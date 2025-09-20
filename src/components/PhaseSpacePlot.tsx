import React, { forwardRef, memo, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';

export type PatchDTO = {
  id: number;
  name?: string;
  color?: string; // hex color string like #rrggbb
  main: [number, number, number];
  u: [number, number, number];
  v: [number, number, number];
};

export type PhaseSpacePlotHandle = {
  addPatch: (center?: { x?: number; y?: number; z?: number }) => number | null;
  deleteSelectedPatch: () => void;
  clearSelection: () => void;
  getPatches: () => PatchDTO[]; // world coordinates
  setPatches: (patches: PatchDTO[]) => void; // expects world coordinates
  renamePatch: (patchId: number, name: string) => void;
  updatePointWorld: (patchId: number, role: 'main'|'u'|'v', coord: {x:number;y:number;z:number}) => void;
  updatePatchColor: (patchId: number, colorHex: string) => void;
  setTransformMode: (mode: 'translate'|'rotate'|'scale'|'uv') => void;
  setTransformSpace: (space: 'local'|'world') => void;
  focusOnTrajectory: () => void;
  setMainLocked: (patchId: number, locked: boolean) => void;
  commit: (reason?: string) => void;
};

type ExternalControls = {
  signal?: Float32Array | Float64Array | number[];
  displayStartPosition?: number; // 1-based
  displayEndPosition?: number;   // 1-based
  tau?: number;
};

type Props = {
  external: ExternalControls;
  debug?: boolean;
  pointPixelSize?: number; // desired on-screen size for point sprites (in pixels)
  onPatchesChange?: (patches: PatchDTO[], meta?: { commit?: boolean; reason?: string }) => void;
  // Controls how close auto-framing gets relative to the original 2.0× span
  // e.g., 10 => 10x closer than original (d = maxSpan * 2.0 / 10 = 0.2 * maxSpan)
  frameCloseness?: number;
  // Selection change callback for UI highlight (supports points and edges)
  onSelectionChange?: (sel: { patchId: number | null; role: 'main' | 'u' | 'v' | 'edge_u' | 'edge_v' | null }) => void;
};

export const PhaseSpacePlot = memo(forwardRef<PhaseSpacePlotHandle, Props>(function PhaseSpacePlotImpl({ external, debug = true, pointPixelSize, onPatchesChange, frameCloseness = 2, onSelectionChange }, ref) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orbitRef = useRef<OrbitControls | null>(null);
  const lineRef = useRef<THREE.Line | null>(null);
  const gizmoRef = useRef<TransformControls | null>(null);
  const pivotRef = useRef<THREE.Object3D | null>(null);
  const uvFrameRef = useRef<THREE.Object3D | null>(null);
  const uvHandleURef = useRef<THREE.Object3D | null>(null);
  const uvHandleVRef = useRef<THREE.Object3D | null>(null);
  const uvCtrlURef = useRef<TransformControls | null>(null);
  const uvCtrlVRef = useRef<TransformControls | null>(null);
  const uvUDragRef = useRef<{
    patchId: number;
    target: 'group'|'point'|'edge';
    role?: 'main'|'u'|'v';
    edgeRole?: 'u'|'v';
    startPosWorld: THREE.Vector3;
    startGroupPos?: THREE.Vector3;
    startPointLocal?: THREE.Vector3;
  } | null>(null);
  const uvVDragRef = useRef<{
    patchId: number;
    target: 'group'|'point'|'edge';
    role?: 'main'|'u'|'v';
    edgeRole?: 'u'|'v';
    startPosWorld: THREE.Vector3;
    startGroupPos?: THREE.Vector3;
    startPointLocal?: THREE.Vector3;
  } | null>(null);
  const uvAnyDraggingRef = useRef<boolean>(false);
  const uvOverHandleRef = useRef<boolean>(false);
  const suppressPickUntilRef = useRef<number>(0);
  const uvAnchorRef = useRef<{ target: 'group'|'point'|'edge'; role?: 'main'|'u'|'v' } | null>(null);
  const selectedClickedObjectRef = useRef<THREE.Object3D | null>(null);
  type DragSnapshot = { patchId: number; main0: THREE.Vector3; u0: THREE.Vector3; v0: THREE.Vector3; pivotLocal0: THREE.Vector3; scale0: number; pointerStart?: { x: number; y: number }; edgeRole?: 'u'|'v' };
  const dragSnapshotRef = useRef<DragSnapshot | null>(null);
  const uvDragRef = useRef<{
    patchId: number;
    target: 'group'|'point';
    role?: 'main'|'u'|'v';
    startPosWorld: THREE.Vector3; // uvFrame start position
    startGroupPos?: THREE.Vector3; // world
    startPointLocal?: THREE.Vector3; // local
    uDirLocal?: THREE.Vector3; // unit
    vDirLocal?: THREE.Vector3; // unit
  } | null>(null);
  const modeRef = useRef<'translate'|'rotate'|'scale'|'uv'>('translate');
  const boundsRef = useRef<{ minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lockedMainSetRef = useRef<Set<number>>(new Set());
  const lastMainDuringDragRef = useRef<THREE.Vector3 | null>(null);

  type Patch = {
    id: number;
    name: string;
    color: THREE.Color; // main point + quad color
    points: { main: THREE.Sprite; u: THREE.Sprite; v: THREE.Sprite };
    lines: { u: THREE.Line; v: THREE.Line };
    quad: THREE.Mesh;
    group: THREE.Group;
    baseSpan: number; // original average edge length used for scale clamping
    objects: THREE.Object3D[];
  };
  const patchesRef = useRef<Map<number, Patch>>(new Map());
  const patchIdCounterRef = useRef(0);
  const selectedPatchRef = useRef<Patch | null>(null);
  const whiteCircleTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const cameraWorldPosRef = useRef(new THREE.Vector3());
  const pointWorldPosRef = useRef(new THREE.Vector3());
  const [ready, setReady] = useState(false);
  const lastPointerRef = useRef<{x:number;y:number}>({ x: 0, y: 0 });
  const rotateRadPerPixelRef = useRef<number>(0.01);
  // Uniform scaling vertical sensitivity: exp(-dy * alpha) mapped to [0.1, 20]
  const uniformScaleAlphaRef = useRef<number>(Math.log(20) / 280); // ~280px to reach 20x
  // Track pivot world position during edge-translate drags
  const lastPivotDuringDragRef = useRef<THREE.Vector3 | null>(null);
  // Fat-line overlay for selected edge
  const fatEdgeRef = useRef<{ role?: 'u'|'v'; line?: Line2 } | null>(null);
  // Track when to auto-frame: only on first plot or when signal object changes
  const hasFramedOnceRef = useRef(false);
  const lastSignalObjRef = useRef<any>(null);
  // Track last bounds we auto-framed for, and whether user interacted with camera
  const lastFramedBoundsRef = useRef<{ minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number } | null>(null);
  const userInteractedRef = useRef(false);
  // Adjustable default framing closeness (10x by default)
  const frameClosenessRef = useRef<number>(frameCloseness);
  useEffect(() => { frameClosenessRef.current = Math.max(1e-6, frameCloseness || 2); }, [frameCloseness]);
  const computeDesiredDistance = (span: number) => {
    const closeness = Math.max(1e-6, frameClosenessRef.current);
    // Original was 2.0 * span; closer => divide by closeness
    return span * (2.0 / closeness);
  };

  // Reframe automatically when framing closeness changes.
  // Preserve current camera direction, only change distance to center.
  useEffect(() => {
    const cam = cameraRef.current; const orbit = orbitRef.current; const b = boundsRef.current;
    if (!cam || !orbit || !b) return;
    if (!ready) return;
    if (gizmoRef.current?.dragging) return;
    const { minX, maxX, minY, maxY, minZ, maxZ } = b;
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
    const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1;
    const desired = span * (2.0 / Math.max(1e-6, frameCloseness || 2));
    const center = new THREE.Vector3(cx, cy, cz);
    const dir = cam.position.clone().sub(center);
    if (dir.lengthSq() < 1e-12) dir.set(0.7, 0.7, 0.7);
    dir.normalize();
    const newPos = center.clone().add(dir.multiplyScalar(desired));
    cam.position.copy(newPos);
    cam.lookAt(center);
    orbit.target.set(cx, cy, cz); orbit.update();
  }, [frameCloseness, ready]);

  const baseColors = {
    main: new THREE.Color('#ff6b6b'),
    u: new THREE.Color('#4d96ff'),
    v: new THREE.Color('#51cf66'),
    line: new THREE.Color('#aaaaaa'),
    quad: new THREE.Color('#ffffff'),
  } as const;
  const highlightColor = new THREE.Color('#ffdd59');
  const LINE_OPACITY = 0.99;
  const LINE_OPACITY_SELECTED = 1.0;
  function randomColorHex() {
    const h = Math.random();
    const s = 0.65;
    const l = 0.55;
    const color = new THREE.Color();
    color.setHSL(h, s, l);
    return `#${color.getHexString()}`;
  }
  const defaultPointPx = Math.max(4, Math.min(64, pointPixelSize ?? 15));
  const pointSizePxRef = useRef<number>(defaultPointPx);
  useEffect(() => { pointSizePxRef.current = Math.max(4, Math.min(64, pointPixelSize ?? 15));
    // update existing points' desired pixel height
    patchesRef.current.forEach(p => {
      Object.values(p.points).forEach(pt => { (pt as any).userData.pixelHeight = pointSizePxRef.current; });
    });
  }, [pointPixelSize]);

  function createWhiteCircleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.beginPath(); ctx.arc(32, 32, 30, 0, Math.PI * 2); ctx.fillStyle = 'white'; ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }

  function createPoint(position: THREE.Vector3, patchId: number, role: keyof typeof baseColors) {
    if (!whiteCircleTextureRef.current) whiteCircleTextureRef.current = createWhiteCircleTexture();
    const mat = new THREE.SpriteMaterial({ map: whiteCircleTextureRef.current, color: baseColors[role].clone(), transparent: true, alphaTest: 0.01 });
    const sp = new THREE.Sprite(mat);
    const SPRITE_SIZE = 0.3;
    sp.position.copy(position); sp.scale.set(SPRITE_SIZE, SPRITE_SIZE, 1);
    sp.userData = { type: 'point', patchId, role, isPointSprite: true, pixelHeight: pointSizePxRef.current };
    return sp;
  }

  function updatePatchGeometry(patch: Patch) {
    const { main, u, v } = patch.points;
    // Recenter group origin at parallelogram center (only shift points, not line/quad objects)
    const isDraggingPoint = !!(gizmoRef.current?.dragging && (gizmoRef.current?.object as any)?.userData?.type === 'point');
    const isDraggingPivot = !!(gizmoRef.current?.dragging && pivotRef.current && gizmoRef.current?.object === pivotRef.current);
    const isDraggingUV = !!(gizmoRef.current?.dragging && modeRef.current === 'uv');
    if (!isDraggingPoint && !isDraggingPivot && !(isDraggingUV || uvAnyDraggingRef.current)) {
      const centerLocal = new THREE.Vector3().addVectors(u.position, v.position).multiplyScalar(0.5);
      if (centerLocal.lengthSq() > 1e-12) {
        main.position.sub(centerLocal);
        u.position.sub(centerLocal);
        v.position.sub(centerLocal);
        // Ensure renderable objects stay at local origin; geometry will be updated next
        patch.lines.u.position.set(0, 0, 0);
        patch.lines.v.position.set(0, 0, 0);
        patch.quad.position.set(0, 0, 0);
        patch.group.position.add(centerLocal);
      }
    }

    // Update lines
    patch.lines.u.geometry.setFromPoints([main.position, u.position]);
    patch.lines.v.geometry.setFromPoints([main.position, v.position]);
    // Update quad (recompute from local points)
    const p4 = new THREE.Vector3().addVectors(u.position, v.position).sub(main.position);
    const positions = new Float32Array([...main.position.toArray(), ...u.position.toArray(), ...p4.toArray(), ...v.position.toArray()]);
    const indices = [0, 1, 2, 0, 2, 3];
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    patch.quad.geometry.dispose(); patch.quad.geometry = geom;
    // Update fat edge overlay if it targets this patch
    if (selectedPatchRef.current && selectedPatchRef.current.id === patch.id && fatEdgeRef.current?.line && fatEdgeRef.current?.role) {
      createOrUpdateFatEdge(patch, fatEdgeRef.current.role);
    }
  }

  function clearSelection() {
    const sel = selectedPatchRef.current; if (!sel) return;
    (sel.points.main.material as THREE.SpriteMaterial).color.copy(sel.color);
    (sel.points.u.material as THREE.SpriteMaterial).color.copy(baseColors.u);
    (sel.points.v.material as THREE.SpriteMaterial).color.copy(baseColors.v);
    (sel.lines.u.material as THREE.LineBasicMaterial).color.copy(baseColors.u);
    (sel.lines.v.material as THREE.LineBasicMaterial).color.copy(baseColors.v);
    (sel.lines.u.material as THREE.LineBasicMaterial).opacity = LINE_OPACITY;
    (sel.lines.v.material as THREE.LineBasicMaterial).opacity = LINE_OPACITY;
    // remove fat edge overlay if any
    if (fatEdgeRef.current?.line && sceneRef.current) {
      sceneRef.current.remove(fatEdgeRef.current.line);
    }
    fatEdgeRef.current = null;
    (sel.quad.material as THREE.MeshBasicMaterial).opacity = 0.165;
    (sel.quad.material as THREE.MeshBasicMaterial).color.copy(sel.color);
    gizmoRef.current?.detach();
    selectedPatchRef.current = null;
    // Cleanup UV helper if active
    if (modeRef.current === 'uv') {
      const giz = gizmoRef.current; const scene = sceneRef.current;
      if (uvFrameRef.current && scene && giz) { giz.detach(); scene.remove(uvFrameRef.current); uvFrameRef.current = null; }
      if (giz) { (giz as any).showX = true; (giz as any).showY = true; (giz as any).showZ = true; }
      if (uvCtrlURef.current) { try { uvCtrlURef.current.detach(); } catch {} uvCtrlURef.current.visible = false; }
      if (uvCtrlVRef.current) { try { uvCtrlVRef.current.detach(); } catch {} uvCtrlVRef.current.visible = false; }
      if (uvHandleURef.current && scene) { scene.remove(uvHandleURef.current); uvHandleURef.current = null; }
      if (uvHandleVRef.current && scene) { scene.remove(uvHandleVRef.current); uvHandleVRef.current = null; }
    }
    // Notify UI
    onSelectionChange?.({ patchId: null, role: null });
  }

  function setSelection(p: Patch, clickedObject?: THREE.Object3D) {
    const cur = selectedPatchRef.current;
    if (cur && cur.id === p.id) {
      if (clickedObject) selectedClickedObjectRef.current = clickedObject;
      ensureAttachTarget(p);
      // Update fat edge overlay when switching target within same patch
      const anyClicked: any = clickedObject as any;
      if (anyClicked && anyClicked.userData && anyClicked.userData.type === 'line') {
        const role = (anyClicked.userData.role as 'u'|'v');
        createOrUpdateFatEdge(p, role);
        uvAnchorRef.current = { target: 'edge', role };
      } else {
        if (fatEdgeRef.current?.line && sceneRef.current) {
          sceneRef.current.remove(fatEdgeRef.current.line);
        }
        fatEdgeRef.current = null;
      }
      // Update UV anchor
      if (clickedObject && (anyClicked?.userData?.type === 'point')) uvAnchorRef.current = { target: 'point', role: (anyClicked.userData.role as any) };
      else uvAnchorRef.current = { target: 'group' };
      // Notify UI even when switching within same group (point or edge)
      if (clickedObject) {
        let role: 'main'|'u'|'v'|'edge_u'|'edge_v'|null = null;
        const anyClicked: any = clickedObject as any;
        if (anyClicked && anyClicked.userData) {
          if (anyClicked.userData.type === 'point') role = (anyClicked.userData.role as 'main'|'u'|'v') ?? null;
          else if (anyClicked.userData.type === 'line') role = ((anyClicked.userData.role as 'u'|'v') === 'u') ? 'edge_u' : 'edge_v';
        }
        onSelectionChange?.({ patchId: p.id, role });
      }
      return;
    }
    clearSelection();
    selectedPatchRef.current = p;
    Object.values(p.points).forEach(pt => (pt.material as THREE.SpriteMaterial).color.copy(highlightColor));
    // Keep u/v line colors, only raise opacity for selection
    (p.lines.u.material as THREE.LineBasicMaterial).opacity = LINE_OPACITY_SELECTED;
    (p.lines.v.material as THREE.LineBasicMaterial).opacity = LINE_OPACITY_SELECTED;
    // If clicked a line, create/update fat overlay using Line2
    if (clickedObject && (clickedObject as any).userData?.type === 'line') {
      const role = (clickedObject as any).userData?.role as 'u'|'v';
      createOrUpdateFatEdge(p, role);
      uvAnchorRef.current = { target: 'edge', role };
    } else {
      // clear overlay
      if (fatEdgeRef.current?.line && sceneRef.current) sceneRef.current.remove(fatEdgeRef.current.line);
      fatEdgeRef.current = null;
    }
    (p.quad.material as THREE.MeshBasicMaterial).opacity = 0.44;
    selectedClickedObjectRef.current = clickedObject ?? null;
    // Set UV anchor for new selection
    const anyClicked: any = clickedObject as any;
    if (clickedObject && (anyClicked?.userData?.type === 'point')) uvAnchorRef.current = { target: 'point', role: (anyClicked.userData.role as any) };
    else if (clickedObject && (anyClicked?.userData?.type === 'line')) uvAnchorRef.current = { target: 'edge', role: (anyClicked.userData.role as any) };
    else uvAnchorRef.current = { target: 'group' };
    ensureAttachTarget(p);
    // Notify UI with selected role (point or edge)
    let role: 'main'|'u'|'v'|'edge_u'|'edge_v'|null = null;
    if (anyClicked && anyClicked.userData) {
      if (anyClicked.userData.type === 'point') {
        role = (anyClicked.userData.role as 'main'|'u'|'v') ?? null;
      } else if (anyClicked.userData.type === 'line') {
        role = ((anyClicked.userData.role as 'u'|'v') === 'u') ? 'edge_u' : 'edge_v';
      }
    }
    onSelectionChange?.({ patchId: p.id, role });
  }

  function createOrUpdateFatEdge(p: Patch, role: 'u'|'v') {
    const scene = sceneRef.current; if (!scene) return;
    const aLocal = p.points.main.position.clone();
    const bLocal = (role === 'u' ? p.points.u.position : p.points.v.position).clone();
    const aWorld = p.group.localToWorld(aLocal.clone());
    const bWorld = p.group.localToWorld(bLocal.clone());
    const positions = [aWorld.x, aWorld.y, aWorld.z, bWorld.x, bWorld.y, bWorld.z];
    if (!fatEdgeRef.current || !fatEdgeRef.current.line) {
      const geom = new LineGeometry();
      geom.setPositions(positions);
      const mat = new LineMaterial({ color: role === 'u' ? baseColors.u.getHex() : baseColors.v.getHex(), linewidth: 4, transparent: true, opacity: 1.0, depthTest: false });
      // set resolution immediately
      const renderer = rendererRef.current;
      if (renderer) {
        const size = new THREE.Vector2();
        renderer.getSize(size);
        (mat as any).resolution?.set?.(size.x, size.y);
      }
      const line2 = new Line2(geom, mat);
      line2.computeLineDistances();
      line2.renderOrder = 1000;
      scene.add(line2);
      fatEdgeRef.current = { role, line: line2 };
    } else {
      const geom = (fatEdgeRef.current.line!.geometry as LineGeometry);
      geom.setPositions(positions);
      const mat = (fatEdgeRef.current.line!.material as LineMaterial);
      mat.color.set(role === 'u' ? baseColors.u.getHex() : baseColors.v.getHex());
      const renderer = rendererRef.current;
      if (renderer) {
        const size = new THREE.Vector2();
        renderer.getSize(size);
        (mat as any).resolution?.set?.(size.x, size.y);
      }
      fatEdgeRef.current.role = role;
    }
  }

  function ensureAttachTarget(p: Patch) {
    const gizmo = gizmoRef.current; if (!gizmo) return;
    const mode = (gizmo as any).mode as 'translate'|'rotate'|'scale';
    const clicked: any = selectedClickedObjectRef.current;
    const scene = sceneRef.current; if (!scene) return;
    const needPivot = (mode === 'rotate' || mode === 'scale');
    if (modeRef.current === 'uv') { updateUVDoubleAxisForSelection(p); return; }
    const locked = lockedMainSetRef.current.has(p.id);
    if (!needPivot) {
      if (pivotRef.current) { scene.remove(pivotRef.current); pivotRef.current = null; }
      if (clicked && clicked.userData?.type === 'point') {
        gizmo.attach(clicked);
      } else if (clicked && clicked.userData?.type === 'line') {
        if (locked) { gizmo.attach(p.group); }
        else {
          const pivot = new THREE.Object3D();
          const a = p.points.main.position.clone();
          const b = (clicked.userData.role === 'u' ? p.points.u.position : p.points.v.position).clone();
          const midLocal = a.clone().add(b).multiplyScalar(0.5);
          const midWorld = p.group.localToWorld(midLocal.clone());
          pivot.position.copy(midWorld);
          scene.add(pivot); pivotRef.current = pivot; gizmo.attach(pivot);
        }
      } else {
        gizmo.attach(p.group);
      }
      return;
    }
    // Create/position pivot at desired world position (clicked point or group center)
    const pivot = pivotRef.current ?? new THREE.Object3D();
    const wp = new THREE.Vector3();
    if (clicked && clicked.userData?.type === 'point') (clicked as THREE.Object3D).getWorldPosition(wp);
    else if (clicked && clicked.userData?.type === 'line' && !locked) {
      const a = p.points.main.position.clone();
      const b = (clicked.userData.role === 'u' ? p.points.u.position : p.points.v.position).clone();
      const midLocal = a.clone().add(b).multiplyScalar(0.5);
      p.group.localToWorld(midLocal); wp.copy(midLocal);
    } else p.group.getWorldPosition(wp);
    pivot.position.copy(wp);
    pivot.quaternion.identity(); pivot.scale.set(1,1,1);
    if (!pivotRef.current) { scene.add(pivot); pivotRef.current = pivot; }
    gizmo.attach(pivot);
  }

  function updateUVGizmoForSelection(p: Patch) {
    const gizmo = gizmoRef.current; const scene = sceneRef.current; if (!gizmo || !scene) return;
    // Build UV basis from pu/pv world directions
    const mW = p.points.main.position.clone(); p.group.localToWorld(mW);
    const uW = p.points.u.position.clone(); p.group.localToWorld(uW);
    const vW = p.points.v.position.clone(); p.group.localToWorld(vW);
    let uDir = uW.clone().sub(mW); let vDir = vW.clone().sub(mW);
    if (uDir.lengthSq() < 1e-12) uDir.set(1,0,0);
    if (vDir.lengthSq() < 1e-12) vDir.set(0,0,1);
    uDir.normalize();
    vDir.sub(uDir.clone().multiplyScalar(vDir.dot(uDir))).normalize();
    let zDir = new THREE.Vector3().crossVectors(uDir, vDir);
    if (zDir.lengthSq() < 1e-12) zDir.set(0,1,0); else zDir.normalize();
    const basis = new THREE.Matrix4().makeBasis(uDir, vDir, zDir);
    const q = new THREE.Quaternion().setFromRotationMatrix(basis);
    const uv = uvFrameRef.current ?? new THREE.Object3D();
    const attachPos = new THREE.Vector3();
    const clicked: any = selectedClickedObjectRef.current;
    if (clicked && clicked.userData?.type === 'point') (clicked as THREE.Object3D).getWorldPosition(attachPos); else p.group.getWorldPosition(attachPos);
    uv.position.copy(attachPos);
    uv.quaternion.copy(q);
    if (!uvFrameRef.current) { scene.add(uv); uvFrameRef.current = uv; }
    // Attach gizmo to uv frame with X/Y only
    (gizmo as any).setMode?.('translate');
    (gizmo as any).setSpace?.('local');
    (gizmo as any).showX = true; (gizmo as any).showY = true; (gizmo as any).showZ = false;
    gizmo.attach(uv);
  }

  function updateUVDoubleAxisForSelection(p: Patch) {
    const scene = sceneRef.current; if (!scene) return;
    const clicked: any = selectedClickedObjectRef.current;
    const mW = p.points.main.position.clone(); p.group.localToWorld(mW);
    const uW = p.points.u.position.clone(); p.group.localToWorld(uW);
    const vW = p.points.v.position.clone(); p.group.localToWorld(vW);
    let uDir = uW.clone().sub(mW); if (uDir.lengthSq() < 1e-12) uDir.set(1,0,0); uDir.normalize();
    let vDir = vW.clone().sub(mW); if (vDir.lengthSq() < 1e-12) vDir.set(0,0,1); vDir.normalize();
    const anchor = new THREE.Vector3();
    const anchorSpec = uvAnchorRef.current;
    if (anchorSpec && anchorSpec.target === 'point' && anchorSpec.role) {
      const obj = p.points[anchorSpec.role] as THREE.Object3D; obj.getWorldPosition(anchor);
    } else if (anchorSpec && anchorSpec.target === 'edge' && anchorSpec.role) {
      const aLocal = p.points.main.position.clone();
      const bLocal = (anchorSpec.role === 'u' ? p.points.u.position : p.points.v.position).clone();
      const midLocal = aLocal.clone().add(bLocal).multiplyScalar(0.5);
      const midWorld = p.group.localToWorld(midLocal.clone());
      anchor.copy(midWorld);
    } else if (clicked && clicked.userData?.type === 'point') {
      (clicked as THREE.Object3D).getWorldPosition(anchor);
    } else if (clicked && clicked.userData?.type === 'line') {
      const role = (clicked.userData.role as 'u'|'v');
      const aLocal = p.points.main.position.clone();
      const bLocal = (role === 'u' ? p.points.u.position : p.points.v.position).clone();
      const midLocal = aLocal.clone().add(bLocal).multiplyScalar(0.5);
      const midWorld = p.group.localToWorld(midLocal.clone());
      anchor.copy(midWorld);
    } else {
      p.group.getWorldPosition(anchor);
    }
    // Align U handle local Y(0,1,0) to pu; V handle local Z(0,0,1) to pv
    const qU = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), uDir);
    const qV = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1), vDir);
    const makeHandle = (ref: React.MutableRefObject<THREE.Object3D | null>, q: THREE.Quaternion) => {
      const obj = ref.current ?? new THREE.Object3D();
      obj.position.copy(anchor);
      obj.quaternion.copy(q);
      if (!ref.current) { scene.add(obj); ref.current = obj; }
    };
    makeHandle(uvHandleURef, qU);
    makeHandle(uvHandleVRef, qV);
    const showOnlyAxis = (ctrl: TransformControls, axisChar: 'X'|'Y'|'Z') => {
      ctrl.traverse((obj: any) => {
        const name: string = obj?.name ?? '';
        if (!name) return;
        const ok = (name === axisChar || name.startsWith(axisChar));
        if (typeof obj.visible === 'boolean') obj.visible = ok;
      });
    };
    const setupCtrl = (ref: React.MutableRefObject<TransformControls | null>, handle: THREE.Object3D | null, axisChar: 'Y'|'Z') => {
      if (!ref.current || !handle) return;
      const ctrl = ref.current;
      ctrl.setMode('translate');
      (ctrl as any).setSpace?.('local');
      (ctrl as any).showX = false; (ctrl as any).showY = (axisChar === 'Y'); (ctrl as any).showZ = (axisChar === 'Z');
      ctrl.attach(handle);
      ctrl.visible = true;
      showOnlyAxis(ctrl, axisChar);
    };
    // U: only Y axis (green), V: only Z axis (blue)
    setupCtrl(uvCtrlURef, uvHandleURef.current, 'Y');
    setupCtrl(uvCtrlVRef, uvHandleVRef.current, 'Z');
  }

  function measurePatchSpan(p: Patch) {
    const a = p.points.u.position.clone().sub(p.points.main.position).length();
    const b = p.points.v.position.clone().sub(p.points.main.position).length();
    return Math.max(1e-6, (a + b) * 0.5);
  }

  function applyPivotDelta(p: Patch, mode: 'rotate'|'scale', lastScale: THREE.Vector3, lastQuat: THREE.Quaternion) {
    const pivot = pivotRef.current!;
    const gizmo = gizmoRef.current!;
    const groupWorldQuat = new THREE.Quaternion(); p.group.getWorldQuaternion(groupWorldQuat);
    const pivotLocal = p.group.worldToLocal(pivot.position.clone());
    if (mode === 'scale') {
      // Determine which handle is active: 'X' | 'Y' | 'Z' | 'XYZ' | null
      const axisName = (gizmo as any).axis as string | null;
      const s = pivot.scale.clone();
      // Tuning: allow wide range [0.1, 20] and lower sensitivity
      // Max reachable step equals exp(k); choose k = ln(20)
      const k = Math.log(20); // ~2.9957
      // Helper for mapping raw control scale -> step factor (path-independent)
      const mapScale = (raw: number) => {
        const v = Math.max(1e-6, raw);
        // Nonlinear warping to adjust sensitivity:
        // - Shrink side (u > 0): gamma > 1 to make near-0.1 slower
        // - Expand side (u < 0): gamma < 1 to make near-20 faster
        let u = 1 / v - 1; // in (-1, +inf)
        // Make both sides less sensitive near 1.0
        // Larger exponents => milder response for small drags
        const gammaShrink = 1.7; // u>0 (towards 0.1)
        const gammaExpand = 1.8; // u<0 (towards 20)
        if (u > 0) u = Math.pow(u, gammaShrink);
        else if (u < 0) u = -Math.pow(-u, gammaExpand);
        const step = Math.exp(-k * u);
        // Clamp to inclusive [0.1, 20]
        return Math.min(20.0, Math.max(0.1, step));
      };
      const snap = dragSnapshotRef.current;
      const pivotLocal0 = (snap && snap.patchId === p.id) ? snap.pivotLocal0 : pivotLocal;
      const main0 = (snap && snap.patchId === p.id) ? snap.main0 : p.points.main.position.clone();
      const u0 = (snap && snap.patchId === p.id) ? snap.u0 : p.points.u.position.clone();
      const v0 = (snap && snap.patchId === p.id) ? snap.v0 : p.points.v.position.clone();

      // Reset pivot for next event to avoid compounding
      pivot.scale.set(1,1,1); lastScale.set(1,1,1);

      // Compute transform under two modes:
      // - Uniform: scale all directions equally (center box 'XYZ', or undefined)
      // - Directional: scale only along the chosen axis, keep perpendicular unchanged
      const applyUniform = (stepUniform: number) => {
        const scalePointFrom0 = (orig: THREE.Vector3, dst: THREE.Vector3) => {
          const rel0 = orig.clone().sub(pivotLocal0).multiplyScalar(stepUniform);
          dst.copy(pivotLocal0.clone().add(rel0));
        };
        scalePointFrom0(main0, p.points.main.position);
        scalePointFrom0(u0, p.points.u.position);
        scalePointFrom0(v0, p.points.v.position);
      };

      const applyDirectional = (axisChar: 'X'|'Y'|'Z', stepAxis: number) => {
        // Axis orientation respects gizmo space (local/world)
        const space = (gizmo as any).space as 'local'|'world';
        const axisWorld = new THREE.Vector3(
          axisChar === 'X' ? 1 : 0,
          axisChar === 'Y' ? 1 : 0,
          axisChar === 'Z' ? 1 : 0,
        );
        if (space === 'local') axisWorld.applyQuaternion(groupWorldQuat);
        axisWorld.normalize();
        // Convert to group-local axis for editing the local point positions
        const invGroup = groupWorldQuat.clone().invert();
        const axisLocal = axisWorld.clone().applyQuaternion(invGroup).normalize();
        const scalePointAxisFrom0 = (orig: THREE.Vector3, dst: THREE.Vector3) => {
          const rel0 = orig.clone().sub(pivotLocal0);
          const t = rel0.dot(axisLocal); // component along axis
          const parallel = axisLocal.clone().multiplyScalar(t * stepAxis);
          const perp = rel0.clone().sub(axisLocal.clone().multiplyScalar(t));
          dst.copy(pivotLocal0.clone().add(parallel).add(perp));
        };
        const clicked: any = selectedClickedObjectRef.current;
        const locked = lockedMainSetRef.current.has(p.id);
        if (clicked && clicked.userData?.type === 'line' && !locked) {
          const edgeRole = (clicked.userData.role as 'u'|'v');
          scalePointAxisFrom0(main0, p.points.main.position);
          if (edgeRole === 'u') scalePointAxisFrom0(u0, p.points.u.position);
          else scalePointAxisFrom0(v0, p.points.v.position);
        } else {
          scalePointAxisFrom0(main0, p.points.main.position);
          scalePointAxisFrom0(u0, p.points.u.position);
          scalePointAxisFrom0(v0, p.points.v.position);
        }
      };

      // Route based on handle
      if (!axisName || axisName === 'E' || axisName === 'XYZ' || axisName.length > 1) {
        // Skip center-handle scale here; handled in pointermove for strict 2D mapping
        return;
      } else if (axisName === 'X' || axisName === 'Y' || axisName === 'Z') {
        const comp = axisName === 'X' ? s.x : axisName === 'Y' ? s.y : s.z;
        const stepAxis = mapScale(Math.max(1e-6, comp));
        applyDirectional(axisName, stepAxis);
      } else {
        // Unknown axis: do nothing
        return;
      }

      updatePatchGeometry(p);
      return;
    }
    if (mode === 'rotate') {
      // When pointer-based rotation is active, objectChange will be ignored
      return;
    }
  }

  function deletePatch(patchId: number) {
    const p = patchesRef.current.get(patchId); if (!p || !sceneRef.current) return;
    if (selectedPatchRef.current?.id === patchId) clearSelection();
    sceneRef.current!.remove(p.group);
    p.objects.forEach(o => {
      const anyObj = o as any;
      if (anyObj.geometry) anyObj.geometry.dispose();
      if (anyObj.material) Array.isArray(anyObj.material) ? anyObj.material.forEach((m: any) => m.dispose()) : anyObj.material.dispose();
    });
    patchesRef.current.delete(patchId);
  }

  function createPatch(center: THREE.Vector3) {
    const scene = sceneRef.current; if (!scene) return null;
    const id = patchIdCounterRef.current++;
    const group = new THREE.Group();
    const mainPoint = createPoint(center, id, 'main');
    const uPoint = createPoint(center.clone().add(new THREE.Vector3(1, 0, 0)), id, 'u');
    const vPoint = createPoint(center.clone().add(new THREE.Vector3(0, 0, 1)), id, 'v');
    const lineMaterial = new THREE.LineBasicMaterial({ color: baseColors.line, transparent: true, opacity: LINE_OPACITY });
    const uLine = new THREE.Line(new THREE.BufferGeometry(), lineMaterial.clone()); uLine.userData = { type: 'line', patchId: id, role: 'u' }; (uLine.material as THREE.LineBasicMaterial).color.copy(baseColors.u);
    const vLine = new THREE.Line(new THREE.BufferGeometry(), lineMaterial.clone()); vLine.userData = { type: 'line', patchId: id, role: 'v' }; (vLine.material as THREE.LineBasicMaterial).color.copy(baseColors.v);
    const quadMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.165 });
    const quad = new THREE.Mesh(new THREE.BufferGeometry(), quadMaterial); quad.userData = { type: 'quad', patchId: id };
    group.add(mainPoint, uPoint, vPoint, uLine, vLine, quad);
    const color = new THREE.Color(randomColorHex());
    (mainPoint.material as THREE.SpriteMaterial).color.copy(color);
    (quad.material as THREE.MeshBasicMaterial).color.copy(color);
    const patch: Patch = { id, name: `组 ${id}`, color, points: { main: mainPoint, u: uPoint, v: vPoint }, lines: { u: uLine, v: vLine }, quad, group, baseSpan: 1, objects: [mainPoint, uPoint, vPoint, uLine, vLine, quad] };
    // Initial recenter to place group origin at parallelogram center
    updatePatchGeometry(patch);
    patch.baseSpan = measurePatchSpan(patch);
    scene.add(group);
    patchesRef.current.set(id, patch);
    return patch;
  }

  function serializePatchesWorld(): PatchDTO[] {
    const out: PatchDTO[] = [];
    patchesRef.current.forEach(p => {
      const mW = p.points.main.position.clone(); p.group.localToWorld(mW);
      const uW = p.points.u.position.clone(); p.group.localToWorld(uW);
      const vW = p.points.v.position.clone(); p.group.localToWorld(vW);
      out.push({ id: p.id, name: p.name, color: `#${p.color.getHexString()}`, main: [mW.x, mW.y, mW.z], u: [uW.x, uW.y, uW.z], v: [vW.x, vW.y, vW.z] });
    });
    return out;
  }

  function rebuildPatchesFromDTO(arr: PatchDTO[]) {
    const scene = sceneRef.current; if (!scene) return;
    patchesRef.current.forEach(p => {
      scene.remove(p.group);
      p.objects.forEach(o => {
        const anyObj = o as any;
        if (anyObj.geometry) anyObj.geometry.dispose();
        if (anyObj.material) Array.isArray(anyObj.material) ? anyObj.material.forEach((m: any) => m.dispose()) : anyObj.material.dispose();
      });
    });
    patchesRef.current.clear();
    let maxId = -1;
    arr.forEach(dto => {
      const id = dto.id; maxId = Math.max(maxId, id);
      const group = new THREE.Group();
      const mainPoint = createPoint(new THREE.Vector3(...dto.main), id, 'main');
      const uPoint = createPoint(new THREE.Vector3(...dto.u), id, 'u');
      const vPoint = createPoint(new THREE.Vector3(...dto.v), id, 'v');
      const lineMaterial = new THREE.LineBasicMaterial({ color: baseColors.line, transparent: true, opacity: LINE_OPACITY });
      const uLine = new THREE.Line(new THREE.BufferGeometry(), lineMaterial.clone()); uLine.userData = { type: 'line', patchId: id, role: 'u' }; (uLine.material as THREE.LineBasicMaterial).color.copy(baseColors.u);
      const vLine = new THREE.Line(new THREE.BufferGeometry(), lineMaterial.clone()); vLine.userData = { type: 'line', patchId: id, role: 'v' }; (vLine.material as THREE.LineBasicMaterial).color.copy(baseColors.v);
      const quadMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.165 });
      const quad = new THREE.Mesh(new THREE.BufferGeometry(), quadMaterial); quad.userData = { type: 'quad', patchId: id };
      group.add(mainPoint, uPoint, vPoint, uLine, vLine, quad);
      const color = new THREE.Color(dto.color ?? randomColorHex());
      (mainPoint.material as THREE.SpriteMaterial).color.copy(color);
      (quad.material as THREE.MeshBasicMaterial).color.copy(color);
      const patch: Patch = { id, name: dto.name ?? `组 ${id}`, color, points: { main: mainPoint, u: uPoint, v: vPoint }, lines: { u: uLine, v: vLine }, quad, group, baseSpan: 1, objects: [mainPoint, uPoint, vPoint, uLine, vLine, quad] };
      updatePatchGeometry(patch);
      patch.baseSpan = measurePatchSpan(patch);
      scene.add(group);
      patchesRef.current.set(id, patch);
    });
    patchIdCounterRef.current = Math.max(patchIdCounterRef.current, maxId + 1);
    clearSelection();
  }

  function emitChange(commit = false, reason?: string) {
    if (!onPatchesChange) return;
    onPatchesChange(serializePatchesWorld(), commit ? { commit: true, reason } : undefined);
  }

  useImperativeHandle(ref, () => ({
    addPatch: (center) => {
      let pos: THREE.Vector3;
      if (center && (center.x !== undefined || center.y !== undefined || center.z !== undefined)) {
        pos = new THREE.Vector3(center.x ?? 0, center.y ?? 0, center.z ?? 0);
      } else if (boundsRef.current) {
        const { minX, maxX, minY, maxY, minZ, maxZ } = boundsRef.current;
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const cz = (minZ + maxZ) / 2;
        const rX = maxX - minX, rY = maxY - minY, rZ = maxZ - minZ;
        const jitter = Math.max(rX, rY, rZ) * 0.15; // small random offset inside the visible region
        pos = new THREE.Vector3(
          cx + THREE.MathUtils.randFloatSpread(jitter),
          cy + THREE.MathUtils.randFloatSpread(jitter * 0.4),
          cz + THREE.MathUtils.randFloatSpread(jitter)
        );
      } else {
        pos = new THREE.Vector3(THREE.MathUtils.randFloatSpread(5), 0, THREE.MathUtils.randFloatSpread(5));
      }
      const p = createPatch(pos); if (!p) return null; setSelection(p, p.points.main); emitChange(true, 'add-patch'); return p.id;
    },
    deleteSelectedPatch: () => { const sel = selectedPatchRef.current; if (sel) { deletePatch(sel.id); emitChange(true, 'delete-patch'); } },
    clearSelection: () => { clearSelection(); },
    getPatches: () => serializePatchesWorld(),
    setPatches: (arr) => { rebuildPatchesFromDTO(arr); emitChange(true, 'apply-snapshot'); },
    renamePatch: (patchId, name) => { const p = patchesRef.current.get(patchId); if (p) { p.name = name; emitChange(true, 'rename'); } },
    updatePatchColor: (patchId: number, colorHex: string) => {
      const p = patchesRef.current.get(patchId); if (!p) return;
      const c = new THREE.Color(colorHex);
      p.color.copy(c);
      (p.points.main.material as THREE.SpriteMaterial).color.copy(c);
      (p.quad.material as THREE.MeshBasicMaterial).color.copy(c);
      emitChange(true, 'recolor');
    },
    updatePointWorld: (patchId, role, coord) => {
      const p = patchesRef.current.get(patchId); if (!p) return;
      const w = new THREE.Vector3(coord.x, coord.y, coord.z);
      const local = p.group.worldToLocal(w.clone());
      p.points[role].position.copy(local);
      updatePatchGeometry(p); emitChange(false, 'point-change');
    },
    setTransformMode: (mode) => {
      modeRef.current = mode as any;
      const gizmo = gizmoRef.current; const scene = sceneRef.current; const sel = selectedPatchRef.current;
      if (mode === 'uv') {
        // Hide main gizmo and show dual single-axis
        if (gizmo) { gizmo.detach(); }
        if (sel) updateUVDoubleAxisForSelection(sel);
      } else {
        // Cleanup UV helper when leaving uv mode
        if (uvFrameRef.current && scene && gizmo) { gizmo.detach(); scene.remove(uvFrameRef.current); uvFrameRef.current = null; }
        // Hide and detach dual controls
        if (uvCtrlURef.current) { try { uvCtrlURef.current.detach(); } catch {} uvCtrlURef.current.visible = false; }
        if (uvCtrlVRef.current) { try { uvCtrlVRef.current.detach(); } catch {} uvCtrlVRef.current.visible = false; }
        if (uvHandleURef.current && scene) { scene.remove(uvHandleURef.current); uvHandleURef.current = null; }
        if (uvHandleVRef.current && scene) { scene.remove(uvHandleVRef.current); uvHandleVRef.current = null; }
        if (gizmo) { (gizmo as any).showX = true; (gizmo as any).showY = true; (gizmo as any).showZ = true; gizmo.setMode(mode as any); }
        if (sel) ensureAttachTarget(sel);
      }
    },
    setTransformSpace: (space) => { gizmoRef.current?.setSpace(space); const sel = selectedPatchRef.current; if (sel) ensureAttachTarget(sel); },
    focusOnTrajectory: () => {
      const cam = cameraRef.current, orbit = orbitRef.current; const b = boundsRef.current; if (!cam || !orbit || !b) return;
      const { minX, maxX, minY, maxY, minZ, maxZ } = b;
      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
      const rX = maxX - minX, rY = maxY - minY, rZ = maxZ - minZ;
      const d = computeDesiredDistance(Math.max(rX, rY, rZ) || 1);
      cam.position.set(cx + d * 0.7, cy + d * 0.7, cz + d * 0.7);
      cam.lookAt(cx, cy, cz);
      orbit.target.set(cx, cy, cz); orbit.update();
      lastFramedBoundsRef.current = { minX, maxX, minY, maxY, minZ, maxZ };
    },
    setMainLocked: (patchId: number, locked: boolean) => {
      if (locked) lockedMainSetRef.current.add(patchId); else lockedMainSetRef.current.delete(patchId);
    },
    commit: (reason?: string) => { emitChange(true, reason ?? 'manual-commit'); },
  }), []);

  useEffect(() => {
    const mount = mountRef.current; if (!mount) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e0f12);
    sceneRef.current = scene;

    const width0 = mount.clientWidth || 1;
    const height0 = mount.clientHeight || 1;
    const camera = new THREE.PerspectiveCamera(60, width0 / height0, 0.1, 1000);
    camera.position.set(30, 24, 36);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width0, height0, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    rendererRef.current = renderer;

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbitRef.current = orbit;
    // Mark any camera interaction so we won't auto-frame on param-only tweaks
    orbit.addEventListener('start', () => { userInteractedRef.current = true; });

    // Lights
    scene.add(new THREE.AmbientLight(0xcccccc, 0.5));
    let detachDebugHandlers: (() => void) | null = null;
    if (debug) {
      const gizmo = new TransformControls(camera, renderer.domElement);
      gizmo.setSize(0.7);
      const lastScale = new THREE.Vector3(1,1,1);
      const lastQuat = new THREE.Quaternion();
      gizmo.addEventListener('dragging-changed', (e: any) => { 
        orbit.enabled = !e.value; 
        const sel = selectedPatchRef.current;
        const mode = (gizmo as any).mode as 'translate'|'rotate'|'scale';
        if (e.value) {
          lastScale.set(1,1,1); lastQuat.identity();
          if (sel) {
            ensureAttachTarget(sel);
            // Setup UV drag baseline on start
            if (modeRef.current === 'uv' && uvFrameRef.current) {
              const clicked: any = selectedClickedObjectRef.current;
              uvDragRef.current = {
                patchId: sel.id,
                target: (clicked && clicked.userData?.type === 'point') ? 'point' : 'group',
                role: (clicked && clicked.userData?.type === 'point') ? (clicked.userData.role as any) : undefined,
                startPosWorld: uvFrameRef.current.position.clone(),
                startGroupPos: (() => { const gpos = new THREE.Vector3(); sel.group.getWorldPosition(gpos); return gpos; })(),
                startPointLocal: (clicked && clicked.userData?.type === 'point') ? (clicked as THREE.Object3D).position.clone() : undefined,
              };
            }
            if (pivotRef.current) {
              const pivotLocal0 = sel.group.worldToLocal(pivotRef.current.position.clone());
              dragSnapshotRef.current = {
                patchId: sel.id,
                main0: sel.points.main.position.clone(),
                u0: sel.points.u.position.clone(),
                v0: sel.points.v.position.clone(),
                pivotLocal0,
                scale0: measurePatchSpan(sel) / Math.max(1e-6, sel.baseSpan),
                pointerStart: { ...lastPointerRef.current },
              };
              const clicked: any = selectedClickedObjectRef.current;
              if (clicked && clicked.userData?.type === 'line') {
                dragSnapshotRef.current.edgeRole = (clicked.userData.role as 'u'|'v');
              }
            } else {
              dragSnapshotRef.current = null;
            }
            // record main position for locked-main behavior on translate
            const obj: any = (gizmo as any).object;
            if (obj && obj.userData && obj.userData.type === 'point' && obj.userData.role === 'main' && lockedMainSetRef.current.has(sel.id) && mode === 'translate') {
              lastMainDuringDragRef.current = sel.points.main.position.clone();
            } else {
              lastMainDuringDragRef.current = null;
            }
            // record pivot world pos for edge-translate
            const clicked: any = selectedClickedObjectRef.current;
            if (clicked && clicked.userData?.type === 'line' && mode === 'translate' && pivotRef.current && !lockedMainSetRef.current.has(sel.id)) {
              const wp = new THREE.Vector3(); pivotRef.current.getWorldPosition(wp); lastPivotDuringDragRef.current = wp.clone();
            } else {
              lastPivotDuringDragRef.current = null;
            }
          }
        } else {
        if (modeRef.current === 'uv') { uvDragRef.current = null; suppressPickUntilRef.current = performance.now() + 180; }
          // Keep pivot at last location to preserve axes position
          dragSnapshotRef.current = null;
          lastMainDuringDragRef.current = null;
          lastPivotDuringDragRef.current = null;
          // Suppress scene picking for a short moment to avoid up->click
          suppressPickUntilRef.current = performance.now() + 180;
          uvOverHandleRef.current = false;
          if (sel) { updatePatchGeometry(sel); emitChange(true, 'drag-end'); if (modeRef.current === 'uv') updateUVDoubleAxisForSelection(sel); }
        }
      });
      gizmo.addEventListener('objectChange', () => { 
        const sel = selectedPatchRef.current; if (!sel) return;
        const mode = (gizmo as any).mode as 'translate'|'rotate'|'scale';
        // Custom UV translate handling
        if (modeRef.current === 'uv') {
          const uv = uvFrameRef.current; const info = uvDragRef.current; if (!uv || !info) return;
          const cur = uv.position.clone();
          const rawDeltaW = cur.clone().sub(info.startPosWorld);
          // Project raw gizmo movement onto its local X/Y to get scalar distances
          const xAxis = new THREE.Vector3(1,0,0).applyQuaternion(uv.quaternion).normalize();
          const yAxis = new THREE.Vector3(0,1,0).applyQuaternion(uv.quaternion).normalize();
          const sx = rawDeltaW.dot(xAxis);
          const sy = rawDeltaW.dot(yAxis);
          // Build pu/pv direction (unit) in world space (not orthogonalized)
          const mW = sel.points.main.position.clone(); sel.group.localToWorld(mW);
          const uW = sel.points.u.position.clone(); sel.group.localToWorld(uW);
          const vW = sel.points.v.position.clone(); sel.group.localToWorld(vW);
          const uDir = uW.sub(mW); const vDir = vW.sub(mW);
          if (uDir.lengthSq() < 1e-12 && vDir.lengthSq() < 1e-12) return;
          if (uDir.lengthSq() < 1e-12) uDir.set(1,0,0);
          if (vDir.lengthSq() < 1e-12) vDir.set(0,0,1);
          uDir.normalize(); vDir.normalize();
          const mappedDeltaW = uDir.multiplyScalar(sx).add(vDir.multiplyScalar(sy));
          // Reposition uv frame to the mapped position to avoid drift
          const mappedPos = info.startPosWorld.clone().add(mappedDeltaW);
          uv.position.copy(mappedPos);
          if (info.target === 'point' && info.role) {
            const group = sel.group;
            const a = group.worldToLocal(info.startPosWorld.clone());
            const b = group.worldToLocal(mappedPos.clone());
            const dLocal = b.sub(a);
            const baseLocal = info.startPointLocal!.clone();
            sel.points[info.role].position.copy(baseLocal.add(dLocal));
            updatePatchGeometry(sel); emitChange();
          } else {
            // Move whole group by mapped world delta
            const parent = sel.group.parent as THREE.Object3D | null;
            if (parent) {
              const newWorld = new THREE.Vector3(); sel.group.getWorldPosition(newWorld);
              newWorld.add(mappedDeltaW);
              const newLocal = parent.worldToLocal(newWorld.clone());
              sel.group.position.copy(newLocal);
              emitChange();
            }
          }
          // Incremental baseline
          info.startPosWorld.copy(mappedPos);
          if (info.target === 'point' && info.role) info.startPointLocal = sel.points[info.role].position.clone();
          return;
        }
        if (pivotRef.current && (mode === 'rotate' || mode === 'scale')) {
          applyPivotDelta(sel, mode, lastScale, lastQuat);
          emitChange();
        } else {
          // If dragging main point and locked, shift u/v by delta to keep relative offsets
          const obj: any = (gizmo as any).object;
          if (mode === 'translate' && obj && obj.userData && obj.userData.type === 'point' && obj.userData.role === 'main' && lockedMainSetRef.current.has(sel.id) && lastMainDuringDragRef.current) {
            const curMain = sel.points.main.position;
            const delta = curMain.clone().sub(lastMainDuringDragRef.current);
            if (delta.lengthSq() !== 0) {
              sel.points.u.position.add(delta);
              sel.points.v.position.add(delta);
              lastMainDuringDragRef.current.copy(curMain);
            }
          }
          // Edge translate: move endpoints with pivot delta (unlocked)
          if (mode === 'translate' && pivotRef.current && lastPivotDuringDragRef.current) {
            const clicked: any = selectedClickedObjectRef.current;
            const locked = lockedMainSetRef.current.has(sel.id);
            if (clicked && clicked.userData?.type === 'line' && !locked) {
              const prevW = lastPivotDuringDragRef.current.clone();
              const curW = new THREE.Vector3(); pivotRef.current.getWorldPosition(curW);
              const prevL = sel.group.worldToLocal(prevW.clone());
              const curL = sel.group.worldToLocal(curW.clone());
              const deltaL = curL.clone().sub(prevL);
              sel.points.main.position.add(deltaL);
              if (clicked.userData.role === 'u') sel.points.u.position.add(deltaL); else sel.points.v.position.add(deltaL);
              lastPivotDuringDragRef.current.copy(curW);
            }
          }
          updatePatchGeometry(sel); emitChange();
        }
      });
      // Create dual single-axis UV controls (hidden by default)
      const uvCtrlU = new TransformControls(camera, renderer.domElement);
      uvCtrlU.setSize(0.7); (uvCtrlU as any).setSpace?.('local'); (uvCtrlU as any).showX = true; (uvCtrlU as any).showY = false; (uvCtrlU as any).showZ = false; uvCtrlU.visible = false; scene.add(uvCtrlU); uvCtrlURef.current = uvCtrlU;
      const uvCtrlV = new TransformControls(camera, renderer.domElement);
      uvCtrlV.setSize(0.7); (uvCtrlV as any).setSpace?.('local'); (uvCtrlV as any).showX = true; (uvCtrlV as any).showY = false; (uvCtrlV as any).showZ = false; uvCtrlV.visible = false; scene.add(uvCtrlV); uvCtrlVRef.current = uvCtrlV;
      const beginUVDrag = (which: 'u'|'v') => {
        const sel = selectedPatchRef.current; if (!sel) return;
        const clicked: any = selectedClickedObjectRef.current;
        const handle = which === 'u' ? uvHandleURef.current : uvHandleVRef.current; if (!handle) return;
        // Build drag record; treat a clicked line as an 'edge' target
        const isPoint = (clicked && clicked.userData?.type === 'point');
        const isEdge = (clicked && clicked.userData?.type === 'line');
        const rec = {
          patchId: sel.id,
          target: isPoint ? 'point' : (isEdge ? 'edge' : 'group'),
          role: isPoint ? (clicked.userData.role as any) : undefined,
          edgeRole: isEdge ? (clicked.userData.role as 'u'|'v') : undefined,
          startPosWorld: handle.position.clone(),
          startGroupPos: (() => { const g = new THREE.Vector3(); sel.group.getWorldPosition(g); return g; })(),
          startPointLocal: isPoint ? (clicked as THREE.Object3D).position.clone() : undefined,
        } as const;
        if (which === 'u') uvUDragRef.current = rec; else uvVDragRef.current = rec;
        uvAnyDraggingRef.current = true; orbit.enabled = false;
        // Lock anchor spec based on current target
        if (rec.target === 'point' && rec.role) uvAnchorRef.current = { target: 'point', role: rec.role };
        else if (rec.target === 'edge' && rec.edgeRole) uvAnchorRef.current = { target: 'edge', role: rec.edgeRole };
        else uvAnchorRef.current = { target: 'group' };
      };
      const endUVDrag = () => {
        uvUDragRef.current = null; uvVDragRef.current = null; uvAnyDraggingRef.current = false; orbit.enabled = true; const sel = selectedPatchRef.current; if (sel) { updatePatchGeometry(sel); emitChange(true, 'uv-drag-end'); if (modeRef.current === 'uv') updateUVDoubleAxisForSelection(sel); }
      };
      const onUVObjectChange = (which: 'u'|'v') => {
        const sel = selectedPatchRef.current; if (!sel) return; const handle = which === 'u' ? uvHandleURef.current : uvHandleVRef.current; if (!handle) return; const rec = which === 'u' ? uvUDragRef.current : uvVDragRef.current; if (!rec) return;
        // compute scalar along handle axis (U: local Y, V: local Z)
        const axis = (which === 'u') ? new THREE.Vector3(0,1,0).applyQuaternion(handle.quaternion).normalize()
                                     : new THREE.Vector3(0,0,1).applyQuaternion(handle.quaternion).normalize();
        const deltaW = handle.position.clone().sub(rec.startPosWorld);
        const s = deltaW.dot(axis);
        // map to pu/pv unit direction
        const mW = sel.points.main.position.clone(); sel.group.localToWorld(mW);
        const dirW = (which === 'u' ? sel.points.u.position.clone() : sel.points.v.position.clone()); sel.group.localToWorld(dirW);
        const vec = dirW.sub(mW); if (vec.lengthSq() < 1e-12) vec.set(which === 'u' ? 1 : 0, 0, which === 'v' ? 1 : 0); vec.normalize();
        const mappedDeltaW = vec.multiplyScalar(s);
        const mappedPos = rec.startPosWorld.clone().add(mappedDeltaW);
        handle.position.copy(mappedPos);
        // The other axis follows completely
        const otherHandle = which === 'u' ? uvHandleVRef.current : uvHandleURef.current; if (otherHandle) otherHandle.position.copy(mappedPos);
        if (rec.target === 'point' && rec.role) {
          const a = sel.group.worldToLocal(rec.startPosWorld.clone()); const b = sel.group.worldToLocal(mappedPos.clone()); const dLocal = b.sub(a);
          const baseLocal = rec.startPointLocal!.clone(); sel.points[rec.role].position.copy(baseLocal.add(dLocal)); updatePatchGeometry(sel); emitChange();
        } else if (rec.target === 'edge' && rec.edgeRole) {
          // Move main + selected edge endpoint together; third point remains
          const a = sel.group.worldToLocal(rec.startPosWorld.clone());
          const b = sel.group.worldToLocal(mappedPos.clone());
          const dLocal = b.sub(a);
          sel.points.main.position.add(dLocal);
          if (rec.edgeRole === 'u') sel.points.u.position.add(dLocal); else sel.points.v.position.add(dLocal);
          updatePatchGeometry(sel); emitChange();
        } else {
          const parent = sel.group.parent as THREE.Object3D | null;
          if (parent) {
            const newWorld = new THREE.Vector3();
            sel.group.getWorldPosition(newWorld);
            newWorld.add(mappedDeltaW);
            const newLocal = parent.worldToLocal(newWorld.clone());
            sel.group.position.copy(newLocal);
            emitChange();
            // Keep fat edge overlay in sync when dragging an edge anchor in UV mode
            const clickedAny: any = selectedClickedObjectRef.current;
            if (clickedAny && clickedAny.userData?.type === 'line' && fatEdgeRef.current?.line) {
              const role = (clickedAny.userData.role as 'u'|'v');
              createOrUpdateFatEdge(sel, role);
            }
          }
        }
        // incremental baseline
        if (which === 'u') uvUDragRef.current!.startPosWorld.copy(mappedPos); else uvVDragRef.current!.startPosWorld.copy(mappedPos);
        if (rec.target === 'point' && rec.role) { if (which === 'u') uvUDragRef.current!.startPointLocal = sel.points[rec.role].position.clone(); else uvVDragRef.current!.startPointLocal = sel.points[rec.role].position.clone(); }
      };
      uvCtrlU.addEventListener('dragging-changed', (e: any) => { if (e.value) beginUVDrag('u'); else { suppressPickUntilRef.current = performance.now() + 180; uvOverHandleRef.current = false; endUVDrag(); } });
      uvCtrlV.addEventListener('dragging-changed', (e: any) => { if (e.value) beginUVDrag('v'); else { suppressPickUntilRef.current = performance.now() + 180; uvOverHandleRef.current = false; endUVDrag(); } });
      uvCtrlU.addEventListener('hoveron', () => { uvOverHandleRef.current = true; });
      uvCtrlU.addEventListener('hoveroff', () => { uvOverHandleRef.current = false; });
      uvCtrlV.addEventListener('hoveron', () => { uvOverHandleRef.current = true; });
      uvCtrlV.addEventListener('hoveroff', () => { uvOverHandleRef.current = false; });
      uvCtrlU.addEventListener('objectChange', () => onUVObjectChange('u'));
      uvCtrlV.addEventListener('objectChange', () => onUVObjectChange('v'));
      gizmo.setScaleSnap?.(0.05);
      scene.add(gizmo); gizmoRef.current = gizmo;

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const onPointerDown = (event: PointerEvent) => {
        // Suppress pick if within debounce window after a drag end
        if (performance.now() < suppressPickUntilRef.current) return;
        if (gizmoRef.current?.dragging || uvCtrlURef.current?.dragging || uvCtrlVRef.current?.dragging) return;
        lastPointerRef.current = { x: event.clientX, y: event.clientY };
        // 1) Try to pick scene objects first (points > others)
        const r = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - r.left) / r.width) * 2 - 1;
        pointer.y = -((event.clientY - r.top) / r.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const objs = Array.from(patchesRef.current.values()).flatMap(p => p.objects);
        const pointObjs = objs.filter(o => (o as any).userData && (o as any).userData.type === 'point');
        let hits = raycaster.intersectObjects(pointObjs as any, false);
        let chosen: THREE.Object3D | null = null;
        if (hits.length) {
          chosen = hits[0].object as THREE.Object3D;
        } else {
          // Prefer hitting lines first, then fall back to quads/others
          const lineObjs = objs.filter(o => (o as any).userData && (o as any).userData.type === 'line');
          const quadObjs = objs.filter(o => (o as any).userData && (o as any).userData.type === 'quad');
          // Compute a pixel-based world threshold for more reliable line picking
          const cam = cameraRef.current!;
          const rect = renderer.domElement.getBoundingClientRect();
          const b = boundsRef.current;
          const cx = b ? (b.minX + b.maxX) * 0.5 : 0;
          const cy = b ? (b.minY + b.maxY) * 0.5 : 0;
          const cz = b ? (b.minZ + b.maxZ) * 0.5 : 0;
          const center = new THREE.Vector3(cx, cy, cz);
          const dist = cam.position.distanceTo(center);
          const vFov = cam.fov * Math.PI / 180;
          const worldPerPixel = (2 * Math.tan(vFov / 2) * dist) / Math.max(1, rect.height);
          const thr = Math.max(0.002, Math.min(0.25, worldPerPixel * 8));
          (raycaster.params as any).Line = { threshold: thr } as any;
          hits = raycaster.intersectObjects(lineObjs as any, false);
          if (hits.length) {
            chosen = hits[0].object as THREE.Object3D;
          } else {
            // Fall back to quads and any other non-point visuals
            hits = raycaster.intersectObjects(quadObjs as any, false);
            if (!hits.length) {
              const others = objs.filter(o => (o as any).userData && (o as any).userData.type !== 'point' && (o as any).userData.type !== 'line' && (o as any).userData.type !== 'quad');
              hits = raycaster.intersectObjects(others as any, false);
            }
            if (hits.length) chosen = hits[0].object as THREE.Object3D;
          }
        }
        if (chosen) {
          const p = patchesRef.current.get((chosen as any).userData.patchId);
          if (p) { setSelection(p, chosen); return; }
        }
        // 2) No scene hit — even点击空白也不清除，保持当前选择
        // 单击或拖动空白处不取消选择（仅双击空白才清除，见 dblclick 处理）
        return;
      };
      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      const onDblClick = (event: MouseEvent) => {
        // 仅在双击空白处时清除选择
        if (performance.now() < suppressPickUntilRef.current) return;
        if (gizmoRef.current?.dragging || uvCtrlURef.current?.dragging || uvCtrlVRef.current?.dragging) return;
        const r = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - r.left) / r.width) * 2 - 1;
        pointer.y = -((event.clientY - r.top) / r.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const objs = Array.from(patchesRef.current.values()).flatMap(p => p.objects);
        const hits = raycaster.intersectObjects(objs as any, false);
        const mainAxis = (gizmoRef.current as any)?.axis;
        const uvAxisActive = ((uvCtrlURef.current as any)?.axis || (uvCtrlVRef.current as any)?.axis);
        const isOnUVHandle = (modeRef.current === 'uv') && uvOverHandleRef.current && uvAxisActive;
        if (!hits.length && !mainAxis && !isOnUVHandle) {
          clearSelection();
        }
      };
      renderer.domElement.addEventListener('dblclick', onDblClick);
      const onPointerMove = (event: PointerEvent) => {
        const gizmo = gizmoRef.current; const camera = cameraRef.current;
        if (!gizmo || !camera) return;
        if (!gizmo.dragging) { lastPointerRef.current = { x: event.clientX, y: event.clientY }; return; }
        const mode = (gizmo as any).mode as 'translate'|'rotate'|'scale';
        if (mode !== 'rotate' && mode !== 'scale') { lastPointerRef.current = { x: event.clientX, y: event.clientY }; return; }
        const sel = selectedPatchRef.current; const pivot = pivotRef.current; const snap = dragSnapshotRef.current;
        if (!sel || !pivot || !snap || snap.patchId !== sel.id) { lastPointerRef.current = { x: event.clientX, y: event.clientY }; return; }
        const pointerStart = snap.pointerStart ?? lastPointerRef.current;
        const axisName = (gizmo as any).axis as string | null;
        if (mode === 'rotate') {
          const dx = event.clientX - pointerStart.x;
          const dy = event.clientY - pointerStart.y;
          const rad = (dx - dy * 0.2) * rotateRadPerPixelRef.current;
          const space = (gizmo as any).space as 'local'|'world';
          let axisWorld = new THREE.Vector3(0,1,0);
          const camDir = new THREE.Vector3(); camera.getWorldDirection(camDir);
          if (!axisName || axisName === 'E' || axisName === 'XYZ' || axisName.length > 1) axisWorld.copy(camDir);
          else if (axisName.includes('X')) axisWorld.set(1,0,0);
          else if (axisName.includes('Y')) axisWorld.set(0,1,0);
          else if (axisName.includes('Z')) axisWorld.set(0,0,1);
          if (space === 'local') { const groupQuat = new THREE.Quaternion(); sel.group.getWorldQuaternion(groupQuat); axisWorld.applyQuaternion(groupQuat); }
          axisWorld.normalize();
          const invGroup = new THREE.Quaternion(); sel.group.getWorldQuaternion(invGroup).invert();
          const axisLocal = axisWorld.clone().applyQuaternion(invGroup).normalize();
          const deltaLocal = new THREE.Quaternion().setFromAxisAngle(axisLocal, rad);
          const pivotLocal0 = snap.pivotLocal0;
          const rotateFrom0 = (orig: THREE.Vector3, dst: THREE.Vector3) => {
            const rel0 = orig.clone().sub(pivotLocal0).applyQuaternion(deltaLocal);
            dst.copy(pivotLocal0.clone().add(rel0));
          };
          const clickedRot: any = selectedClickedObjectRef.current;
          const lockedRot = lockedMainSetRef.current.has(sel.id);
          if (clickedRot && clickedRot.userData?.type === 'line' && !lockedRot) {
            const edgeRole = (clickedRot.userData.role as 'u'|'v');
            rotateFrom0(snap.main0, sel.points.main.position);
            if (edgeRole === 'u') rotateFrom0(snap.u0, sel.points.u.position);
            else rotateFrom0(snap.v0, sel.points.v.position);
          } else {
            rotateFrom0(snap.main0, sel.points.main.position);
            rotateFrom0(snap.u0, sel.points.u.position);
            rotateFrom0(snap.v0, sel.points.v.position);
          }
          updatePatchGeometry(sel); emitChange(); pivot.quaternion.identity();
          lastPointerRef.current = { x: event.clientX, y: event.clientY };
          return;
        }
        // Scale with strict 2D mapping for center handle
        if (mode === 'scale' && (!axisName || axisName === 'E' || axisName === 'XYZ' || axisName.length > 1)) {
          const dy = event.clientY - pointerStart.y; // up (negative) => enlarge
          const alpha = uniformScaleAlphaRef.current;
          let step = Math.exp(-dy * alpha);
          step = Math.min(20, Math.max(0.1, step));
          const pivotLocal0 = snap.pivotLocal0;
          const scalePointFrom0 = (orig: THREE.Vector3, dst: THREE.Vector3) => {
            const rel0 = orig.clone().sub(pivotLocal0).multiplyScalar(step);
            dst.copy(pivotLocal0.clone().add(rel0));
          };
          const clicked: any = selectedClickedObjectRef.current;
          const locked = lockedMainSetRef.current.has(sel.id);
          if (clicked && clicked.userData?.type === 'line' && !locked) {
            const edgeRole = (clicked.userData.role as 'u'|'v');
            scalePointFrom0(snap.main0, sel.points.main.position);
            if (edgeRole === 'u') scalePointFrom0(snap.u0, sel.points.u.position);
            else scalePointFrom0(snap.v0, sel.points.v.position);
          } else {
            scalePointFrom0(snap.main0, sel.points.main.position);
            scalePointFrom0(snap.u0, sel.points.u.position);
            scalePointFrom0(snap.v0, sel.points.v.position);
          }
          updatePatchGeometry(sel); emitChange();
          lastPointerRef.current = { x: event.clientX, y: event.clientY };
          return;
        }
        // For other scale cases, let objectChange handle it
        lastPointerRef.current = { x: event.clientX, y: event.clientY };
      };
      renderer.domElement.addEventListener('pointermove', onPointerMove);
      detachDebugHandlers = () => {
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
        renderer.domElement.removeEventListener('dblclick', onDblClick);
        renderer.domElement.removeEventListener('pointermove', onPointerMove);
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      if (fatEdgeRef.current?.line) {
        const mat = fatEdgeRef.current.line.material as LineMaterial;
        (mat as any).resolution?.set?.(w, h);
      }
    });
    resizeObserver.observe(mount);

    const animate = () => {
      orbit.update();
      if (debug) {
        camera.getWorldPosition(cameraWorldPosRef.current);
        patchesRef.current.forEach(p => {
          Object.values(p.points).forEach(point => {
            point.getWorldPosition(pointWorldPosRef.current);
            const dist = cameraWorldPosRef.current.distanceTo(pointWorldPosRef.current);
            const FADE_MIN_DIST = 15, FADE_MAX_DIST = 40;
            const opacityFactor = 1.0 - THREE.MathUtils.smoothstep(dist, FADE_MIN_DIST, FADE_MAX_DIST);
            (point.material as THREE.SpriteMaterial).opacity = Math.max(0.2, opacityFactor);
          });
        });
      }
      // Keep axis labels at roughly constant screen size
      const sizeV = new THREE.Vector2();
      renderer.getSize(sizeV);
      const rH = sizeV.y || 1;
      const vFov = camera.fov * Math.PI / 180;
      const tmp = new THREE.Vector3();
      const tmpScale = new THREE.Vector3();
      for (const child of scene.children) {
        const ud: any = (child as any).userData;
        if (ud && ud.isLabel && child.type === 'Sprite') {
          const sprite = child as THREE.Sprite;
          sprite.getWorldPosition(tmp);
          const dist = camera.position.distanceTo(tmp);
          const desiredPx = ud.pixelHeight || 36;
          const worldHeight = 2 * Math.tan(vFov / 2) * dist * (desiredPx / rH);
          const mat = sprite.material as THREE.SpriteMaterial;
          const tex = mat.map as any;
          const ratio = (tex && tex.image && tex.image.width && tex.image.height) ? (tex.image.width / tex.image.height) : 4.0;
          sprite.scale.set(worldHeight * ratio, worldHeight, 1);
        }
      }
      // Keep points at roughly constant screen size and align pick area with visual size
      patchesRef.current.forEach(p => {
        Object.values(p.points).forEach(point => {
          const ud: any = (point as any).userData;
          if (ud && ud.isPointSprite) {
            point.getWorldPosition(tmp);
            const dist = camera.position.distanceTo(tmp);
            const desiredPx = ud.pixelHeight || pointSizePxRef.current;
            const worldHeight = 2 * Math.tan(vFov / 2) * dist * (desiredPx / rH);
            // Compensate parent world scale so sprite visual size is stable even when parent is scaled (pivot/group)
            const parentObj = (point.parent as THREE.Object3D) || scene;
            parentObj.getWorldScale(tmpScale);
            const parentScalar = Math.max(1e-6, (Math.abs(tmpScale.x) + Math.abs(tmpScale.y)) * 0.5);
            const localSize = worldHeight / parentScalar;
            (point as THREE.Sprite).scale.set(localSize, localSize, 1);
          }
        });
      });
      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);
    setReady(true);

    return () => {
      detachDebugHandlers?.();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      resizeObserver.disconnect();
      // Dispose OrbitControls instance to release event listeners
      orbit.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current; if (!scene) return;
    if (lineRef.current) {
      scene.remove(lineRef.current);
      lineRef.current.geometry.dispose();
      (lineRef.current.material as THREE.Material).dispose();
      lineRef.current = null;
    }

    const signal = external.signal; if (!signal || (signal as any).length === 0) return;
    const startIdx = Math.max(0, (external.displayStartPosition ?? 1) - 1);
    const endIdx = Math.min((signal as any).length - 1, (external.displayEndPosition ?? (signal as any).length) - 1);
    const tau = external.tau ?? 8;
    if (startIdx >= endIdx) return;

    const seg = (signal as any).subarray ? (signal as any).subarray(startIdx, endIdx + 1) : (signal as any).slice(startIdx, endIdx + 1);
    const N = seg.length - 2 * tau - 1; if (N <= 0) return;

    const points: THREE.Vector3[] = [];
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < N; i++) {
      const x = seg[i]; const y = seg[i + tau]; const z = seg[i + 2 * tau];
      points.push(new THREE.Vector3(x, y, z));
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    }
    if (points.length === 0) return;

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const colors = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      const t = i / (points.length - 1);
      colors[i * 3] = t; colors[i * 3 + 1] = 0.2; colors[i * 3 + 2] = 1 - t;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.LineBasicMaterial({ vertexColors: true });
    const line = new THREE.Line(geometry, material);
    scene.add(line); lineRef.current = line;

    boundsRef.current = { minX, maxX, minY, maxY, minZ, maxZ };
    createAxes(scene, minX, maxX, minY, maxY, minZ, maxZ);

    const cam = cameraRef.current, orbit = orbitRef.current; if (cam && orbit) {
      const signalChanged = lastSignalObjRef.current !== external.signal;
      const prev = lastFramedBoundsRef.current;
      const sizeOld = prev ? Math.max(prev.maxX - prev.minX, prev.maxY - prev.minY, prev.maxZ - prev.minZ) : null;
      const sizeNew = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
      const sizeRatio = sizeOld && sizeNew > 1e-9 ? Math.max(sizeOld, sizeNew) / Math.max(1e-9, Math.min(sizeOld, sizeNew)) : Infinity;
      let shouldFrame = !hasFramedOnceRef.current || signalChanged || (!userInteractedRef.current && (sizeRatio > 2.0));
      if (!shouldFrame) {
        // Also reframe if camera is extremely far relative to desired framing
        const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
        const desired = computeDesiredDistance(Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1) * 1.1; // small slack
        const center = new THREE.Vector3(cx, cy, cz);
        const distNow = cam.position.distanceTo(center);
        if (distNow > desired * 6) shouldFrame = true;
      }
      if (shouldFrame) {
        const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
        const rX = maxX - minX, rY = maxY - minY, rZ = maxZ - minZ;
        const d = computeDesiredDistance(Math.max(rX, rY, rZ) || 1);
        cam.position.set(cx + d * 0.7, cy + d * 0.7, cz + d * 0.7);
        cam.lookAt(cx, cy, cz); orbit.target.set(cx, cy, cz); orbit.update();
        hasFramedOnceRef.current = true;
        lastFramedBoundsRef.current = { minX, maxX, minY, maxY, minZ, maxZ };
      }
      lastSignalObjRef.current = external.signal;
    }
  }, [ready, external.signal, external.displayStartPosition, external.displayEndPosition, external.tau]);

  function createAxes(scene: THREE.Scene, minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number) {
    const old = scene.children.filter(c => (c as any).userData && (c as any).userData.isMatlabAxis);
    old.forEach(o => scene.remove(o));

    const rangeX = maxX - minX; const rangeY = maxY - minY; const rangeZ = maxZ - minZ;
    const margin = 0.1;
    const extendedMinX = minX - rangeX * margin;
    const extendedMaxX = maxX + rangeX * margin;
    const extendedMinY = minY - rangeY * margin;
    const extendedMaxY = maxY + rangeY * margin;
    const extendedMinZ = minZ - rangeZ * margin;
    const extendedMaxZ = maxZ + rangeZ * margin;

    const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 }); // X - red
    const yAxisMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 }); // Y - green
    const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff }); // Z - blue
    const gridMaterial = new THREE.LineBasicMaterial({ color: 0x3a3a3a });
    const tickMaterial = new THREE.LineBasicMaterial({ color: 0x5a5a5a });

    const mark = (obj: THREE.Object3D) => { (obj as any).userData = { ...(obj as any).userData, isMatlabAxis: true }; };

    const eps = (Math.max(rangeX, rangeY, rangeZ) || 1) * 1e-3;

    const xAxis = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(extendedMinX, extendedMinY + eps, extendedMinZ + eps),
      new THREE.Vector3(extendedMaxX, extendedMinY + eps, extendedMinZ + eps)
    ]), xAxisMaterial); xAxis.renderOrder = 998; (xAxis.material as THREE.LineBasicMaterial).depthTest = false; mark(xAxis); scene.add(xAxis);

    const yAxis = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(extendedMinX + eps, extendedMinY, extendedMinZ + eps),
      new THREE.Vector3(extendedMinX + eps, extendedMaxY, extendedMinZ + eps)
    ]), yAxisMaterial); yAxis.renderOrder = 998; (yAxis.material as THREE.LineBasicMaterial).depthTest = false; mark(yAxis); scene.add(yAxis);

    const zAxis = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(extendedMinX + eps, extendedMinY + eps, extendedMinZ),
      new THREE.Vector3(extendedMinX + eps, extendedMinY + eps, extendedMaxZ)
    ]), zAxisMaterial); zAxis.renderOrder = 998; (zAxis.material as THREE.LineBasicMaterial).depthTest = false; mark(zAxis); scene.add(zAxis);

    const numGridLines = 8; // denser ground grid
    // Ground grid: lines parallel to Z at fixed X (skip edges to avoid overlapping axes)
    for (let i = 1; i < numGridLines; i++) {
      const x = extendedMinX + (extendedMaxX - extendedMinX) * (i / numGridLines);
      const gZ = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, extendedMinY, extendedMinZ),
        new THREE.Vector3(x, extendedMinY, extendedMaxZ)
      ]), gridMaterial); mark(gZ); scene.add(gZ);
    }
    // Ground grid: lines parallel to X at fixed Z (skip edges)
    for (let i = 1; i < numGridLines; i++) {
      const z = extendedMinZ + (extendedMaxZ - extendedMinZ) * (i / numGridLines);
      const gX = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(extendedMinX, extendedMinY, z),
        new THREE.Vector3(extendedMaxX, extendedMinY, z)
      ]), gridMaterial); mark(gX); scene.add(gX);
    }

    const tickLength = Math.min(rangeX, rangeY, rangeZ) * 0.02;
    const numTicks = 5;
    for (let i = 0; i <= numTicks; i++) {
      const x = minX + (maxX - minX) * i / numTicks;
      const t = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, extendedMinY + eps, extendedMinZ + eps),
        new THREE.Vector3(x, extendedMinY + eps - tickLength, extendedMinZ + eps)
      ]), tickMaterial); mark(t); scene.add(t);
    }
    for (let i = 0; i <= numTicks; i++) {
      const y = minY + (maxY - minY) * i / numTicks;
      const t = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(extendedMinX, y, extendedMinZ),
        new THREE.Vector3(extendedMinX - tickLength, y, extendedMinZ)
      ]), tickMaterial); mark(t); scene.add(t);
    }
    for (let i = 0; i <= numTicks; i++) {
      const z = minZ + (maxZ - minZ) * i / numTicks;
      const t = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(extendedMinX + eps, extendedMinY + eps, z),
        new THREE.Vector3(extendedMinX + eps - tickLength, extendedMinY + eps, z)
      ]), tickMaterial); mark(t); scene.add(t);
    }

    createAxisLabels(
      scene,
      minX, maxX, minY, maxY, minZ, maxZ,
      extendedMinX, extendedMinY, extendedMinZ,
      extendedMaxX, extendedMaxY, extendedMaxZ,
      tickLength
    );
  }

  function createAxisLabels(
    scene: THREE.Scene,
    minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number,
    extendedMinX: number, extendedMinY: number, extendedMinZ: number,
    extendedMaxX: number, extendedMaxY: number, extendedMaxZ: number,
    tickLength: number
  ) {
    const createTextTexture = (text: string, fontSize = 18) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = 512; canvas.height = 128; // bigger canvas for crisper large labels
      // Light text for dark scene background
      context.fillStyle = '#ffffff';
      context.font = `${fontSize}px Times New Roman`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, 256, 64);
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      return texture;
    };

    const mark = (obj: THREE.Object3D) => { (obj as any).userData = { ...(obj as any).userData, isMatlabAxis: true }; };
    const spanX = maxX - minX, spanY = maxY - minY, spanZ = maxZ - minZ;
    const minSpan = Math.max(Math.min(spanX, spanY, spanZ), 1e-6);
    const axisLabelScale = minSpan * 0.45; // 1.5x of previous (0.3)

    const xMat = new THREE.SpriteMaterial({ map: createTextTexture('sigL(i)', 48), depthTest: false, depthWrite: false });
    const xSprite = new THREE.Sprite(xMat);
    // Place near X-axis positive tip
    xSprite.position.set(extendedMaxX + (tickLength * 0.8), extendedMinY + (tickLength * 0.6), extendedMinZ);
    xSprite.scale.set(axisLabelScale, axisLabelScale * 0.3, 1); xSprite.renderOrder = 999; mark(xSprite); (xSprite as any).userData.isLabel = true; (xSprite as any).userData.pixelHeight = 48; scene.add(xSprite);

    const yMat = new THREE.SpriteMaterial({ map: createTextTexture('sigL(i+τ)', 48), depthTest: false, depthWrite: false });
    const ySprite = new THREE.Sprite(yMat);
    // Place near Y-axis positive tip
    ySprite.position.set(extendedMinX - (tickLength * 0.6), extendedMaxY + (tickLength * 0.8), extendedMinZ);
    ySprite.scale.set(axisLabelScale, axisLabelScale * 0.3, 1); ySprite.renderOrder = 999; mark(ySprite); (ySprite as any).userData.isLabel = true; (ySprite as any).userData.pixelHeight = 48; scene.add(ySprite);

    const zMat = new THREE.SpriteMaterial({ map: createTextTexture('sigL(i+2τ)', 48), depthTest: false, depthWrite: false });
    const zSprite = new THREE.Sprite(zMat);
    // Place near Z-axis positive tip
    zSprite.position.set(extendedMinX - (tickLength * 0.6), extendedMinY + (tickLength * 0.6), extendedMaxZ + (tickLength * 0.8));
    zSprite.scale.set(axisLabelScale, axisLabelScale * 0.3, 1); zSprite.renderOrder = 999; mark(zSprite); (zSprite as any).userData.isLabel = true; (zSprite as any).userData.pixelHeight = 48; scene.add(zSprite);

    const numTicks = 5; const valueScale = axisLabelScale * 1.05; // 1.5x of previous (0.7)
    for (let i = 0; i <= numTicks; i++) {
      const x = minX + (maxX - minX) * i / numTicks;
      const mat = new THREE.SpriteMaterial({ map: createTextTexture(x.toFixed(2), 36), depthTest: false, depthWrite: false });
      mat.depthTest = false;
      const s = new THREE.Sprite(mat);
      s.position.set(x, extendedMinY + (tickLength * 0.6), extendedMinZ);
      s.scale.set(valueScale, valueScale * 0.4, 1); s.renderOrder = 999; mark(s); (s as any).userData.isLabel = true; (s as any).userData.pixelHeight = 36; scene.add(s);
    }
    for (let i = 0; i <= numTicks; i++) {
      const y = minY + (maxY - minY) * i / numTicks;
      const mat = new THREE.SpriteMaterial({ map: createTextTexture(y.toFixed(2), 36), depthTest: false, depthWrite: false });
      mat.depthTest = false;
      const s = new THREE.Sprite(mat);
      s.position.set(extendedMinX - (tickLength * 0.8), y, extendedMinZ);
      s.scale.set(valueScale, valueScale * 0.4, 1); s.renderOrder = 999; mark(s); (s as any).userData.isLabel = true; (s as any).userData.pixelHeight = 36; scene.add(s);
    }
    for (let i = 0; i <= numTicks; i++) {
      const z = minZ + (maxZ - minZ) * i / numTicks;
      const mat = new THREE.SpriteMaterial({ map: createTextTexture(z.toFixed(2), 36), depthTest: false, depthWrite: false });
      mat.depthTest = false;
      const s = new THREE.Sprite(mat);
      s.position.set(extendedMinX, extendedMinY + (tickLength * 0.6), z);
      s.scale.set(valueScale, valueScale * 0.4, 1); s.renderOrder = 999; mark(s); (s as any).userData.isLabel = true; (s as any).userData.pixelHeight = 36; scene.add(s);
    }
  }

  return (
    <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
  );
}));
