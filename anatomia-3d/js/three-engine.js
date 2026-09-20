/* ========================================================================= */
/* ARQUIVO: anatomia-3d/js/three-engine.js                                   */
/* ========================================================================= */

/**
 * MOTOR GRÁFICO 3D MASTER: DISSECÇÃO EM 5 CAMADAS, HOTSPOTS & FISIOLOGIA
 * Ecossistema LAIFT - Módulo Master 3D
 * - Renderização WebGL via Three.js (r128) + DRACOLoader
 * - Dissecção Anatômica Virtual por Profundidade Tecidual:
 *     Nível 1: Pele ➔ Nível 2: Músculos ➔ Nível 3: Esqueleto ➔ Nível 4: Vasos ➔ Nível 5: Vísceras
 * - Hotspots / Pins Interativos 3D com Pulso Luminescente e Telemetria Semiomédica
 * - Câmera Cinematográfica Interpolada (Cubic Easing Tween)
 * - Sistema de Partículas para Trânsito Fisiológico e Hemodinâmica
 * - Manequim Vetorial Anatômico de Contingência (Resiliência Total)
 */

const ThreeEngine = (() => {
  // -------------------------------------------------------------------------
  // 1. VARIÁVEIS DE ESTADO E AMBIENTE THREE.JS
  // -------------------------------------------------------------------------
  let scene, camera, renderer, controls;
  let bodyModel = null;
  let hoveredMesh = null;
  let raycaster, mouse;

  // Sistema de Hotspots / Pins Flutuantes
  let pinsGroup = null;
  let pinsPulseTime = 0;
  let arePinsVisible = true;

  // Sistema de Partículas Fisiológicas
  let particleSystem = null;
  let particlePositions = null;
  let particleVelocities = null;
  let activeParticleAction = null;
  const PARTICLE_COUNT = 140;

  // Controle de Interpolação de Câmera (Tween)
  let isCameraTweening = false;
  let cameraStartPos = null;
  let cameraEndPos = null;
  let targetStartLook = null;
  let targetEndLook = null;
  let tweenStartTime = 0;
  const TWEEN_DURATION_MS = 800;

  // Camada de Dissecção Ativa (1: Pele a 5: Vísceras)
  let currentDissectionLevel = 5;

  // Elementos DOM
  let container, loadingOverlay, organHud, organNameEl;

  // Paleta Visual Biomédica
  const COLOR_HIGHLIGHT = 0x38bdf8;
  const COLOR_PIN_GLOW = 0x00e5ff;
  const COLOR_PIN_CORE = 0xffffff;
  const DEFAULT_EMISSIVE = 0x000000;

  // Definição Taxonômica das 5 Camadas de Dissecção
  const DISSECTION_LAYERS = {
    1: { id: "pele", nome: "Pele & Tegumento", keywords: ["skin", "integum", "derma", "epiderm"] },
    2: { id: "musculo", nome: "Musculatura", keywords: ["muscl", "tendon", "fascia", "myo", "bicep", "rectus", "pectoral"] },
    3: { id: "esqueleto", nome: "Esqueleto & Cartilagem", keywords: ["bone", "skelet", "cartilage", "rib", "spine", "femur", "skull", "vertebra", "clavicle", "pelvis"] },
    4: { id: "vasos", nome: "Vasos & Hemodinâmica", keywords: ["vessel", "arter", "vein", "aort", "vena_cava", "vascular", "capillar", "carotid"] },
    5: { id: "visceras", nome: "Vísceras & Órgãos", keywords: ["brain", "cerebr", "heart", "lung", "stomach", "liver", "kidney", "intestin", "pancrea", "spleen", "organ", "digest", "oral", "esophag", "bladder", "renal"] }
  };

  // Mapeamento Espacial de Hotspots / Pins Anatômicos
  const PIN_DEFINITIONS = [
    {
      id: "pin_brain",
      organKey: "brain",
      label: "Encéfalo (SNC)",
      sistema: "nervoso",
      pos: { x: 0, y: 1.76, z: 0.08 },
      cameraPos: { x: 0, y: 1.8, z: 1.1 },
      lookTarget: { x: 0, y: 1.75, z: 0 },
      descricao: "Centro de processamento superior; barreira hematoencefálica e densidade sináptica."
    },
    {
      id: "pin_heart",
      organKey: "heart",
      label: "Coração & Coronárias",
      sistema: "cardiovascular",
      pos: { x: 0.045, y: 1.26, z: 0.11 },
      cameraPos: { x: 0.15, y: 1.28, z: 1.0 },
      lookTarget: { x: 0.04, y: 1.25, z: 0 },
      descricao: "Bomba eletromecânica central, perfusão aórtica e receptores beta-1 adrenérgicos."
    },
    {
      id: "pin_lungs",
      organKey: "lung",
      label: "Pulmões & Alvéolos",
      sistema: "respiratorio",
      pos: { x: -0.11, y: 1.32, z: 0.09 },
      cameraPos: { x: -0.2, y: 1.35, z: 1.1 },
      lookTarget: { x: -0.1, y: 1.3, z: 0 },
      descricao: "Hematose alveolar, árvore brônquica e membrana de difusão de gases anestésicos."
    },
    {
      id: "pin_stomach",
      organKey: "stomach",
      label: "Estômago (Fundo & Antro)",
      sistema: "digestorio",
      pos: { x: -0.065, y: 1.05, z: 0.1 },
      cameraPos: { x: -0.18, y: 1.08, z: 1.0 },
      lookTarget: { x: -0.06, y: 1.02, z: 0 },
      descricao: "Secreção cloridropeptica, desnaturação protéica e esvaziamento para o duodeno."
    },
    {
      id: "pin_liver",
      organKey: "liver",
      label: "Fígado & Sistema Porta",
      sistema: "digestorio",
      pos: { x: 0.095, y: 1.06, z: 0.1 },
      cameraPos: { x: 0.22, y: 1.1, z: 1.05 },
      lookTarget: { x: 0.09, y: 1.04, z: 0 },
      descricao: "Metabolismo de primeira passagem, citocromo P450 (Fase I) e conjugação (Fase II)."
    },
    {
      id: "pin_kidneys",
      organKey: "kidney",
      label: "Rins & Néfrons",
      sistema: "urinario",
      pos: { x: 0.12, y: 0.94, z: -0.07 },
      cameraPos: { x: 0.25, y: 0.98, z: -0.85 },
      lookTarget: { x: 0.11, y: 0.93, z: 0 },
      descricao: "Ultrafiltração glomerular, depuração plasmática de xenobióticos e balanço hidroeletrolítico."
    }
  ];

  // =========================================================================
  // 2. INICIALIZAÇÃO E SETUP DO AMBIENTE
  // =========================================================================
  function init() {
    container = document.getElementById("canvas-3d-container");
    loadingOverlay = document.getElementById("loading-3d-overlay");
    organHud = document.getElementById("organ-hud");
    organNameEl = document.getElementById("organ-name");

    if (!container || typeof THREE === "undefined") {
      console.warn("[ThreeEngine] Three.js ou contêiner canvas não localizado.");
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

    // Sistema de Luz de Alta Fidelidade
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));

    const dirFront = new THREE.DirectionalLight(0xffffff, 0.85);
    dirFront.position.set(5, 10, 7);
    scene.add(dirFront);

    const dirRim = new THREE.DirectionalLight(0x38bdf8, 0.45);
    dirRim.position.set(-5, 5, -5);
    scene.add(dirRim);

    // OrbitControls
    if (typeof THREE.OrbitControls === "function") {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 0.7;
      controls.maxDistance = 6.0;
      controls.target.set(0, 1.0, 0);
    }

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Submódulos Visuais
    setupPhysiologicalParticles();
    setupPinsGroup();
    loadModelWithFallback();

    // Listeners Globais
    window.addEventListener("resize", onWindowResize);
    container.addEventListener("click", onSceneClick);
    container.addEventListener("touchstart", onTouchStart, { passive: true });

    if (window.ResizeObserver) {
      const observer = new ResizeObserver(() => onWindowResize());
      observer.observe(container);
    }

    // Injeção de Controles de Dissecção na UI se houver contêiner
    injectDissectionSliderUI();

    animate();
    console.log("[ThreeEngine] Motor Tridimensional Master Ativo.");
  }

  // =========================================================================
  // 3. CARREGAMENTO DE MALHAS & MANEQUIM DE CONTINGÊNCIA
  // =========================================================================
  function loadModelWithFallback() {
    if (typeof THREE.GLTFLoader !== "function") {
      console.warn("[ThreeEngine] GLTFLoader indisponível. Carregando Manequim Provisório.");
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
        console.warn("[ThreeEngine] Falha ao instanciar decodificador DRACO:", e);
      }
    }

    loader.load(
      "models/body.glb",
      (gltf) => {
        bodyModel = gltf.scene;
        bodyModel.position.set(0, 0, 0);

        // Habilita canal alfa transparente em todas as malhas para suporte a dissecção
        bodyModel.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.transparent = true;
            child.material.depthWrite = true;
            child.material.opacity = 1.0;
          }
        });

        scene.add(bodyModel);
        if (loadingOverlay) loadingOverlay.classList.add("hidden");
        setDissectionDepth(currentDissectionLevel);
        console.log("[ThreeEngine] Malha Z-Anatomy body.glb integrada.");
      },
      (xhr) => {
        if (loadingOverlay && xhr.total > 0) {
          const pct = Math.round((xhr.loaded / xhr.total) * 100);
          loadingOverlay.innerText = `Descomprimindo Atlas 3D... ${pct}%`;
        }
      },
      (err) => {
        console.warn("[ThreeEngine] body.glb ausente. Ativando Manequim Anatômico Provisório:", err);
        buildEmergencyMannequin();
        if (loadingOverlay) loadingOverlay.classList.add("hidden");
      }
    );
  }

  function buildEmergencyMannequin() {
    const group = new THREE.Group();
    group.name = "Emergency_Mannequin_Group";

    // 1. Pele / Contorno externo
    const matSkin = new THREE.MeshStandardMaterial({
      color: 0x334155,
      wireframe: true,
      transparent: true,
      opacity: 0.25
    });
    const skinMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 1.15, 16), matSkin);
    skinMesh.position.set(0, 1.05, 0);
    skinMesh.name = "mesh_skin_trunk";
    group.add(skinMesh);

    // 2. Musculatura
    const matMuscle = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      transparent: true,
      opacity: 0.85
    });
    const muscleMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.21, 1.1, 16), matMuscle);
    muscleMesh.position.set(0, 1.05, 0);
    muscleMesh.name = "mesh_muscle_pectoral";
    group.add(muscleMesh);

    // 3. Esqueleto (Caixa torácica / Crânio)
    const matBone = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.95
    });
    const headBone = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), matBone);
    headBone.position.set(0, 1.75, 0);
    headBone.name = "mesh_bone_skull_brain";
    group.add(headBone);

    const ribCage = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.19, 0.6, 12, 1, true), matBone);
    ribCage.position.set(0, 1.25, 0);
    ribCage.name = "mesh_skelet_ribs";
    group.add(ribCage);

    // 4. Vasos (Aorta e Cava)
    const matVessel = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0x7f1d1d,
      transparent: true,
      opacity: 0.95
    });
    const aorta = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 8), matVessel);
    aorta.position.set(0.01, 1.15, 0.02);
    aorta.name = "mesh_vessel_aorta";
    group.add(aorta);

    // 5. Vísceras Chave
    // Coração
    const matHeart = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x450a0a, transparent: true });
    const heart = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 14), matHeart);
    heart.position.set(0.045, 1.26, 0.08);
    heart.name = "mesh_organ_heart";
    group.add(heart);

    // Pulmões
    const matLung = new THREE.MeshStandardMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.7 });
    const lungL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), matLung);
    lungL.position.set(-0.11, 1.3, 0.05);
    lungL.name = "mesh_organ_lung";
    group.add(lungL);

    // Estômago
    const matStomach = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0x431407, transparent: true });
    const stomach = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), matStomach);
    stomach.position.set(-0.065, 1.05, 0.08);
    stomach.name = "mesh_organ_stomach";
    group.add(stomach);

    // Fígado
    const matLiver = new THREE.MeshStandardMaterial({ color: 0x854d0e, emissive: 0x422006, transparent: true });
    const liver = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.12), matLiver);
    liver.position.set(0.095, 1.06, 0.07);
    liver.name = "mesh_organ_liver";
    group.add(liver);

    // Rins
    const matKidney = new THREE.MeshStandardMaterial({ color: 0xeab308, emissive: 0x422006, transparent: true });
    const kidney = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), matKidney);
    kidney.position.set(0.11, 0.94, -0.06);
    kidney.name = "mesh_organ_kidney";
    group.add(kidney);

    bodyModel = group;
    scene.add(bodyModel);
    setDissectionDepth(currentDissectionLevel);
  }

  // =========================================================================
  // 4. MOTOR DE DISSECÇÃO POR PROFUNDIDADE TECIDUAL (1 A 5)
  // =========================================================================
  /**
   * Ajusta a visibilidade e opacidade das malhas conforme o nível de dissecção:
   * 1: Pele ➔ 2: Musculatura ➔ 3: Esqueleto ➔ 4: Vasos ➔ 5: Vísceras
   * @param {Number} targetDepth - Nível de 1 a 5
   */
  function setDissectionDepth(targetDepth) {
    currentDissectionLevel = Math.max(1, Math.min(5, parseInt(targetDepth, 10)));
    if (!bodyModel) return;

    bodyModel.traverse((child) => {
      if (!child.isMesh || !child.material) return;

      const name = (child.name || "").toLowerCase();
      const meshLayer = detectMeshLayer(name);

      // Regra de dissecção cirúrgica:
      // - Camadas mais externas que a camada alvo são desbastadas (ocultadas/invisíveis)
      // - A camada alvo ganha 100% de opacidade
      // - Camadas mais profundas permanecem visíveis por transparência anatômica
      if (meshLayer < currentDissectionLevel) {
        child.material.opacity = 0.0;
        child.material.transparent = true;
        child.visible = false;
      } else if (meshLayer === currentDissectionLevel) {
        child.visible = true;
        child.material.transparent = false;
        child.material.opacity = 1.0;
        if (child.material.emissive) child.material.emissiveIntensity = 0.15;
      } else {
        // Camadas mais internas
        child.visible = true;
        child.material.transparent = true;
        child.material.opacity = currentDissectionLevel === 5 ? 1.0 : 0.45;
        if (child.material.emissive) child.material.emissiveIntensity = 0.05;
      }
    });

    // Atualiza o indicador textual se existir no DOM
    const badge = document.getElementById("dissectionLevelBadge");
    if (badge && DISSECTION_LAYERS[currentDissectionLevel]) {
      badge.textContent = `Camada ${currentDissectionLevel}/5: ${DISSECTION_LAYERS[currentDissectionLevel].nome}`;
    }
  }

  function detectMeshLayer(meshName) {
    for (let layerNum = 1; layerNum <= 5; layerNum++) {
      const def = DISSECTION_LAYERS[layerNum];
      if (def.keywords.some((k) => meshName.includes(k))) {
        return layerNum;
      }
    }
    return 5; // Padrão para tecidos internos não classificados
  }

  // =========================================================================
  // 5. SISTEMA DE HOTSPOTS / PINS FLUTUANTES INTERATIVOS
  // =========================================================================
  function setupPinsGroup() {
    pinsGroup = new THREE.Group();
    pinsGroup.name = "Anatomical_Pins_Group";

    PIN_DEFINITIONS.forEach((pinDef) => {
      const pinAnchor = new THREE.Group();
      pinAnchor.position.set(pinDef.pos.x, pinDef.pos.y, pinDef.pos.z);
      pinAnchor.name = `anchor_${pinDef.id}`;

      // Núcleo luminoso esférico
      const coreMat = new THREE.MeshBasicMaterial({ color: COLOR_PIN_CORE });
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 12), coreMat);
      core.name = `pin_core_${pinDef.id}`;
      pinAnchor.add(core);

      // Halo pulsante exterior
      const haloMat = new THREE.MeshBasicMaterial({
        color: COLOR_PIN_GLOW,
        transparent: true,
        opacity: 0.6,
        wireframe: true
      });
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 10), haloMat);
      halo.name = `pin_halo_${pinDef.id}`;
      pinAnchor.add(halo);

      // Associa metadados ao objeto para identificação via Raycaster
      pinAnchor.userData = {
        isPin: true,
        pinData: pinDef
      };

      pinsGroup.add(pinAnchor);
    });

    scene.add(pinsGroup);
  }

  function updatePinsPulse(time) {
    if (!pinsGroup || !arePinsVisible) return;

    pinsPulseTime += 0.04;
    const scaleFactor = 1.0 + Math.sin(pinsPulseTime) * 0.28;
    const opacityFactor = 0.45 + (Math.sin(pinsPulseTime) + 1) * 0.25;

    pinsGroup.children.forEach((anchor) => {
      const halo = anchor.children[1];
      if (halo) {
        halo.scale.set(scaleFactor, scaleFactor, scaleFactor);
        halo.material.opacity = opacityFactor;
      }
    });
  }

  function togglePinsVisibility(forceState) {
    arePinsVisible = typeof forceState !== "undefined" ? forceState : !arePinsVisible;
    if (pinsGroup) pinsGroup.visible = arePinsVisible;
  }

  function activatePin(pinDef) {
    console.log(`[ThreeEngine] Hotspot acionado: ${pinDef.label}`);

    // 1. Move a câmera diretamente com foco cinematográfico no órgão
    tweenCamera(pinDef.cameraPos, pinDef.lookTarget);

    // 2. Destaca o órgão correspondente
    highlightOrgan(pinDef.organKey);

    // 3. Atualiza o HUD de telemetria
    if (organHud && organNameEl) {
      organNameEl.innerHTML = `
        <span style="color:#38bdf8;">📍 ${pinDef.label}</span>
        <div style="font-size:0.68rem; color:#94a3b8; margin-top:2px; font-weight:normal;">${pinDef.descricao}</div>
      `;
      organHud.classList.remove("hidden");
    }

    // 4. Integração: se o AtlasEngine estiver ativo, sincroniza a ficha do sistema
    if (typeof AtlasEngine !== "undefined" && typeof AtlasEngine.selectSystem === "function") {
      AtlasEngine.selectSystem(pinDef.sistema);
    }
  }

  // =========================================================================
  // 6. SISTEMA DE PARTÍCULAS FISIOLÓGICAS
  // =========================================================================
  function setupPhysiologicalParticles() {
    const geometry = new THREE.BufferGeometry();
    particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    particleVelocities = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particlePositions[i * 3 + 0] = 0;
      particlePositions[i * 3 + 1] = -20; // Fora da viewport
      particlePositions[i * 3 + 2] = 0;

      particleVelocities[i * 3 + 0] = (Math.random() - 0.5) * 0.002;
      particleVelocities[i * 3 + 1] = -0.006 - Math.random() * 0.004;
      particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xfacc15,
      size: 0.032,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });

    particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);
  }

  function triggerParticleFlow(actionType) {
    if (!particleSystem) return;
    activeParticleAction = actionType;
    particleSystem.material.opacity = 0.95;

    const pos = particlePositions;
    let baseY = 1.75;
    let spreadX = 0.05;
    let colorHex = 0xfacc15;

    if (actionType === "oral_cavity") {
      baseY = 1.74;
      colorHex = 0xfacc15; // Ptialina / Alimento
    } else if (actionType === "pharynx_transit") {
      baseY = 1.54;
      colorHex = 0xfb923c; // Trânsito faríngeo
    } else if (actionType === "esophagus_wave") {
      baseY = 1.38;
      colorHex = 0xf97316; // Peristaltismo
    } else if (actionType === "stomach_entry") {
      baseY = 1.05;
      spreadX = 0.12;
      colorHex = 0x34d399; // Quimo gástrico
    } else if (actionType === "aorta_flow") {
      baseY = 1.25;
      colorHex = 0xef4444; // Hemodinâmica arterial
    }

    particleSystem.material.color.setHex(colorHex);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * spreadX;
      pos[i * 3 + 1] = baseY + (Math.random() - 0.5) * 0.06;
      pos[i * 3 + 2] = 0.08 + (Math.random() - 0.5) * 0.03;
    }

    particleSystem.geometry.attributes.position.needsUpdate = true;
  }

  function stopParticles() {
    if (!particleSystem) return;
    activeParticleAction = null;
    particleSystem.material.opacity = 0.0;
  }

  function updateParticles() {
    if (!particleSystem || !activeParticleAction) return;

    const pos = particlePositions;
    const vel = particleVelocities;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3 + 0] += vel[i * 3 + 0];
      pos[i * 3 + 1] += vel[i * 3 + 1];
      pos[i * 3 + 2] += vel[i * 3 + 2];

      if (pos[i * 3 + 1] < 0.82) {
        pos[i * 3 + 1] = 1.72;
        pos[i * 3 + 0] = (Math.random() - 0.5) * 0.05;
      }
    }

    particleSystem.geometry.attributes.position.needsUpdate = true;
  }

  // =========================================================
  // 7. CÂMERA INTERPOLADA & SELEÇÃO DE SISTEMAS
  // =========================================================
  function selectSystem(systemId) {
    if (typeof ATLAS_DATABASE === "undefined") return;

    const sys = ATLAS_DATABASE.sistemas.find((s) => s.id === systemId);
    if (!sys) return;

    tweenCamera(sys.focoCamera, sys.targetLook);
    filterMeshesByKeywords(sys.meshKeywords);
  }

  function filterMeshesByKeywords(keywords) {
    if (!bodyModel) return;

    bodyModel.traverse((child) => {
      if (child.isMesh && child.material) {
        const name = child.name.toLowerCase();
        const matches = keywords.some((k) => name.includes(k.toLowerCase()));

        if (matches) {
          child.material.transparent = false;
          child.material.opacity = 1.0;
          if (child.material.emissive) child.material.emissiveIntensity = 0.25;
        } else {
          child.material.transparent = true;
          child.material.opacity = 0.12;
          if (child.material.emissive) child.material.emissiveIntensity = 0.0;
        }
      }
    });
  }

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

    const elapsed = now - tweenStartTime;
    const progress = Math.min(elapsed / TWEEN_DURATION_MS, 1.0);
    const ease = 1 - Math.pow(1 - progress, 3); // Cubic Ease-Out

    camera.position.lerpVectors(cameraStartPos, cameraEndPos, ease);
    controls.target.lerpVectors(targetStartLook, targetEndLook, ease);
    controls.update();

    if (progress >= 1.0) {
      isCameraTweening = false;
    }
  }

  // =========================================================
  // 8. RAYCASTING, HIGHLIGHT E INTERAÇÃO COM O USUÁRIO
  // =========================================================
  function highlightOrgan(organKey) {
    if (!bodyModel) return;
    let found = false;

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
          }, 3500);
        }
        found = true;
      }
    });

    return found;
  }

  function processInteraction(clientX, clientY) {
    if (!container || !camera) return;

    const rect = container.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // 1. Prioridade para toque em Hotspots / Pins flutuantes
    if (pinsGroup && arePinsVisible) {
      const pinIntersects = raycaster.intersectObjects(pinsGroup.children, true);
      if (pinIntersects.length > 0) {
        let rootAnchor = pinIntersects[0].object;
        while (rootAnchor.parent && rootAnchor.parent !== pinsGroup) {
          rootAnchor = rootAnchor.parent;
        }

        if (rootAnchor.userData && rootAnchor.userData.isPin) {
          activatePin(rootAnchor.userData.pinData);
          return;
        }
      }
    }

    // 2. Interação anatômica nas malhas do corpo
    if (!bodyModel) return;

    const targets = bodyModel.isGroup ? bodyModel.children : [bodyModel];
    const intersects = raycaster.intersectObjects(targets, true);

    if (intersects.length > 0) {
      const object = intersects[0].object;

      if (hoveredMesh && hoveredMesh !== object) {
        if (hoveredMesh.material && hoveredMesh.material.emissive) {
          hoveredMesh.material.emissive.setHex(DEFAULT_EMISSIVE);
        }
      }

      hoveredMesh = object;
      if (hoveredMesh.material && hoveredMesh.material.emissive) {
        hoveredMesh.material.emissive.setHex(COLOR_HIGHLIGHT);
        hoveredMesh.material.emissiveIntensity = 0.6;
      }

      if (organHud && organNameEl) {
        const cleanName = object.name.replace(/mesh_/g, "").replace(/_/g, " ").replace(/[0-9]/g, "").trim();
        organNameEl.innerText = cleanName || "Tecido Selecionado";
        organHud.classList.remove("hidden");
      }
    } else {
      if (hoveredMesh && hoveredMesh.material && hoveredMesh.material.emissive) {
        hoveredMesh.material.emissive.setHex(DEFAULT_EMISSIVE);
        hoveredMesh = null;
      }
      if (organHud) organHud.classList.add("hidden");
    }
  }

  function onSceneClick(e) {
    processInteraction(e.clientX, e.clientY);
  }

  function onTouchStart(e) {
    if (e.touches && e.touches.length > 0) {
      processInteraction(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

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

  // =========================================================
  // 9. CONTROLE DINÂMICO DE DISSECÇÃO NA UI
  // =========================================================
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

  // =========================================================
  // 10. LOOP DE ANIMAÇÃO
  // =========================================================
  function animate(now) {
    requestAnimationFrame(animate);

    updateCameraTween(now);
    updateParticles();
    updatePinsPulse(now);

    if (controls && typeof controls.update === "function") {
      controls.update();
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  // =========================================================================
  // EXPOSIÇÃO DA API PÚBLICA DO MOTOR
  // =========================================================================
  return {
    init,
    selectSystem,
    highlightOrgan,
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
