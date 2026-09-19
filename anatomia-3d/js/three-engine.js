/* ========================================================================= */
/* ARQUIVO: anatomia-3d/js/three-engine.js                                   */
/* ========================================================================= */

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

    if (!container || typeof THREE === 'undefined') return;

    scene = new THREE.Scene();
    
    const width = container.clientWidth || 320;
    const height = container.clientHeight || 240;

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 3.2);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0x38bdf8, 0.35);
    backLight.position.set(-5, 5, -5);
    scene.add(backLight);

    // Verificação segura de OrbitControls
    if (typeof THREE.OrbitControls === 'function') {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 1;
      controls.maxDistance = 6;
      controls.target.set(0, 1, 0);
    }

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    loadModel();

    window.addEventListener('resize', onWindowResize);
    container.addEventListener('click', onMouseClick);
    container.addEventListener('touchstart', onTouchStart, { passive: true });

    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => onWindowResize());
      resizeObserver.observe(container);
    }

    animate();
  }

  function loadModel() {
    // Blindagem: Se GLTFLoader não carregou do CDN, entra direto em contingência
    if (typeof THREE.GLTFLoader !== 'function') {
      console.warn('[LAIFT 3D] GLTFLoader indisponível. Ativando Manequim Provisório.');
      if (loadingOverlay) loadingOverlay.classList.add('hidden');
      criarManequimDeEmergencia();
      return;
    }

    let loader;
    try {
      loader = new THREE.GLTFLoader();

      // Blindagem: Só instancia DRACOLoader se ele realmente existir como função
      if (typeof THREE.DRACOLoader === 'function') {
        const dracoLoader = new THREE.DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.1/');
        loader.setDRACOLoader(dracoLoader);
      }
    } catch (e) {
      console.warn('[LAIFT 3D] Falha ao configurar decodificador:', e);
      if (loadingOverlay) loadingOverlay.classList.add('hidden');
      criarManequimDeEmergencia();
      return;
    }

    loader.load(
      'models/body.glb',
      (gltf) => {
        bodyModel = gltf.scene;
        bodyModel.position.set(0, 0, 0);
        scene.add(bodyModel);
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
        console.log('[LAIFT 3D] Modelo GLTF/DRACO carregado com sucesso.');
      },
      undefined,
      (error) => {
        console.warn('[LAIFT 3D] body.glb não encontrado. Ativando Manequim Provisório.');
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
        criarManequimDeEmergencia();
      }
    );
  }

  function criarManequimDeEmergencia() {
    const group = new THREE.Group();

    const matCorpo = new THREE.MeshStandardMaterial({ color: 0x1e293b, wireframe: true });
    const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 1.1, 16), matCorpo);
    tronco.position.set(0, 1.05, 0);
    tronco.name = "tronco";
    group.add(tronco);

    const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), matCorpo);
    cabeca.position.set(0, 1.75, 0);
    cabeca.name = "brain_cerebro";
    group.add(cabeca);

    const matOrgao = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0f2442 });
    const orgao = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), matOrgao);
    orgao.position.set(0.04, 1.2, 0.1);
    orgao.name = "heart_coracao";
    group.add(orgao);

    bodyModel = group;
    scene.add(bodyModel);
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
        hoveredMesh.material.emissiveIntensity = 0.6;
      }

      if (organHud && organNameEl) {
        const cleanName = object.name.replace(/_/g, ' ').replace(/[0-9]/g, '').trim();
        organNameEl.innerText = cleanName || 'Tecido Selecionado';
        organHud.classList.remove('hidden');
      }
    } else {
      if (hoveredMesh && hoveredMesh.material && hoveredMesh.material.emissive) {
        hoveredMesh.material.emissive.setHex(DEFAULT_EMISSIVE);
        hoveredMesh = null;
      }
      if (organHud) organHud.classList.add('hidden');
    }
  }

  function onMouseClick(e) { processInteraction(e.clientX, e.clientY); }
  function onTouchStart(e) { if (e.touches.length > 0) processInteraction(e.touches[0].clientX, e.touches[0].clientY); }

  function onWindowResize() {
    if (!container || !renderer || !camera) return;
    const width = container.clientWidth || 320;
    const height = container.clientHeight || 240;
    if (width > 0 && height > 0) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    if (controls && typeof controls.update === 'function') controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  function highlightOrgan(organName) {
    if (!bodyModel) return;
    bodyModel.traverse((child) => {
      if (child.isMesh && child.name && child.name.toLowerCase().includes(organName.toLowerCase())) {
        if (hoveredMesh && hoveredMesh.material && hoveredMesh.material.emissive) {
          hoveredMesh.material.emissive.setHex(DEFAULT_EMISSIVE);
        }
        hoveredMesh = child;
        if (hoveredMesh.material && hoveredMesh.material.emissive) {
          hoveredMesh.material.emissive.setHex(HIGHLIGHT_COLOR);
          hoveredMesh.material.emissiveIntensity = 0.8;
        }
      }
    });
  }

  return { init, highlightOrgan, onWindowResize };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ThreeEngine.init);
} else {
  ThreeEngine.init();
}
