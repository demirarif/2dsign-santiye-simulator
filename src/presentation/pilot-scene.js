import { pilotLayout } from '../data/pilot-layout.js';
import { pilotProject } from '../data/pilot-project.js';
import { createRoomView } from './three/room-view.js';
import { createScaffoldView } from './three/scaffold-view.js';
import { createWorkerView } from './three/worker-view.js';

/**
 * ADIM 1: yalnızca mekân ve ölçek incelemesi. İskele seçimi bir model inceleme
 * kontrolüdür; takvimde iş ilerletmez. İş hareketleri sonraki adımlarda bağlanacak.
 * Ekranı oluştururken THREE bağımlılığını dışarıdan alırız.
 */
export function mountPilotScene(root, THREE) {
  const canvas = root.querySelector('.pilot-canvas');
  const stage = root.querySelector('.pilot-stage');
  const loading = root.querySelector('.pilot-loading');
  const yawInput = root.querySelector('.pilot-yaw');
  const zoomInput = root.querySelector('.pilot-zoom');
  const scaffoldInput = root.querySelector('.pilot-scaffold');
  const workerInput = root.querySelector('.pilot-worker');
  const detail = root.querySelector('.pilot-detail');
  const viewId = 'm2-blockout-v1';
  const allowedStages = new Set(Array.from(scaffoldInput.options, (option) => option.value));
  const defaults = { yaw: pilotLayout.camera.yaw, pitch: pilotLayout.camera.pitch, zoom: 1, scaffoldStage: 'ready', showWorker: true };
  let state = { ...defaults };
  let renderer, room, scaffold, worker, resizeObserver, mutationObserver;
  let frame = 0, disposed = false;
  const events = new AbortController();
  const on = (target, type, listener, options = {}) => target.addEventListener(type, listener, { ...options, signal: events.signal });
  const themeQuery = matchMedia('(prefers-color-scheme: dark)');
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const labels = {
    ready: 'Kurulu iskele', 'platform-set': 'Platform yerleşimi', braced: 'Çerçeve ve çaprazlar',
    'frames-set': 'Çerçeveler', 'base-set': 'Ayaklar', staged: 'İskele parçaları',
  };

  function applySaved(saved) {
    if (saved?.modelContent?.scene !== viewId) return;
    const ui = saved.privateContent ?? {};
    if (Number.isFinite(ui.yaw)) state.yaw = Math.atan2(Math.sin(ui.yaw), Math.cos(ui.yaw));
    if (Number.isFinite(ui.pitch)) state.pitch = clamp(ui.pitch, Math.PI / 9, Math.PI * 0.46);
    if (Number.isFinite(ui.zoom)) state.zoom = clamp(ui.zoom, 0.75, 1.7);
    if (allowedStages.has(saved.modelContent.scaffoldStage)) state.scaffoldStage = saved.modelContent.scaffoldStage;
    if (typeof saved.modelContent.showWorker === 'boolean') state.showWorker = saved.modelContent.showWorker;
  }
  function save() {
    window.openai?.setWidgetState?.({
      modelContent: { scene: viewId, scaffoldStage: state.scaffoldStage, showWorker: state.showWorker },
      privateContent: { yaw: state.yaw, pitch: state.pitch, zoom: state.zoom },
    })?.catch(() => {});
  }
  function syncControls() {
    const yaw = Math.round(Math.atan2(Math.sin(state.yaw), Math.cos(state.yaw)) * 180 / Math.PI);
    yawInput.value = String(yaw);
    zoomInput.value = String(Math.round(state.zoom * 100));
    root.querySelector('.pilot-yaw-value').value = `${yaw}°`;
    root.querySelector('.pilot-zoom-value').value = `${Math.round(state.zoom * 100)}%`;
    scaffoldInput.value = state.scaffoldStage;
    workerInput.checked = state.showWorker;
    const text = `${labels[state.scaffoldStage]} · alan ve ölçek önizlemesi`;
    if (detail.textContent !== text) detail.textContent = text;
    root.dataset.scaffoldStage = state.scaffoldStage;
    root.dataset.yaw = String(yaw);
    root.dataset.pitch = String(Math.round(state.pitch * 180 / Math.PI));
    root.dataset.zoom = String(Math.round(state.zoom * 100));
    root.dataset.workerVisible = String(state.showWorker);
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    events.abort();
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
    worker?.dispose();
    scaffold?.dispose();
    room?.dispose();
    renderer?.dispose();
  }

  try {
    applySaved(window.openai?.widgetState);
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-7, 7, 5, -5, 0.1, 80);
    const target = new THREE.Vector3(pilotLayout.camera.target.x, pilotLayout.camera.target.y, pilotLayout.camera.target.z);

    scene.add(new THREE.HemisphereLight(0xfff3de, 0x87958c, 1.85));
    const key = new THREE.DirectionalLight(0xffeed8, 3.4);
    key.position.set(-3, 10, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 30 });
    key.shadow.normalBias = 0.016;
    key.shadow.bias = -0.00008;
    key.target.position.set(0, 0, 0);
    scene.add(key, key.target);
    const fill = new THREE.DirectionalLight(0xd6e6ef, 1.1);
    fill.position.set(6, 7, -5);
    scene.add(fill);

    room = createRoomView(THREE, pilotLayout);
    scene.add(room.root);
    scaffold = createScaffoldView(THREE, { ...pilotLayout.scaffold, stage: state.scaffoldStage });
    scaffold.root.position.set(pilotLayout.scaffold.position.x, 0, pilotLayout.scaffold.position.z);
    scene.add(scaffold.root);
    worker = createWorkerView(THREE, pilotProject.workers.find((item) => item.id === pilotLayout.worker.id));
    worker.applyMotion({
      position: pilotLayout.worker.position, yawRadians: pilotLayout.worker.yawRadians,
      distanceMeters: 0, speedMetersPerSecond: 0, presentationSeconds: 0,
    });
    scene.add(worker.root);

    const corners = [];
    const extentX = pilotLayout.room.width / 2 + 0.35;
    const extentZ = pilotLayout.room.depth / 2 + 0.3;
    for (const x of [-extentX, extentX]) {
      for (const y of [-0.3, pilotLayout.room.wallHeight + 0.15]) {
        for (const z of [-extentZ, extentZ]) corners.push(new THREE.Vector3(x, y, z));
      }
    }
    function render() {
      frame = 0;
      if (disposed) return;
      if (!root.isConnected) { dispose(); return; }
      const width = stage.clientWidth, height = stage.clientHeight;
      if (!width || !height) return;
      const aspect = width / height;
      renderer.setSize(width, height, false);
      camera.position.set(
        target.x + Math.sin(state.yaw) * Math.cos(state.pitch) * 22,
        target.y + Math.sin(state.pitch) * 22,
        target.z + Math.cos(state.yaw) * Math.cos(state.pitch) * 22,
      );
      camera.lookAt(target);
      camera.updateMatrixWorld(true);
      let half = 0;
      for (const corner of corners) {
        const point = corner.clone().applyMatrix4(camera.matrixWorldInverse);
        half = Math.max(half, Math.abs(point.y), Math.abs(point.x) / aspect);
      }
      half *= 1.035 / state.zoom;
      camera.left = -half * aspect;
      camera.right = half * aspect;
      camera.top = half;
      camera.bottom = -half;
      camera.updateProjectionMatrix();
      room.setCutaway(state.yaw);
      room.setTheme(themeQuery.matches);
      scaffold.setStage(state.scaffoldStage);
      worker.root.visible = state.showWorker;
      renderer.render(scene, camera);
      root.dataset.drawCalls = String(renderer.info.render.calls);
      syncControls();
    }
    function requestRender() { if (!frame && !disposed) frame = requestAnimationFrame(render); }

    on(yawInput, 'input', () => { state.yaw = Number(yawInput.value) * Math.PI / 180; requestRender(); });
    on(yawInput, 'change', save);
    on(zoomInput, 'input', () => { state.zoom = Number(zoomInput.value) / 100; requestRender(); });
    on(zoomInput, 'change', save);
    on(scaffoldInput, 'change', () => { state.scaffoldStage = scaffoldInput.value; requestRender(); save(); });
    on(workerInput, 'change', () => { state.showWorker = workerInput.checked; requestRender(); save(); });
    let pointer = null;
    on(canvas, 'pointerdown', (event) => {
      if (pointer || event.button > 0) return;
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    });
    on(canvas, 'pointermove', (event) => {
      if (pointer?.id !== event.pointerId) return;
      state.yaw -= (event.clientX - pointer.x) * 0.008;
      state.pitch = clamp(state.pitch + (event.clientY - pointer.y) * 0.006, Math.PI / 9, Math.PI * 0.46);
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      requestRender();
    });
    const endDrag = (event) => { if (pointer?.id === event.pointerId) { pointer = null; save(); } };
    on(canvas, 'pointerup', endDrag);
    on(canvas, 'pointercancel', endDrag);
    on(canvas, 'wheel', (event) => {
      event.preventDefault();
      state.zoom = clamp(state.zoom * Math.exp(-event.deltaY * 0.001), 0.75, 1.7);
      requestRender();
      save();
    }, { passive: false });
    on(themeQuery, 'change', requestRender);
    on(window, 'openai:set_globals', (event) => { applySaved(event.detail?.globals?.widgetState); requestRender(); });
    on(window, 'pagehide', dispose);
    resizeObserver = new ResizeObserver(requestRender);
    resizeObserver.observe(stage);
    mutationObserver = new MutationObserver(() => { if (!root.isConnected) dispose(); });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    render();
    loading.hidden = true;
    root.dataset.ready = 'true';
    return { dispose };
  } catch (error) {
    dispose();
    loading.hidden = false;
    loading.textContent = `Çalışma alanı açılamadı: ${error.message}`;
    loading.setAttribute('role', 'alert');
    root.dataset.error = error.message;
    return { dispose };
  }
}
