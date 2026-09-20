/* ========================================================================= */
/* ARQUIVO: anatomia-3d/js/three-engine.js                                   */
/* ========================================================================= */

/**
 * MOTOR GRÁFICO 3D, CAMADAS ANATÔMICAS & SISTEMA DE PARTÍCULAS
 * Ecossistema LAIFT - Módulo Master 3D
 * - Renderização Three.js (r128) com DRACOLoader
 * - Isolamento e transparência dinâmica dos 10 sistemas anatômicos
 * - Transições suaves de câmera (Tweening)
 * - Sistema de partículas fisiológicas (Deglutição, Hemodinâmica, Néfrons)
 * - Raycasting para seleção direta de órgãos e tecidos
 */

const ThreeEngine = (() => {
  // Variáveis Core do WebGL
  let scene, camera, renderer, controls;
  let bodyModel = null;
  let hoveredMesh = null;
  let raycaster, mouse;

  // Sistema de Partículas Fisiológicas
  let particleSystem = null;
  let particlePositions = null;
  let particleVelocities = null;
  let activeParticleAction = null;
  const PARTICLE_COUNT = 120;

  // Controle de Interpolação de Câmera (Tween)
  let isCameraTweening = false;
  let cameraStartPos = null;
  let cameraEndPos = null;
  let targetStartLook = null;
  let targetEndLook = null;
  let tweenStartTime = 0;
  const TWEEN_DURATION_MS = 750;

  // Elementos do DOM
  let container, loadingOverlay, organHud, organNameEl;

  // Paleta Visual de Destaque
  const HIGHLIGHT_COLOR = 0x38bdf8;
  const DEFAULT_EMISSIVE = 0x000000;

  // =========================================================================
  // 1. INICIALIZAÇÃO DO MOTOR
  // =========================================================================
  function init() {
    container = document.getElementById("canvas-3d-container");
    loadingOverlay = document.getElementById("loading-3d-overlay");
    organHud = document.getElementById("organ-hud");
    organNameEl = document.getElementById("organ-name");

    if (!container || typeof THREE === "undefined") {
      console.warn("[ThreeEngine] Contêiner DOM ou Three.js indisponível.");
      return;
    }

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 280;

    // Cena
    scene = new THREE.Scene();

    // Câmera Perspectiva
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 3.2);

    // Renderizador WebGL
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    // Iluminação Tripla de Estúdio Clínico
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLightFront = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLightFront.position.set(5, 10, 7);
    scene.add(dirLightFront);

    const dirLightBack = new THREE.DirectionalLight(0x38bdf8, 0.4);
    dirLightBack.position.set(-5, 5, -5);
    scene.add(dirLightBack);

    // Controles Orbitais
    if (typeof THREE.OrbitControls === "function") {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 0.8;
      controls.maxDistance = 6.0;
      controls.target.set(0, 1.0, 0);
    }

    // Raycaster e Coordenadas
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Inicialização dos Submotores
    setupPhysiologicalParticles();
    loadAnatomicalModel();

    // Listeners de Redimensionamento e Interação
    window.addEventListener("resize", onWindowResize);
    container.addEventListener("click", onSceneClick);
    container.addEventListener("touchstart", onTouchStart, { passive: true });

    if (window.ResizeObserver) {
      const observer = new ResizeObserver(() => onWindowResize());
      observer.observe(container);
    }

    // Início do Loop de Renderização
    animate();
    console.log("[ThreeEngine] Motor Tridimensional Ativo e Calibrado.");
  }

  // =========================================================================
  // 2. CARREGAMENTO COM FALLBACK BLINDADO (GLTF / DRACO)
  // =========================================================================
  function loadAnatomicalModel() {
    if (typeof THREE.GLTFLoader !== "function") {
      console.warn("[ThreeEngine] GLTFLoader ausente. Ativando Manequim Provisório.");
      criarManequimDeEmergencia();
      if (loadingOverlay) loadingOverlay.classList.add("hidden");
      return;
    }

    const loader = new THREE.GLTFLoader();

    if (typeof THREE.DRACOLoader === "function") {
      try {
        const dracoLoader = new THREE.DRACOLoader();
        dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.4.1/");
        loader.setDRACOLoader(dracoLoader);
      } catch (e) {
        console.warn("[ThreeEngine] Falha ao configurar DRACO:", e);
      }
    }

    loader.load(
      "models/body.glb",
      (gltf) => {
        bodyModel = gltf.scene;
        bodyModel.position.set(0, 0, 0);

        // Habilita canal de transparência em todos os materiais carregados
        bodyModel.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.transparent = true;
            child.material.opacity = 1.0;
          }
        });

        scene.add(bodyModel);
        if (loadingOverlay) loadingOverlay.classList.add("hidden");
        console.log("[ThreeEngine] Malhas do body.glb carregadas com sucesso.");
      },
      (xhr) => {
        if (loadingOverlay && xhr.total > 0) {
          const pct = Math.round((xhr.loaded / xhr.total) * 100);
          loadingOverlay.innerText = `Carregando Malhas 3D... ${pct}%`;
        }
      },
      (err) => {
        console.warn("[ThreeEngine] body.glb ausente. Carregando Manequim Anatômico Provisório:", err);
        criarManequimDeEmergencia();
        if (loadingOverlay) loadingOverlay.classList.add("hidden");
      }
    );
  }

  function criarManequimDeEmergencia() {
    const group = new THREE.Group();
    const matWire = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      wireframe: true,
      transparent: true,
      opacity: 0.85
    });

    // Tronco e abdômen
    const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 1.1, 16), matWire);
    tronco.position.set(0, 1.05, 0);
    tronco.name = "mesh_trunk_digest";
    group.add(tronco);

    // Cabeça
    const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), matWire);
    cabeca.position.set(0, 1.75, 0);
    cabeca.name = "mesh_head_brain";
    group.add(cabeca);

    // Coração (Cardiovascular)
    const matHeart = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x450a0a,
      transparent: true,
      opacity: 1.0
    });
    const heart = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 14), matHeart);
    heart.position.set(0.04, 1.25, 0.08);
    heart.name = "mesh_heart";
    group.add(heart);

    // Estômago (Digestório)
    const matStomach = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0x431407,
      transparent: true,
      opacity: 1.0
    });
    const stomach = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 14), matStomach);
    stomach.position.set(-0.06, 1.0, 0.08);
    stomach.name = "mesh_stomach";
    group.add(stomach);

    // Rins (Urinário)
    const matKidney = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      emissive: 0x422006,
      transparent: true,
      opacity: 1.0
    });
    const kidneyR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), matKidney);
    kidneyR.position.set(0.12, 0.95, -0.06);
    kidneyR.name = "mesh_kidney";
    group.add(kidneyR);

    bodyModel = group;
    scene.add(bodyModel);
  }

  // =========================================================================
  // 3. SISTEMA DE PARTÍCULAS FISIOLÓGICAS (TRÂNSITO E DINÂMICA)
  // =========================================================================
  function setupPhysiologicalParticles() {
    const geometry = new THREE.BufferGeometry();
    particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    particleVelocities = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particlePositions[i * 3 + 0] = 0;
      particlePositions[i * 3 + 1] = -10; // Inicia fora da tela
      particlePositions[i * 3 + 2] = 0;

      particleVelocities[i * 3 + 0] = (Math.random() - 0.5) * 0.002;
      particleVelocities[i * 3 + 1] = -0.005 - Math.random() * 0.004;
      particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xfacc15,
      size: 0.035,
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

    particleSystem.material.opacity = 0.9;
    const pos = particlePositions;

    // Calibração espacial das partículas conforme o processo fisiológico
    let baseY = 1.75;
    let spreadX = 0.05;
    let colorHex = 0xfacc15; // Dourado padrão (Alimento)

    if (actionType === "oral_cavity") {
      baseY = 1.75;
      colorHex = 0xfacc15;
    } else if (actionType === "pharynx_transit") {
      baseY = 1.55;
      colorHex = 0xfb923c;
    } else if (actionType === "esophagus_wave") {
      baseY = 1.40;
      colorHex = 0xf97316;
    } else if (actionType === "stomach_entry") {
      baseY = 1.05;
      spreadX = 0.12;
      colorHex = 0x34d399;
    } else if (actionType === "atria_to_ventricle" || actionType === "aorta_flow") {
      baseY = 1.25;
      colorHex = 0xef4444; // Vermelho arterial
    } else if (actionType === "glomerular_filter") {
      baseY = 0.95;
      colorHex = 0x38bdf8; // Azul ultrafiltrado
    }

    particleSystem.material.color.setHex(colorHex);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * spreadX;
      pos[i * 3 + 1] = baseY + (Math.random() - 0.5) * 0.08;
      pos[i * 3 + 2] = 0.08 + (Math.random() - 0.5) * 0.04;
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

      // Reciclagem da partícula dentro do fluxo
      if (pos[i * 3 + 1] < 0.85) {
        pos[i * 3 + 1] = 1.7;
        pos[i * 3 + 0] = (Math.random() - 0.5) * 0.06;
      }
    }

    particleSystem.geometry.attributes.position.needsUpdate = true;
  }

  // =========================================================================
  // 4. FILTRAGEM DE SISTEMAS & INTERPOLAÇÃO DE CÂMERA (MACRO)
  // =========================================================================
  function selectSystem(systemId) {
    if (typeof ATLAS_DATABASE === "undefined") return;

    const sys = ATLAS_DATABASE.sistemas.find((s) => s.id === systemId);
    if (!sys) return;

    // Move a câmera para o ponto anatômico de melhor visualização
    tweenCamera(sys.focoCamera, sys.targetLook);

    // Isola as malhas do sistema selecionado
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
          if (child.material.emissive) {
            child.material.emissiveIntensity = 0.2;
          }
        } else {
          // Efeito Raio-X dos sistemas circundantes
          child.material.transparent = true;
          child.material.opacity = 0.12;
          if (child.material.emissive) {
            child.material.emissiveIntensity = 0.0;
          }
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

    // Função de atenuação suave (Cubic Ease Out)
    const ease = 1 - Math.pow(1 - progress, 3);

    camera.position.lerpVectors(cameraStartPos, cameraEndPos, ease);
    controls.target.lerpVectors(targetStartLook, targetEndLook, ease);
    controls.update();

    if (progress >= 1.0) {
      isCameraTweening = false;
    }
  }

  // =========================================================================
  // 5. SELEÇÃO DIRETA & HIGHLIGHT DE ÓRGÃOS
  // =========================================================================
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
          hoveredMesh.material.emissive.setHex(HIGHLIGHT_COLOR);
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
    if (!bodyModel) return;

    const rect = container.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

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
        hoveredMesh.material.emissive.setHex(HIGHLIGHT_COLOR);
        hoveredMesh.material.emissiveIntensity = 0.7;
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
    const width = container.clientWidth || 360;
    const height = container.clientHeight || 280;

    if (width > 0 && height > 0) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
  }

  function animate(now) {
    requestAnimationFrame(animate);

    updateCameraTween(now);
    updateParticles();

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
