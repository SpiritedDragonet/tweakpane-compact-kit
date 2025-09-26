import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MarkerDTO, PhaseSpacePlot, PhaseSpacePlotHandle, PatchDTO } from './components/PhaseSpacePlot';
import ConditionEditorPanel from './components/ConditionEditorPanel';

type ECGMarkerEntry = { id: number; label: string; index: number };
const ECG_STANDARD_LABELS = ['P', 'Q', 'R', 'S', 'J', 'T', 'U', 'V'] as const;
const DEFAULT_ECG_LABEL_COLORS: Record<string, string> = {
  P: '#ff6b6b',
  Q: '#ffd166',
  R: '#06d6a0',
  S: '#118ab2',
  J: '#ffa502',
  T: '#ef476f',
  U: '#9b5de5',
  V: '#4cc9f0',
  custom: '#cccccc',
};
const CUSTOM_LABEL_OPTION = '__custom__';
const STANDARD_LABEL_SET = new Set<string>(ECG_STANDARD_LABELS);
const normalizeHex = (value: string | undefined | null) => (value ? value.trim().toLowerCase() : '');
const toColorKey = (label: string | undefined | null): string | null => {
  if (!label) return null;
  const trimmed = label.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  return STANDARD_LABEL_SET.has(upper) ? upper : trimmed;
};
const isStandardKey = (key: string) => STANDARD_LABEL_SET.has(key);
const getColorForLabelKey = (key: string | null, palette: Record<string, string>) => {
  if (!key) return palette.custom ?? DEFAULT_ECG_LABEL_COLORS.custom;
  const existing = palette[key];
  if (existing) return existing;
  if (isStandardKey(key)) return DEFAULT_ECG_LABEL_COLORS[key as keyof typeof DEFAULT_ECG_LABEL_COLORS];
  return palette.custom ?? DEFAULT_ECG_LABEL_COLORS.custom;
};
const getColorForName = (label: string | undefined | null, palette: Record<string, string>) =>
  getColorForLabelKey(toColorKey(label), palette);

function generatePseudoECG(N = 3000, fs = 250) {
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / fs; // time in seconds
    const rr = 1.0;   // 1 Hz heart rate
    const phase = (t % rr) / rr; // 0..1 phase
    const base = 0.05 * Math.sin(2 * Math.PI * 0.6 * t) + 0.03 * Math.sin(2 * Math.PI * 1.2 * t);
    const rPeak = Math.exp(-Math.pow((phase - 0.05) / 0.015, 2)) * 1.2;
    const tWave = Math.exp(-Math.pow((phase - 0.4) / 0.05, 2)) * 0.25;
    const noise = (Math.random() - 0.5) * 0.02;
    out[i] = base + rPeak + tWave + noise;
  }
  return out;
}

