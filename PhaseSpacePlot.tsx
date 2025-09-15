import { memo, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { useProjectStore } from '../../stores/projectStore';
import { industrialTheme } from '../../config/theme';
import './PhaseSpacePlot.css';

/**
 * A React component for rendering a 3D phase space plot of ECG signal using delay embedding.
 * Based on the MATLAB algorithm's phase space visualization approach.
 * @component
 */
export type PatchDTO = {
  id: number;
  main: [number, number, number];
  u: [number, number, number];
  v: [number, number, number];
};

export type PhaseSpacePlotHandle = {
  addPatch: (center?: { x: number; y: number; z: number }) => number | null;
  deleteSelectedPatch: () => void;
  clearSelection: () => void;
  getPatches: () => PatchDTO[];
  setPatches: (patches: PatchDTO[]) => void;
  focusOnTrajectory: () => void;
};

type ExternalControls = {
  signal?: Float32Array | Float64Array | number[]; // 单通道信号
  displayStartPosition?: number; // 1-based，与现有 store 保持一致
  displayEndPosition?: number;   // 1-based
  tau?: number;
};

type PhaseSpacePlotProps = {
  debug?: boolean; // 开启调试编辑功能（点组/补丁的增删改查）
  external?: ExternalControls; // 可选：外部以 props 方式控制相空间输入
  onPatchesChange?: (patches: PatchDTO[]) => void; // 可选：补丁变化回调
};

const PhaseSpacePlotComponent = ({ debug = false, external, onPatchesChange }: PhaseSpacePlotProps, ref: any) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const lineRef = useRef<THREE.Line | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const gizmoRef = useRef<TransformControls | null>(null);
  const boundsRef = useRef<{ minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number } | null>(null);

  // Patch(补丁/点组)编辑相关
  type Patch = {
    id: number;
    points: { main: THREE.Sprite; u: THREE.Sprite; v: THREE.Sprite };
    lines: { u: THREE.Line; v: THREE.Line };
    quad: THREE.Mesh;
    objects: THREE.Object3D[]; // 用于统一加入scene与拾取
  };
  const patchesRef = useRef<Map<number, Patch>>(new Map());
  const patchIdCounterRef = useRef(0);
  const selectedPatchRef = useRef<Patch | null>(null);
  const whiteCircleTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const cameraWorldPosRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const pointWorldPosRef = useRef<THREE.Vector3>(new THREE.Vector3());

  const baseColors = {
    main: new THREE.Color('#ff6b6b'),
    u: new THREE.Color('#4d96ff'),
    v: new THREE.Color('#51cf66'),
    line: new THREE.Color('#aaaaaa'),
    quad: new THREE.Color('#ffffff'),
  } as const;
  const highlightColor = new THREE.Color('#ffdd59');

  const createWhiteCircleTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    return tex;
  };

  const createPoint = (position: THREE.Vector3, patchId: number, role: keyof typeof baseColors) => {
    if (!whiteCircleTextureRef.current) whiteCircleTextureRef.current = createWhiteCircleTexture();
    const mat = new THREE.SpriteMaterial({
      map: whiteCircleTextureRef.current,
      color: baseColors[role].clone(),
      transparent: true,
      alphaTest: 0.01,
    });
    const point = new THREE.Sprite(mat);
    point.position.copy(position);
    const SPRITE_SIZE = 0.3 / 4;
    point.scale.set(SPRITE_SIZE, SPRITE_SIZE, 1);
    point.userData = { type: 'point', patchId, role };
    return point;
  };

  const updatePatchGeometry = (patch: Patch) => {
    const { main, u, v } = patch.points;
    // 更新线
    patch.lines.u.geometry.setFromPoints([main.position, u.position]);
    patch.lines.v.geometry.setFromPoints([main.position, v.position]);
    // 更新平行四边形
    const p4 = new THREE.Vector3().addVectors(u.position, v.position).sub(main.position);
    const positions = new Float32Array([
      ...main.position.toArray(),
      ...u.position.toArray(),
      ...p4.toArray(),
      ...v.position.toArray(),
    ]);
    const indices = [0, 1, 2, 0, 2, 3];
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    patch.quad.geometry.dispose();
    patch.quad.geometry = geom;
  };

  const clearSelection = () => {
    const patch = selectedPatchRef.current;
    if (!patch) return;
    Object.values(patch.points).forEach(p => (p.material as THREE.SpriteMaterial).color.copy(baseColors[p.userData.role as keyof typeof baseColors]));
    Object.values(patch.lines).forEach(l => (l.material as THREE.LineBasicMaterial).color.copy(baseColors.line));
    (patch.quad.material as THREE.MeshBasicMaterial).opacity = 0.15;
    if (gizmoRef.current) gizmoRef.current.detach();
    selectedPatchRef.current = null;
  };

  const setSelection = (patch: Patch, clickedObject?: THREE.Object3D) => {
    if (selectedPatchRef.current && selectedPatchRef.current.id === patch.id) {
      if (clickedObject && clickedObject.userData.type === 'point' && gizmoRef.current?.object !== clickedObject) {
        gizmoRef.current?.attach(clickedObject as THREE.Object3D);
      }
      return;
    }
    clearSelection();
    selectedPatchRef.current = patch;
    Object.values(patch.points).forEach(p => (p.material as THREE.SpriteMaterial).color.copy(highlightColor));
    Object.values(patch.lines).forEach(l => (l.material as THREE.LineBasicMaterial).color.copy(highlightColor));
    (patch.quad.material as THREE.MeshBasicMaterial).opacity = 0.4;
    const targetPoint = clickedObject && clickedObject.userData.type === 'point' ? clickedObject : patch.points.main;
    gizmoRef.current?.attach(targetPoint);
  };

  const deletePatch = (patchId: number) => {
    const patch = patchesRef.current.get(patchId);
    if (!patch || !sceneRef.current) return;
    if (selectedPatchRef.current?.id === patchId) clearSelection();
    patch.objects.forEach(obj => {
      sceneRef.current!.remove(obj);
      const anyObj = obj as any;
      if (anyObj.geometry) anyObj.geometry.dispose();
      if (anyObj.material) Array.isArray(anyObj.material) ? anyObj.material.forEach((m: any) => m.dispose()) : anyObj.material.dispose();
    });
    patchesRef.current.delete(patchId);
  };

  const createPatch = (centerPos: THREE.Vector3) => {
    const scene = sceneRef.current;
    if (!scene) return null;
    const patchId = patchIdCounterRef.current++;
    const mainPoint = createPoint(centerPos, patchId, 'main');
    const uPoint = createPoint(centerPos.clone().add(new THREE.Vector3(1, 0, 0)), patchId, 'u');
    const vPoint = createPoint(centerPos.clone().add(new THREE.Vector3(0, 0, 1)), patchId, 'v');
    const lineMaterial = new THREE.LineBasicMaterial({ color: baseColors.line, transparent: true });
    const uLine = new THREE.Line(new THREE.BufferGeometry(), lineMaterial.clone());
    const vLine = new THREE.Line(new THREE.BufferGeometry(), lineMaterial.clone());
    uLine.userData = { type: 'line', patchId, role: 'u' };
    vLine.userData = { type: 'line', patchId, role: 'v' };
    const quadMaterial = new THREE.MeshBasicMaterial({ color: baseColors.quad, side: THREE.DoubleSide, transparent: true, opacity: 0.15 });
    const quad = new THREE.Mesh(new THREE.BufferGeometry(), quadMaterial);
    quad.userData = { type: 'quad', patchId };
    const patch: Patch = {
      id: patchId,
      points: { main: mainPoint, u: uPoint, v: vPoint },
      lines: { u: uLine, v: vLine },
      quad,
      objects: [mainPoint, uPoint, vPoint, uLine, vLine, quad],
    };
    updatePatchGeometry(patch);
    patch.objects.forEach(obj => scene.add(obj));
    patchesRef.current.set(patchId, patch);
    return patch;
  };

  // 序列化/反序列化补丁集合
  function serializePatches(): PatchDTO[] {
    const out: PatchDTO[] = [];
    patchesRef.current.forEach(p => {
      const m = p.points.main.position, u = p.points.u.position, v = p.points.v.position;
      out.push({ id: p.id, main: [m.x, m.y, m.z], u: [u.x, u.y, u.z], v: [v.x, v.y, v.z] });
    });
    return out;
  }

  function rebuildPatchesFromDTO(arr: PatchDTO[]) {
    const scene = sceneRef.current; if (!scene) return;
    // 清空现有
    patchesRef.current.forEach(p => {
      p.objects.forEach(obj => {
        scene.remove(obj);
        const anyObj = obj as any;
        if (anyObj.geometry) anyObj.geometry.dispose();
        if (anyObj.material) Array.isArray(anyObj.material) ? anyObj.material.forEach((m: any) => m.dispose()) : anyObj.material.dispose();
      });
    });
    patchesRef.current.clear();

    let maxId = -1;
    arr.forEach(dto => {
      const patchId = dto.id;
      maxId = Math.max(maxId, patchId);
      const mainPoint = createPoint(new THREE.Vector3(...dto.main), patchId, 'main');
      const uPoint = createPoint(new THREE.Vector3(...dto.u), patchId, 'u');
      const vPoint = createPoint(new THREE.Vector3(...dto.v), patchId, 'v');
      const lineMaterial = new THREE.LineBasicMaterial({ color: baseColors.line, transparent: true });
      const uLine = new THREE.Line(new THREE.BufferGeometry(), lineMaterial.clone()); uLine.userData = { type: 'line', patchId, role: 'u' };
      const vLine = new THREE.Line(new THREE.BufferGeometry(), lineMaterial.clone()); vLine.userData = { type: 'line', patchId, role: 'v' };
      const quadMaterial = new THREE.MeshBasicMaterial({ color: baseColors.quad, side: THREE.DoubleSide, transparent: true, opacity: 0.15 });
      const quad = new THREE.Mesh(new THREE.BufferGeometry(), quadMaterial); quad.userData = { type: 'quad', patchId };
      const patch: Patch = { id: patchId, points: { main: mainPoint, u: uPoint, v: vPoint }, lines: { u: uLine, v: vLine }, quad, objects: [mainPoint, uPoint, vPoint, uLine, vLine, quad] };
      updatePatchGeometry(patch);
      patch.objects.forEach(obj => scene.add(obj));
      patchesRef.current.set(patchId, patch);
    });
    patchIdCounterRef.current = Math.max(patchIdCounterRef.current, maxId + 1);
    clearSelection();
  }

  function triggerPatchesChange() {
    if (onPatchesChange) onPatchesChange(serializePatches());
  }

  // 对焦到当前轨迹中心
  function focusOnTrajectory() {
    if (!cameraRef.current || !controlsRef.current || !boundsRef.current) return;
    const { minX, maxX, minY, maxY, minZ, maxZ } = boundsRef.current;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const rangeX = maxX - minX, rangeY = maxY - minY, rangeZ = maxZ - minZ;
    const maxRange = Math.max(rangeX, rangeY, rangeZ) || 1;
    const distance = maxRange * 2.0;
    cameraRef.current.position.set(
      centerX + distance * 0.7,
      centerY + distance * 0.7,
      centerZ + distance * 0.7
    );
    cameraRef.current.lookAt(centerX, centerY, centerZ);
    controlsRef.current.target.set(centerX, centerY, centerZ);
    controlsRef.current.update();
  }

  // 对外暴露的句柄（给上层 UI 调用）
  useImperativeHandle(ref, () => ({
    addPatch: (center) => {
      const pos = new THREE.Vector3(center?.x ?? THREE.MathUtils.randFloatSpread(10), center?.y ?? 2, center?.z ?? THREE.MathUtils.randFloatSpread(10));
      const p = createPatch(pos);
      if (!p) return null;
      setSelection(p, p.points.main);
      triggerPatchesChange();
      return p.id;
    },
    deleteSelectedPatch: () => { const sel = selectedPatchRef.current; if (sel) { deletePatch(sel.id); triggerPatchesChange(); } },
    clearSelection: () => { clearSelection(); },
    getPatches: () => serializePatches(),
    setPatches: (patches: PatchDTO[]) => { rebuildPatchesFromDTO(patches); triggerPatchesChange(); },
    focusOnTrajectory: () => focusOnTrajectory(),
  }), []);

  // 从store获取ECG数据和显示范围
  const ecgData = useProjectStore(state => state.ecgData); // 保留用于元数据
  const processedSignalBuffer = useProjectStore(state => state.processedSignalBuffer);
  const processedDataVersion = useProjectStore(state => state.processedDataVersion);
  const selectedSignalIndex = useProjectStore(state => state.selectedSignalIndex);
  const displayStartPosition = useProjectStore(state => state.displayStartPosition);
  const displayEndPosition = useProjectStore(state => state.displayEndPosition);
  const phaseSpaceTau = useProjectStore(state => state.phaseSpaceTau);
  const isEcgLoading = useProjectStore(state => state.isEcgLoading);
  const ecgLoadingError = useProjectStore(state => state.ecgLoadingError);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // 初始化Three.js场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(industrialTheme.background);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    camera.position.set(50, 50, 50);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    currentMount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // 可选：调试辅助-光源与网格
    let gridHelper: THREE.GridHelper | null = null;
    let ambientLight: THREE.AmbientLight | null = null;
    let dirLight: THREE.DirectionalLight | null = null;
    if (debug) {
      ambientLight = new THREE.AmbientLight(0xcccccc, 0.5);
      dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
      dirLight.position.set(5, 10, 7);
      scene.add(ambientLight);
      scene.add(dirLight);
      gridHelper = new THREE.GridHelper(30, 30, 0x444444, 0x222222);
      scene.add(gridHelper);
    }

    // 可选：调试编辑-变换控制器 & 交互
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pointerDownHandler = (event: PointerEvent) => {
      if (!debug) return;
      if (gizmoRef.current?.dragging) return;
      pointer.x = (event.clientX / currentMount.clientWidth) * 2 - 1;
      pointer.y = -(event.clientY / currentMount.clientHeight) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const allInteractiveObjects = Array.from(patchesRef.current.values()).flatMap(p => p.objects);
      const hits = raycaster.intersectObjects(allInteractiveObjects, false);
      if (hits.length > 0) {
        const firstHit = hits[0].object as THREE.Object3D;
        const patch = patchesRef.current.get(firstHit.userData.patchId);
        if (patch) setSelection(patch, firstHit);
      } else {
        clearSelection();
      }
    };
    renderer.domElement.addEventListener('pointerdown', pointerDownHandler);

    if (debug) {
      const gizmo = new TransformControls(camera, renderer.domElement);
      gizmo.setSize(0.7);
      gizmo.addEventListener('dragging-changed', (e: any) => {
        controls.enabled = !e.value;
      });
      gizmo.addEventListener('objectChange', () => {
        const p = selectedPatchRef.current;
        if (p) updatePatchGeometry(p);
      });
      scene.add(gizmo);
      gizmoRef.current = gizmo;
    }

    // 动画循环
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      // 调试：根据远近衰减点的透明度
      if (debug && camera) {
        camera.getWorldPosition(cameraWorldPosRef.current);
        patchesRef.current.forEach(patch => {
          Object.values(patch.points).forEach(point => {
            point.getWorldPosition(pointWorldPosRef.current);
            const dist = cameraWorldPosRef.current.distanceTo(pointWorldPosRef.current);
            const FADE_MIN_DIST = 15;
            const FADE_MAX_DIST = 40;
            const opacityFactor = 1.0 - THREE.MathUtils.smoothstep(dist, FADE_MIN_DIST, FADE_MAX_DIST);
            (point.material as THREE.SpriteMaterial).opacity = Math.max(0.2, opacityFactor);
          });
        });
      }
      renderer.render(scene, camera);
    };
    animate();

    // 响应窗口大小变化
    const resizeObserver = new ResizeObserver(entries => {
        const entry = entries[0];
        const { width, height } = entry.contentRect;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    });
    resizeObserver.observe(currentMount);

    // 调试：快捷键与初始数据
    const addAction = () => {
      if (!debug) return;
      const newPatchPos = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(10), 2, THREE.MathUtils.randFloatSpread(10)
      );
      const newPatch = createPatch(newPatchPos);
      if (newPatch) { setSelection(newPatch, newPatch.points.main); triggerPatchesChange(); }
    };
    const deleteAction = () => {
      if (!debug) return;
      const sel = selectedPatchRef.current;
      if (sel) { deletePatch(sel.id); triggerPatchesChange(); }
    };
    const keydownHandler = (e: KeyboardEvent) => {
      if (!debug) return;
      switch (e.key.toLowerCase()) {
        case 'q': gizmoRef.current?.setSpace(gizmoRef.current.space === 'local' ? 'world' : 'local'); break;
        case 'w': gizmoRef.current?.setMode('translate'); break;
        case 'e': gizmoRef.current?.setMode('rotate'); break;
        case 'r': gizmoRef.current?.setMode('scale'); break;
        case 'escape': clearSelection(); break;
        case 'a': addAction(); break;
        case 'delete': case 'backspace': deleteAction(); break;
      }
    };
    window.addEventListener('keydown', keydownHandler);

    if (debug) {
      createPatch(new THREE.Vector3(0, 2, 0));
      createPatch(new THREE.Vector3(-4, 1, -3));
      triggerPatchesChange();
    }

    // 清理函数
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.removeEventListener('pointerdown', pointerDownHandler);
      window.removeEventListener('keydown', keydownHandler);
      if (gizmoRef.current) {
        scene.remove(gizmoRef.current);
        gizmoRef.current.dispose();
        gizmoRef.current = null;
      }
      // 清空调试对象
      patchesRef.current.forEach(p => {
        p.objects.forEach(obj => {
          scene.remove(obj);
          const anyObj = obj as any;
          if (anyObj.geometry) anyObj.geometry.dispose();
          if (anyObj.material) Array.isArray(anyObj.material) ? anyObj.material.forEach((m: any) => m.dispose()) : anyObj.material.dispose();
        });
      });
      patchesRef.current.clear();
      if (gridHelper) scene.remove(gridHelper);
      if (ambientLight) scene.remove(ambientLight);
      if (dirLight) scene.remove(dirLight);
      if (currentMount && renderer.domElement.parentNode === currentMount) {
            currentMount.removeChild(renderer.domElement);
        }
    };
  }, []);

  // 当ECG数据或显示范围变化时更新相空间图 - 从processedSignalBuffer读取（唯一真实来源）
  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;

    // 移除旧的相空间轨迹
    if (lineRef.current) {
      scene.remove(lineRef.current);
      lineRef.current.geometry.dispose();
      (lineRef.current.material as THREE.Material).dispose();
      lineRef.current = null;
    }

    // 选择数据来源：优先 external.signal，否则从 store 的 processedSignalBuffer
    let signalData: Float64Array | Float32Array | number[] | null = null;
    let startPos1 = external?.displayStartPosition ?? displayStartPosition;
    let endPos1 = external?.displayEndPosition ?? displayEndPosition;
    const tau = external?.tau ?? phaseSpaceTau; // 时间延迟参数

    if (external?.signal && external.signal.length > 0) {
      signalData = external.signal;
    } else if (processedSignalBuffer && ecgData?.metadata && selectedSignalIndex >= 0) {
      const processedView = new Float64Array(processedSignalBuffer);
      if (processedView.length === 0) return;
      const numSignals = ecgData.signals?.length || 1;
      const samplesPerSignal = processedView.length / numSignals;
      if (selectedSignalIndex >= numSignals) return;
      const signalStartIndex = selectedSignalIndex * samplesPerSignal;
      const signalEndIndex = signalStartIndex + samplesPerSignal;
      signalData = processedView.subarray(signalStartIndex, signalEndIndex);
    }

    if (!signalData || signalData.length === 0) return;

    // 计算显示范围（将1基位置转换为0基索引）
    const startIdx = Math.max(0, (startPos1 ?? 1) - 1);
    const endIdx = Math.min(signalData.length - 1, (endPos1 ?? (signalData.length)) - 1);

    if (startIdx >= endIdx) return;

    // 提取信号段
    const signalSegment = signalData.subarray(startIdx, endIdx + 1);
    const N = signalSegment.length - 2 * tau - 1;

    if (N <= 0) return;

    // 构建相空间坐标 (对应MATLAB的vector_A_mat)
    const points: THREE.Vector3[] = [];
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (let i = 0; i < N; i++) {
      const x = signalSegment[i];           // sigL(i)
      const y = signalSegment[i + tau];     // sigL(i + tau)
      const z = signalSegment[i + 2 * tau]; // sigL(i + 2*tau)

      points.push(new THREE.Vector3(x, y, z));

      // 记录边界值用于坐标轴标记
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    }

    if (points.length === 0) return;

    // 创建轨迹几何体
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    // 创建渐变色材质 (模拟时间演化)
    const colors = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      const t = i / (points.length - 1);
      // 从蓝色渐变到红色
      colors[i * 3] = t;     // R
      colors[i * 3 + 1] = 0.2; // G
      colors[i * 3 + 2] = 1 - t; // B
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 2
    });

    const line = new THREE.Line(geometry, material);
    scene.add(line);
    lineRef.current = line;

    // 自适应相机位置和坐标轴范围
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const rangeZ = maxZ - minZ;
    const maxRange = Math.max(rangeX, rangeY, rangeZ);

    if (cameraRef.current && maxRange > 0) {
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const centerZ = (minZ + maxZ) / 2;
      const distance = maxRange * 2;
      cameraRef.current.position.set(
        centerX + distance * 0.7,
        centerY + distance * 0.7,
        centerZ + distance * 0.7
      );
      cameraRef.current.lookAt(centerX, centerY, centerZ);

      if (controlsRef.current) {
        controlsRef.current.target.set(centerX, centerY, centerZ);
        controlsRef.current.update();
      }
    }

    // 保存轨迹边界并更新MATLAB风格坐标轴
    boundsRef.current = { minX, maxX, minY, maxY, minZ, maxZ };
    createMatlabStyleAxes(scene, minX, maxX, minY, maxY, minZ, maxZ);

  }, [processedSignalBuffer, processedDataVersion, ecgData?.metadata, ecgData?.signals?.length, selectedSignalIndex, displayStartPosition, displayEndPosition, phaseSpaceTau, external?.signal, external?.displayStartPosition, external?.displayEndPosition, external?.tau]);

  // 创建MATLAB风格的3D坐标轴系统
  function createMatlabStyleAxes(scene: THREE.Scene, minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number) {
    // 移除旧的坐标轴元素
    const oldAxes = scene.children.filter(child => child.userData.isMatlabAxis);
    oldAxes.forEach(axis => scene.remove(axis));

    // 计算坐标轴范围
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const rangeZ = maxZ - minZ;

    // 扩展范围以留出边距
    const margin = 0.1;
    const extendedMinX = minX - rangeX * margin;
    const extendedMaxX = maxX + rangeX * margin;
    const extendedMinY = minY - rangeY * margin;
    const extendedMaxY = maxY + rangeY * margin;
    const extendedMinZ = minZ - rangeZ * margin;
    const extendedMaxZ = maxZ + rangeZ * margin;

    // 创建坐标轴线材质（黑色，MATLAB风格）
    const axisMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    const gridMaterial = new THREE.LineBasicMaterial({ color: 0x808080, linewidth: 1 });
    const tickMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 });

    // 创建主坐标轴
    // X轴
    const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(extendedMinX, extendedMinY, extendedMinZ),
      new THREE.Vector3(extendedMaxX, extendedMinY, extendedMinZ)
    ]);
    const xAxis = new THREE.Line(xAxisGeometry, axisMaterial);
    xAxis.userData.isMatlabAxis = true;
    scene.add(xAxis);

    // Y轴
    const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(extendedMinX, extendedMinY, extendedMinZ),
      new THREE.Vector3(extendedMinX, extendedMaxY, extendedMinZ)
    ]);
    const yAxis = new THREE.Line(yAxisGeometry, axisMaterial);
    yAxis.userData.isMatlabAxis = true;
    scene.add(yAxis);

    // Z轴
    const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(extendedMinX, extendedMinY, extendedMinZ),
      new THREE.Vector3(extendedMinX, extendedMinY, extendedMaxZ)
    ]);
    const zAxis = new THREE.Line(zAxisGeometry, axisMaterial);
    zAxis.userData.isMatlabAxis = true;
    scene.add(zAxis);

    // 创建网格线（可选，MATLAB风格的浅色网格）
    const numGridLines = 5;

    // X方向网格线
    for (let i = 1; i < numGridLines; i++) {
      const x = minX + (maxX - minX) * i / numGridLines;
      // YZ平面网格
      const gridGeometry1 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, extendedMinY, extendedMinZ),
        new THREE.Vector3(x, extendedMaxY, extendedMinZ)
      ]);
      const gridLine1 = new THREE.Line(gridGeometry1, gridMaterial);
      gridLine1.userData.isMatlabAxis = true;
      scene.add(gridLine1);

      const gridGeometry2 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, extendedMinY, extendedMinZ),
        new THREE.Vector3(x, extendedMinY, extendedMaxZ)
      ]);
      const gridLine2 = new THREE.Line(gridGeometry2, gridMaterial);
      gridLine2.userData.isMatlabAxis = true;
      scene.add(gridLine2);
    }

    // Y方向网格线
    for (let i = 1; i < numGridLines; i++) {
      const y = minY + (maxY - minY) * i / numGridLines;
      const gridGeometry1 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(extendedMinX, y, extendedMinZ),
        new THREE.Vector3(extendedMaxX, y, extendedMinZ)
      ]);
      const gridLine1 = new THREE.Line(gridGeometry1, gridMaterial);
      gridLine1.userData.isMatlabAxis = true;
      scene.add(gridLine1);

      const gridGeometry2 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(extendedMinX, y, extendedMinZ),
        new THREE.Vector3(extendedMinX, y, extendedMaxZ)
      ]);
      const gridLine2 = new THREE.Line(gridGeometry2, gridMaterial);
      gridLine2.userData.isMatlabAxis = true;
      scene.add(gridLine2);
    }

    // Z方向网格线
    for (let i = 1; i < numGridLines; i++) {
      const z = minZ + (maxZ - minZ) * i / numGridLines;
      const gridGeometry1 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(extendedMinX, extendedMinY, z),
        new THREE.Vector3(extendedMaxX, extendedMinY, z)
      ]);
      const gridLine1 = new THREE.Line(gridGeometry1, gridMaterial);
      gridLine1.userData.isMatlabAxis = true;
      scene.add(gridLine1);

      const gridGeometry2 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(extendedMinX, extendedMinY, z),
        new THREE.Vector3(extendedMinX, extendedMaxY, z)
      ]);
      const gridLine2 = new THREE.Line(gridGeometry2, gridMaterial);
      gridLine2.userData.isMatlabAxis = true;
      scene.add(gridLine2);
    }

    // 创建刻度标记
    const tickLength = Math.min(rangeX, rangeY, rangeZ) * 0.02;

    // X轴刻度
    const numTicks = 5;
    for (let i = 0; i <= numTicks; i++) {
      const x = minX + (maxX - minX) * i / numTicks;
      const tickGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, extendedMinY, extendedMinZ),
        new THREE.Vector3(x, extendedMinY - tickLength, extendedMinZ)
      ]);
      const tick = new THREE.Line(tickGeometry, tickMaterial);
      tick.userData.isMatlabAxis = true;
      scene.add(tick);
    }

    // Y轴刻度
    for (let i = 0; i <= numTicks; i++) {
      const y = minY + (maxY - minY) * i / numTicks;
      const tickGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(extendedMinX, y, extendedMinZ),
        new THREE.Vector3(extendedMinX - tickLength, y, extendedMinZ)
      ]);
      const tick = new THREE.Line(tickGeometry, tickMaterial);
      tick.userData.isMatlabAxis = true;
      scene.add(tick);
    }

    // Z轴刻度
    for (let i = 0; i <= numTicks; i++) {
      const z = minZ + (maxZ - minZ) * i / numTicks;
      const tickGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(extendedMinX, extendedMinY, z),
        new THREE.Vector3(extendedMinX - tickLength, extendedMinY, z)
      ]);
      const tick = new THREE.Line(tickGeometry, tickMaterial);
      tick.userData.isMatlabAxis = true;
      scene.add(tick);
    }

    // 创建文本标签（MATLAB风格）
    createAxisLabels(scene, minX, maxX, minY, maxY, minZ, maxZ, extendedMinX, extendedMinY, extendedMinZ, tickLength);
  }

  // 创建MATLAB风格的轴标签
  function createAxisLabels(scene: THREE.Scene, minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number,
                           extendedMinX: number, extendedMinY: number, extendedMinZ: number, tickLength: number) {

    // 创建文本纹理的辅助函数（MATLAB风格）
    const createTextTexture = (text: string, fontSize = 18) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = 256;
      canvas.height = 64;

      context.fillStyle = '#000000'; // 黑色文字，MATLAB风格
      context.font = `${fontSize}px Times New Roman`; // Times字体，更科学
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, 128, 32);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      return texture;
    };

    // 轴标签
    const axisLabelScale = Math.min(maxX - minX, maxY - minY, maxZ - minZ) * 0.1;

    // X轴标签
    const xTexture = createTextTexture('sigL(i)', 20);
    const xMaterial = new THREE.SpriteMaterial({ map: xTexture });
    const xSprite = new THREE.Sprite(xMaterial);
    xSprite.position.set((minX + maxX) / 2, extendedMinY - tickLength * 8, extendedMinZ);
    xSprite.scale.set(axisLabelScale, axisLabelScale * 0.3, 1);
    xSprite.userData.isMatlabAxis = true;
    scene.add(xSprite);

    // Y轴标签
    const yTexture = createTextTexture('sigL(i+τ)', 20);
    const yMaterial = new THREE.SpriteMaterial({ map: yTexture });
    const ySprite = new THREE.Sprite(yMaterial);
    ySprite.position.set(extendedMinX - tickLength * 8, (minY + maxY) / 2, extendedMinZ);
    ySprite.scale.set(axisLabelScale, axisLabelScale * 0.3, 1);
    ySprite.userData.isMatlabAxis = true;
    scene.add(ySprite);

    // Z轴标签
    const zTexture = createTextTexture('sigL(i+2τ)', 20);
    const zMaterial = new THREE.SpriteMaterial({ map: zTexture });
    const zSprite = new THREE.Sprite(zMaterial);
    zSprite.position.set(extendedMinX - tickLength * 6, extendedMinY, (minZ + maxZ) / 2);
    zSprite.scale.set(axisLabelScale, axisLabelScale * 0.3, 1);
    zSprite.userData.isMatlabAxis = true;
    scene.add(zSprite);

    // 数值标签
    const numTicks = 5;
    const valueScale = axisLabelScale * 0.6;

    // X轴数值
    for (let i = 0; i <= numTicks; i++) {
      const x = minX + (maxX - minX) * i / numTicks;
      const valueTexture = createTextTexture(x.toFixed(2), 14);
      const valueMaterial = new THREE.SpriteMaterial({ map: valueTexture });
      const valueSprite = new THREE.Sprite(valueMaterial);
      valueSprite.position.set(x, extendedMinY - tickLength * 4, extendedMinZ);
      valueSprite.scale.set(valueScale, valueScale * 0.4, 1);
      valueSprite.userData.isMatlabAxis = true;
      scene.add(valueSprite);
    }

    // Y轴数值
    for (let i = 0; i <= numTicks; i++) {
      const y = minY + (maxY - minY) * i / numTicks;
      const valueTexture = createTextTexture(y.toFixed(2), 14);
      const valueMaterial = new THREE.SpriteMaterial({ map: valueTexture });
      const valueSprite = new THREE.Sprite(valueMaterial);
      valueSprite.position.set(extendedMinX - tickLength * 4, y, extendedMinZ);
      valueSprite.scale.set(valueScale, valueScale * 0.4, 1);
      valueSprite.userData.isMatlabAxis = true;
      scene.add(valueSprite);
    }

    // Z轴数值
    for (let i = 0; i <= numTicks; i++) {
      const z = minZ + (maxZ - minZ) * i / numTicks;
      const valueTexture = createTextTexture(z.toFixed(2), 14);
      const valueMaterial = new THREE.SpriteMaterial({ map: valueTexture });
      const valueSprite = new THREE.Sprite(valueMaterial);
      valueSprite.position.set(extendedMinX - tickLength * 3, extendedMinY - tickLength * 2, z);
      valueSprite.scale.set(valueScale, valueScale * 0.4, 1);
      valueSprite.userData.isMatlabAxis = true;
      scene.add(valueSprite);
    }
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        border: '1px solid #444',
        backgroundColor: industrialTheme.background
      }}
    >
      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: '100%'
        }}
      />
      {/* 调试控制面板（可选） */}
      {debug && (
        <div style={{ position: 'absolute', left: 10, top: 10, zIndex: 10 }}>
          <div style={{
            background: 'rgba(0,0,0,0.6)', padding: '10px 15px', borderRadius: 8,
            fontSize: 13, lineHeight: 1.6, color: '#e8e8e8'
          }}>
            <b style={{ color: '#fff', fontSize: 14 as any }}>操作指南</b><br />
            • 点击点/线/面选中整个组<br />
            • 拖动控制柄移动点<br />
            • W/E/R: 移动/旋转/缩放模式<br />
            • Q: 切换坐标系 | Esc: 取消选择
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            <button
              onClick={() => {
                const newPatchPos = new THREE.Vector3(
                  THREE.MathUtils.randFloatSpread(10), 2, THREE.MathUtils.randFloatSpread(10)
                );
                const p = createPatch(newPatchPos);
                if (p) setSelection(p, p.points.main);
              }}
              style={{ background: '#333', color: '#eee', border: '1px solid #555', padding: '8px 12px', borderRadius: 5, cursor: 'pointer' }}
            >增加一个组 (A)</button>
            <button
              onClick={() => {
                const sel = selectedPatchRef.current; if (sel) deletePatch(sel.id);
              }}
              style={{ background: '#333', color: '#eee', border: '1px solid #555', padding: '8px 12px', borderRadius: 5, cursor: 'pointer' }}
            >删除选中组 (Del)</button>
          </div>
        </div>
      )}
      {/* 加载状态显示 */}
      {isEcgLoading && (
        <div className="phase-space-overlay">

        </div>
      )}

      {/* 错误状态显示 */}
      {ecgLoadingError && (
        <div className="phase-space-overlay error">
          <div>Error: {ecgLoadingError}</div>
        </div>
              )}


      </div>
  );
};

export const PhaseSpacePlot = memo(forwardRef(PhaseSpacePlotComponent));
// @ts-ignore
PhaseSpacePlot.displayName = 'PhaseSpacePlot';
