import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PhaseSpacePlot, PhaseSpacePlotHandle, PatchDTO } from './components/PhaseSpacePlot';

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
  const [pointSizePx, setPointSizePx] = useState<number>(15);
  const [frameCloseness, setFrameCloseness] = useState<number>(2); // 默认近景倍数（更贴近你的偏好）
  const [patches, setPatches] = useState<PatchDTO[]>([]);
  const [toolMode, setToolMode] = useState<'translate'|'rotate'|'scale'|'uv'>('translate');
  const [toolSpace, setToolSpace] = useState<'local'|'world'>('local');
  // Per-group coordinate display mode: 'global' (absolute) or 'local' (relative to main for u/v)
  const [coordModeById, setCoordModeById] = useState<Record<number, 'global' | 'local'>>({});
  const [lockMainById, setLockMainById] = useState<Record<number, boolean>>({});
  // Selection from 3D view for UI highlight
  const [selection, setSelection] = useState<{ patchId: number | null; role: 'main'|'u'|'v'|'edge_u'|'edge_v'|null }>({ patchId: null, role: null });
  const plotRef = useRef<PhaseSpacePlotHandle>(null);
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

  const external = useMemo(() => ({
    signal,
    displayStartPosition: start + 1, // convert to 1-based for compatibility
    displayEndPosition: end + 1,
    tau,
  }), [signal, start, end, tau]);

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: '1 1 auto', padding: 12, boxSizing: 'border-box' }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', border: '1px solid #333', borderRadius: 8, background: '#0a0b0e', overflow: 'hidden' }}>
          <PhaseSpacePlot
            ref={plotRef}
            external={external}
            debug={true}
            pointPixelSize={pointSizePx}
            frameCloseness={frameCloseness}
            onSelectionChange={setSelection}
            onPatchesChange={setPatches}
          />
        </div>
      </div>
      <aside style={{ width: 340, borderLeft: '1px solid #2a2a2a', background: 'rgba(0,0,0,0.35)', padding: 12, boxSizing: 'border-box', overflowY: 'auto' }}>
        <div style={{ background: 'rgba(0,0,0,0.55)', padding: '10px 14px', borderRadius: 8, border: '1px solid #333', fontSize: 12, lineHeight: 1.5 }}>
          <b style={{ color: '#fff', fontSize: 13 as any }}>操作指南</b><br />
          • 鼠标拖拽旋转，滚轮缩放视角<br />
          • 点击点/线/面选中组；拖动控制柄移动点<br />
          • W/E/R：移动/旋转/缩放；Q：切换坐标系；Esc：取消选择
        </div>
        <div style={{ background: 'rgba(0,0,0,0.55)', padding: '10px 14px', borderRadius: 8, border: '1px solid #333', fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>
          <b style={{ color: '#fff', fontSize: 13 as any }}>相空间参数</b>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <label style={{ minWidth: 70, color: '#cfcfcf' }}>τ (Tau)</label>
            <input type="range" min={1} max={50} step={1} value={tau} onChange={(e) => setTau(parseInt(e.target.value, 10))} style={{ flex: 1 }} />
            <input type="number" min={1} max={50} step={1} value={tau} onChange={(e) => setTau(parseInt(e.target.value, 10) || 8)} style={{ width: 80, fontSize: 12, background: '#111', color: '#ddd', border: '1px solid #444', borderRadius: 4, padding: '4px 6px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <label style={{ minWidth: 70, color: '#cfcfcf' }}>近景倍数</label>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <label style={{ minWidth: 70, color: '#cfcfcf' }}>Start</label>
            <input type="number" min={0} max={Math.max(0, signal.length - 2)} step={1} value={start} onChange={(e) => setStart(Math.max(0, parseInt(e.target.value, 10) || 0))} style={{ width: 80, fontSize: 12, background: '#111', color: '#ddd', border: '1px solid #444', borderRadius: 4, padding: '4px 6px' }} />
            <label style={{ minWidth: 40, color: '#cfcfcf' }}>End</label>
            <input type="number" min={1} max={signal.length - 1} step={1} value={end} onChange={(e) => setEnd(Math.min(signal.length - 1, parseInt(e.target.value, 10) || (signal.length - 1)))} style={{ width: 80, fontSize: 12, background: '#111', color: '#ddd', border: '1px solid #444', borderRadius: 4, padding: '4px 6px' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <button onClick={() => setSignal(generatePseudoECG())} style={{ background: '#333', color: '#eee', border: '1px solid #555', padding: '8px 12px', borderRadius: 5, cursor: 'pointer' }}>重新生成信号</button>
          </div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.55)', padding: '10px 14px', borderRadius: 8, border: '1px solid #333', fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>
          <b style={{ color: '#fff', fontSize: 13 as any }}>交互模式</b>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <label style={{ minWidth: 70, color: '#cfcfcf' }}>操作</label>
            <select value={toolMode} onChange={(e) => { const m = e.target.value as any; setToolMode(m); plotRef.current?.setTransformMode(m); }} style={{ flex: 1, background: '#111', color: '#ddd', border: '1px solid #444', borderRadius: 4, padding: '4px 6px' }}>
              <option value='translate'>移动 (W)</option>
              <option value='rotate'>旋转 (E)</option>
              <option value='scale'>缩放 (R)</option>
              <option value='uv'>沿u/v平移</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <label style={{ minWidth: 70, color: '#cfcfcf' }}>坐标系</label>
            <select value={toolSpace} onChange={(e) => { const s = e.target.value as any; setToolSpace(s); plotRef.current?.setTransformSpace(s); }} style={{ flex: 1, background: '#111', color: '#ddd', border: '1px solid #444', borderRadius: 4, padding: '4px 6px' }}>
              <option value='local'>局部 (Q)</option>
              <option value='world'>世界</option>
            </select>
          </div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.55)', padding: '10px 14px', borderRadius: 8, border: '1px solid #333', fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>
          <b style={{ color: '#fff', fontSize: 13 as any }}>显示设置</b>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <label style={{ minWidth: 90, color: '#cfcfcf' }}>点大小(px)</label>
            <input type="range" min={6} max={60} step={1} value={pointSizePx} onChange={(e) => setPointSizePx(parseInt(e.target.value, 10) || 15)} style={{ flex: 1 }} />
            <input type="number" min={6} max={60} step={1} value={pointSizePx} onChange={(e) => setPointSizePx(Math.max(6, Math.min(60, parseInt(e.target.value, 10) || 15)))} style={{ width: 80, fontSize: 12, background: '#111', color: '#ddd', border: '1px solid #444', borderRadius: 4, padding: '4px 6px' }} />
          </div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.55)', padding: '10px 14px', borderRadius: 8, border: '1px solid #333', fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>
          <b style={{ color: '#fff', fontSize: 13 as any }}>补丁编辑</b>
          {/* 统一坐标操作区：作用于当前选中组 */}
          <div style={{ marginTop: 10 }}>
            <div style={{ color: '#aaa', marginBottom: 6 }}>
              目标组: {selection.patchId != null ? `ID ${selection.patchId}` : '未选择'}；坐标模式: {(() => {
                if (selection.patchId == null) return '-';
                const mode = coordModeById[selection.patchId] ?? 'global';
                return mode === 'global' ? '绝对' : '相对';
              })()}
            </div>
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
                const transform = (vec: [number,number,number], kind: string) => {
                  const [x,y,z] = vec;
                  switch (kind) {
                    case 'AX_X': return [x, 0, 0] as [number,number,number];
                    case 'AX_Y': return [0, y, 0] as [number,number,number];
                    case 'AX_Z': return [0, 0, z] as [number,number,number];
                    case 'PL_XY': return [x, y, 0] as [number,number,number];
                    case 'PL_YZ': return [0, y, z] as [number,number,number];
                    case 'PL_ZX': return [x, 0, z] as [number,number,number];
                    case 'DG_XY': { const s = (x + y) / 2; return [s, s, 0] as [number,number,number]; }
                    case 'DG_YZ': { const s = (y + z) / 2; return [0, s, s] as [number,number,number]; }
                    case 'DG_ZX': { const s = (z + x) / 2; return [s, 0, s] as [number,number,number]; }
                    case 'DP_XY': { const s = (x + y) / 2; return [s, s, z] as [number,number,number]; }
                    case 'DP_YZ': { const s = (y + z) / 2; return [x, s, s] as [number,number,number]; }
                    case 'DP_ZX': { const s = (z + x) / 2; return [s, y, s] as [number,number,number]; }
                    case 'MAIN_D': { const s = (x + y + z) / 3; return [s, s, s] as [number,number,number]; }
                    default: return vec;
                  }
                };
                const role = selection.role as 'main'|'u'|'v';
                if (role === 'main') {
                  const newM = transform(m, op); // p uses absolute in both modes
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
                  // First align main, then map u with the same op
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
                  // First align main, then map v with the same op
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
            <b style={{ color: '#fff', fontSize: 13 as any, whiteSpace: 'nowrap' }}>组列表</b>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              <span style={{ color: '#aaa' }}>全部坐标:</span>
              <button
                onClick={() => {
                  const next: Record<number, 'global'|'local'> = {};
                  patches.forEach(pp => { next[pp.id] = 'global'; });
                  setCoordModeById(next);
                }}
                style={{ background: '#2f2f2f', color: '#eee', border: '1px solid #555', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
              >绝对</button>
              <button
                onClick={() => {
                  const next: Record<number, 'global'|'local'> = {};
                  patches.forEach(pp => { next[pp.id] = 'local'; });
                  setCoordModeById(next);
                }}
                style={{ background: '#2f2f2f', color: '#eee', border: '1px solid #555', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
              >相对</button>
            </div>
          </div>
          {/* 新增/删除移动到组列表，并在其上方放置命名选择器 */}
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
                style={{ background: '#333', color: '#eee', border: '1px solid #555', padding: '8px 12px', borderRadius: 5, cursor: 'pointer' }}
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
              <div key={p.id} style={{ border: '1px solid #444', borderRadius: 6, padding: 8, background: 'rgba(0,0,0,0.35)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: selection.patchId === p.id ? '#ffdd59' : '#bbb', minWidth: 40, fontWeight: selection.patchId === p.id ? 700 : 400 }}>ID {p.id}</span>
                  <input
                    value={p.name ?? ''}
                    placeholder={`组 ${p.id}`}
                    onChange={(e) => plotRef.current?.renamePatch(p.id, e.target.value)}
                    style={{ flex: 1, background: '#111', color: '#ddd', border: '1px solid #444', borderRadius: 4, padding: '4px 6px' }}
                  />
                  <input
                    type='color'
                    value={p.color ?? '#ffffff'}
                    onChange={(e) => plotRef.current?.updatePatchColor(p.id, e.target.value)}
                    title='主点/面的颜色'
                    style={{ width: 36, height: 24, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
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
                          >绝对</button>
                          <button
                            onClick={() => setCoordModeById(prev => ({ ...prev, [p.id]: 'local' }))}
                            style={{ background: mode === 'local' ? '#4a4a4a' : '#2f2f2f', color: '#eee', border: '1px solid #555', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                          >相对</button>
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
                  </div>
                </div>
                {(['main','u','v'] as const).map(role => (
                  <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    {(() => {
                      const isPointSelected = selection.patchId === p.id && selection.role === role;
                      const isEdgeSelected = selection.patchId === p.id && ((selection.role === 'edge_u' && (role === 'main' || role === 'u')) || (selection.role === 'edge_v' && (role === 'main' || role === 'v')));
                      const active = isPointSelected || isEdgeSelected;
                      const label = role === 'main' ? 'p' : role;
                      return (
                        <span style={{ color: active ? '#ffdd59' : '#aaa', width: 36, fontWeight: active ? 700 : 400 }}>{label}</span>
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
                          style={{ width: 80, background: '#111', color: '#ddd', border: '1px solid #444', borderRadius: 4, padding: '4px 6px' }}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
};
