import { cafeLayout, planToWorld } from '../data/cafe-layout.js';
import { pilotProject } from '../data/pilot-project.js';
import { formatWorkHour, referenceAreas, referenceSettings, referenceTasks, scheduleReferenceProgram } from '../data/reference-program.js';
import { createCafeView } from './three/cafe-view.js';
import { createLabelSprite } from './three/label-sprite.js';
import { createScaffoldView } from './three/scaffold-view.js';
import { createWorkerView, selectionFromObject } from './three/worker-view.js';

/**
 * Kafenin tamamı için inceleme sahnesi: 45° yörünge kamera, döndürme/yakınlaşma, alana
 * tıklayınca odaklanma ve referans programdan alan kartı. Takvim zamanına henüz bağlı
 * değildir; M2 iskele aşaması bir model inceleme kontrolüdür ve programda zaman ilerletmez.
 *
 * Görünüm durumu Codex sohbetinde widgetState'e, tarayıcıda sessionStorage'a yazılır
 * (canlı yenilemede açı korunur). Adres satırı ?zone=M2&yaw=135&pitch=40&zoom=150&tint=0
 * &worker=0&stage=braced ile başlangıç görünümü verilebilir; ekran görüntüleri bunu kullanır.
 */
export function mountCafeScene(root, THREE) {
  const query = (selector) => root.querySelector(selector);
  const canvas = query('.cafe-canvas');
  const stage = query('.cafe-stage');
  const loading = query('.cafe-loading');
  const panel = query('.cafe-panel');
  const yawInput = query('.cafe-yaw');
  const zoomInput = query('.cafe-zoom');
  const zoneInput = query('.cafe-zone');
  const tintInput = query('.cafe-tint');
  const workerInput = query('.cafe-worker');
  const scaffoldInput = query('.cafe-scaffold');
  const viewId = cafeLayout.id;
  const storageKey = `santiye-gorunum:${viewId}`;
  const zoneIds = cafeLayout.zones.map((zone) => zone.id);
  const tintById = new Map(cafeLayout.zones.map((zone) => [zone.id, zone.tint]));
  const areaById = new Map(referenceAreas.map((area) => [area.id, area]));
  const scheduleById = new Map(scheduleReferenceProgram().map((entry) => [entry.id, entry]));
  const programEnd = Math.max(...[...scheduleById.values()].map((entry) => entry.endHour));
  const allowedStages = new Set(Array.from(scaffoldInput.options, (option) => option.value));
  const themeQuery = matchMedia('(prefers-color-scheme: dark)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const normalizeAngle = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
  const limits = { pitch: [Math.PI / 9, Math.PI * 0.46], zoom: [0.75, 3] };
  const state = {
    yaw: cafeLayout.camera.yaw, pitch: cafeLayout.camera.pitch, zoom: 1,
    zoneId: null, tint: true, showWorker: true, scaffoldStage: 'ready',
  };
  let renderer;
  let cafe;
  let scaffold;
  let worker;
  let resizeObserver;
  let mutationObserver;
  let frame = 0;
  let disposed = false;
  let transition = null;
  let lastTheme = null;
  const events = new AbortController();
  const on = (target, type, listener, options = {}) => target.addEventListener(type, listener, { ...options, signal: events.signal });

  function apply(candidate) {
    if (!candidate || typeof candidate !== 'object') return;
    if (Number.isFinite(candidate.yaw)) state.yaw = normalizeAngle(candidate.yaw);
    if (Number.isFinite(candidate.pitch)) state.pitch = clamp(candidate.pitch, ...limits.pitch);
    if (Number.isFinite(candidate.zoom)) state.zoom = clamp(candidate.zoom, ...limits.zoom);
    if (candidate.zoneId === null || zoneIds.includes(candidate.zoneId)) state.zoneId = candidate.zoneId;
    if (typeof candidate.tint === 'boolean') state.tint = candidate.tint;
    if (typeof candidate.showWorker === 'boolean') state.showWorker = candidate.showWorker;
    if (allowedStages.has(candidate.scaffoldStage)) state.scaffoldStage = candidate.scaffoldStage;
  }
  function fromWidgetState(saved) {
    if (saved?.modelContent?.scene !== viewId) return null;
    return { ...saved.modelContent, ...(saved.privateContent ?? {}) };
  }
  function fromAddress() {
    const params = new URLSearchParams(location.search);
    const degrees = (name) => (params.has(name) && Number.isFinite(Number(params.get(name))) ? Number(params.get(name)) * Math.PI / 180 : undefined);
    const flag = (name) => (params.has(name) ? params.get(name) !== '0' : undefined);
    const zone = params.get('zone');
    return {
      yaw: degrees('yaw'), pitch: degrees('pitch'),
      zoom: params.has('zoom') ? Number(params.get('zoom')) / 100 : undefined,
      zoneId: zone === null ? undefined : (zoneIds.includes(zone) ? zone : null),
      tint: flag('tint'), showWorker: flag('worker'), scaffoldStage: params.get('stage') ?? undefined,
    };
  }
  function readSession() {
    try {
      return JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
    } catch {
      return null;
    }
  }
  function save() {
    const { yaw, pitch, zoom, ...model } = state;
    if (window.openai?.setWidgetState) {
      window.openai.setWidgetState({ modelContent: { scene: viewId, ...model }, privateContent: { yaw, pitch, zoom } })?.catch?.(() => {});
      return;
    }
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Gizli pencere veya engellenmiş depolama: görünüm yalnızca bu oturumda kalır.
    }
  }

  function element(tag, { className, text, attributes } = {}, children = []) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    for (const [name, value] of Object.entries(attributes ?? {})) node.setAttribute(name, value);
    node.append(...children);
    return node;
  }
  const hex = (value) => `#${value.toString(16).padStart(6, '0')}`;
  const squareMeters = (value) => `≈${Math.round(value).toLocaleString('tr-TR')} m²`;
  function timeRange(entry) {
    const start = formatWorkHour(entry.startHour);
    const end = formatWorkHour(entry.endHour, { end: true });
    const [startDay, startTime] = [start.slice(0, start.lastIndexOf(' ')), start.slice(start.lastIndexOf(' ') + 1)];
    const [endDay, endTime] = [end.slice(0, end.lastIndexOf(' ')), end.slice(end.lastIndexOf(' ') + 1)];
    return startDay === endDay ? `${startDay} ${startTime}–${endTime}` : `${start} → ${end}`;
  }
  const place = (id) => (id === 'OUT' ? `dış sevk (${referenceSettings.logisticsEntryAreaId} üzerinden)` : id);
  function zoneTasks(zoneId) {
    return referenceTasks
      .filter((task) => task.areaId === zoneId)
      .map((task) => ({ task, entry: scheduleById.get(task.id) }))
      .sort((left, right) => left.entry.startHour - right.entry.startHour);
  }
  function renderPanel() {
    if (!state.zoneId) {
      const list = element('ul', { className: 'cafe-zone-list' }, zoneIds.map((id) => {
        const button = element('button', { attributes: { type: 'button', 'data-zone': id } }, [
          element('span', { className: 'cafe-swatch', attributes: { style: `--zone:${hex(tintById.get(id))}` } }),
          element('span', {}, [element('strong', { text: id }), ` ${areaById.get(id)?.name ?? ''}`]),
          element('span', { className: 'cafe-count tabular-nums', text: `${zoneTasks(id).length} iş` }),
        ]);
        return element('li', {}, [button]);
      }));
      panel.replaceChildren(
        element('p', { className: 'cafe-eyebrow', text: 'Tüm kafe' }),
        element('h2', { text: `${zoneIds.length} alan · ${referenceTasks.length} iş · ${Math.ceil(programEnd / referenceSettings.workdayHours)} gün` }),
        element('p', { className: 'text-small text-muted', text: `İç mekân ${squareMeters(cafe.floorAreas.interior)}, teras ${squareMeters(cafe.floorAreas.terrace)}. Ölçüler paftadan yaklaşık; mobilyalar referans yerleşimdir.` }),
        list,
        element('p', { className: 'text-small text-muted', text: 'Bir alana sahnede tıklayın ya da listeden seçin.' }),
      );
      return;
    }
    const zone = cafe.zones.get(state.zoneId);
    const area = areaById.get(state.zoneId);
    const tasks = zoneTasks(state.zoneId);
    const back = element('button', { className: 'cafe-back', text: '← Tüm kafe', attributes: { type: 'button' } });
    panel.replaceChildren(
      back,
      element('p', { className: 'cafe-eyebrow', text: `${state.zoneId} · ${squareMeters(zone.areaSquareMeters)}` }),
      element('h2', { text: area?.name ?? state.zoneId }),
      element('dl', {}, [
        element('dt', { text: 'Başlangıç' }), element('dd', { text: area?.before ?? '—' }),
        element('dt', { text: 'Hedef son durum' }), element('dd', { text: area?.after ?? '—' }),
      ]),
      element('h3', { text: `Bu alandaki işler (${tasks.length})` }),
      element('ol', { className: 'cafe-tasks', attributes: { style: `--zone:${hex(tintById.get(state.zoneId))}` } }, tasks.map(({ task, entry }) => element('li', {}, [
        element('span', { className: 'cafe-task-time', text: timeRange(entry) }),
        element('span', { text: task.label }),
        element('span', {
          className: 'cafe-task-meta',
          text: `${task.team} · ${task.people} kişi${task.kind === 'move' ? ` · ${place(task.from)} → ${place(task.to)}` : ''}`,
        }),
      ]))),
    );
  }
  function setZone(zoneId, now = performance.now()) {
    if (zoneId === state.zoneId) return;
    transition = { fromTarget: view.target.clone(), fromHalf: view.half, start: now, duration: reducedMotion.matches ? 0 : 560 };
    state.zoneId = zoneId;
    state.zoom = 1;
    cafe.setSelectedZone(zoneId);
    renderPanel();
    save();
    requestRender();
  }

  function syncControls() {
    const yaw = Math.round(normalizeAngle(state.yaw) * 180 / Math.PI);
    const zoom = Math.round(state.zoom * 100);
    yawInput.value = String(yaw);
    zoomInput.value = String(zoom);
    query('.cafe-yaw-value').value = `${yaw}°`;
    query('.cafe-zoom-value').value = `${zoom}%`;
    zoneInput.value = state.zoneId ?? '';
    tintInput.checked = state.tint;
    workerInput.checked = state.showWorker;
    scaffoldInput.value = state.scaffoldStage;
    Object.assign(root.dataset, {
      zone: state.zoneId ?? 'tum', yaw: String(yaw), pitch: String(Math.round(state.pitch * 180 / Math.PI)), zoom: String(zoom),
      tint: String(state.tint), workerVisible: String(state.showWorker), scaffoldStage: state.scaffoldStage,
    });
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
    cafe?.dispose();
    renderer?.dispose();
  }

  const view = { target: null, half: 10 };
  try {
    apply(fromWidgetState(window.openai?.widgetState) ?? readSession());
    apply(fromAddress());
    for (const id of zoneIds) zoneInput.append(new Option(`${id} · ${areaById.get(id)?.name ?? ''}`, id));

    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 220);
    view.target = new THREE.Vector3();

    scene.add(new THREE.HemisphereLight(0xfff3de, 0x87958c, 1.9));
    const key = new THREE.DirectionalLight(0xffeed8, 3.2);
    key.position.set(-14, 30, 18);
    key.castShadow = true;
    key.shadow.mapSize.set(4096, 4096);
    Object.assign(key.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 90 });
    key.shadow.normalBias = 0.02;
    key.shadow.bias = -0.0001;
    scene.add(key, key.target);
    const fill = new THREE.DirectionalLight(0xd6e6ef, 1.05);
    fill.position.set(16, 14, -12);
    scene.add(fill);

    cafe = createCafeView(THREE, cafeLayout, {
      createLabel: (zoneId, { detailed }) => createLabelSprite(THREE, { code: zoneId, name: detailed ? areaById.get(zoneId)?.name ?? '' : '' }),
    });
    scene.add(cafe.root);
    const scaffoldAt = planToWorld(cafeLayout.scaffold.at);
    scaffold = createScaffoldView(THREE, { ...cafeLayout.scaffold, stage: state.scaffoldStage });
    scaffold.root.position.set(scaffoldAt.x, 0, scaffoldAt.z);
    scene.add(scaffold.root);
    const workerAt = planToWorld(cafeLayout.worker.at);
    worker = createWorkerView(THREE, pilotProject.workers.find((item) => item.id === cafeLayout.worker.id));
    worker.applyMotion({
      position: { x: workerAt.x, y: 0, z: workerAt.z }, yawRadians: cafeLayout.worker.yawRadians,
      distanceMeters: 0, speedMetersPerSecond: 0, presentationSeconds: 0,
    });
    scene.add(worker.root);
    cafe.setSelectedZone(state.zoneId);
    cafe.setTint(state.tint);

    const corners = (bounds, low, high) => {
      const result = [];
      for (const x of [bounds.minX, bounds.maxX]) for (const y of [low, high]) for (const z of [bounds.minZ, bounds.maxZ]) result.push(new THREE.Vector3(x, y, z));
      return result;
    };
    const grow = (bounds, margin) => ({ minX: bounds.minX - margin, maxX: bounds.maxX + margin, minZ: bounds.minZ - margin, maxZ: bounds.maxZ + margin });
    function orient(target) {
      const distance = 70;
      camera.position.set(
        target.x + Math.sin(state.yaw) * Math.cos(state.pitch) * distance,
        target.y + Math.sin(state.pitch) * distance,
        target.z + Math.cos(state.yaw) * Math.cos(state.pitch) * distance,
      );
      camera.lookAt(target);
      camera.updateMatrixWorld(true);
    }
    // Genel bakış kafenin dış dikdörtgenine değil gerçek L biçimine sığdırılır.
    const overviewPoints = [...cafeLayout.outline, ...cafeLayout.terrace].flatMap((point) => {
      const { x, z } = planToWorld(point);
      return [new THREE.Vector3(x, -0.3, z), new THREE.Vector3(x, cafeLayout.wallHeight + 0.2, z)];
    });
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    /** Görünüm düzleminde içeriği ortalayan hedef ve yarım yükseklik. */
    function goalView(aspect) {
      const zone = state.zoneId ? cafe.zones.get(state.zoneId) : null;
      const bounds = zone ? grow(zone.bounds, 1.6) : cafe.bounds;
      const points = zone ? corners(bounds, 0, cafeLayout.wallHeight + 0.2) : overviewPoints;
      const center = new THREE.Vector3((bounds.minX + bounds.maxX) / 2, zone ? 0.8 : 0.5, (bounds.minZ + bounds.maxZ) / 2);
      orient(center);
      let [minX, maxX, minY, maxY] = [Infinity, -Infinity, Infinity, -Infinity];
      const point = new THREE.Vector3();
      for (const source of points) {
        point.copy(source).applyMatrix4(camera.matrixWorldInverse);
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      up.setFromMatrixColumn(camera.matrixWorld, 1);
      const target = center.addScaledVector(right, (minX + maxX) / 2).addScaledVector(up, (minY + maxY) / 2);
      return { target, half: Math.max((maxY - minY) / 2, (maxX - minX) / 2 / aspect) * (zone ? 1.03 : 1.06) };
    }

    function render(now = performance.now()) {
      frame = 0;
      if (disposed) return;
      if (!root.isConnected) { dispose(); return; }
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      if (!width || !height) return;
      const aspect = width / height;
      renderer.setSize(width, height, false);
      const goal = goalView(aspect);
      let animating = false;
      if (transition) {
        const t = transition.duration ? clamp((now - transition.start) / transition.duration, 0, 1) : 1;
        const eased = t * t * (3 - 2 * t);
        view.target.lerpVectors(transition.fromTarget, goal.target, eased);
        view.half = transition.fromHalf + (goal.half - transition.fromHalf) * eased;
        if (t >= 1) transition = null;
        else animating = true;
      } else {
        view.target.copy(goal.target);
        view.half = goal.half;
      }
      orient(view.target);
      const half = view.half / state.zoom;
      Object.assign(camera, { left: -half * aspect, right: half * aspect, top: half, bottom: -half });
      camera.updateProjectionMatrix();
      if (lastTheme !== themeQuery.matches) {
        lastTheme = themeQuery.matches;
        cafe.setTheme(lastTheme);
      }
      cafe.setCutaway(state.yaw);
      const labelHeight = half * 2 * 0.042;
      for (const zone of cafe.zones.values()) {
        for (const sprite of Object.values(zone.labels ?? {})) sprite.scale.set(labelHeight * sprite.userData.aspect, labelHeight, 1);
      }
      scaffold.setStage(state.scaffoldStage);
      worker.root.visible = state.showWorker;
      renderer.render(scene, camera);
      root.dataset.drawCalls = String(renderer.info.render.calls);
      syncControls();
      if (animating) requestRender();
    }
    function requestRender() {
      if (!frame && !disposed) frame = requestAnimationFrame(render);
    }
    function nudge(change) {
      Object.assign(state, change(state));
      state.yaw = normalizeAngle(state.yaw);
      state.pitch = clamp(state.pitch, ...limits.pitch);
      state.zoom = clamp(state.zoom, ...limits.zoom);
      requestRender();
    }

    on(yawInput, 'input', () => nudge(() => ({ yaw: Number(yawInput.value) * Math.PI / 180 })));
    on(yawInput, 'change', save);
    on(zoomInput, 'input', () => nudge(() => ({ zoom: Number(zoomInput.value) / 100 })));
    on(zoomInput, 'change', save);
    on(zoneInput, 'change', () => setZone(zoneInput.value || null));
    on(tintInput, 'change', () => { state.tint = tintInput.checked; cafe.setTint(state.tint); requestRender(); save(); });
    on(workerInput, 'change', () => { state.showWorker = workerInput.checked; requestRender(); save(); });
    on(scaffoldInput, 'change', () => { state.scaffoldStage = scaffoldInput.value; requestRender(); save(); });
    on(panel, 'click', (event) => {
      const zoneButton = event.target.closest('[data-zone]');
      if (zoneButton) setZone(zoneButton.dataset.zone);
      else if (event.target.closest('.cafe-back')) setZone(null);
    });

    const raycaster = new THREE.Raycaster();
    const pointerPosition = new THREE.Vector2();
    function zoneAt(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      pointerPosition.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointerPosition, camera);
      const hit = raycaster.intersectObjects(cafe.pickables, false)[0];
      const selection = hit ? selectionFromObject(hit.object) : null;
      return selection?.kind === 'area' ? selection.id : null;
    }
    let pointer = null;
    let hoverFrame = 0;
    on(canvas, 'pointerdown', (event) => {
      if (pointer || event.button > 0) return;
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, dragged: false };
      canvas.setPointerCapture(event.pointerId);
    });
    on(canvas, 'pointermove', (event) => {
      if (pointer?.id === event.pointerId) {
        if (!pointer.dragged && Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 5) {
          pointer.dragged = true;
          canvas.classList.add('is-dragging');
        }
        if (pointer.dragged) {
          const dx = event.clientX - pointer.x;
          const dy = event.clientY - pointer.y;
          nudge(({ yaw, pitch }) => ({ yaw: yaw - dx * 0.008, pitch: pitch + dy * 0.006 }));
        }
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        return;
      }
      if (event.pointerType !== 'mouse' || hoverFrame) return;
      const { clientX, clientY } = event;
      hoverFrame = requestAnimationFrame(() => {
        hoverFrame = 0;
        canvas.classList.toggle('is-pointing', zoneAt(clientX, clientY) !== null);
      });
    });
    const endPointer = (event) => {
      if (pointer?.id !== event.pointerId) return;
      const clicked = !pointer.dragged && event.type === 'pointerup';
      pointer = null;
      canvas.classList.remove('is-dragging');
      if (clicked) {
        const zoneId = zoneAt(event.clientX, event.clientY);
        if (zoneId) setZone(zoneId);
      } else {
        save();
      }
    };
    on(canvas, 'pointerup', endPointer);
    on(canvas, 'pointercancel', endPointer);
    on(canvas, 'wheel', (event) => {
      event.preventDefault();
      nudge(({ zoom }) => ({ zoom: zoom * Math.exp(-event.deltaY * 0.0012) }));
      save();
    }, { passive: false });
    on(canvas, 'keydown', (event) => {
      const step = Math.PI / 24;
      const actions = {
        ArrowLeft: () => nudge(({ yaw }) => ({ yaw: yaw + step })),
        ArrowRight: () => nudge(({ yaw }) => ({ yaw: yaw - step })),
        ArrowUp: () => nudge(({ pitch }) => ({ pitch: pitch + step / 2 })),
        ArrowDown: () => nudge(({ pitch }) => ({ pitch: pitch - step / 2 })),
        '+': () => nudge(({ zoom }) => ({ zoom: zoom * 1.15 })),
        '=': () => nudge(({ zoom }) => ({ zoom: zoom * 1.15 })),
        '-': () => nudge(({ zoom }) => ({ zoom: zoom / 1.15 })),
        Escape: () => setZone(null),
      };
      if (!actions[event.key]) return;
      event.preventDefault();
      actions[event.key]();
      save();
    });
    on(themeQuery, 'change', requestRender);
    on(window, 'openai:set_globals', (event) => {
      const saved = fromWidgetState(event.detail?.globals?.widgetState);
      if (!saved) return;
      const previousZone = state.zoneId;
      apply(saved);
      if (state.zoneId !== previousZone) {
        cafe.setSelectedZone(state.zoneId);
        renderPanel();
      }
      cafe.setTint(state.tint);
      requestRender();
    });
    on(window, 'pagehide', dispose);
    resizeObserver = new ResizeObserver(requestRender);
    resizeObserver.observe(stage);
    mutationObserver = new MutationObserver(() => { if (!root.isConnected) dispose(); });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    renderPanel();
    render();
    loading.hidden = true;
    root.dataset.ready = 'true';
    return { dispose };
  } catch (error) {
    dispose();
    loading.hidden = false;
    loading.textContent = `Kafe sahnesi açılamadı: ${error.message}`;
    loading.setAttribute('role', 'alert');
    root.dataset.error = error.message;
    return { dispose };
  }
}
