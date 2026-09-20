/* ========================================================================= */
/* ARQUIVO: anatomia-3d/js/three-engine.js                                   */
/* VERSÃO:  2.2.0 — COMPLETA: 14 SISTEMAS, 18 VIAS & ECOSSISTEMA LAIFT      */
/* ========================================================================= */

/**
 * MOTOR GRÁFICO 3D MASTER: 14 SISTEMAS, 18 VIAS & SIMULAÇÃO DE CRISES
 * Ecossistema LAIFT - Módulo Master 3D / Bio-Twin
 * - Suporte nativo a Regex com wildcards (* / globs) para qualquer malha
 * - Trajetórias Spline 3D com emissores de partículas para as 18 Vias de Administração
 * - Controle granular contínuo de opacidade (0% a 100%), visibilidade e foco/isolamento
 * - Simulação dinâmica de crises fisiopatológicas (choque colinérgico, bradicardia, cianose)
 * - Ganchos para Quiz 3D Gamificado com feedback luminoso (acerto/erro) e Raycasting
 * - Manequim procedural de contingência cobrindo os 14 sistemas biológicos
 * - Carregamento modular assíncrono de modelos GLB com suporte a IndexedDB (ApiCache)
 */

const ThreeEngine = (() => {
  // -------------------------------------------------------------------------
  // 1. ESTADO E AMBIENTE THREE.JS
  // -------------------------------------------------------------------------
  let scene, camera, renderer, controls;
  let bodyModel = null;
  let hoveredMesh = null;
  let raycaster, mouse;

  // Dicionário de Sistemas e Modelos Modulares Carregados
  const loadedSystems = {};

  // Hotspots / Marcadores Anatômicos 3D
  let pinsGroup = null;
  let pinsPulseTime = 0;
  let arePinsVisible = true;

  // Sistema de Partículas para as 18 Vias Farmacológicas
  let routeCurve = null;
  let routeParticles = null;
  let routeParticlePositions = null;
  let routeParticleProgress = [];
  let isRouteActive = false;
  let activeRouteId = null;
  const ROUTE_PARTICLE_COUNT = 150;

  // Sistema de Partículas Fisiológicas (Deglutição, Hemodinâmica, Secreções)
  let physioParticles = null;
  let physioPositions = null;
  let physioVelocities = null;
  let activePhysioAction = null;
  const PHYSIO_PARTICLE_COUNT = 120;

  // Interpolação de Câmera Cinematográfica (Tween)
  let isCameraTweening = false;
  let cameraStartPos = null;
  let cameraEndPos = null;
  let targetStartLook = null;
  let targetEndLook = null;
  let tweenStartTime = 0;
  let tweenDuration = 800;

  // Camadas de Dissecção Anatômica (1: Pele a 5: Vísceras)
  let currentDissectionLevel = 5;

  // Registro Granular de Estados das Malhas (Opacidade e Visibilidade)
  const organStates = {};

  // Estado Fisiopatológico & Crises Toxicológicas
  let isCrisisActive = false;
  let crisisType = null;
  let cardiacCycleTime = 0;
  let heartRateBpm = 75; // Frequência basal padrão (BPM)
  let originalSkinColors = new Map();

  // Elementos do DOM
  let container, loadingOverlay, organHud, organNameEl;

  // Paleta Visual Biomédica
  const COLOR_HIGHLIGHT = 0x38bdf8;
  const COLOR_SUCCESS = 0x10b981;
  const COLOR_ERROR = 0xef4444;
  const COLOR_PIN_CORE = 0xffffff;
  const COLOR_PIN_GLOW = 0x00e5ff;
  const DEFAULT_EMISSIVE = 0x000000;

  // Classificação Taxonômica das 5 Camadas de Dissecção
  const DISSECTION_LAYERS = {
    1: { id: "pele", nome: "Pele & Tegumento", keywords: ["*skin*", "*integum*", "*derma*", "*epiderm*", "*pele*"] },
    2: { id: "musculo", nome: "Musculatura & Fáscias", keywords: ["*muscl*", "*tendon*", "*fascia*", "*myo*", "*bicep*", "*pectoral*", "*quadriceps*", "*diafrag*"] },
    3: { id: "esqueleto", nome: "Esqueleto & Articulações", keywords: ["*bone*", "*skelet*", "*cartilage*", "*joint*", "*ligament*", "*skull*", "*spine*", "*femur*", "*rib*", "*pelvis*", "*tibia*"] },
    4: { id: "vasos", nome: "Vasos & Sistema Linfático", keywords: ["*vessel*", "*arter*", "*vein*", "*aort*", "*cava*", "*vascular*", "*lymph*", "*capillar*", "*jugular*"] },
    5: { id: "visceras", nome: "Vísceras & Órgãos Nobres", keywords: ["*lung*", "*heart*", "*brain*", "*stomach*", "*liver*", "*kidney*", "*intestin*", "*pancrea*", "*spleen*", "*bladder*", "*ovary*", "*testis*", "*thyroid*", "*adrenal*", "*uterus*"] }
  };

  // Coordenadas Espaciais Nativas de Contingência para as 18 Vias de Administração[cite: 1]
  const DEFAULT_ROUTE_WAYPOINTS = {
    ORAL: {[cite: 1]
      nome: "Via Oral", cor: "#f59e0b",[cite: 1]
      waypoints: [
        { x: 0.0, y: 1.74, z: 0.12 }, { x: 0.0, y: 1.54, z: 0.06 }, { x: -0.06, y: 1.05, z: 0.08 },
        { x: 0.02, y: 0.88, z: 0.07 }, { x: 0.05, y: 0.98, z: 0.04 }, { x: 0.09, y: 1.06, z: 0.06 }, { x: 0.04, y: 1.25, z: 0.08 }
      ]
    },
    SUBLINGUAL: {[cite: 1]
      nome: "Via Sublingual", cor: "#f59e0b",[cite: 1]
      waypoints: [
        { x: 0.0, y: 1.68, z: 0.08 }, { x: 0.03, y: 1.66, z: 0.05 }, { x: 0.08, y: 1.58, z: 0.04 },
        { x: 0.09, y: 1.42, z: 0.04 }, { x: 0.05, y: 1.30, z: 0.06 }
      ]
    },
    RETAL: {[cite: 1]
      nome: "Via Retal", cor: "#f59e0b",[cite: 1]
      waypoints: [
        { x: 0.0, y: 0.72, z: -0.10 }, { x: 0.03, y: 0.74, z: -0.07 }, { x: 0.05, y: 0.82, z: -0.05 },
        { x: 0.04, y: 1.00, z: -0.02 }, { x: 0.04, y: 1.25, z: 0.06 }
      ]
    },
    INTRAGASTRICA: {[cite: 1]
      nome: "Via Intragástrica (SNG/PEG)", cor: "#f59e0b",[cite: 1]
      waypoints: [
        { x: 0.02, y: 1.76, z: 0.14 }, { x: 0.01, y: 1.52, z: 0.06 }, { x: -0.06, y: 1.05, z: 0.08 },
        { x: 0.02, y: 0.88, z: 0.07 }, { x: 0.04, y: 1.25, z: 0.08 }
      ]
    },
    INTRAVENOSA: {[cite: 1]
      nome: "Via Intravenosa (IV)", cor: "#ef4444",[cite: 1]
      waypoints: [
        { x: 0.32, y: 1.12, z: 0.05 }, { x: 0.22, y: 1.22, z: 0.04 }, { x: 0.08, y: 1.30, z: 0.05 },
        { x: 0.05, y: 1.25, z: 0.07 }, { x: 0.0, y: 1.28, z: 0.04 }, { x: 0.04, y: 1.24, z: 0.08 }, { x: 0.02, y: 1.35, z: 0.05 }
      ]
    },
    INTRAMUSCULAR: {[cite: 1]
      nome: "Via Intramuscular (IM)", cor: "#a855f7",[cite: 1]
      waypoints: [
        { x: 0.38, y: 1.35, z: 0.03 }, { x: 0.28, y: 1.32, z: 0.04 }, { x: 0.15, y: 1.30, z: 0.05 },
        { x: 0.05, y: 1.25, z: 0.07 }, { x: 0.03, y: 1.32, z: 0.06 }
      ]
    },
    SUBCUTANEA: {[cite: 1]
      nome: "Via Subcutânea (SC)", cor: "#a855f7",[cite: 1]
      waypoints: [
        { x: 0.08, y: 0.95, z: 0.11 }, { x: 0.07, y: 0.97, z: 0.09 }, { x: 0.06, y: 1.08, z: 0.05 },
        { x: 0.04, y: 1.25, z: 0.06 }
      ]
    },
    INTRADERMICA: {[cite: 1]
      nome: "Via Intradérmica (ID)", cor: "#a855f7",[cite: 1]
      waypoints: [
        { x: 0.30, y: 1.15, z: 0.10 }, { x: 0.28, y: 1.16, z: 0.08 }, { x: 0.20, y: 1.22, z: 0.06 }
      ]
    },
    INTRAARTERIAL: {[cite: 1]
      nome: "Via Intra-arterial", cor: "#ef4444",[cite: 1]
      waypoints: [
        { x: 0.02, y: 1.35, z: 0.05 }, { x: 0.05, y: 1.10, z: 0.04 }, { x: 0.09, y: 1.05, z: 0.06 }
      ]
    },
    INTRACARDIACA: {[cite: 1]
      nome: "Via Intracardíaca", cor: "#ef4444",[cite: 1]
      waypoints: [
        { x: 0.04, y: 1.25, z: 0.15 }, { x: 0.04, y: 1.25, z: 0.09 }, { x: 0.02, y: 1.35, z: 0.05 }
      ]
    },
    INTRAOSSEA: {[cite: 1]
      nome: "Via Intraóssea (IO)", cor: "#a855f7",[cite: 1]
      waypoints: [
        { x: -0.10, y: 0.60, z: 0.08 }, { x: -0.08, y: 0.65, z: 0.05 }, { x: 0.03, y: 0.95, z: 0.04 },
        { x: 0.04, y: 1.25, z: 0.06 }
      ]
    },
    INTRATECAL: {[cite: 1]
      nome: "Via Intratecal (IT)", cor: "#38bdf8",[cite: 1]
      waypoints: [
        { x: 0.0, y: 0.85, z: -0.10 }, { x: 0.0, y: 1.15, z: -0.06 }, { x: 0.0, y: 1.50, z: -0.03 },
        { x: 0.0, y: 1.74, z: 0.02 }
      ]
    },
    EPIDURAL: {[cite: 1]
      nome: "Via Epidural", cor: "#38bdf8",[cite: 1]
      waypoints: [
        { x: 0.0, y: 0.88, z: -0.11 }, { x: 0.0, y: 1.10, z: -0.07 }, { x: 0.0, y: 1.30, z: -0.04 }
      ]
    },
    TOPICA: {[cite: 1]
      nome: "Via Tópica & Transdérmica", cor: "#fbbf24",[cite: 1]
      waypoints: [
        { x: 0.35, y: 0.95, z: 0.08 }, { x: 0.33, y: 0.96, z: 0.05 }, { x: 0.22, y: 1.08, z: 0.04 },
        { x: 0.05, y: 1.25, z: 0.07 }
      ]
    },
    NASAL: {[cite: 1]
      nome: "Via Nasal (Inalação / Spray)", cor: "#06b6d4",[cite: 1]
      waypoints: [
        { x: 0.0, y: 1.76, z: 0.15 }, { x: 0.0, y: 1.75, z: 0.10 }, { x: 0.0, y: 1.78, z: 0.07 },
        { x: 0.0, y: 1.82, z: 0.05 }, { x: 0.03, y: 1.55, z: 0.04 }
      ]
    },
    PULMONAR_INALATORIA: {[cite: 1]
      nome: "Via Pulmonar (Inalatória)", cor: "#06b6d4",[cite: 1]
      waypoints: [
        { x: 0.0, y: 1.72, z: 0.12 }, { x: 0.01, y: 1.55, z: 0.06 }, { x: -0.04, y: 1.40, z: 0.03 },
        { x: -0.10, y: 1.35, z: 0.05 }, { x: 0.04, y: 1.25, z: 0.07 }
      ]
    },
    OCULAR: {[cite: 1]
      nome: "Via Ocular", cor: "#38bdf8",[cite: 1]
      waypoints: [
        { x: -0.04, y: 1.78, z: 0.16 }, { x: -0.035, y: 1.78, z: 0.14 }, { x: -0.02, y: 1.75, z: 0.12 },
        { x: 0.0, y: 1.70, z: 0.10 }
      ]
    },
    OTOLOGICA: {[cite: 1]
      nome: "Via Otológica", cor: "#e2e8f0",[cite: 1]
      waypoints: [
        { x: 0.16, y: 1.76, z: 0.02 }, { x: 0.13, y: 1.75, z: 0.01 }, { x: 0.10, y: 1.74, z: 0.00 }
      ]
    },
    VAGINAL: {[cite: 1]
      nome: "Via Vaginal", cor: "#fd79a8",[cite: 1]
      waypoints: [
        { x: 0.0, y: 0.72, z: 0.02 }, { x: 0.0, y: 0.76, z: 0.03 }, { x: 0.03, y: 0.88, z: 0.04 },
        { x: 0.04, y: 1.15, z: 0.05 }
      ]
    }
  };

  // Hotspots Anatômicos Chave com Câmera e Metadados Semiomédicos
  const PIN_DEFINITIONS = [
    { id: "pin_brain", organKey: "brain", label: "Encéfalo (SNC)", pos: { x: 0, y: 1.76, z: 0.08 }, cam: { x: 0, y: 1.8, z: 1.1 }, look: { x: 0, y: 1.75, z: 0 }, desc: "Centro integrador neuroendócrino e barreira hematoencefálica (BHE)." },
    { id: "pin_heart", organKey: "heart", label: "Coração & Miocárdio", pos: { x: 0.045, y: 1.26, z: 0.11 }, cam: { x: 0.15, y: 1.28, z: 1.0 }, look: { x: 0.04, y: 1.25, z: 0 }, desc: "Bomba eletromecânica sincicial; débito cardíaco e receptores β1/M2." },
    { id: "pin_lungs", organKey: "lung", label: "Pulmões & Alvéolos", pos: { x: -0.11, y: 1.32, z: 0.09 }, cam: { x: -0.2, y: 1.35, z: 1.1 }, look: { x: -0.1, y: 1.3, z: 0 }, desc: "Hematose alvéolo-capilar, surfactante pulmonar e receptores β2/M3." },
    { id: "pin_stomach", organKey: "stomach", label: "Estômago", pos: { x: -0.065, y: 1.05, z: 0.1 }, cam: { x: -0.18, y: 1.08, z: 1.0 }, look: { x: -0.06, y: 1.02, z: 0 }, desc: "Clivagem ácida (pH 1.5-2.0), digestão proteica e bomba H+/K+-ATPase." },
    { id: "pin_liver", organKey: "liver", label: "Fígado & Sistema Porta", pos: { x: 0.095, y: 1.06, z: 0.1 }, cam: { x: 0.22, y: 1.1, z: 1.05 }, look: { x: 0.09, y: 1.04, z: 0 }, desc: "Metabolismo pré-sistêmico de primeira passagem e citocromo P450." },
    { id: "pin_kidneys", organKey: "kidney", label: "Rins & Néfrons", pos: { x: 0.12, y: 0.94, z: -0.07 }, cam: { x: 0.25, y: 0.98, z: -0.85 }, look: { x: 0.11, y: 0.93, z: 0 }, desc: "Ultrafiltração glomerular, depuração plasmática e regulação de volume." }
  ];

  // =========================================================================
  // 2. AUXILIAR: COMPARADOR DE WILDCARDS (RESOLVE GLOBS mesh_*)
  // =========================================================================
  function matchesWildcard(meshName, pattern) {
    if (!meshName || !pattern) return false;
    const cleanPattern = pattern.trim().toLowerCase().replace(/\*/g, ".*");
    const regex = new RegExp(`^${cleanPattern}$`, "i");
    return regex.test(meshName.toLowerCase().trim()) || meshName.toLowerCase().includes(pattern.replace(/\*/g, "").toLowerCase());
  }

  // =========================================================================
  // 3. INICIALIZAÇÃO DO MOTOR WEBGL
  // =========================================================================
  function init() {
    container = document.getElementById("canvas-3d-container");
    loadingOverlay = document.getElementById("loading-3d-overlay");
    organHud = document.getElementById("organ-hud");
    organNameEl = document.getElementById("organ-name");

    if (!container || typeof THREE === "undefined") {
      console.warn("[ThreeEngine] WebGL ou container DOM indisponível.");
      return;
    }

    const width = container.clientWidth || 380;
    const height = container.clientHeight || 280;

    // Cena & Câmera Perspectiva
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.25, 3.2);

    // Renderizador WebGL com Alto Rendimento
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    // Sistema de Iluminação Tripla de Estúdio Anatômico
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirFront = new THREE.DirectionalLight(0xffffff, 0.95);
    dirFront.position.set(5, 10, 7);
    scene.add(dirFront);

    const dirBack = new THREE.DirectionalLight(0x38bdf8, 0.5);
    dirBack.position.set(-5, 5, -5);
    scene.add(dirBack);

    // Controles Orbitais
    if (typeof THREE.OrbitControls === "function") {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 0.5;
      controls.maxDistance = 5.5;
      controls.target.set(0, 1.1, 0);
    }

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Inicialização de Submotores
    setupRouteParticleSystem();
    setupPhysioParticleSystem();
    setupPinsGroup();
    loadAnatomicalModel();

    // Listeners Globais
    window.addEventListener("resize", onWindowResize);
    container.addEventListener("click", onSceneClick);
    container.addEventListener("touchstart", onTouchStart, { passive: true });

    if (window.ResizeObserver) {
      const observer = new ResizeObserver(() => onWindowResize());
      observer.observe(container);
    }

    injectDissectionSliderUI();
    animate();
    console.log("[ThreeEngine v2.2] Motor Master 3D Operacional.");
  }

  // =========================================================================
  // 4. CARREGAMENTO MODULAR / MESTRE COM FALLBACK COMPLETO
  // =========================================================================
  async function loadAnatomicalModel() {
    let modelUrl = "models/body.glb";

    // Verifica persistência IndexedDB via ApiCache
    if (typeof ApiCache !== "undefined" && typeof ApiCache.obterModelo3DBinario === "function") {
      modelUrl = await ApiCache.obterModelo3DBinario("z_anatomy_master", modelUrl);
    }

    if (typeof THREE.GLTFLoader !== "function") {
      buildComprehensiveMannequin();
      if (loadingOverlay) loadingOverlay.classList.add("hidden");
      return;
    }

    const loader = new THREE.GLTFLoader();

    if (typeof THREE.DRACOLoader === "function") {
      try {
        const draco = new THREE.DRACOLoader();
        draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.4.1/");
        loader.setDRACOLoader(draco);
      } catch (e) {
        console.warn("[ThreeEngine] DRACOLoader ignorado:", e);
      }
    }

    loader.load(
      modelUrl,
      (gltf) => {
        bodyModel = gltf.scene;
        bodyModel.position.set(0, 0, 0);

        bodyModel.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material = child.material.clone();
            child.material.transparent = true;
            child.material.depthWrite = true;
            child.material.opacity = 1.0;
            organStates[child.name] = { visible: true, opacity: 1.0 };
            if (child.material.color) {
              originalSkinColors.set(child.name, child.material.color.getHex());
            }
          }
        });

        scene.add(bodyModel);
        if (loadingOverlay) loadingOverlay.classList.add("hidden");
        setDissectionDepth(currentDissectionLevel);
        console.log("[ThreeEngine] Malhas do Atlas carregadas com sucesso.");
      },
      (xhr) => {
        if (loadingOverlay && xhr.total > 0) {
          const pct = Math.round((xhr.loaded / xhr.total) * 100);
          loadingOverlay.innerText = `Carregando Malhas 3D... ${pct}%`;
        }
      },
      () => {
        console.warn("[ThreeEngine] body.glb ausente. Ativando Manequim Anatômico Completo.");
        buildComprehensiveMannequin();
        if (loadingOverlay) loadingOverlay.classList.add("hidden");
      }
    );
  }

  /**
   * Constrói Manequim Procedural Completo cobrindo os 14 Sistemas[cite: 1]
   */
  function buildComprehensiveMannequin() {
    const group = new THREE.Group();
    group.name = "Comprehensive_Anatomy_Group";

    function createPart(name, geometry, color, pos, opt = {}) {
      const mat = new THREE.MeshStandardMaterial({
        color: color,
        transparent: true,
        opacity: opt.opacity || 1.0,
        wireframe: opt.wireframe || false,
        emissive: opt.emissive || 0x000000,
        depthWrite: true
      });
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.name = name;
      mesh.position.set(pos.x, pos.y, pos.z);
      if (opt.rot) mesh.rotation.set(opt.rot.x, opt.rot.y, opt.rot.z);
      group.add(mesh);
      organStates[name] = { visible: true, opacity: opt.opacity || 1.0 };
      originalSkinColors.set(name, color);
      return mesh;
    }

    // 1. Tegumentar: Pele
    createPart("mesh_skin_trunk", new THREE.CylinderGeometry(0.3, 0.24, 1.15, 16), 0x334155, { x: 0, y: 1.05, z: 0 }, { opacity: 0.22, wireframe: true });
    createPart("mesh_skin_head", new THREE.SphereGeometry(0.21, 16, 16), 0x334155, { x: 0, y: 1.75, z: 0 }, { opacity: 0.18, wireframe: true });

    // 2. Muscular & Fascial
    createPart("mesh_muscle_pectoral", new THREE.CylinderGeometry(0.27, 0.22, 1.05, 16), 0x991b1b, { x: 0, y: 1.05, z: 0 }, { opacity: 0.85 });
    createPart("mesh_fascia_lata", new THREE.CylinderGeometry(0.12, 0.09, 0.8, 12), 0xdbeafe, { x: -0.15, y: 0.45, z: 0 }, { opacity: 0.35 });

    // 3. Esquelético & Articular
    createPart("mesh_skull_bone", new THREE.SphereGeometry(0.19, 16, 16), 0xe2e8f0, { x: 0, y: 1.75, z: 0 }, { opacity: 0.95 });
    createPart("mesh_rib_cage", new THREE.CylinderGeometry(0.24, 0.19, 0.6, 12, 1, true), 0xe2e8f0, { x: 0, y: 1.25, z: 0 }, { opacity: 0.9 });
    createPart("mesh_spine_vertebrae", new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), 0xe2e8f0, { x: 0, y: 1.1, z: -0.12 }, { opacity: 0.95 });
    createPart("mesh_pelvis_bone", new THREE.CylinderGeometry(0.22, 0.18, 0.25, 12), 0xe2e8f0, { x: 0, y: 0.65, z: 0 }, { opacity: 0.95 });
    createPart("mesh_femur_bone", new THREE.CylinderGeometry(0.04, 0.035, 0.75, 8), 0xe2e8f0, { x: 0.15, y: 0.38, z: 0 }, { opacity: 0.95 });

    // 4. Cardiovascular
    createPart("mesh_heart_organ", new THREE.SphereGeometry(0.09, 14, 14), 0xef4444, { x: 0.045, y: 1.26, z: 0.08 }, { emissive: 0x450a0a });
    createPart("mesh_aorta_vessel", new THREE.CylinderGeometry(0.02, 0.02, 0.7, 8), 0xdc2626, { x: 0.01, y: 1.15, z: 0.02 }, { emissive: 0x7f1d1d });
    createPart("mesh_vein_cava", new THREE.CylinderGeometry(0.02, 0.02, 0.65, 8), 0x2563eb, { x: 0.05, y: 1.15, z: 0.02 }, { emissive: 0x1e3a8a });

    // 5. Linfático & Imunológico
    createPart("mesh_spleen_organ", new THREE.SphereGeometry(0.06, 12, 12), 0x10b981, { x: 0.12, y: 1.12, z: -0.04 }, { emissive: 0x064e3b });
    createPart("mesh_thymus_organ", new THREE.BoxGeometry(0.05, 0.08, 0.03), 0x34d399, { x: 0, y: 1.40, z: 0.07 });

    // 6. Nervoso & Sentidos
    createPart("mesh_brain_organ", new THREE.SphereGeometry(0.14, 14, 14), 0x38bdf8, { x: 0, y: 1.76, z: 0.02 }, { emissive: 0x075985 });
    createPart("mesh_spinal_cord", new THREE.CylinderGeometry(0.015, 0.015, 0.85, 8), 0x7dd3fc, { x: 0, y: 1.12, z: -0.10 });
    createPart("mesh_eye_orbit", new THREE.SphereGeometry(0.03, 10, 10), 0xf8fafc, { x: -0.05, y: 1.78, z: 0.16 });

    // 7. Respiratório
    createPart("mesh_lung_organ", new THREE.SphereGeometry(0.085, 12, 12), 0x06b6d4, { x: -0.11, y: 1.3, z: 0.05 }, { opacity: 0.75 });
    createPart("mesh_trachea_organ", new THREE.CylinderGeometry(0.025, 0.025, 0.25, 8), 0x22d3ee, { x: 0, y: 1.52, z: 0.05 });

    // 8. Digestório
    createPart("mesh_stomach_organ", new THREE.SphereGeometry(0.11, 14, 14), 0xf97316, { x: -0.065, y: 1.05, z: 0.08 }, { emissive: 0x431407 });
    createPart("mesh_liver_organ", new THREE.BoxGeometry(0.15, 0.1, 0.12), 0x854d0e, { x: 0.095, y: 1.06, z: 0.07 }, { emissive: 0x422006 });
    createPart("mesh_pancreas_organ", new THREE.BoxGeometry(0.12, 0.03, 0.04), 0xfbbf24, { x: -0.02, y: 0.98, z: 0.04 });
    createPart("mesh_intestine_small", new THREE.TorusGeometry(0.1, 0.04, 8, 16), 0xd97706, { x: 0, y: 0.85, z: 0.06 });
    createPart("mesh_colon_organ", new THREE.CylinderGeometry(0.15, 0.15, 0.22, 12, 1, true), 0xb45309, { x: 0, y: 0.85, z: 0.04 });

    // 9. Urinário / Renal
    createPart("mesh_kidney_organ", new THREE.SphereGeometry(0.055, 12, 12), 0xeab308, { x: 0.11, y: 0.94, z: -0.06 }, { emissive: 0x422006 });
    createPart("mesh_bladder_organ", new THREE.SphereGeometry(0.06, 12, 12), 0xfacc15, { x: 0, y: 0.60, z: 0.05 });

    // 10. Endócrino
    createPart("mesh_thyroid_organ", new THREE.BoxGeometry(0.06, 0.04, 0.02), 0xec4899, { x: 0, y: 1.58, z: 0.07 });
    createPart("mesh_adrenal_organ", new THREE.ConeGeometry(0.025, 0.03, 6), 0xf472b6, { x: 0.11, y: 1.01, z: -0.06 });

    // 11. Reprodutor
    createPart("mesh_prostate_organ", new THREE.SphereGeometry(0.03, 8, 8), 0x6366f1, { x: 0, y: 0.54, z: 0.04 });

    bodyModel = group;
    scene.add(bodyModel);
    setDissectionDepth(currentDissectionLevel);
  }

  // =========================================================================
  // 5. CONTROLE GRANULAR DE ÓRGÃOS, OPACIDADE E SELEÇÃO DE SISTEMAS
  // =========================================================================
  function setOrganVisibility(organKey, isVisible) {
    if (!bodyModel) return;
    bodyModel.traverse((child) => {
      if (child.isMesh && matchesWildcard(child.name, organKey)) {
        child.visible = isVisible;
        if (!organStates[child.name]) organStates[child.name] = {};
        organStates[child.name].visible = isVisible;
      }
    });
  }

  function setOrganOpacity(organKey, opacityValue) {
    if (!bodyModel) return;
    const alpha = Math.max(0, Math.min(1, parseFloat(opacityValue)));

    bodyModel.traverse((child) => {
      if (child.isMesh && child.material && matchesWildcard(child.name, organKey)) {
        child.material.transparent = alpha < 1.0;
        child.material.opacity = alpha;
        child.material.depthWrite = alpha > 0.2;
        child.visible = alpha > 0.005;

        if (!organStates[child.name]) organStates[child.name] = {};
        organStates[child.name].opacity = alpha;
      }
    });
  }

  function isolateOrgan(organKey) {
    if (!bodyModel) return;
    bodyModel.traverse((child) => {
      if (child.isMesh && child.material) {
        if (matchesWildcard(child.name, organKey)) {
          child.visible = true;
          child.material.transparent = false;
          child.material.opacity = 1.0;
          child.material.depthWrite = true;
        } else {
          child.material.transparent = true;
          child.material.opacity = 0.06;
          child.material.depthWrite = false;
        }
      }
    });
  }

  function resetOrganTree() {
    if (!bodyModel) return;
    bodyModel.traverse((child) => {
      if (child.isMesh && child.material) {
        child.visible = true;
        child.material.transparent = true;
        child.material.opacity = 1.0;
        child.material.depthWrite = true;
        organStates[child.name] = { visible: true, opacity: 1.0 };
      }
    });
    setDissectionDepth(currentDissectionLevel);
  }

  function selectSystem(systemId) {
    if (typeof ATLAS_DATABASE === "undefined" || !Array.isArray(ATLAS_DATABASE.sistemas)) return;[cite: 1]
    const sys = ATLAS_DATABASE.sistemas.find((s) => s.id === systemId);[cite: 1]
    if (!sys) return;

    tweenCamera(sys.focoCamera, sys.targetLook);[cite: 1]

    if (bodyModel) {
      bodyModel.traverse((child) => {
        if (child.isMesh && child.material) {
          const match = (sys.meshKeywords || []).some((k) => matchesWildcard(child.name, k));[cite: 1]
          child.material.transparent = !match;
          child.material.opacity = match ? 1.0 : 0.08;
        }
      });
    }
  }

  // =========================================================================
  // 6. MOTOR DE SIMULAÇÃO DAS 18 VIAS DE ADMINISTRAÇÃO (SPLINE 3D)
  // =========================================================================
  function setupRouteParticleSystem() {
    const geom = new THREE.BufferGeometry();
    routeParticlePositions = new Float32Array(ROUTE_PARTICLE_COUNT * 3);
    routeParticleProgress = new Float32Array(ROUTE_PARTICLE_COUNT);

    for (let i = 0; i < ROUTE_PARTICLE_COUNT; i++) {
      routeParticlePositions[i * 3 + 0] = 0;
      routeParticlePositions[i * 3 + 1] = -30;
      routeParticlePositions[i * 3 + 2] = 0;
      routeParticleProgress[i] = i / ROUTE_PARTICLE_COUNT;
    }

    geom.setAttribute("position", new THREE.BufferAttribute(routeParticlePositions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xf59e0b,
      size: 0.038,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });

    routeParticles = new THREE.Points(geom, mat);
    scene.add(routeParticles);
  }

  function simulateAdministrationRoute(routeId) {
    const rId = String(routeId || "ORAL").toUpperCase();
    let waypointsData = null;
    let corFluxo = "#38bdf8";

    // 1. Busca no ATLAS_DATABASE v2.0.0[cite: 1]
    if (typeof ATLAS_DATABASE !== "undefined" && ATLAS_DATABASE.viasAdministracao && ATLAS_DATABASE.viasAdministracao[rId]) {[cite: 1]
      waypointsData = ATLAS_DATABASE.viasAdministracao[rId].waypoints3D;[cite: 1]
      corFluxo = ATLAS_DATABASE.viasAdministracao[rId].corFluxo || corFluxo;[cite: 1]
    }

    // 2. Fallback interno nativo para todas as 18 vias
    if (!waypointsData && DEFAULT_ROUTE_WAYPOINTS[rId]) {
      waypointsData = DEFAULT_ROUTE_WAYPOINTS[rId].waypoints;
      corFluxo = DEFAULT_ROUTE_WAYPOINTS[rId].cor;
    }

    if (!waypointsData || waypointsData.length < 2) {
      console.warn(`[ThreeEngine] Via farmacológica ${rId} sem pontos tridimensionais suficientes.`);
      return;
    }

    activeRouteId = rId;
    isRouteActive = true;

    const vectors = waypointsData.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    routeCurve = new THREE.CatmullRomCurve3(vectors, false, "catmullrom", 0.35);

    routeParticles.material.color.set(corFluxo);
    routeParticles.material.opacity = 0.95;

    const startPoint = waypointsData[0];
    tweenCamera(
      { x: startPoint.x * 1.5, y: startPoint.y + 0.08, z: startPoint.z + 1.15 },
      { x: startPoint.x, y: startPoint.y, z: startPoint.z }
    );

    console.log(`[ThreeEngine] Rota Farmacológica Ativada: ${rId}`);
  }

  function updateRouteParticles() {
    if (!isRouteActive || !routeCurve || !routeParticles) return;
    const pos = routeParticlePositions;
    const speed = 0.0035;

    for (let i = 0; i < ROUTE_PARTICLE_COUNT; i++) {
      routeParticleProgress[i] += speed;
      if (routeParticleProgress[i] > 1.0) routeParticleProgress[i] -= 1.0;

      const point = routeCurve.getPointAt(routeParticleProgress[i]);
      pos[i * 3 + 0] = point.x + (Math.sin(i * 9) * 0.005);
      pos[i * 3 + 1] = point.y + (Math.cos(i * 7) * 0.005);
      pos[i * 3 + 2] = point.z;
    }

    routeParticles.geometry.attributes.position.needsUpdate = true;
  }

  function stopRouteSimulation() {
    isRouteActive = false;
    activeRouteId = null;
    if (routeParticles) routeParticles.material.opacity = 0.0;
  }

  // =========================================================================
  // 7. SIMULAÇÃO DE CRISES FISIOPATOLÓGICAS (TOXICOLOGIA LAIFT)
  // =========================================================================
  function setCrisisMode(active, type = "colinergica") {
    isCrisisActive = !!active;
    crisisType = type;

    if (isCrisisActive) {
      console.warn(`[ThreeEngine] 🚨 MODO CRISE ATIVADO: ${type}`);
      if (type === "colinergica") {
        heartRateBpm = 38; // Bradicardia severa
        triggerParticleFlow("pharynx_transit");
        if (physioParticles) physioParticles.material.color.setHex(0x38bdf8);
      } else if (type === "anafilaxia") {
        heartRateBpm = 145; // Taquicardia compensatória
        triggerParticleFlow("aorta_flow");
      }
    } else {
      console.log(`[ThreeEngine] 🛡️ Retorno ao estado basal normal.`);
      heartRateBpm = 75;
      stopParticles();

      // Restaura cores normais da pele
      if (bodyModel) {
        bodyModel.traverse((child) => {
          if (child.isMesh && matchesWildcard(child.name, "*skin*")) {
            const original = originalSkinColors.get(child.name);
            if (original && child.material && child.material.color) {
              child.material.color.setHex(original);
            }
          }
        });
      }
    }
  }

  function updatePhysiopathologyAnimation() {
    if (!bodyModel) return;

    // Pulsação eletromecânica proporcional aos batimentos por minuto
    cardiacCycleTime += (heartRateBpm / 60) * 0.08;
    const pulseScale = 1.0 + Math.sin(cardiacCycleTime) * (isCrisisActive ? 0.03 : 0.06);

    bodyModel.traverse((child) => {
      if (child.isMesh && matchesWildcard(child.name, "*heart*")) {
        child.scale.set(pulseScale, pulseScale, pulseScale);
      }

      // Cianose periférica durante colapso hipóxico ou bradicardia severa
      if (isCrisisActive && crisisType === "colinergica" && matchesWildcard(child.name, "*skin*")) {
        if (child.material && child.material.color) {
          child.material.color.setHex(0x1e293b);
        }
      }
    });
  }

  // =========================================================================
  // 8. PARTÍCULAS FISIOLÓGICAS, PINS E DISSECÇÃO
  // =========================================================================
  function setupPhysioParticleSystem() {
    const geom = new THREE.BufferGeometry();
    physioPositions = new Float32Array(PHYSIO_PARTICLE_COUNT * 3);
    physioVelocities = new Float32Array(PHYSIO_PARTICLE_COUNT * 3);

    for (let i = 0; i < PHYSIO_PARTICLE_COUNT; i++) {
      physioPositions[i * 3 + 1] = -20;
      physioVelocities[i * 3 + 1] = -0.005;
    }

    geom.setAttribute("position", new THREE.BufferAttribute(physioPositions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xfacc15, size: 0.032, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending });
    physioParticles = new THREE.Points(geom, mat);
    scene.add(physioParticles);
  }

  function triggerParticleFlow(actionType) {
    if (!physioParticles) return;
    activePhysioAction = actionType;
    physioParticles.material.opacity = 0.95;

    let baseY = 1.74;
    let colorHex = 0xfacc15;

    if (actionType === "pharynx_transit") { baseY = 1.54; colorHex = 0xfb923c; }
    else if (actionType === "esophagus_wave") { baseY = 1.38; colorHex = 0xf97316; }
    else if (actionType === "stomach_entry") { baseY = 1.05; colorHex = 0x34d399; }
    else if (actionType === "aorta_flow") { baseY = 1.25; colorHex = 0xef4444; }

    physioParticles.material.color.setHex(colorHex);

    const pos = physioPositions;
    for (let i = 0; i < PHYSIO_PARTICLE_COUNT; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 0.05;
      pos[i * 3 + 1] = baseY + (Math.random() - 0.5) * 0.06;
      pos[i * 3 + 2] = 0.08;
    }
    physioParticles.geometry.attributes.position.needsUpdate = true;
  }

  function stopParticles() {
    activePhysioAction = null;
    if (physioParticles) physioParticles.material.opacity = 0.0;
  }

  function updatePhysioParticles() {
    if (!physioParticles || !activePhysioAction) return;
    const pos = physioPositions;

    for (let i = 0; i < PHYSIO_PARTICLE_COUNT; i++) {
      pos[i * 3 + 1] += physioVelocities[i * 3 + 1];
      if (pos[i * 3 + 1] < 0.85) pos[i * 3 + 1] = 1.72;
    }
    physioParticles.geometry.attributes.position.needsUpdate = true;
  }

  function setupPinsGroup() {
    pinsGroup = new THREE.Group();
    pinsGroup.name = "Pins_Group";

    PIN_DEFINITIONS.forEach((p) => {
      const pinAnchor = new THREE.Group();
      pinAnchor.position.set(p.pos.x, p.pos.y, p.pos.z);

      const core = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 12), new THREE.MeshBasicMaterial({ color: COLOR_PIN_CORE }));
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), new THREE.MeshBasicMaterial({ color: COLOR_PIN_GLOW, transparent: true, opacity: 0.6, wireframe: true }));

      pinAnchor.add(core);
      pinAnchor.add(halo);
      pinAnchor.userData = { isPin: true, data: p };
      pinsGroup.add(pinAnchor);
    });

    scene.add(pinsGroup);
  }

  function updatePinsPulse() {
    if (!pinsGroup || !arePinsVisible) return;
    pinsPulseTime += 0.04;
    const scale = 1.0 + Math.sin(pinsPulseTime) * 0.25;

    pinsGroup.children.forEach((a) => {
      const halo = a.children[1];
      if (halo) halo.scale.set(scale, scale, scale);
    });
  }

  function togglePinsVisibility(forceState) {
    arePinsVisible = typeof forceState !== "undefined" ? forceState : !arePinsVisible;
    if (pinsGroup) pinsGroup.visible = arePinsVisible;
  }

  function setDissectionDepth(depth) {
    currentDissectionLevel = Math.max(1, Math.min(5, parseInt(depth, 10)));
    if (!bodyModel) return;

    bodyModel.traverse((child) => {
      if (child.isMesh && child.material) {
        let meshLayer = 5;

        for (let l = 1; l <= 5; l++) {
          if (DISSECTION_LAYERS[l].keywords.some((k) => matchesWildcard(child.name, k))) {
            meshLayer = l;
            break;
          }
        }

        if (meshLayer < currentDissectionLevel) {
          child.visible = false;
        } else if (meshLayer === currentDissectionLevel) {
          child.visible = true;
          child.material.transparent = false;
          child.material.opacity = 1.0;
        } else {
          child.visible = true;
          child.material.transparent = true;
          child.material.opacity = currentDissectionLevel === 5 ? 1.0 : 0.4;
        }
      }
    });

    const badge = document.getElementById("dissectionLevelBadge");
    if (badge && DISSECTION_LAYERS[currentDissectionLevel]) {
      badge.textContent = `Camada ${currentDissectionLevel}/5: ${DISSECTION_LAYERS[currentDissectionLevel].nome}`;
    }
  }

  // =========================================================================
  // 9. CÂMERA TWEEN, INTERAÇÃO & FEEDBACK PARA QUIZ 3D
  // =========================================================================
  function tweenCamera(targetPos, targetLook, durationMs = 800) {
    if (!camera || !controls) return;
    cameraStartPos = camera.position.clone();
    cameraEndPos = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
    targetStartLook = controls.target.clone();
    targetEndLook = new THREE.Vector3(targetLook.x, targetLook.y, targetLook.z);
    tweenStartTime = performance.now();
    tweenDuration = durationMs;
    isCameraTweening = true;
  }

  function updateCameraTween(now) {
    if (!isCameraTweening) return;
    const progress = Math.min((now - tweenStartTime) / tweenDuration, 1.0);
    const ease = 1 - Math.pow(1 - progress, 3);

    camera.position.lerpVectors(cameraStartPos, cameraEndPos, ease);
    controls.target.lerpVectors(targetStartLook, targetEndLook, ease);
    controls.update();

    if (progress >= 1.0) isCameraTweening = false;
  }

  function highlightOrgan(organKey, colorHex = COLOR_HIGHLIGHT, durationMs = 3000) {
    if (!bodyModel) return false;
    let found = false;

    bodyModel.traverse((child) => {
      if (child.isMesh && matchesWildcard(child.name, organKey)) {
        if (hoveredMesh && hoveredMesh.material && hoveredMesh.material.emissive) {
          hoveredMesh.material.emissive.setHex(DEFAULT_EMISSIVE);
        }
        hoveredMesh = child;
        if (hoveredMesh.material && hoveredMesh.material.emissive) {
          hoveredMesh.material.emissive.setHex(colorHex);
          hoveredMesh.material.emissiveIntensity = 0.85;

          setTimeout(() => {
            if (hoveredMesh && hoveredMesh.material && hoveredMesh.material.emissive) {
              hoveredMesh.material.emissive.setHex(DEFAULT_EMISSIVE);
            }
          }, durationMs);
        }
        found = true;
      }
    });
    return found;
  }

  /**
   * Feedback luminoso em tempo real para o Quiz 3D Gamificado
   */
  function flashOrganFeedback(organKey, isCorrect) {
    const color = isCorrect ? COLOR_SUCCESS : COLOR_ERROR;
    highlightOrgan(organKey, color, 2000);
  }

  function raycastHitOrgan(clientX, clientY) {
    if (!container || !camera || !bodyModel) return null;

    const rect = container.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(bodyModel.children, true);

    if (hits.length > 0) {
      return {
        meshName: hits[0].object.name,
        point: hits[0].point,
        object: hits[0].object
      };
    }
    return null;
  }

  function processInteraction(clientX, clientY) {
    if (!container || !camera) return;

    // Prioridade para avaliação de Quiz Gamificado se ativo
    if (typeof QuizEngine !== "undefined" && typeof QuizEngine.isQuizActive === "function" && QuizEngine.isQuizActive()) {
      const hit = raycastHitOrgan(clientX, clientY);
      if (hit && hit.meshName) {
        QuizEngine.evaluateUserAnswer(hit.meshName);
        return;
      }
    }

    const rect = container.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Detecção de clique em Pins / Hotspots
    if (pinsGroup && arePinsVisible) {
      const hits = raycaster.intersectObjects(pinsGroup.children, true);
      if (hits.length > 0) {
        let root = hits[0].object;
        while (root.parent && root.parent !== pinsGroup) root = root.parent;
        if (root.userData && root.userData.isPin) {
          const p = root.userData.data;
          tweenCamera(p.cam, p.look || p.pos);
          highlightOrgan(p.organKey || p.id);
          if (organHud && organNameEl) {
            organNameEl.innerHTML = `<span style="color:#38bdf8;">📍 ${p.label}</span><div style="font-size:0.68rem; color:#94a3b8; font-weight:normal;">${p.desc || ""}</div>`;
            organHud.classList.remove("hidden");
          }
          return;
        }
      }
    }

    // Detecção direta sobre malhas anatômicas
    if (!bodyModel) return;
    const hits = raycaster.intersectObjects(bodyModel.children, true);
    if (hits.length > 0) {
      const obj = hits[0].object;
      if (hoveredMesh && hoveredMesh !== obj && hoveredMesh.material && hoveredMesh.material.emissive) {
        hoveredMesh.material.emissive.setHex(DEFAULT_EMISSIVE);
      }
      hoveredMesh = obj;
      if (hoveredMesh.material && hoveredMesh.material.emissive) {
        hoveredMesh.material.emissive.setHex(COLOR_HIGHLIGHT);
        hoveredMesh.material.emissiveIntensity = 0.6;
      }
      if (organHud && organNameEl) {
        const cleanName = obj.name.replace(/mesh_/g, "").replace(/_/g, " ").replace(/[0-9]/g, "").trim();
        organNameEl.innerText = cleanName || "Tecido Selecionado";
        organHud.classList.remove("hidden");
      }
    }
  }

  function onSceneClick(e) { processInteraction(e.clientX, e.clientY); }
  function onTouchStart(e) { if (e.touches && e.touches.length > 0) processInteraction(e.touches[0].clientX, e.touches[0].clientY); }

  function onWindowResize() {
    if (!container || !renderer || !camera) return;
    const width = container.clientWidth || 380;
    const height = container.clientHeight || 280;
    if (width > 0 && height > 0) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
  }

  // =========================================================================
  // 10. WIDGET DE DISSECÇÃO NO CANVAS
  // =========================================================================
  function injectDissectionSliderUI() {
    if (document.getElementById("dissectionControlWidget")) return;

    const widget = document.createElement("div");
    widget.id = "dissectionControlWidget";
    widget.style.cssText = `
      position: absolute;
      bottom: 12px;
      left: 12px;
      background: rgba(2, 6, 23, 0.88);
      border: 1px solid #334155;
      padding: 8px 12px;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      z-index: 30;
      backdrop-filter: blur(6px);
    `;

    widget.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <span id="dissectionLevelBadge" style="font-size:0.7rem; font-weight:700; color:#38bdf8;">Camada 5/5: Vísceras</span>
        <button type="button" id="btnTogglePins" style="background:transparent; border:1px solid #334155; color:#94a3b8; font-size:0.65rem; padding:2px 6px; border-radius:4px; cursor:pointer;" title="Alternar Marcadores">📍 Pins</button>
      </div>
      <input type="range" id="dissectionSlider" min="1" max="5" value="5" step="1" style="width:160px; accent-color:#0284c7; cursor:pointer; margin:4px 0;">
      <div style="display:flex; justify-content:space-between; font-size:0.6rem; color:#64748b; font-family:monospace;">
        <span>Pele</span>
        <span>Músculo</span>
        <span>Osso</span>
        <span>Vasos</span>
        <span>Vísceras</span>
      </div>
    `;

    if (container) {
      container.appendChild(widget);

      const slider = widget.querySelector("#dissectionSlider");
      if (slider) {
        slider.addEventListener("input", (e) => setDissectionDepth(e.target.value));
      }

      const btnPins = widget.querySelector("#btnTogglePins");
      if (btnPins) {
        btnPins.addEventListener("click", () => {
          togglePinsVisibility();
          btnPins.style.color = arePinsVisible ? "#38bdf8" : "#64748b";
        });
      }
    }
  }

  // =========================================================================
  // 11. LOOP PRINCIPAL DE RENDERIZAÇÃO
  // =========================================================================
  function animate(now) {
    requestAnimationFrame(animate);

    updateCameraTween(now);
    updateRouteParticles();
    updatePhysioParticles();
    updatePinsPulse();
    updatePhysiopathologyAnimation();

    if (controls && typeof controls.update === "function") {
      controls.update();
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  // =========================================================================
  // API PÚBLICA EXPOSTA DO MOTOR
  // =========================================================================
  return {
    init,
    selectSystem,
    highlightOrgan,
    flashOrganFeedback,
    setOrganVisibility,
    setOrganOpacity,
    isolateOrgan,
    resetOrganTree,
    simulateAdministrationRoute,
    stopRouteSimulation,
    setCrisisMode,
    raycastHitOrgan,
    setDissectionDepth,
    togglePinsVisibility,
    triggerParticleFlow,
    stopParticles,
    tweenCamera,
    onWindowResize,
    getScene: () => scene,
    getCamera: () => camera,
    getBodyModel: () => bodyModel
  };
})();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", ThreeEngine.init);
} else {
  ThreeEngine.init();
}

/* ========================================================================= */
/* FIM DO ARQUIVO: anatomia-3d/js/three-engine.js                            */
/* ========================================================================= */