export const App: React.FC = () => {
  const [signal, setSignal] = useState<Float32Array>(() => generatePseudoECG());
  const [tau, setTau] = useState<number>(8);
  const [start, setStart] = useState<number>(0);
  const [end, setEnd] = useState<number>(2000);
  const [pointSizePx, setPointSizePx] = useState<number>(10);
  const [markerPointSizePx, setMarkerPointSizePx] = useState<number>(6);
  const [frameCloseness, setFrameCloseness] = useState<number>(2); // 默认近景倍数（更贴近你的偏好）
  const [patches, setPatches] = useState<PatchDTO[]>([]);
  // Keep an immediate, mutable snapshot to avoid stale state reads during rapid UI edits
  const patchesRef = useRef<PatchDTO[]>([]);
  const [toolMode, setToolMode] = useState<'translate'|'rotate'|'scale'|'uv'>('translate');
  // Per-group coordinate display mode: 'global' (absolute) or 'local' (relative to main for u/v)
  const [coordModeById, setCoordModeById] = useState<Record<number, 'global' | 'local'>>({});
  const [lockMainById, setLockMainById] = useState<Record<number, boolean>>({});
  // Selection from 3D view for UI highlight
  const [selection, setSelection] = useState<{ patchId: number | null; role: 'main'|'u'|'v'|'edge_u'|'edge_v'|null }>({ patchId: null, role: null });
  const [groupPanelOpen, setGroupPanelOpen] = useState<boolean>(true);
  const [markerPanelOpen, setMarkerPanelOpen] = useState<boolean>(true);
  const [markers, setMarkers] = useState<ECGMarkerEntry[]>([]);
  const markerIdRef = useRef(0);
  const [ecgLabelColors, setEcgLabelColors] = useState<Record<string, string>>(() => ({ ...DEFAULT_ECG_LABEL_COLORS }));
  const [markerLabelOption, setMarkerLabelOption] = useState<string>('R');
  const [markerCustomLabel, setMarkerCustomLabel] = useState<string>('');
  const [markerCount, setMarkerCount] = useState<number>(1);
  const [markerNameError, setMarkerNameError] = useState<string>('');
  const plotRef = useRef<PhaseSpacePlotHandle>(null);
  // Undo/redo history (max 100 steps)
  const MAX_HISTORY = 100;
  const undoStackRef = useRef<PatchDTO[][]>([]);
  const redoStackRef = useRef<PatchDTO[][]>([]);
  const ignoreChangesRef = useRef(false);
  const clonePatches = (arr: PatchDTO[]) => JSON.parse(JSON.stringify(arr)) as PatchDTO[];
  const pushHistory = (arr: PatchDTO[]) => {
    const stack = undoStackRef.current;
    stack.push(clonePatches(arr));
    while (stack.length > MAX_HISTORY) stack.shift();
    redoStackRef.current = [];
  };
  const applySnapshot = (snap: PatchDTO[]) => {
    ignoreChangesRef.current = true;
    plotRef.current?.setPatches(clonePatches(snap));
    const cloned = clonePatches(snap);
    patchesRef.current = cloned;
    setPatches(cloned);
    ignoreChangesRef.current = false;
  };
  const undo = () => {
    const stack = undoStackRef.current; const redo = redoStackRef.current; if (stack.length <= 1) return;
    const current = stack.pop()!; redo.push(current);
    const prev = stack[stack.length - 1]; applySnapshot(prev);
  };
  const redoFn = () => {
    const stack = undoStackRef.current; const redo = redoStackRef.current; if (redo.length === 0) return;
    const next = redo.pop()!; stack.push(clonePatches(next)); applySnapshot(next);
  };
  // Whether an align op can be applied
  const alignEnabled = selection.patchId != null && selection.role != null;
  // Align op handler (migrated for Tweakpane grid)
  const onApplyAlignOp = (op: string) => {
    const p = patches.find(pp => pp.id === selection.patchId!);
    if (!p) return;
    const mode = coordModeById[p.id] ?? 'global';
    const isRel = mode === 'local';
    const m = p.main as [number, number, number];
    const u = p.u as [number, number, number];
    const v = p.v as [number, number, number];
    const transform = (vec: [number,number,number], op: string): [number,number,number] => {
      const [x, y, z] = vec;
      switch (op) {
        case 'AX_X': return [x, 0, 0];
        case 'AX_Y': return [0, y, 0];
        case 'AX_Z': return [0, 0, z];
        case 'PL_XY': return [x, y, 0];
        case 'PL_YZ': return [0, y, z];
        case 'PL_ZX': return [x, 0, z];
        case 'DG_XY': { const t = (x + y) / 2; return [t, t, 0]; }
        case 'DG_YZ': { const t = (y + z) / 2; return [0, t, t]; }
        case 'DG_ZX': { const t = (z + x) / 2; return [t, 0, t]; }
        case 'DP_XY': { const t = (x + y) / 2; return [t, t, z]; }
        case 'DP_YZ': { const t = (y + z) / 2; return [x, t, t]; }
        case 'DP_ZX': { const t = (z + x) / 2; return [t, y, t]; }
        case 'MAIN_D': { const t = (x + y + z) / 3; return [t, t, t]; }
        default: return vec;
      }
    };
    const role = selection.role as 'main'|'u'|'v'|'edge_u'|'edge_v';
    if (role === 'main') {
      const newM = transform(m, op);
      const locked = !!lockMainById[p.id];
      if (locked) {
        const delta: [number,number,number] = [newM[0]-m[0], newM[1]-m[1], newM[2]-m[2]];
        const uNew: [number,number,number] = [p.u[0]+delta[0], p.u[1]+delta[1], p.u[2]+delta[2]] as any;
        const vNew: [number,number,number] = [p.v[0]+delta[0], p.v[1]+delta[1], p.v[2]+delta[2]] as any;
        plotRef.current?.updatePointWorld(p.id, 'main', { x: newM[0], y: newM[1], z: newM[2] });
        plotRef.current?.updatePointWorld(p.id, 'u', { x: uNew[0], y: uNew[1], z: uNew[2] });
        plotRef.current?.updatePointWorld(p.id, 'v', { x: vNew[0], y: vNew[1], z: vNew[2] });
      } else {
        plotRef.current?.updatePointWorld(p.id, 'main', { x: newM[0], y: newM[1], z: newM[2] });
      }
    } else if (role === 'u') {
      if (isRel) {
        const uRel: [number,number,number] = [u[0]-m[0], u[1]-m[1], u[2]-m[2]];
        const r = transform(uRel, op); const newUAbs: [number,number,number] = [m[0]+r[0], m[1]+r[1], m[2]+r[2]];
        plotRef.current?.updatePointWorld(p.id, 'u', { x: newUAbs[0], y: newUAbs[1], z: newUAbs[2] });
      } else {
        const newU = transform(u, op);
        plotRef.current?.updatePointWorld(p.id, 'u', { x: newU[0], y: newU[1], z: newU[2] });
      }
    } else if (role === 'v') {
      if (isRel) {
        const vRel: [number,number,number] = [v[0]-m[0], v[1]-m[1], v[2]-m[2]];
        const r = transform(vRel, op); const newVAbs: [number,number,number] = [m[0]+r[0], m[1]+r[1], m[2]+r[2]];
        plotRef.current?.updatePointWorld(p.id, 'v', { x: newVAbs[0], y: newVAbs[1], z: newVAbs[2] });
      } else {
        const newV = transform(v, op);
        plotRef.current?.updatePointWorld(p.id, 'v', { x: newV[0], y: newV[1], z: newV[2] });
      }
    } else if (role === 'edge_u') {
      const newM = transform(m, op);
      plotRef.current?.updatePointWorld(p.id, 'main', { x: newM[0], y: newM[1], z: newM[2] });
      if (isRel) {
        const uRel: [number,number,number] = [u[0]-m[0], u[1]-m[1], u[2]-m[2]];
        const rU = transform(uRel, op);
        const newUAbs: [number,number,number] = [newM[0]+rU[0], newM[1]+rU[1], newM[2]+rU[2]];
        plotRef.current?.updatePointWorld(p.id, 'u', { x: newUAbs[0], y: newUAbs[1], z: newUAbs[2] });
      } else {
        const newU = transform(u, op);
        plotRef.current?.updatePointWorld(p.id, 'u', { x: newU[0], y: newU[1], z: newU[2] });
      }
    } else if (role === 'edge_v') {
      const newM = transform(m, op);
      plotRef.current?.updatePointWorld(p.id, 'main', { x: newM[0], y: newM[1], z: newM[2] });
      if (isRel) {
        const vRel: [number,number,number] = [v[0]-m[0], v[1]-m[1], v[2]-m[2]];
        const rV = transform(vRel, op);
        const newVAbs: [number,number,number] = [newM[0]+rV[0], newM[1]+rV[1], newM[2]+rV[2]];
        plotRef.current?.updatePointWorld(p.id, 'v', { x: newVAbs[0], y: newVAbs[1], z: newVAbs[2] });
      } else {
        const newV = transform(v, op);
        plotRef.current?.updatePointWorld(p.id, 'v', { x: newV[0], y: newV[1], z: newV[2] });
      }
    }
    plotRef.current?.commit?.('align-op');
  };
  // Group helpers for Tweakpane panel
  const onRenamePatch = (patchId: number, name: string) => {
    plotRef.current?.renamePatch(patchId, name);
  };
  const onSetCoordMode = (patchId: number, mode: 'global'|'local') => {
    setCoordModeById(prev => ({ ...prev, [patchId]: mode }));
  };
  const onSetLockMain = (patchId: number, locked: boolean) => {
    setLockMainById(prev => ({ ...prev, [patchId]: locked }));
    plotRef.current?.setMainLocked?.(patchId, locked);
  };
  const onReverse = (patchId: number) => {
    const p = patches.find(pp => pp.id === patchId); if (!p) return;
    const u = p.u as [number, number, number];
    const v = p.v as [number, number, number];
    plotRef.current?.updatePointWorld(patchId, 'u', { x: v[0], y: v[1], z: v[2] });
    plotRef.current?.updatePointWorld(patchId, 'v', { x: u[0], y: u[1], z: u[2] });
    plotRef.current?.commit?.('reverse');
  };
  const onRotate = (patchId: number) => {
    const p = patches.find(pp => pp.id === patchId); if (!p) return;
    const m = p.main as [number, number, number];
    const u = p.u as [number, number, number];
    const v = p.v as [number, number, number];
    const opp = [u[0] + v[0] - m[0], u[1] + v[1] - m[1], u[2] + v[2] - m[2]] as [number, number, number];
    plotRef.current?.updatePointWorld(patchId, 'u', { x: m[0], y: m[1], z: m[2] });
    plotRef.current?.updatePointWorld(patchId, 'main', { x: v[0], y: v[1], z: v[2] });
    plotRef.current?.updatePointWorld(patchId, 'v', { x: opp[0], y: opp[1], z: opp[2] });
    plotRef.current?.commit?.('rotate');
  };
  const onDeletePatch = (patchId: number) => {
    plotRef.current?.deletePatchById(patchId);
  };
  const onAddGroup = () => {
    const name = getPlannedGroupName();
    if (newGroupNameKind === 'custom' && !name) return; // invalid custom name
    const id = plotRef.current?.addPatch();
    if (id != null && name) {
      plotRef.current?.renamePatch(id, name);
    }
  };
  const onDeleteSelectedGroup = () => {
    plotRef.current?.deleteSelectedPatch();
  };
  const onEditCoord = (patchId: number, role: 'main'|'u'|'v', axis: 'x'|'y'|'z', value: number) => {
    console.log(`[App] 坐标编辑 id=${patchId} role=${role} ${axis}=${value}`);
    const p = (patchesRef.current || []).find(pp => pp.id === patchId);
    if (!p) {
      console.warn('[App] 未找到指定补丁，忽略编辑', { patchId });
      return;
    }
    const mode = coordModeById[patchId] ?? 'global';
    const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    const curWorld = (p as any)[role] as [number,number,number];
    const next: any = { x: curWorld[0], y: curWorld[1], z: curWorld[2] };
    const mainArr = p.main as [number, number, number];
    if (role === 'main') {
      const newVal = Number.isFinite(value) ? value : curWorld[idx];
      const delta = newVal - curWorld[idx];
      next[axis] = newVal;
      if (lockMainById[patchId]) {
        const uW = p.u as [number,number,number];
        const vW = p.v as [number,number,number];
        const uNext: any = { x: uW[0], y: uW[1], z: uW[2] };
        const vNext: any = { x: vW[0], y: vW[1], z: vW[2] };
        uNext[axis] = (uW as any)[axis] + delta;
        vNext[axis] = (vW as any)[axis] + delta;
        console.log(`[App] 写入(main-锁定) id=${patchId} m=(${next.x},${next.y},${next.z})`);
        plotRef.current?.updatePointWorld(patchId, 'main', next);
        plotRef.current?.updatePointWorld(patchId, 'u', uNext);
        plotRef.current?.updatePointWorld(patchId, 'v', vNext);
        return;
      }
    } else if (mode === 'local') {
      const worldVal = (Number.isFinite(value) ? value : (curWorld[idx] - mainArr[idx])) + mainArr[idx];
      next[axis] = worldVal;
      console.log(`[App] 写入(local) id=${patchId} role=${role} ${axis}=${worldVal}`);
      plotRef.current?.updatePointWorld(patchId, role, next);
      return;
    } else {
      next[axis] = Number.isFinite(value) ? value : curWorld[idx];
      console.log(`[App] 写入(global) id=${patchId} role=${role} ${axis}=${next[axis]}`);
      plotRef.current?.updatePointWorld(patchId, role, next);
      return;
    }
    plotRef.current?.updatePointWorld(patchId, role, next);
    console.log(`[App] 写入(default) id=${patchId} role=${role} m=(${next.x},${next.y},${next.z})`);
  };
  const onCommitCoords = () => { plotRef.current?.commit?.('coords-edit'); };;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      const tag = (tgt?.tagName || '').toUpperCase();
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (tgt && (tgt as any).isContentEditable)) return;
      const key = e.key; const ctrl = e.ctrlKey || e.metaKey; const shift = e.shiftKey;
      if (ctrl && (key === 'z' || key === 'Z') && !shift) { e.preventDefault(); undo(); }
      else if ((ctrl && (key === 'y' || key === 'Y')) || (e.metaKey && (key === 'z' || key === 'Z') && shift)) { e.preventDefault(); redoFn(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  // New group naming UI (P/Q/R/S/J/T/U/V/custom)
  const [newGroupNameKind, setNewGroupNameKind] = useState<string>('P');
  const [customName, setCustomName] = useState<string>('');
  const [customNameError, setCustomNameError] = useState<string>('');
  const validateName = (s: string) => {
    // Require a variable-like identifier: start with letter/_ then [A-Za-z0-9_]*
    if (!s || !s.trim()) return '不能为空';
    if (/\s/.test(s)) return '不能包含空格';
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)) return '仅限字母/数字/下划线，且不能以数字开头';
    return '';
  };
  const getPlannedGroupName = (): string | null => {
    if (newGroupNameKind === 'custom') {
      const err = validateName(customName);
      setCustomNameError(err);
      return err ? null : customName;
    }
    return newGroupNameKind;
  };

  useEffect(() => {
    setEnd(Math.min(signal.length - 1, 2000));
  }, [signal.length]);

  useEffect(() => {
    setCoordModeById(prev => {
      const next: Record<number, 'global' | 'local'> = {};
      let changed = false;
      patches.forEach(p => {
        const prevMode = prev[p.id];
        if (prevMode === undefined) changed = true;
        next[p.id] = prevMode ?? 'global';
      });
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (!changed) {
        if (prevKeys.length !== nextKeys.length) {
          changed = true;
        } else {
          for (const key of prevKeys) {
            if (!Object.prototype.hasOwnProperty.call(next, key)) { changed = true; break; }
            if (next[key as any] !== prev[key as any]) { changed = true; break; }
          }
        }
      }
      return changed ? next : prev;
    });
    setLockMainById(prev => {
      const next: Record<number, boolean> = {};
      let changed = false;
      patches.forEach(p => {
        if (prev[p.id]) next[p.id] = true;
      });
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (!changed) {
        if (prevKeys.length !== nextKeys.length) {
          changed = true;
        } else {
          for (const key of prevKeys) {
            if (!Object.prototype.hasOwnProperty.call(next, key)) { changed = true; break; }
          }
        }
      }
      return changed ? next : prev;
    });
    if (selection.patchId != null && !patches.some(pp => pp.id === selection.patchId)) {
      setSelection({ patchId: null, role: null });
    }
  }, [patches, selection.patchId]);

  useEffect(() => {
    setEcgLabelColors(prev => {
      const usedCustom = new Set<string>();
      patches.forEach(p => {
        const key = toColorKey(p.name);
        if (key && !isStandardKey(key)) usedCustom.add(key);
      });
      markers.forEach(m => {
        const key = toColorKey(m.label);
        if (key && !isStandardKey(key)) usedCustom.add(key);
      });
      const next: Record<string, string> = {};
      let changed = false;
      ECG_STANDARD_LABELS.forEach(label => {
        const current = prev[label] ?? DEFAULT_ECG_LABEL_COLORS[label];
        next[label] = current;
        if (prev[label] === undefined) changed = true;
      });
      usedCustom.forEach(label => {
        const current = prev[label] ?? prev.custom ?? DEFAULT_ECG_LABEL_COLORS.custom;
        next[label] = current;
        if (prev[label] !== current) changed = true;
      });
      next.custom = prev.custom ?? DEFAULT_ECG_LABEL_COLORS.custom;
      Object.keys(prev).forEach(key => {
        if (!(key in next)) changed = true;
      });
      if (!changed && Object.keys(prev).length === Object.keys(next).length) {
        let identical = true;
        for (const key of Object.keys(next)) {
          if (prev[key] !== next[key]) { identical = false; break; }
        }
        if (identical) return prev;
      }
      return next;
    });
  }, [patches, markers]);

  useEffect(() => {
    const handle = plotRef.current;
    if (!handle) return;
    let modified = false;
    patches.forEach(p => {
      const targetColor = getColorForName(p.name, ecgLabelColors);
      const currentColor = p.color ?? '';
      if (normalizeHex(currentColor) !== normalizeHex(targetColor)) {
        if (!modified) ignoreChangesRef.current = true;
        modified = true;
        handle.updatePatchColor(p.id, targetColor);
      }
    });
    if (modified) {
      setTimeout(() => { ignoreChangesRef.current = false; }, 0);
    }
  }, [patches, ecgLabelColors]);

  const external = useMemo(() => ({
    signal,
    displayStartPosition: start + 1, // convert to 1-based for compatibility
    displayEndPosition: end + 1,
    tau,
  }), [signal, start, end, tau]);

  const markersForPlot = useMemo<MarkerDTO[]>(() => markers.map(marker => ({
    id: marker.id,
    label: marker.label,
    index: marker.index,
    color: getColorForLabelKey(marker.label, ecgLabelColors),
  })), [markers, ecgLabelColors]);

  const minMarkerIndex = start;
  const maxMarkerIndex = end - 2 * tau - 1;
  const hasMarkerRange = maxMarkerIndex >= minMarkerIndex;

  // Unified name registry: union of standard names + currently used custom names
  const usedCustomNames = useMemo(() => {
    const set = new Set<string>();
    // From markers
    for (const m of markers) {
      const key = toColorKey(m.label);
      if (key && !isStandardKey(key) && validateName(key) === '') set.add(key);
    }
    // From groups (patch names)
    for (const p of patches) {
      const key = toColorKey((p as any).name);
      if (key && !isStandardKey(key) && validateName(key) === '') set.add(key);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }, [markers, patches]);
  // Points panel name options: standards + used customs + a special "__custom__" option
  const markerNameOptions = useMemo(
    () => [...ECG_STANDARD_LABELS, ...usedCustomNames, CUSTOM_LABEL_OPTION],
    [usedCustomNames],
  );
  const groupNameOptions = useMemo(
    () => [...ECG_STANDARD_LABELS, ...usedCustomNames, 'custom'],
    [usedCustomNames],
  );
  useEffect(() => {
    if (groupNameOptions.length === 0) return;
    if (!groupNameOptions.includes(newGroupNameKind)) {
      setNewGroupNameKind(groupNameOptions[0]);
    }
  }, [groupNameOptions, newGroupNameKind]);
  // Display settings name options: include 'custom' default + standards + used customs
  const colorOptions = useMemo(
    () => [...ECG_STANDARD_LABELS, ...usedCustomNames, 'custom'],
    [usedCustomNames],
  );
  const [colorEditLabel, setColorEditLabel] = useState<string>(ECG_STANDARD_LABELS[0]);
  useEffect(() => {
    if (!markerNameOptions.includes(markerLabelOption)) {
      setMarkerLabelOption(markerNameOptions[0] ?? CUSTOM_LABEL_OPTION);
    }
  }, [markerNameOptions, markerLabelOption]);
  useEffect(() => {
    if (markerLabelOption !== CUSTOM_LABEL_OPTION && markerNameError) {
      setMarkerNameError('');
    }
  }, [markerLabelOption, markerNameError]);
  useEffect(() => {
    if (colorOptions.length === 0) {
      if (colorEditLabel !== 'custom') setColorEditLabel('custom');
      return;
    }
    if (!colorOptions.includes(colorEditLabel)) {
      setColorEditLabel(colorOptions[0]);
    }
  }, [colorOptions, colorEditLabel]);

  const addMarkersDisabled = !hasMarkerRange || (markerLabelOption === CUSTOM_LABEL_OPTION && markerCustomLabel.trim() === '');
  const currentEditColor = getColorForLabelKey(colorEditLabel, ecgLabelColors);

  const handleAddMarkers = (countArg: number, baseLabelRawArg: string) => {
    // Accept count/label from panel; fall back to current state when missing.
    const rawFromPanel = (baseLabelRawArg ?? '').trim();
    const usingCustomOption = (markerLabelOption === CUSTOM_LABEL_OPTION);
    const baseLabelRaw = rawFromPanel || (usingCustomOption ? markerCustomLabel.trim() : markerLabelOption);

    // Reset name error when非自定义选项
    if (!usingCustomOption && rawFromPanel) setMarkerNameError('');

    const labelKey = toColorKey(baseLabelRaw);
    if (!labelKey) { if (usingCustomOption) setMarkerNameError('名称不能为空'); return; }
    if (labelKey === 'custom') { setMarkerNameError('名称不可为 "custom"'); return; }
    const isStandard = isStandardKey(labelKey);
    if (!isStandard) {
      const validation = validateName(labelKey);
      if (validation) { setMarkerNameError(validation); return; }
      setMarkerNameError('');
    }

    if (!hasMarkerRange) return;
    const count = Math.max(1, Math.floor(Number.isFinite(Number(countArg)) ? Number(countArg) : Number(markerCount)));

    // Ensure palette contains color for this key
    setEcgLabelColors(prev => {
      if (isStandard) {
        if (prev[labelKey] !== undefined) return prev;
        return { ...prev, [labelKey]: DEFAULT_ECG_LABEL_COLORS[labelKey] };
      }
      if (prev[labelKey] !== undefined) return prev;
      return { ...prev, [labelKey]: prev.custom ?? DEFAULT_ECG_LABEL_COLORS.custom };
    });

    const span = maxMarkerIndex - minMarkerIndex + 1;
    if (span <= 0) return;
    const newMarkers: ECGMarkerEntry[] = [];
    for (let i = 0; i < count; i++) {
      const idx = minMarkerIndex + Math.floor(Math.random() * span);
      newMarkers.push({ id: markerIdRef.current++, label: labelKey, index: idx });
    }
    setMarkers(prev => [...prev, ...newMarkers]);

    if (usingCustomOption) setMarkerCustomLabel('');
    if (isStandard || usingCustomOption) setMarkerLabelOption(labelKey);
  };

  const removeMarker = (markerId: number) => {
    setMarkers(prev => prev.filter(m => m.id !== markerId));
  };

  const clearMarkers = () => {
    // Always trigger a state update to ensure UI/3D刷新
    setMarkers([]);
    // Reset name error and optional custom input for更顺手的交互
    setMarkerNameError('');
    // Optional: reset ID counter so后续添加从0重新计数
    markerIdRef.current = 0;
  };

  // Batch group helpers for Tweakpane
  const onDeleteAllGroups = () => {
    plotRef.current?.setPatches([]);
  };
  const onSetAllCoordMode = (mode: 'global'|'local') => {
    setCoordModeById(prev => {
      const next: Record<number, 'global'|'local'> = {};
      patches.forEach(pp => { next[pp.id] = mode; });
      return next;
    });
  };
  const onAddGroupWithPlan = (kind: 'P'|'Q'|'R'|'S'|'J'|'T'|'U'|'V'|'custom', custom: string) => {
    let name: string | null = null;
    if (kind === 'custom') {
      const err = validateName(custom);
      setCustomNameError(err);
      if (!err) name = custom;
    } else {
      name = kind;
    }
    if (!name) return;
    const id = plotRef.current?.addPatch();
    if (id != null) plotRef.current?.renamePatch(id, name);
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: '1 1 auto', padding: 12, boxSizing: 'border-box' }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', border: '1px solid #333', borderRadius: 8, background: '#0a0b0e', overflow: 'hidden' }}>
          <PhaseSpacePlot
            ref={plotRef}
            external={external}
            debug={true}
            pointPixelSize={pointSizePx}
            markerPointPixelSize={markerPointSizePx}
            frameCloseness={frameCloseness}
            markers={markersForPlot}
            onSelectionChange={setSelection}
            onPatchesChange={(arr, meta) => {
              patchesRef.current = arr;
              setPatches(arr);
              if (ignoreChangesRef.current) return;
              if (meta?.commit) pushHistory(arr);
            }}
          />
        </div>
        {/* 点列表旧 UI 已迁移到 Tweakpane */}
      </div>
      
      <aside style={{ width: 320, borderLeft: '1px solid #2a2a2a', background: 'rgba(0,0,0,0.35)', padding: 0, boxSizing: 'border-box' }}>
        <ConditionEditorPanel
          tau={tau}
          setTau={setTau}
          start={start}
          setStart={setStart}
          end={end}
          setEnd={setEnd}
          signalLength={signal.length}
          onRegenerateSignal={() => setSignal(generatePseudoECG())}
          toolMode={toolMode}
          onChangeToolMode={(m) => { setToolMode(m); plotRef.current?.setTransformMode(m); }}
          pointSizePx={pointSizePx}
          setPointSizePx={(v) => setPointSizePx(Math.max(4, Math.min(64, Math.floor(v))))}
          markerPointSizePx={markerPointSizePx}
          setMarkerPointSizePx={(v) => setMarkerPointSizePx(Math.max(2, Math.min(40, Math.floor(v))))}
          frameCloseness={frameCloseness}
          setFrameCloseness={(v) => setFrameCloseness(Math.max(2, Math.min(100, Math.floor(v))))}
          colorOptions={colorOptions}
          colorEditLabel={colorEditLabel}
          setColorEditLabel={setColorEditLabel}
          currentEditColor={currentEditColor}
          onChangeColor={(label, hex) => {
            setEcgLabelColors(prev => {
              if (prev[label] === hex) return prev;
              return { ...prev, [label]: hex };
            });
          }}
          alignEnabled={alignEnabled}
          onApplyAlignOp={onApplyAlignOp}
          patches={patches}
          selection={selection}
          coordModeById={coordModeById}
          onSetCoordMode={onSetCoordMode}
          lockMainById={lockMainById}
          onSetLockMain={onSetLockMain}
          onRenamePatch={onRenamePatch}
          onReverse={onReverse}
          onRotate={onRotate}
          onDeletePatch={onDeletePatch}
          onAddGroup={onAddGroup}
          onDeleteSelectedGroup={onDeleteSelectedGroup}
          onEditCoord={onEditCoord}
          onCommitCoords={onCommitCoords}
          groupNameOptions={groupNameOptions}
          newGroupNameKind={newGroupNameKind}
          onSetNewGroupNameKind={(k) => { setNewGroupNameKind(k); if (k !== 'custom') setCustomNameError(''); }}
          customName={customName}
          onSetCustomName={(s) => { setCustomName(s); setCustomNameError(validateName(s)); }}
          customNameError={customNameError}
          onDeleteAllGroups={onDeleteAllGroups}
          onSetAllCoordMode={onSetAllCoordMode}
          onAddGroupWithPlan={onAddGroupWithPlan}
          markers={markers}
          markerNameOptions={markerNameOptions as string[]}
          markerLabelOption={markerLabelOption}
          onSetMarkerLabelOption={setMarkerLabelOption}
          markerCustomLabel={markerCustomLabel}
          onSetMarkerCustomLabel={setMarkerCustomLabel}
          markerNameError={markerNameError}
          markerCount={markerCount}
          onSetMarkerCount={(n) => setMarkerCount(Math.max(1, Math.min(200, Math.floor(n) || 1)))}
          minMarkerIndex={minMarkerIndex}
          maxMarkerIndex={maxMarkerIndex}
          hasMarkerRange={hasMarkerRange}
          onAddMarkers={handleAddMarkers}
          onClearMarkers={clearMarkers}
          onRemoveMarker={removeMarker}
          customOptionValue={CUSTOM_LABEL_OPTION}
        />
      </aside>
    </div>
  );
};



