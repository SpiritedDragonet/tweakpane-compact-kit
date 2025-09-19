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
  const [toolMode, setToolMode] = useState<'translate'|'rotate'|'scale'>('translate');
  const [toolSpace, setToolSpace] = useState<'local'|'world'>('local');
  // Per-group coordinate display mode: 'global' (absolute) or 'local' (relative to main for u/v)
  const [coordModeById, setCoordModeById] = useState<Record<number, 'global' | 'local'>>({});
  const plotRef = useRef<PhaseSpacePlotHandle>(null);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <button onClick={() => plotRef.current?.addPatch()} style={{ background: '#333', color: '#eee', border: '1px solid #555', padding: '8px 12px', borderRadius: 5, cursor: 'pointer' }}>增加一个组 (A)</button>
            <button onClick={() => plotRef.current?.deleteSelectedPatch()} style={{ background: '#333', color: '#eee', border: '1px solid #555', padding: '8px 12px', borderRadius: 5, cursor: 'pointer' }}>删除选中组 (Del)</button>
          </div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.55)', padding: '10px 14px', borderRadius: 8, border: '1px solid #333', fontSize: 12, lineHeight: 1.5, marginTop: 10 }}>
          <b style={{ color: '#fff', fontSize: 13 as any }}>组列表</b>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              onClick={() => {
                // Set all groups to global display
                const next: Record<number, 'global'|'local'> = {};
                patches.forEach(pp => { next[pp.id] = 'global'; });
                setCoordModeById(next);
              }}
              style={{ background: '#2f2f2f', color: '#eee', border: '1px solid #555', padding: '6px 10px', borderRadius: 5, cursor: 'pointer' }}
            >全部设为全局</button>
            <button
              onClick={() => {
                // Set all groups to local display
                const next: Record<number, 'global'|'local'> = {};
                patches.forEach(pp => { next[pp.id] = 'local'; });
                setCoordModeById(next);
              }}
              style={{ background: '#2f2f2f', color: '#eee', border: '1px solid #555', padding: '6px 10px', borderRadius: 5, cursor: 'pointer' }}
            >全部设为局部</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            {patches.map(p => (
              <div key={p.id} style={{ border: '1px solid #444', borderRadius: 6, padding: 8, background: 'rgba(0,0,0,0.35)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#bbb', minWidth: 40 }}>ID {p.id}</span>
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
                  {(() => {
                    const mode = coordModeById[p.id] ?? 'global';
                    const nextMode = mode === 'global' ? 'local' : 'global';
                    return (
                      <button
                        onClick={() => setCoordModeById(prev => ({ ...prev, [p.id]: nextMode }))}
                        title='切换该组坐标显示（全局/局部）'
                        style={{ background: '#2f2f2f', color: '#eee', border: '1px solid #555', padding: '6px 10px', borderRadius: 5, cursor: 'pointer' }}
                      >坐标显示: {mode === 'global' ? '全局' : '局部'}</button>
                    );
                  })()}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button
                    onClick={() => {
                      // Invert: swap u and v positions
                      const u = p.u as [number, number, number];
                      const v = p.v as [number, number, number];
                      plotRef.current?.updatePointWorld(p.id, 'u', { x: v[0], y: v[1], z: v[2] });
                      plotRef.current?.updatePointWorld(p.id, 'v', { x: u[0], y: u[1], z: u[2] });
                    }}
                    style={{ background: '#2f2f2f', color: '#eee', border: '1px solid #555', padding: '6px 10px', borderRadius: 5, cursor: 'pointer' }}
                  >反转</button>
                  <button
                    onClick={() => {
                      // Rotate: u -> main position; main -> v position; v -> opposite corner of parallelogram
                      const m = p.main as [number, number, number];
                      const u = p.u as [number, number, number];
                      const v = p.v as [number, number, number];
                      const opp = [u[0] + v[0] - m[0], u[1] + v[1] - m[1], u[2] + v[2] - m[2]] as [number, number, number];
                      plotRef.current?.updatePointWorld(p.id, 'u', { x: m[0], y: m[1], z: m[2] });
                      plotRef.current?.updatePointWorld(p.id, 'main', { x: v[0], y: v[1], z: v[2] });
                      plotRef.current?.updatePointWorld(p.id, 'v', { x: opp[0], y: opp[1], z: opp[2] });
                    }}
                    style={{ background: '#2f2f2f', color: '#eee', border: '1px solid #555', padding: '6px 10px', borderRadius: 5, cursor: 'pointer' }}
                  >轮换</button>
                </div>
                {(['main','u','v'] as const).map(role => (
                  <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <span style={{ color: '#aaa', width: 36 }}>{role}</span>
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
                              next[axis] = isNaN(val) ? curWorld[idx] : val;
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
