/* ========================================================================= */
/* INÍCIO DO ARQUIVO: anatomia-3d/js/three-engine.js                         */
/* ========================================================================= */

/**
 * MOTOR DE RENDERIZAÇÃO 3D E INTERAÇÃO ANATÓMICA
 * Utiliza Three.js com DRACOLoader para modelos otimizados (Z-Anatomy).
 * Inclui Fallback automático caso o ficheiro body.glb esteja ausente.
 */

const ThreeEngine = (() => {
  let scene, camera, renderer, controls;
  let raycaster, mouse;
  let bodyModel = null;
  let hoveredMesh = null;
  
  let container, loadingOverlay, organHud, organNameEl;

  const HIGHLIGHT_COLOR = 0x38bdf8;
  const DEFAULT_EMISSIVE = 0x000000;

  function init() {
    container = document.getElementById('canvas-3d-container');
    loadingOverlay = document.getElementById('loading-3d-overlay');
    organHud = document.getElementById('organ-hud');
    organNameEl = document.getElementById('organ-name');

    if (!container) return;

    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 1.2, 3.5);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0x38bdf8, 0.3);
    backLight.position.set(-5, 5, -5);
    scene.add(backLight);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1;
    controls.maxDistance = 6;
    controls.target.set(0, 1, 0);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    loadModel();

    window.addEventListener('resize', onWindowResize);
    container.addEventListener('click', onMouseClick);
    container.addEventListener('touchstart', onTouchStart, { passive: true });

    animate();
  }

  function loadModel() {
    const dracoLoader = new THREE.DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.1/');

    const loader = new THREE.GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    const modelPath = 'models/body.glb'; 

    loader.load(
      modelPath,
      (gltf) => {
        bodyModel = gltf.scene;
        bodyModel.position.set(0, 0, 0);
        scene.add(bodyModel);

        if (loadingOverlay) loadingOverlay.classList.add('hidden');
        console.log('[LAIFT 3D] Modelo Anatómico DRACO carregado com sucesso.');
      },
      (xhr) => {
        if (loadingOverlay && xhr.total > 0) {
          const percent = Math.round((xhr.loaded / xhr.total) * 100);
          loadingOverlay.innerText = `A Descomprimir Z-Anatomy... ${percent}%`;
        }
      },
      (error) => {
        console.error('[LAIFT 3D] Erro ao carregar modelo 3D (Arquivo Ausente):', error);
        
        // GRACEFUL DEGRADATION: Oculta o overlay de loading congelado e exibe aviso
        if (loadingOverlay) {
          loadingOverlay.innerHTML = `
            <div style="text-align: center; color: #f87171; padding: 12px; background: rgba(0,0,0,0.6); border-radius: 8px;">
              <p>⚠️ <strong>Modelo 3D Ausente</strong></p>
              <p style="font-size: 0.75rem; color: #cbd5e1; margin-top: 4px;">Faça o upload do arquivo "body.glb" na pasta models/</p>
            </div>
          `;
          // Remove o overlay após 4 segundos para não bloquear a UI
          setTimeout(() => loadingOverlay.classList.add('hidden'), 4000);
        }

        // Adiciona um manequim provisório (Cápsula) para a tela não ficar vazia
        criarManequimDeEmergencia();
      }
    );
  }

  // Cria uma cápsula básica que simula o corpo humano caso o ficheiro não exista
  function criarManequimDeEmergencia() {
    const geometry = new THREE.CapsuleGeometry(0.4, 1.2, 4, 16);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x1e293b, 
      wireframe: true, 
      emissive: 0x000000 
    });
    bodyModel = new THREE.Mesh(geometry, material);
    bodyModel.position.set(0, 1, 0);
    bodyModel.name = "Manequim_Provisorio";
    scene.add(bodyModel);
    console.log('[LAIFT 3D] Manequim de emergência ativado.');
  }

  function processInteraction(clientX, clientY) {
    if (!bodyModel) return;

    const rect = container.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    
    // Se o modelo for um grupo (como o GLTF), testa os filhos. Se for o manequim, testa a própria malha.
    const targets = bodyModel.isGroup ? bodyModel.children : [bodyModel];
    const intersects = raycaster.intersectObjects(targets, true);

    if (intersects.length > 0) {
      const object = intersects[0].object;

      if (hoveredMesh && hoveredMesh !== object) {
        if (hoveredMesh.material) hoveredMesh.material.emissive.setHex(DEFAULT_EMISSIVE);
      }

      hoveredMesh = object;
      
      if (hoveredMesh.material && hoveredMesh.material.emissive) {
        hoveredMesh.material.emissive.setHex(HIGHLIGHT_COLOR);
        hoveredMesh.material.emissiveIntensity = 0.5;
      }

      if (organHud && organNameEl) {
        const cleanName = object.name.replace(/_/g, ' ').replace(/[0-9]/g, '').trim();
        organNameEl.innerText = cleanName || 'Tecido Orgânico';
        organHud.classList.remove('hidden');
      }
    } else {
      if (hoveredMesh) {
        if (hoveredMesh.material) hoveredMesh.material.emissive.setHex(DEFAULT_EMISSIVE);
        hoveredMesh = null;
      }
      if (organHud) organHud.classList.add('hidden');
    }
  }

  function onMouseClick(event) { processInteraction(event.clientX, event.clientY); }
  function onTouchStart(event) { if (event.touches.length > 0) processInteraction(event.touches[0].clientX, event.touches[0].clientY); }

  function onWindowResize() {
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  function highlightOrgan(organName) {
    if (!bodyModel) return;
    
    let found = false;
    bodyModel.traverse((child) => {
      // Evita o erro se o child for um manequim sem nome ou material complexo
      if (child.isMesh && child.name && child.name.toLowerCase().includes(organName.toLowerCase())) {
        if (hoveredMesh && hoveredMesh.material) hoveredMesh.material.emissive.setHex(DEFAULT_EMISSIVE);
        hoveredMesh = child;
        if (hoveredMesh.material) {
          hoveredMesh.material.emissive.setHex(HIGHLIGHT_COLOR);
          hoveredMesh.material.emissiveIntensity = 0.8;
        }
        found = true;
      }
    });
    
    // Fallback: se não achar o órgão específico e estiver a usar o manequim provisório
    if (!found && bodyModel.name === "Manequim_Provisorio") {
      if (hoveredMesh && hoveredMesh.material) hoveredMesh.material.emissive.setHex(DEFAULT_EMISSIVE);
      hoveredMesh = bodyModel;
      hoveredMesh.material.emissive.setHex(HIGHLIGHT_COLOR);
      hoveredMesh.material.emissiveIntensity = 0.8;
    }
    
    return found;
  }

  return { init, highlightOrgan };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ThreeEngine.init);
} else {
  ThreeEngine.init();
}

/* ========================================================================= */
/* FIM DO ARQUIVO: anatomia-3d/js/three-engine.js                            */
/* ========================================================================= */
