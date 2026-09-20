/* ========================================================================= */
/* ARQUIVO: anatomia-3d/js/three-engine.js                                   */
/* ========================================================================= */

/**
 * MOTOR GRÁFICO 3D MASTER: DISSECÇÃO, ÁRVORE DE ÓRGÃOS & SIMULAÇÃO DE VIAS
 * Ecossistema LAIFT - Módulo Master 3D / Bio-Twin
 * - Controle granular por órgão: setOrganVisibility(), setOrganOpacity() e isolateOrgan()
 * - Animação de fluxo farmacológico por curvas Spline 3D para as 7 Vias de Administração:
 *     1. Oral | 2. Intravenosa | 3. Intramuscular | 4. Nasal | 5. Tópica | 6. Ocular | 7. Otológica
 * - Hotspots/Pins interativos 3D com pulso e telemetria semiológica
 * - Dissecção virtual em 5 camadas: Pele -> Músculos -> Esqueleto -> Vasos -> Vísceras
 * - Sistema de partículas fisiológicas de trânsito (deglutição, ejeção, filtração)
 * - Manequim anatômico multicamadas de contingência com materiais dedicados
 */

const ThreeEngine = (() => {
  // -------------------------------------------------------------------------
  // 1. ESTADO E AMBIENTE THREE.JS
  // -------------------------------------------------------------------------
  let scene, camera, renderer, controls;
  let bodyModel = null;
  let hoveredMesh = null;
  let raycaster, mouse;

  // Sistema de Pins / Hotspots
  let pinsGroup = null;
  let pinsPulseTime = 0;
  let arePinsVisible = true;

  // Sistema de Partículas para as 7 Vias de Administração
  let routeCurve = null;
  let routeParticles = null;
  let routeParticlePositions = null;
  let routeParticleProgress = [];
  let isRouteActive = false;
  let activeRouteId = null;
  const ROUTE_PARTICLE_COUNT = 120;

  // Sistema de Partículas de Fisiologia Interna
  let physioParticles = null;
  let physioPositions = null;
  let physioVelocities = null;
  let activePhysioAction = null;
  const PHYSIO_PARTICLE_COUNT = 90;

  // Interpolação de Câmera (Tween)
  let isCameraTweening = false;
  let cameraStartPos = null;
  let cameraEndPos = null;
  let targetStartLook = null;
  let targetEndLook = null;
  let tweenStartTime = 0;
  const TWEEN_DURATION_MS = 850;

  // Camadas de Dissecção (1 a 5)
  let currentDissectionLevel = 5;

  // Dicionário de Estado Granular por Malha/Órgão
  const organStates = {};

  // Elementos DOM
  let container, loadingOverlay, organHud, organNameEl;

  // Paleta Visual Biomédica
  const COLOR_HIGHLIGHT = 0x38bdf8;
  const COLOR_PIN_CORE = 0xffffff;
  const COLOR_PIN_GLOW = 0x00e5ff;
  const DEFAULT_EMISSIVE = 0x000000;

  // Classificação Taxonômica das 5 Camadas de Dissecção
  const DISSECTION_LAYERS = {
    1: { id: "pele", nome: "Pele & Tegumento", keywords: ["skin", "integum", "derma", "epiderm", "pele"] },
    2: { id: "musculo", nome: "Musculatura", keywords: ["muscl", "tendon", "fascia", "myo", "bicep", "pectoral", "musculo", "diafragma"] },
    3: { id: "esqueleto", nome: "Esqueleto & Cartilagens", keywords: ["bone", "skelet", "cartilage", "rib", "spine", "skull", "femur", "esqueleto", "cranio", "costela", "vertebra"] },
    4: { id: "vasos", nome: "Vasos & Circulação", keywords: ["vessel", "arter", "vein", "aort", "cava", "vascular", "vaso", "jugular", "carotida"] },
    5: { id: "visceras", nome: "Vísceras & Órgãos", keywords: ["brain", "heart", "lung", "stomach", "liver", "kidney", "intestin", "pancrea", "spleen", "bladder", "coracao", "pulmao", "estomago", "figado", "rim", "encefalo", "vesicula", "laringe", "traqueia"] }
  };

  // Coordenadas Espaciais Nativas de Contingência para as 7 Vias Farmacológicas
  const DEFAULT_ROUTE_WAYPOINTS = {
    "ORAL": {
      nome: "Via Oral",
      cor: "#f59e0b",
      waypoints: [
        { x: 0.0, y: 1.74, z: 0.12 },
        { x: 0.0, y: 1.54, z: 0.06 },
        { x: -0.06, y: 1.05, z: 0.08 },
        { x: 0.02, y: 0.88, z: 0.07 },
        { x: 0.05, y: 0.98, z: 0.04 },
        { x: 0.09, y: 1.06, z: 0.06 },
        { x: 0.04, y: 1.25, z: 0.08 }
      ]
    },
    "INTRAVENOSA": {
      nome: "Via Intravenosa",
      cor: "#ef4444",
      waypoints: [
        { x: 0.32, y: 1.12, z: 0.05 },
        { x: 0.22, y: 1.22, z: 0.04 },
        { x: 0.08, y: 1.30, z: 0.05 },
        { x: 0.05, y: 1.25, z: 0.07 },
        { x: 0.0, y: 1.28, z: 0.04 },
        { x: 0.04, y: 1.24, z: 0.08 },
        { x: 0.02, y: 1.35, z: 0.05 }
      ]
    },
    "INTRAMUSCULAR": {
      nome: "Via Intramuscular",
      cor: "#a855f7",
      waypoints: [
        { x: 0.38, y: 1.35, z: 0.03 },
        { x: 0.28, y: 1.32, z: 0.04 },
        { x: 0.15, y: 1.30, z: 0.05 },
        { x: 0.05, y: 1.25, z: 0.07 },
        { x: 0.03, y: 1.32, z: 0.06 }
      ]
    },
    "NASAL": {
      nome: "Via Nasal",
      cor: "#06b6d4",
      waypoints: [
        { x: 0.0, y: 1.76, z: 0.15 },
        { x: 0.0, y: 1.75, z: 0.10 },
        { x: 0.0, y: 1.78, z: 0.07 },
        { x: 0.0, y: 1.82, z: 0.05 },
        { x: 0.03, y: 1.55, z: 0.04 }
      ]
    },
    "TOPICA": {
      nome: "Via Tópica & Transdérmica",
      cor: "#fbbf24",
      waypoints: [
        { x: 0.35, y: 0.95, z: 0.08 },
        { x: 0.34, y: 0.95, z: 0.06 },
        { x: 0.32, y: 0.96, z: 0.04 },
        { x: 0.22, y: 1.08, z: 0.04 },
        { x: 0.05, y: 1.25, z: 0.07 }
      ]
    },
    "OCULAR": {
      nome: "Via Ocular",
      cor: "#38bdf8",
      waypoints: [
        { x: -0.04, y: 1.78, z: 0.16 },
        { x: -0.035, y: 1.78, z: 0.14 },
        { x: -0.02, y: 1.75, z: 0.13 },
        { x: 0.0, y: 1.70, z: 0.10 }
      ]
    },
    "OTOLOGICA": {
      nome: "Via Otológica",
      cor: "#e2e8f0",
      waypoints: [
        { x: 0.16, y: 1.76, z: 0.02 },
        { x: 0.13, y: 1.75, z: 0.01 },
        { x: 0.10, y: 1.74, z: 0.00 }
      ]
    }
  };

  // Mapeamento de Pins Anatômicos Essenciais
  const PIN_DEFINITIONS = [
    {
      id: "pin_brain",
      organKey: "brain",
      label: "Encéfalo (SNC)",
      pos: { x: 0, y: 1.76, z: 0.08 },
      cam: { x: 0, y: 1.8, z: 1.1 },
      look: { x: 0, y: 1.75, z: 0 },
      descricao: "Centro integrador; barreira hematoencefálica (BHE) e densidade sináptica."
    },
    {
      id: "pin_heart",
      organKey: "heart",
      label: "Coração & Coronárias",
      pos: { x: 0.045, y: 1.26, z: 0.11 },
      cam: { x: 0.15, y: 1.28, z: 1.0 },
      look: { x: 0.04, y: 1.25, z: 0 },
      descricao: "Bomba mecânica sincicial quadricameral e distribuição hemodinâmica sistêmica."
    },
    {
      id: "pin_lungs",
      organKey: "lung",
      label: "Pulmões & Alvéolos",
      pos: { x: -0.11, y: 1.32, z: 0.09 },
      cam: { x: -0.2, y: 1.35, z: 1.1 },
      look: { x: -0.1, y: 1.3, z: 0 },
      descricao: "Hematose alveolar por difusão passiva de gases e leito vascular pulmonar."
    },
    {
      id: "pin_stomach",
      organKey: "stomach",
      label: "Estômago (Fundo/Antro)",
      pos: { x: -0.065, y: 1.05, z: 0.1 },
      cam: { x: -0.18, y: 1.08, z: 1.0 },
      look: { x: -0.06, y: 1.02, z: 0 },
      descricao: "Clivagem cloridropéptica (pH 1.5-2.0) e início da desnaturação proteica."
    },
    {
      id: "pin_liver",
      organKey: "liver",
      label: "Fígado & Sistema Porta",
      pos: { x: 0.095, y: 1.06, z: 0.1 },
      cam: { x: 0.22, y: 1.1, z: 1.05 },
      look: { x: 0.09, y: 1.04, z: 0 },
      descricao: "Metabolismo de primeira passagem, conjugação de Fase II e isoformas de CYP450."
    },
    {
      id: "pin_kidneys",
      organKey: "kidney",
      label: "Rins & Néfrons",
      pos: { x: 0.12, y: 0.94, z: -0.07 },
      cam: { x: 0.25, y: 0.98, z: -0.85 },
      look: { x: 0.11, y: 0.93, z: 0 },
      descricao: "Filtração glomerular, depuração de xenobióticos e reabsorção tubular seletiva."
    }
  ];

  // =========================================================================
  // 2. INICIALIZAÇÃO DO MOTOR
  // =========================================================================
  function init() {
    container = document.getElementById("canvas-3d-container");
    loadingOverlay = document.getElementById("loading-3d-overlay");
    organHud = document.getElementById("organ-hud");
    organNameEl = document.getElementById("organ-name");

    if (!container || typeof THREE === "undefined") {
      console.warn("[ThreeEngine] Three.js ou container canvas não encontrado.");
      return;
    }

    const width = container.clientWidth || 380;
    const height = container.clientHeight || 280;

    // Cena
    scene = new THREE.Scene();

    // Câmera
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 3.2);

    // Renderer WebGL
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    // Iluminação
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirFront = new THREE.DirectionalLight(0xffffff, 0.85);
    dirFront.position.set(5, 10, 7);
    scene.add(dirFront);

    const dirBack = new THREE.DirectionalLight(0x38bdf8, 0.45);
    dirBack.position.set(-5, 5, -5);
    scene.add(dirBack);

    // OrbitControls
    if (typeof THREE.OrbitControls === "function") {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 0.6;
      controls.maxDistance = 6.0;
      controls.target.set(0, 1.0, 0);
    }

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Submotores
    setupRouteParticleSystem();
    setupPhysioParticleSystem();
    setupPinsGroup();
    loadAnatomicalModel();

    // Listeners
    window.addEventListener("resize", onWindowResize);
    container.addEventListener("click", onSceneClick);
    container.addEventListener("touchstart", onTouchStart, { passive: true });

    if (window.ResizeObserver) {
      const observer = new ResizeObserver(() => onWindowResize());
      observer.observe(container);
    }

    // Injeção do Widget de Dissecção se não existir no HTML
    injectDissectionSliderUI();

    animate();
    console.log("[ThreeEngine] Motor Tridimensional Master Ativo.");
  }

  // =========================================================================
  // 3. CARREGAMENTO COM CACHE BINÁRIO & FALLBACK RESILIENTE
  // =========================================================================
  async function loadAnatomicalModel() {
    let modelSourceUrl = "models/body.glb";

    if (typeof ApiCache !== "undefined" && typeof ApiCache.obterModelo3DBinario === "function") {
      modelSourceUrl = await ApiCache.obterModelo3DBinario("z_anatomy_male_master", modelSourceUrl);
    }

    if (typeof THREE.GLTFLoader !== "function") {
      buildEmergencyMannequin();
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
      modelSourceUrl,
      (gltf) => {
        bodyModel = gltf.scene;
        bodyModel.position.set(0, 0, 0);

        bodyModel.traverse((child) => {
          if (child.isMesh && child.material) {
            // Clona materiais compartilhados para permitir controle de opacidade independente
            child.material = child.material.clone();
            child.material.transparent = true;
            child.material.depthWrite = true;
            child.material.opacity = 1.0;
            organStates[child.name] = { visible: true, opacity: 1.0 };
          }
        });

        scene.add(bodyModel);
        if (loadingOverlay) loadingOverlay.classList.add("hidden");
        setDissectionDepth(currentDissectionLevel);
        console.log("[ThreeEngine] Modelo carregado com controle de malhas ativado.");
      },
      (xhr) => {
        if (loadingOverlay && xhr.total > 0) {
          const pct = Math.round((xhr.loaded / xhr.total) * 100);
          loadingOverlay.innerText = `Carregando Malhas Anatômicas... ${pct}%`;
        }
      },
      () => {
        console.warn("[ThreeEngine] body.glb ausente. Carregando Manequim Anatômico Provisório.");
        buildEmergencyMannequin();
        if (loadingOverlay) loadingOverlay.classList.add("hidden");
      }
    );
  }

  function buildEmergencyMannequin() {
    const group = new THREE.Group();
    group.name = "Emergency_Anatomy_Group";

    // Camada 1: Pele
    const matSkin = new THREE.MeshStandardMaterial({
      color: 0x334155,
      wireframe: true,
      transparent: true,
      opacity: 0.22
    });
    const skin = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 1.15, 16), matSkin);
    skin.position.set(0, 1.05, 0);
    skin.name = "pele_tronco";
    group.add(skin);

    // Camada 2: Músculo
    const matMuscle = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      transparent: true,
      opacity: 0.85
    });
    const muscle = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.21, 1.1, 16), matMuscle);
    muscle.position.set(0, 1.05, 0);
    muscle.name = "musculo_peitoral";
    group.add(muscle);

    // Camada 3: Esqueleto
    const matBone = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.95
    });
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), matBone);
    skull.position.set(0, 1.75, 0);
    skull.name = "esqueleto_cranio_brain";
    group.add(skull);

    const ribCage = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.19, 0.6, 12, 1, true), matBone);
    ribCage.position.set(0, 1.25, 0);
    ribCage.name = "esqueleto_costelas";
    group.add(ribCage);

    // Camada 4: Vasos
    const matVessel = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0x7f1d1d,
      transparent: true,
      opacity: 0.95
    });
    const aorta = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 8), matVessel);
    aorta.position.set(0.01, 1.15, 0.02);
    aorta.name = "vasos_aorta";
    group.add(aorta);

    // Camada 5: Vísceras
    const matHeart = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x450a0a, transparent: true });
    const heart = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 14), matHeart);
    heart.position.set(0.045, 1.26, 0.08);
    heart.name = "coracao";
    group.add(heart);

    const matLung = new THREE.MeshStandardMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.75 });
    const lung = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), matLung);
    lung.position.set(-0.11, 1.3, 0.05);
    lung.name = "pulmoes";
    group.add(lung);

    const matStomach = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0x431407, transparent: true });
    const stomach = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), matStomach);
    stomach.position.set(-0.065, 1.05, 0.08);
    stomach.name = "estomago";
    group.add(stomach);

    const matLiver = new THREE.MeshStandardMaterial({ color: 0x854d0e, emissive: 0x422006, transparent: true });
    const liver = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.12), matLiver);
    liver.position.set(0.095, 1.06, 0.07);
    liver.name = "figado";
    group.add(liver);

    const matKidney = new THREE.MeshStandardMaterial({ color: 0xeab308, emissive: 0x422006, transparent: true });
    const kidney = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), matKidney);
    kidney.position.set(0.11, 0.94, -0.06);
    kidney.name = "rins";
    group.add(kidney);

    bodyModel = group;
    bodyModel.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        organStates[child.name] = { visible: true, opacity: child.material.opacity || 1.0 };
      }
    });

    scene.add(bodyModel);
    setDissectionDepth(currentDissectionLevel);
  }

  // =========================================================================
  // 4. CONTROLE GRANULAR DE ÓRGÃOS & OPACIDADE EM TEMPO REAL
  // =========================================================================
  function setOrganVisibility(organKey, isVisible) {
    if (!bodyModel) return;

    bodyModel.traverse((child) => {
      if (child.isMesh) {
        const name = child.name.toLowerCase();
        if (name.includes(organKey.toLowerCase())) {
          child.visible = isVisible;
          if (!organStates[child.name]) organStates[child.name] = {};
          organStates[child.name].visible = isVisible;
        }
      }
    });
  }

  function setOrganOpacity(organKey, opacityValue) {
    if (!bodyModel) return;
    const alpha = Math.max(0, Math.min(1, parseFloat(opacityValue)));

    bodyModel.traverse((child) => {
      if (child.isMesh && child.material) {
        const name = child.name.toLowerCase();
        if (name.includes(organKey.toLowerCase())) {
          child.material.transparent = alpha < 1.0;
          child.material.opacity = alpha;
          child.material.depthWrite = alpha > 0.2;
          child.visible = alpha > 0.005;

          if (!organStates[child.name]) organStates[child.name] = {};
          organStates[child.name].opacity = alpha;
        }
      }
    });
  }

  function isolateOrgan(organKey) {
    if (!bodyModel) return;

    bodyModel.traverse((child) => {
      if (child.isMesh && child.material) {
        const name = child.name.toLowerCase();
        if (name.includes(organKey.toLowerCase())) {
          child.visible = true;
          child.material.transparent = false;
          child.material.opacity = 1.0;
          child.material.depthWrite = true;
        } else {
          child.material.transparent = true;
          child.material.opacity = 0.08;
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

  // =========================================================================
  // 5. MOTOR DE SIMULAÇÃO DAS 7 VIAS DE ADMINISTRAÇÃO (SPLINE 3D)
  // =========================================================================
  function setupRouteParticleSystem() {
    const geom = new THREE.BufferGeometry();
    routeParticlePositions = new Float32Array(ROUTE_PARTICLE_COUNT * 3);
    routeParticleProgress = new Float32Array(ROUTE_PARTICLE_COUNT);

    for (let i = 0; i < ROUTE_PARTICLE_COUNT; i++) {
      routeParticlePositions[i * 3 + 0] = 0;
      routeParticlePositions[i * 3 + 1] = -20;
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

    // 1. Busca na base de dados global se carregada
    if (typeof ATLAS_DATABASE !== "undefined" && ATLAS_DATABASE.viasAdministracao && ATLAS_DATABASE.viasAdministracao[rId]) {
      waypointsData = ATLAS_DATABASE.viasAdministracao[rId].waypoints3D;
      corFluxo = ATLAS_DATABASE.viasAdministracao[rId].corFluxo || corFluxo;
    }

    // 2. Fallback interno nativo se a base não estiver carregada
    if (!waypointsData && DEFAULT_ROUTE_WAYPOINTS[rId]) {
      waypointsData = DEFAULT_ROUTE_WAYPOINTS[rId].waypoints;
      corFluxo = DEFAULT_ROUTE_WAYPOINTS[rId].cor;
    }

    if (!waypointsData || waypointsData.length < 2) {
      console.warn(`[ThreeEngine] Via farmacológica ${rId} sem pontos de rota.`);
      return;
    }

    activeRouteId = rId;
    isRouteActive = true;

    // Cria a curva de Bézier / Spline tridimensional contínua
    const vectors = waypointsData.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    routeCurve = new THREE.CatmullRomCurve3(vectors, false, "catmullrom", 0.35);

    routeParticles.material.color.set(corFluxo);
    routeParticles.material.opacity = 0.95;

    // Foco de câmera inicial na via de administração
    const startPoint = waypointsData[0];
    tweenCamera(
      { x: startPoint.x * 1.5, y: startPoint.y + 0.08, z: startPoint.z + 1.15 },
      { x: startPoint.x, y: startPoint.y, z: startPoint.z }
    );

    console.log(`[ThreeEngine] Trajetória farmacológica ativada: ${rId}`);
  }

  function updateRouteParticles() {
    if (!isRouteActive || !routeCurve || !routeParticles) return;

    const pos = routeParticlePositions;
    const speed = 0.0035;

    for (let i = 0; i < ROUTE_PARTICLE_COUNT; i++) {
      routeParticleProgress[i] += speed;
      if (routeParticleProgress[i] > 1.0) {
        routeParticleProgress[i] -= 1.0;
      }

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
  // 6. PARTÍCULAS FISIOLÓGICAS (TRÂNSITO & DEGLUTIÇÃO)
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
    const mat = new THREE.PointsMaterial({
      color: 0xfacc15,
      size: 0.032,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });

    physioParticles = new THREE.Points(geom, mat);
    scene.add(physioParticles);
  }

  function triggerParticleFlow(actionType) {
    if (!physioParticles) return;
    activePhysioAction = actionType;
    physioParticles.material.opacity = 0.95;

    let baseY = 1.74;
    let colorHex = 0xfacc15;

    if (actionType === "oral_cavity") { baseY = 1.74; colorHex = 0xfacc15; }
    else if (actionType === "pharynx_transit") { baseY = 1.54; colorHex = 0xfb923c; }
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
      if (pos[i * 3 + 1] < 0.85) {
        pos[i * 3 + 1] = 1.72;
      }
    }
    physioParticles.geometry.attributes.position.needsUpdate = true;
  }

  // =========================================================================
  // 7. PINS ANATÔMICOS & DISSECÇÃO EM 5 CAMADAS
  // =========================================================================
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
        const name = (child.name || "").toLowerCase();
        let meshLayer = 5;

        for (let l = 1; l <= 5; l++) {
          if (DISSECTION_LAYERS[l].keywords.some((k) => name.includes(k))) {
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
  // 8. CÂMERA TWEEN, INTERAÇÃO & RAYCASTING
  // =========================================================================
  function tweenCamera(targetPos, targetLook) {
    if (!camera || !controls) return;
    cameraStartPos = camera.position.clone();
    cameraEndPos = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
    targetStartLook = controls.target.clone();
    targetEndLook = new THREE.Vector3(targetLook.x, targetLook.y, targetLook.z);
    tweenStartTime = performance.now();
    isCameraTweening = true;
  }

  function updateCameraTween(now) {
    if (!isCameraTweening) return;
    const progress = Math.min((now - tweenStartTime) / TWEEN_DURATION_MS, 1.0);
    const ease = 1 - Math.pow(1 - progress, 3);

    camera.position.lerpVectors(cameraStartPos, cameraEndPos, ease);
    controls.target.lerpVectors(targetStartLook, targetEndLook, ease);
    controls.update();

    if (progress >= 1.0) isCameraTweening = false;
  }

  function selectSystem(systemId) {
    if (typeof ATLAS_DATABASE === "undefined") return;
    const sys = ATLAS_DATABASE.sistemas.find((s) => s.id === systemId);
    if (!sys) return;

    tweenCamera(sys.focoCamera, sys.targetLook);

    if (bodyModel) {
      bodyModel.traverse((child) => {
        if (child.isMesh && child.material) {
          const match = sys.meshKeywords.some((k) => child.name.toLowerCase().includes(k));
          child.material.transparent = !match;
          child.material.opacity = match ? 1.0 : 0.12;
        }
      });
    }
  }

  function highlightOrgan(organKey) {
    if (!bodyModel) return;
    bodyModel.traverse((child) => {
      if (child.isMesh && child.name && child.name.toLowerCase().includes(organKey.toLowerCase())) {
        if (hoveredMesh && hoveredMesh.material && hoveredMesh.material.emissive) {
          hoveredMesh.material.emissive.setHex(DEFAULT_EMISSIVE);
        }
        hoveredMesh = child;
        if (hoveredMesh.material && hoveredMesh.material.emissive) {
          hoveredMesh.material.emissive.setHex(COLOR_HIGHLIGHT);
          hoveredMesh.material.emissiveIntensity = 0.85;
          setTimeout(() => {
            if (hoveredMesh && hoveredMesh.material && hoveredMesh.material.emissive) {
              hoveredMesh.material.emissive.setHex(DEFAULT_EMISSIVE);
            }
          }, 3000);
        }
      }
    });
  }

  function processInteraction(clientX, clientY) {
    if (!container || !camera) return;
    const rect = container.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

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
            organNameEl.innerHTML = `<span style="color:#38bdf8;">📍 ${p.label}</span><div style="font-size:0.68rem; color:#94a3b8; font-weight:normal;">${p.descricao || ""}</div>`;
            organHud.classList.remove("hidden");
          }
          return;
        }
      }
    }

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
  // 9. WIDGET DE DISSECÇÃO NO CANVAS
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
        <span id="dissectionLevelBadge" style="font-size:0.7rem; font-weight:700; color:#38bdf8;">Camada 5/5: Vísceras & Órgãos</span>
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
        slider.addEventListener("input", (e) => {
          setDissectionDepth(e.target.value);
        });
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
  // 10. LOOP DE RENDERIZAÇÃO
  // =========================================================================
  function animate(now) {
    requestAnimationFrame(animate);

    updateCameraTween(now);
    updateRouteParticles();
    updatePhysioParticles();
    updatePinsPulse();

    if (controls && typeof controls.update === "function") {
      controls.update();
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  return {
    init,
    selectSystem,
    highlightOrgan,
    setOrganVisibility,
    setOrganOpacity,
    isolateOrgan,
    resetOrganTree,
    simulateAdministrationRoute,
    stopRouteSimulation,
    setDissectionDepth,
    togglePinsVisibility,
    triggerParticleFlow,
    stopParticles,
    tweenCamera,
    onWindowResize
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
