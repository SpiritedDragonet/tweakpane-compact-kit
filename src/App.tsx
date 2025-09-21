import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MarkerDTO, PhaseSpacePlot, PhaseSpacePlotHandle, PatchDTO } from './components/PhaseSpacePlot';

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
    setPatches(clonePatches(snap));
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
  const [newGroupNameKind, setNewGroupNameKind] = useState<'P'|'Q'|'R'|'S'|'J'|'T'|'U'|'V'|'custom'>('P');
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

  const customLabelKeysSorted = useMemo(
    () => Object.keys(ecgLabelColors)
      .filter(key => key !== 'custom' && !isStandardKey(key))
      .sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [ecgLabelColors],
  );
  const markerNameOptions = useMemo(
    () => [...ECG_STANDARD_LABELS, ...customLabelKeysSorted, CUSTOM_LABEL_OPTION],
    [customLabelKeysSorted],
  );
  const colorOptions = useMemo(
    () => [...ECG_STANDARD_LABELS, ...customLabelKeysSorted, 'custom'],
    [customLabelKeysSorted],
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

  const handleAddMarkers = () => {
    const useCustom = markerLabelOption === CUSTOM_LABEL_OPTION;
    const baseLabelRaw = useCustom ? markerCustomLabel.trim() : markerLabelOption;
    if (!useCustom) setMarkerNameError('');
    const labelKey = toColorKey(baseLabelRaw);
    if (!labelKey) { if (useCustom) setMarkerNameError('名称不能为空'); return; }
    if (labelKey === 'custom') { setMarkerNameError('名称不可为 "custom"'); return; }
    const isStandard = isStandardKey(labelKey);
    if (useCustom) {
      const validation = validateName(labelKey);
      if (validation) { setMarkerNameError(validation); return; }
      setMarkerNameError('');
    }
    if (!hasMarkerRange) return;
    const count = Math.max(1, Math.floor(markerCount));
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
    if (useCustom) setMarkerCustomLabel('');
    if (isStandard || useCustom) setMarkerLabelOption(labelKey);
  };

  const removeMarker = (markerId: number) => {
    setMarkers(prev => prev.filter(m => m.id !== markerId));
  };

  const clearMarkers = () => {
    if (markers.length === 0) return;
    setMarkers([]);
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
              setPatches(arr);
              if (ignoreChangesRef.current) return;
              if (meta?.commit) pushHistory(arr);
            }}
          />
        </div>
        
      </div>
      <aside style={{ width: 340, borderLeft: '1px solid #2a2a2a', background: 'rgba(0,0,0,0.35)', padding: 12, boxSizing: 'border-box', overflowY: 'auto' }}>
        {/* 操作指南面板已移除以简化 UI */}
        <div style={{ background: 'rgba(0,0,0,0.55)', padding: '10px 14px', borderRadius: 8, border: '1px solid #333', fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>
          <b style={{ color: '#fff', fontSize: 13 as any }}>相空间参数</b>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <label style={{ minWidth: 70, color: '#cfcfcf' }}>τ (Tau)</label>
            <input type="range" min={1} max={50} step={1} value={tau} onChange={(e) => setTau(parseInt(e.target.value, 10))} style={{ flex: 1 }} />
            <input type="number" min={1} max={50} step={1} value={tau} onChange={(e) => setTau(parseInt(e.target.value, 10) || 8)} style={{ width: 80, fontSize: 12, background: '#111', color: '#ddd', border: '1px solid #444', borderRadius: 4, padding: '4px 6px' }} />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <label style={{ minWidth: 70, color: '#cfcfcf' }}>开始</label>
            <input type="number" min={0} max={Math.max(0, signal.length - 2)} step={1} value={start} onChange={(e) => setStart(Math.max(0, parseInt(e.target.value, 10) || 0))} style={{ width: 80, fontSize: 12, background: '#111', color: '#ddd', border: '1px solid #444', borderRadius: 4, padding: '4px 6px' }} />
            <label style={{ minWidth: 40, color: '#cfcfcf' }}>结束</label>
            <input type="number" min={1} max={signal.length - 1} step={1} value={end} onChange={(e) => setEnd(Math.min(signal.length - 1, parseInt(e.target.value, 10) || (signal.length - 1)))} style={{ width: 80, fontSize: 12, background: '#111', color: '#ddd', border: '1px solid #444', borderRadius: 4, padding: '4px 6px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <button onClick={() => setSignal(generatePseudoECG())} style={{ background: '#333', color: '#eee', border: '1px solid #555', padding: '8px 12px', borderRadius: 5, cursor: 'pointer' }}>重新生成信号</button>
          </div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.55)', padding: '10px 14px', borderRadius: 8, border: '1px solid #333', fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>
          <b style={{ color: '#fff', fontSize: 13 as any }}>交互模式</b>
          <div style={{ marginTop: 6 }}>
            <span style={{ color: '#cfcfcf' }}>操作</span>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {[
                { value: 'translate' as const, label: '移动', hint: 'W' },
                { value: 'rotate' as const, label: '旋转', hint: 'E' },
                { value: 'scale' as const, label: '缩放', hint: 'R' },
                { value: 'uv' as const, label: '沿u/v平移', hint: '' },
              ].map(btn => {
                const active = toolMode === btn.value;
                return (
                  <button
                    key={btn.value}
                    onClick={() => { setToolMode(btn.value); plotRef.current?.setTransformMode(btn.value); }}
                    style={{
                      background: active ? '#4a4a4a' : '#2f2f2f',
                      color: '#eee',
                      border: '1px solid #555',
                      padding: '6px 10px',
                      borderRadius: 5,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      fontWeight: active ? 600 : 400,
                    }}
                  >{btn.label}{btn.hint ? ` (${btn.hint})` : ''}</button>
                );
              })}
            </div>
          </div>
          
        </div>
        <div style={{ background: 'rgba(0,0,0,0.55)', padding: '10px 14px', borderRadius: 8, border: '1px solid #333', fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>
          <b style={{ color: '#fff', fontSize: 13 as any }}>显示设置</b>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <label style={{ minWidth: 110, color: '#cfcfcf' }}>组点大小(px)</label>
            <input type="range" min={4} max={64} step={1} value={pointSizePx} onChange={(e) => setPointSizePx(Math.max(4, Math.min(64, parseInt(e.target.value, 10) || 10)))} style={{ flex: 1 }} />
            <input type="number" min={4} max={64} step={1} value={pointSizePx} onChange={(e) => setPointSizePx(Math.max(4, Math.min(64, parseInt(e.target.value, 10) || 10)))} style={{ width: 80, fontSize: 12, background: '#111', color: '#ddd', border: '1px solid #444', borderRadius: 4, padding: '4px 6px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <label style={{ minWidth: 110, color: '#cfcfcf' }}>标记点大小(px)</label>
            <input type="range" min={2} max={40} step={1} value={markerPointSizePx} onChange={(e) => setMarkerPointSizePx(Math.max(2, Math.min(40, parseInt(e.target.value, 10) || 6)))} style={{ flex: 1 }} />
            <input type="number" min={2} max={40} step={1} value={markerPointSizePx} onChange={(e) => setMarkerPointSizePx(Math.max(2, Math.min(40, parseInt(e.target.value, 10) || 6)))} style={{ width: 80, fontSize: 12, background: '#111', color: '#ddd', border: '1px solid #444', borderRadius: 4, padding: '4px 6px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <label style={{ minWidth: 90, color: '#cfcfcf' }}>近景倍数</label>
            <input
              type="range"
              min={2}
              max={40}
              step={1}
              value={frameCloseness}
              onChange={(e) => setFrameCloseness(parseInt(e.target.value, 10))}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min={2}
              max={100}
              step={1}
              value={frameCloseness}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setFrameCloseness(Number.isFinite(v) ? Math.max(2, Math.min(100, v)) : 2);
              }}
              style={{ width: 80, fontSize: 12, background: '#111', color: '#ddd', border: '1px solid #444', borderRadius: 4, padding: '4px 6px' }}
            />
          </div>
          <div style={{ marginTop: 10 }}>
            <span style={{ color: '#cfcfcf' }}>ECG 标记颜色</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <label style={{ color: '#aaa' }}>名称</label>
              <select
                value={colorEditLabel}
                onChange={(e) => setColorEditLabel(e.target.value)}
                style={{ background: '#111', color: '#ddd', border: '1px solid #444', borderRadius: 4, padding: '4px 6px' }}
              >
                {colorOptions.map(opt => (
                  <option key={opt} value={opt}>{opt === 'custom' ? '自定义默认' : opt}</option>
                ))}
              </select>
              <label style={{ color: '#aaa' }}>颜色</label>
              <input
                type='color'
                value={currentEditColor}
                onChange={(e) => setEcgLabelColors(prev => {
                  const value = e.target.value;
                  if (prev[colorEditLabel] === value) return prev;
                  return { ...prev, [colorEditLabel]: value };
                })}
                style={{ width: 40, height: 24, border: 'none', background: 'transparent', cursor: 'pointer' }}
              />
              <span style={{ color: '#777', fontSize: 12 }}>{currentEditColor.toUpperCase()}</span>
            </div>
          </div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.55)', padding: '10px 14px', borderRadius: 8, border: '1px solid #333', fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>
          <b style={{ color: '#fff', fontSize: 13 as any }}>对齐操作</b>
          {/* 统一坐标操作区：作用于当前选中组 */}
          <div style={{ marginTop: 10 }}>
            {(() => {
              const disabled = selection.patchId == null || selection.role == null;
              const getPatch = () => patches.find(pp => pp.id === selection.patchId) || null;
              const applyOp = (op: string) => {
                const p = getPatch(); if (!p) return;
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
              const Btn = (props: { label: string; title: string; op: string }) => (
                <button
                  disabled={disabled}
                  onClick={() => applyOp(props.op)}
                  title={disabled ? '请选择一个组并选中具体点' : props.title}
                  style={{ background: disabled ? '#1a1a1a' : '#2b2b2b', color: '#eee', border: '1px solid #555', padding: '6px', borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer' }}
                >{props.label}</button>
              );
              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                    <Btn label='X' title='对齐X轴（相对/绝对）' op='AX_X' />
                    <Btn label='Y' title='对齐Y轴（相对/绝对）' op='AX_Y' />
                    <Btn label='Z' title='对齐Z轴（相对/绝对）' op='AX_Z' />
                    <Btn label='XY' title='对齐XY面（Z=0）' op='PL_XY' />
                    <Btn label='YZ' title='对齐YZ面（X=0）' op='PL_YZ' />
                    <Btn label='ZX' title='对齐ZX面（Y=0）' op='PL_ZX' />
                    <Btn label='XY斜' title='XY对角线（X=Y=(X+Y)/2, Z=0）' op='DG_XY' />
                    <Btn label='YZ斜' title='YZ对角线（Y=Z=(Y+Z)/2, X=0）' op='DG_YZ' />
                    <Btn label='ZX斜' title='ZX对角线（Z=X=(Z+X)/2, Y=0）' op='DG_ZX' />
                    <Btn label='XY斜面' title='XY对角面（X=Y=(X+Y)/2, Z保留）' op='DP_XY' />
                    <Btn label='YZ斜面' title='YZ对角面（Y=Z=(Y+Z)/2, X保留）' op='DP_YZ' />
                    <Btn label='ZX斜面' title='ZX对角面（Z=X=(Z+X)/2, Y保留）' op='DP_ZX' />
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <button
                      disabled={disabled}
                      onClick={() => applyOp('MAIN_D')}
                      title={disabled ? '请选择一个组并选中具体点' : '主对角线（X=Y=Z=(X+Y+Z)/3）'}
                      style={{ width: '100%', background: disabled ? '#1a1a1a' : '#2b2b2b', color: '#eee', border: '1px solid #555', padding: '6px 8px', borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer' }}
                    >主对角线</button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.55)', padding: '10px 14px', borderRadius: 8, border: '1px solid #333', fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setGroupPanelOpen(open => !open)}
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
            >{groupPanelOpen ? '▼' : '▶'} 组列表</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              <span style={{ color: '#aaa' }}>统一坐标:</span>
              <button
                onClick={() => {
                  const next: Record<number, 'global'|'local'> = {};
                  patches.forEach(pp => { next[pp.id] = 'global'; });
                  setCoordModeById(next);
                }}
                style={{ background: '#2f2f2f', color: '#eee', border: '1px solid #555', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
              >全局</button>
              <button
                onClick={() => {
                  const next: Record<number, 'global'|'local'> = {};
                  patches.forEach(pp => { next[pp.id] = 'local'; });
                  setCoordModeById(next);
                }}
                style={{ background: '#2f2f2f', color: '#eee', border: '1px solid #555', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
              >局部</button>
            </div>
          </div>
          {groupPanelOpen && (
            <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <label style={{ color: '#cfcfcf' }}>新组名称</label>
              <select
                value={newGroupNameKind}
                onChange={(e) => { const v = e.target.value as any; setNewGroupNameKind(v); if (v !== 'custom') setCustomNameError(''); }}
                style={{ background: '#111', color: '#ddd', border: '1px solid #444', borderRadius: 4, padding: '4px 6px' }}
              >
                {['P','Q','R','S','J','T','U','V'].map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
                <option value='custom'>自定义</option>
              </select>
              {newGroupNameKind === 'custom' && (
                <>
                  <input
                    value={customName}
                    onChange={(e) => { const s = e.target.value; setCustomName(s); setCustomNameError(validateName(s)); }}
                    placeholder='输入名称（变量名格式）'
                    style={{ width: 180, background: '#111', color: '#ddd', border: '1px solid #444', borderRadius: 4, padding: '4px 6px' }}
                  />
                  {customNameError && (
                    <span style={{ color: '#ff6b6b', fontSize: 12 }}>{customNameError}</span>
                  )}
                </>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  const name = getPlannedGroupName();
                  if (newGroupNameKind === 'custom' && !name) return; // invalid custom name
                  const id = plotRef.current?.addPatch();
                  if (id != null && name) {
                    plotRef.current?.renamePatch(id, name);
                  }
                }}
                disabled={newGroupNameKind === 'custom' && !!validateName(customName)}
                style={{ background: '#333', color: '#eee', border: '1px solid #555', padding: '8px 12px', borderRadius: 5, cursor: (newGroupNameKind === 'custom' && !!validateName(customName)) ? 'not-allowed' : 'pointer', opacity: (newGroupNameKind === 'custom' && !!validateName(customName)) ? 0.6 : 1 }}
              >增加一个组</button>
              <button
                onClick={() => plotRef.current?.deleteSelectedPatch()}
                style={{ background: '#333', color: '#eee', border: '1px solid #555', padding: '8px 12px', borderRadius: 5, cursor: selection.patchId == null ? 'not-allowed' : 'pointer', opacity: selection.patchId == null ? 0.6 : 1 }}
                disabled={selection.patchId == null}
              >删除选中组</button>
            </div>
          </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            {patches.map(p => (
              <div
                key={p.id}
                style={{
                  border: selection.patchId === p.id ? '1px solid #ffdd59' : '1px solid #444',
                  borderRadius: 6,
                  padding: 8,
                  background: selection.patchId === p.id ? 'rgba(255, 221, 89, 0.08)' : 'rgba(0,0,0,0.35)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: selection.patchId === p.id ? '#ffdd59' : '#bbb', minWidth: 40, fontWeight: selection.patchId === p.id ? 700 : 400 }}>ID {p.id}</span>
                  <input
                    value={p.name ?? ''}
                    placeholder={`组 ${p.id}`}
                    onChange={(e) => plotRef.current?.renamePatch(p.id, e.target.value)}
                    style={{ flex: 1, background: '#111', color: '#ddd', border: '1px solid #444', borderRadius: 4, padding: '4px 6px' }}
                  />
                  <span
                    title='组颜色由 ECG 标记颜色映射控制'
                    style={{ display: 'inline-flex', width: 18, height: 18, borderRadius: 4, border: '1px solid #555', background: getColorForName(p.name, ecgLabelColors), flexShrink: 0 }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                    {(() => {
                      const mode = coordModeById[p.id] ?? 'global';
                      return (
                        <>
                          <span style={{ color: '#aaa' }}>坐标:</span>
                          <button
                            onClick={() => setCoordModeById(prev => ({ ...prev, [p.id]: 'global' }))}
                            style={{ background: mode === 'global' ? '#4a4a4a' : '#2f2f2f', color: '#eee', border: '1px solid #555', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                          >全局</button>
                          <button
                            onClick={() => setCoordModeById(prev => ({ ...prev, [p.id]: 'local' }))}
                            style={{ background: mode === 'local' ? '#4a4a4a' : '#2f2f2f', color: '#eee', border: '1px solid #555', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                          >局部</button>
                        </>
                      );
                    })()}
                  </div>
                  <div style={{ display: 'flex', gap: 8, whiteSpace: 'nowrap', alignItems: 'center' }}>
                    {(() => {
                      const locked = !!lockMainById[p.id];
                      return (
                        <button
                          onClick={() => {
                            const next = !locked;
                            setLockMainById(prev => ({ ...prev, [p.id]: next }));
                            plotRef.current?.setMainLocked?.(p.id, next);
                          }}
                          title='锁定主点：对p操作时平移整个组'
                          style={{ background: locked ? '#4a4a4a' : '#2f2f2f', color: '#eee', border: '1px solid #555', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}
                        >锁定主点</button>
                      );
                    })()}
                    <button
                      onClick={() => {
                        const u = p.u as [number, number, number];
                        const v = p.v as [number, number, number];
                        plotRef.current?.updatePointWorld(p.id, 'u', { x: v[0], y: v[1], z: v[2] });
                        plotRef.current?.updatePointWorld(p.id, 'v', { x: u[0], y: u[1], z: u[2] });
                      }}
                      style={{ background: '#2f2f2f', color: '#eee', border: '1px solid #555', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                    >反转</button>
                    <button
                      onClick={() => {
                        const m = p.main as [number, number, number];
                        const u = p.u as [number, number, number];
                        const v = p.v as [number, number, number];
                        const opp = [u[0] + v[0] - m[0], u[1] + v[1] - m[1], u[2] + v[2] - m[2]] as [number, number, number];
                        plotRef.current?.updatePointWorld(p.id, 'u', { x: m[0], y: m[1], z: m[2] });
                        plotRef.current?.updatePointWorld(p.id, 'main', { x: v[0], y: v[1], z: v[2] });
                        plotRef.current?.updatePointWorld(p.id, 'v', { x: opp[0], y: opp[1], z: opp[2] });
                      }}
                      style={{ background: '#2f2f2f', color: '#eee', border: '1px solid #555', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                    >轮换</button>
                    <button
                      onClick={() => plotRef.current?.deletePatchById(p.id)}
                      style={{ background: '#402020', color: '#ffb4b4', border: '1px solid #aa4444', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                    >删除组</button>
                  </div>
                </div>
                {(['main','u','v'] as const).map(role => (
                  <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    {(() => {
                      const isPointSelected = selection.patchId === p.id && selection.role === role;
                      const isEdgeSelected = selection.patchId === p.id && ((selection.role === 'edge_u' && (role === 'main' || role === 'u')) || (selection.role === 'edge_v' && (role === 'main' || role === 'v')));
                      const active = isPointSelected || isEdgeSelected;
                      const label = role === 'main' ? 'p' : role;
                      const mappingKey = role === 'main' ? 'P' : role.toUpperCase();
                      const baseColor = getColorForLabelKey(mappingKey, ecgLabelColors);
                      return (
                        <span style={{ color: active ? '#ffdd59' : baseColor, width: 36, fontWeight: active ? 700 : 400 }}>{label}</span>
                      );
                    })()}
                    {(['x','y','z'] as const).map((axis, idx) => (
                      <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: '#777' }}>{axis.toUpperCase()}</span>
                        <input
                          type='number'
                          step={0.01}
                          value={(() => {
                            // Compute display value based on coord mode
                            const mode = coordModeById[p.id] ?? 'global';
                            const worldArr = (p as any)[role] as [number, number, number];
                            if (role === 'main' || mode === 'global') {
                              const v = worldArr[idx];
                              return (v as any).toFixed ? (v as any).toFixed(3) : v;
                            }
                            // Local: show relative to main for u/v
                            const rel = worldArr[idx] - (p.main as [number,number,number])[idx];
                            return (rel as any).toFixed ? (rel as any).toFixed(3) : rel;
                          })()}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            const mode = coordModeById[p.id] ?? 'global';
                            const curWorld = (p as any)[role] as [number,number,number];
                            const next = { x: curWorld[0], y: curWorld[1], z: curWorld[2] } as any;
                            const mainArr = p.main as [number, number, number];
                            // Main always uses world coordinates
                            if (role === 'main') {
                              const newVal = isNaN(val) ? curWorld[idx] : val;
                              const delta = newVal - curWorld[idx];
                              next[axis] = newVal;
                              // If lock enabled, move u/v by the same delta on this axis
                              if (lockMainById[p.id]) {
                                const uW = p.u as [number,number,number];
                                const vW = p.v as [number,number,number];
                                const uNext = { x: uW[0], y: uW[1], z: uW[2] } as any;
                                const vNext = { x: vW[0], y: vW[1], z: vW[2] } as any;
                                uNext[axis] = (uW as any)[axis] + delta;
                                vNext[axis] = (vW as any)[axis] + delta;
                                plotRef.current?.updatePointWorld(p.id, 'main', next);
                                plotRef.current?.updatePointWorld(p.id, 'u', uNext);
                                plotRef.current?.updatePointWorld(p.id, 'v', vNext);
                                return;
                              }
                            } else if (mode === 'local') {
                              // Convert local delta to world
                              const worldVal = (isNaN(val) ? (curWorld[idx] - mainArr[idx]) : val) + mainArr[idx];
                              next[axis] = worldVal;
                            } else {
                              // Global display/edit
                              next[axis] = isNaN(val) ? curWorld[idx] : val;
                            }
                            plotRef.current?.updatePointWorld(p.id, role, next);
                          }}
                          onBlur={() => plotRef.current?.commit?.('coords-edit')}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); plotRef.current?.commit?.('coords-edit'); } }}
                          style={{ width: 80, background: '#111', color: '#ddd', border: '1px solid #444', borderRadius: 4, padding: '4px 6px' }}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
            </div>
            </>
          )}
        </div>
        <div style={{ background: 'rgba(0,0,0,0.55)', padding: '10px 14px', borderRadius: 8, border: '1px solid #333', fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setMarkerPanelOpen(open => !open)}
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
            >{markerPanelOpen ? '▼' : '▶'} 点列表</button>
            <button
              onClick={clearMarkers}
              disabled={markers.length === 0}
              style={{ background: '#402020', color: '#ffb4b4', border: '1px solid #aa4444', padding: '6px 12px', borderRadius: 5, cursor: markers.length === 0 ? 'not-allowed' : 'pointer', opacity: markers.length === 0 ? 0.6 : 1 }}
            >删除全部点</button>
          </div>
          {markerPanelOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <div style={{ color: hasMarkerRange ? '#aaa' : '#f07167', fontSize: 12 }}>
                {hasMarkerRange ? `有效序列范围: ${minMarkerIndex} ~ ${maxMarkerIndex}` : '当前 τ 或范围设置不足以生成点'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <label style={{ color: '#cfcfcf' }}>名称</label>
                <select
                  value={markerLabelOption}
                  onChange={(e) => setMarkerLabelOption(e.target.value)}
                  style={{ background: '#111', color: '#ddd', border: '1px solid #444', borderRadius: 4, padding: '4px 6px' }}
                >
                  {markerNameOptions.map(opt => (
                    <option key={opt} value={opt}>{opt === CUSTOM_LABEL_OPTION ? '自定义' : opt}</option>
                  ))}
                </select>
                {markerLabelOption === CUSTOM_LABEL_OPTION && (
                  <>
                    <input
                      value={markerCustomLabel}
                      onChange={(e) => setMarkerCustomLabel(e.target.value)}
                      placeholder='自定义名称'
                      style={{ background: '#111', color: '#ddd', border: '1px solid #444', borderRadius: 4, padding: '4px 6px', minWidth: 120 }}
                    />
                    {markerNameError && (
                      <span style={{ color: '#f07167', fontSize: 12 }}>{markerNameError}</span>
                    )}
                  </>
                )}
                <label style={{ color: '#cfcfcf' }}>数量</label>
                <input
                  type='number'
                  min={1}
                  max={200}
                  step={1}
                  value={markerCount}
                  onChange={(e) => setMarkerCount(Math.max(1, Math.min(200, parseInt(e.target.value, 10) || 1)))}
                  style={{ width: 80, fontSize: 12, background: '#111', color: '#ddd', border: '1px solid #444', borderRadius: 4, padding: '4px 6px' }}
                />
                <button
                  onClick={handleAddMarkers}
                  disabled={addMarkersDisabled}
                  style={{ background: '#2f2f2f', color: '#eee', border: '1px solid #555', padding: '6px 12px', borderRadius: 5, cursor: addMarkersDisabled ? 'not-allowed' : 'pointer', opacity: addMarkersDisabled ? 0.5 : 1 }}
                >添加点</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {markers.length === 0 ? (
                  <span style={{ color: '#777' }}>暂无标记点</span>
                ) : (
                  markers.map(marker => {
                    const color = getColorForLabelKey(marker.label, ecgLabelColors);
                    const valid = marker.index >= minMarkerIndex && marker.index <= maxMarkerIndex;
                    return (
                      <div key={marker.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: 'rgba(0,0,0,0.4)', borderRadius: 4 }}>
                        <span style={{ display: 'inline-flex', width: 12, height: 12, borderRadius: 3, background: color, border: '1px solid #555' }} />
                        <span style={{ color, minWidth: 40, fontWeight: 600 }}>{marker.label}</span>
                        <span style={{ color: valid ? '#aaa' : '#f07167', flex: 1 }}>序列值: {marker.index}{valid ? '' : ' (超出范围)'}</span>
                        <button
                          onClick={() => removeMarker(marker.id)}
                          style={{ background: '#402020', color: '#ffb4b4', border: '1px solid #aa4444', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}
                        >删除</button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};



