/* ========================================================================= */
/* INÍCIO DO ARQUIVO: anatomia-3d/js/three-engine.js                         */
/* ========================================================================= */

/**
 * MOTOR DE RENDERIZAÇÃO 3D E INTERAÇÃO ANATÓMICA
 * Utiliza Three.js com DRACOLoader para modelos otimizados (Z-Anatomy).
 */

const ThreeEngine = (() => {
  // Variáveis Core do WebGL
  let scene, camera, renderer, controls;
  let raycaster, mouse;
  let bodyModel = null;
  let hoveredMesh = null;
  
  // Elementos do DOM
  let container;
  let loadingOverlay;
  let organHud;
  let organNameEl;

  // Cor de destaque ao selecionar um órgão (Sky 400 da paleta LAIFT)
  const HIGHLIGHT_COLOR = 0x38bdf8;
  const DEFAULT_EMISSIVE = 0x000000;

  function init() {
    container = document.getElementById('canvas-3d-container');
    loadingOverlay = document.getElementById('loading-3d-overlay');
    organHud = document.getElementById('organ-hud');
    organNameEl = document.getElementById('organ-name');

    if (!container) return;

    // 1. Configuração da Cena e Câmera
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 1.2, 3.5); // Foco no tronco/cabeça por defeito

    // 2. Configuração do Renderizador (Otimizado para Mobile)
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limita a 2x para poupar bateria
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = false; // Desativado para performance mobile
    container.appendChild(renderer.domElement);

    // 3. Iluminação Clínica (Semelhante a um bloco operatório)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0x38bdf8, 0.3); // Luz de preenchimento azulada
    backLight.position.set(-5, 5, -5);
    scene.add(backLight);

    // 4. Controlos Orbitais (Navegação Touch/Mouse)
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1;
    controls.maxDistance = 6;
    controls.target.set(0, 1, 0); // Centro de rotação na pélvis/abdómen

    // 5. Inicialização do Raycaster (Para cliques nos órgãos)
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // 6. Carregamento do Modelo Anatómico
    loadModel();

    // 7. Listeners de Eventos
    window.addEventListener('resize', onWindowResize);
    container.addEventListener('click', onMouseClick);
    container.addEventListener('touchstart', onTouchStart, { passive: true });

    // 8. Iniciar Ciclo de Renderização
    animate();
  }

  function loadModel() {
    // Configuração do DRACOLoader para descomprimir o body.glb
    const dracoLoader = new THREE.DRACOLoader();
    // Utiliza o CDN público da Google para os descodificadores WASM
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.1/');

    const loader = new THREE.GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    // TODO: Ajustar o caminho para o body.glb no repositório final
    const modelPath = 'models/body.glb'; 

    loader.load(
      modelPath,
      (gltf) => {
        bodyModel = gltf.scene;
        
        // Ajuste de escala e posição (depende da origem do Z-Anatomy)
        bodyModel.position.set(0, 0, 0);
        bodyModel.scale.set(1, 1, 1);
        
        scene.add(bodyModel);

        if (loadingOverlay) {
          loadingOverlay.classList.add('hidden');
        }
        console.log('[LAIFT 3D] Modelo Anatómico DRACO carregado com sucesso.');
      },
      (xhr) => {
        if (loadingOverlay) {
          const percent = Math.round((xhr.loaded / xhr.total) * 100);
          loadingOverlay.innerText = `A Descomprimir Z-Anatomy... ${percent}%`;
        }
      },
      (error) => {
        console.error('[LAIFT 3D] Erro ao carregar modelo:', error);
        if (loadingOverlay) {
          loadingOverlay.innerText = 'Erro ao carregar anatomia. Verifique a ligação.';
        }
      }
    );
  }

  // --- Sistema de Interação (Raycasting) ---

  function processInteraction(clientX, clientY) {
    if (!bodyModel) return;

    const rect = container.getBoundingClientRect();
    
    // Normalização das coordenadas do rato/toque para WebGL (-1 a +1)
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Calcula interseções com os filhos do modelo
    const intersects = raycaster.intersectObject(bodyModel, true);

    if (intersects.length > 0) {
      const object = intersects[0].object;

      // Restaura o material do objeto anteriormente focado
      if (hoveredMesh && hoveredMesh !== object) {
        hoveredMesh.material.emissive.setHex(DEFAULT_EMISSIVE);
      }

      hoveredMesh = object;
      
      // Aplica brilho (emissive) à nova estrutura selecionada
      if (hoveredMesh.material && hoveredMesh.material.emissive) {
        hoveredMesh.material.emissive.setHex(HIGHLIGHT_COLOR);
        hoveredMesh.material.emissiveIntensity = 0.5;
      }

      // Atualiza o HUD com o nome da estrutura (assumindo que o GLTF preserva os nomes)
      if (organHud && organNameEl) {
        // Limpa nomes técnicos do GLTF (ex: "mesh_liver_01" -> "liver")
        const cleanName = object.name.replace(/_/g, ' ').replace(/[0-9]/g, '').trim();
        organNameEl.innerText = cleanName || 'Tecido Orgânico';
        organHud.classList.remove('hidden');
      }
    } else {
      // Clique no vazio: limpa a seleção
      if (hoveredMesh) {
        hoveredMesh.material.emissive.setHex(DEFAULT_EMISSIVE);
        hoveredMesh = null;
      }
      if (organHud) {
        organHud.classList.add('hidden');
      }
    }
  }

  function onMouseClick(event) {
    processInteraction(event.clientX, event.clientY);
  }

  function onTouchStart(event) {
    if (event.touches.length > 0) {
      processInteraction(event.touches[0].clientX, event.touches[0].clientY);
    }
  }

  function onWindowResize() {
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update(); // Necessário para o damping
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  // --- API Pública do Motor 3D ---
  
  function highlightOrgan(organName) {
    // Permite que o pk-engine destaque órgãos alvo remotamente
    if (!bodyModel) return;
    
    let found = false;
    bodyModel.traverse((child) => {
      if (child.isMesh && child.name.toLowerCase().includes(organName.toLowerCase())) {
        if (hoveredMesh) hoveredMesh.material.emissive.setHex(DEFAULT_EMISSIVE);
        hoveredMesh = child;
        hoveredMesh.material.emissive.setHex(HIGHLIGHT_COLOR);
        hoveredMesh.material.emissiveIntensity = 0.8;
        found = true;
      }
    });
    return found;
  }

  return {
    init,
    highlightOrgan
  };
})();

// Inicialização
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ThreeEngine.init);
} else {
  ThreeEngine.init();
}

/* ========================================================================= */
/* FIM DO ARQUIVO: anatomia-3d/js/three-engine.js                            */
/* ========================================================================= */
