import React, { useEffect, useRef } from 'react';
import { Pane, InputBindingApi, TpChangeEvent } from 'tweakpane';
import type { BladeLayoutSpec } from '../plugins/BladeLayout';
import { addSizedButton } from '../plugins/addSizedButton';
// Essentials plugin for button grid
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
import type { ButtonGridApi } from '@tweakpane/plugin-essentials';
import type { PatchDTO } from './PhaseSpacePlot';

// Import SVG icons as URLs
import axisFocusXSvg from '../assets/icons/axis_focus_x.svg?url';
import axisFocusYSvg from '../assets/icons/axis_focus_y.svg?url';
import axisFocusZSvg from '../assets/icons/axis_focus_z.svg?url';
import axisPlaneXYSvg from '../assets/icons/axis_plane_010_100.svg?url';
import axisPlaneYZSvg from '../assets/icons/axis_plane_001_010.svg?url';
import axisPlaneZXSvg from '../assets/icons/axis_plane_100_001.svg?url';
import axisDimXYSvg from '../assets/icons/axis_dim_110.svg?url';
import axisDimYZSvg from '../assets/icons/axis_dim_011.svg?url';
import axisDimZXSvg from '../assets/icons/axis_dim_101.svg?url';
import axisPlaneXYDiagSvg from '../assets/icons/axis_plane_110_001.svg?url';
import axisPlaneYZDiagSvg from '../assets/icons/axis_plane_011_100.svg?url';
import axisPlaneZXDiagSvg from '../assets/icons/axis_plane_101_010.svg?url';
import axisDiag111Svg from '../assets/icons/axis_diag_111.svg?url';

type TransformMode = 'translate'|'rotate'|'scale'|'uv';

const DEFAULT_GROUP_OPTIONS = ['P','Q','R','S','J','T','U','V','custom'];

type Props = {
  tau: number;
  setTau: (v: number) => void;
  start: number;
  setStart: (v: number) => void;
  end: number;
  setEnd: (v: number) => void;
  signalLength: number;
  onRegenerateSignal: () => void;
  // Interaction mode props
  toolMode: TransformMode;
  onChangeToolMode: (m: TransformMode) => void;
  // Display settings props
  pointSizePx: number;
  setPointSizePx: (v: number) => void;
  markerPointSizePx: number;
  setMarkerPointSizePx: (v: number) => void;
  frameCloseness: number;
  setFrameCloseness: (v: number) => void;
  // ECG color editing props
  colorOptions: string[];
  colorEditLabel: string;
  setColorEditLabel: (label: string) => void;
  currentEditColor: string;
  onChangeColor: (label: string, hex: string) => void;
  // Align operations
  alignEnabled: boolean;
  onApplyAlignOp: (op: string) => void;
  // Groups list
  patches: PatchDTO[];
  selection: { patchId: number | null; role: 'main'|'u'|'v'|'edge_u'|'edge_v'|null };
  coordModeById: Record<number, 'global'|'local'>;
  onSetCoordMode: (patchId: number, mode: 'global'|'local') => void;
  lockMainById: Record<number, boolean>;
  onSetLockMain: (patchId: number, locked: boolean) => void;
  onRenamePatch: (patchId: number, name: string) => void;
  onReverse: (patchId: number) => void;
  onRotate: (patchId: number) => void;
  onDeletePatch: (patchId: number) => void;
  onAddGroup: () => void;
  onDeleteSelectedGroup: () => void;
  // Coordinate editing
  onEditCoord: (
    patchId: number,
    role: 'main'|'u'|'v',
    axis: 'x'|'y'|'z',
    value: number,
  ) => void;
  onCommitCoords: () => void;
  // Live edit (during drag) – update Three without committing history
  onLiveEditCoord: (
    patchId: number,
    role: 'main'|'u'|'v',
    axis: 'x'|'y'|'z',
    value: number,
  ) => void;
  // New group naming for add (shared name store)
  groupNameOptions: string[];
  newGroupNameKind: string;
  onSetNewGroupNameKind: (k: string) => void;
  customName: string;
  onSetCustomName: (s: string) => void;
  customNameError?: string;
  // Batch operations
  onDeleteAllGroups: () => void;
  onSetAllCoordMode: (mode: 'global'|'local') => void;
  onAddGroupWithPlan: (kind: string, custom: string) => void;
  // Markers (points) panel
  markers: { id: number; label: string; index: number }[];
  markerNameOptions: string[];
  markerLabelOption: string;
  onSetMarkerLabelOption: (v: string) => void;
  markerCustomLabel: string;
  onSetMarkerCustomLabel: (s: string) => void;
  markerNameError?: string;
  markerCount: number;
  onSetMarkerCount: (n: number) => void;
  minMarkerIndex: number;
  maxMarkerIndex: number;
  hasMarkerRange: boolean;
  onAddMarkers: (count: number, baseLabelRaw: string) => void;
  onClearMarkers: () => void;
  onRemoveMarker: (id: number) => void;
  customOptionValue?: string; // value for custom option (default '__custom__')
};

// Clamp helper
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
// Round to N decimals (default 4)
const roundTo = (n: number, d: number = 4) => {
  if (!Number.isFinite(n)) return 0;
  const f = Math.pow(10, Math.max(0, Math.floor(d)));
  return Math.round(n * f) / f;
};
// Limit a delta step to avoid large mid-drag jumps in UI-only display
const clampStep = (prev: number, next: number, stepMax = 0.01) => {
  const d = next - prev;
  const bounded = Math.max(-Math.abs(stepMax), Math.min(Math.abs(stepMax), d));
  return roundTo(prev + bounded, 4);
};

export const ConditionEditorPanel: React.FC<Props> = ({
  tau,
  setTau,
  start,
  setStart,
  end,
  setEnd,
  signalLength,
  onRegenerateSignal,
  toolMode,
  onChangeToolMode,
  pointSizePx,
  setPointSizePx,
  markerPointSizePx,
  setMarkerPointSizePx,
  frameCloseness,
  setFrameCloseness,
  colorOptions,
  colorEditLabel,
  setColorEditLabel,
  currentEditColor,
  onChangeColor,
  alignEnabled,
  onApplyAlignOp,
  patches,
  selection,
  coordModeById,
  onSetCoordMode,
  lockMainById,
  onSetLockMain,
  onRenamePatch,
  onReverse,
  onRotate,
  onDeletePatch,
  onAddGroup,
  onDeleteSelectedGroup,
  onEditCoord,
  onCommitCoords,
  onLiveEditCoord,
  groupNameOptions,
  newGroupNameKind,
  onSetNewGroupNameKind,
  customName,
  onSetCustomName,
  customNameError,
  onDeleteAllGroups,
  onSetAllCoordMode,
  onAddGroupWithPlan,
  markers,
  markerNameOptions,
  markerLabelOption,
  onSetMarkerLabelOption,
  markerCustomLabel,
  onSetMarkerCustomLabel,
  markerNameError: markerNameError2,
  markerCount,
  onSetMarkerCount,
  minMarkerIndex,
  maxMarkerIndex,
  hasMarkerRange,
  onAddMarkers,
  onClearMarkers,
  onRemoveMarker,
  customOptionValue = '__custom__',
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const paneRef = useRef<Pane | null>(null);
  const gridRef = useRef<ButtonGridApi | null>(null);
  const alignGridRef = useRef<ButtonGridApi | null>(null);
  const mainDiagGridRef = useRef<ButtonGridApi | null>(null);
  const alignEnabledRef = useRef<boolean>(alignEnabled);
  const onApplyAlignOpRef = useRef<(op: string) => void>(onApplyAlignOp);
  const uiSyncingRef = useRef<boolean>(false);
  const pointSizeInputRef = useRef<InputBindingApi<number> | null>(null);
  const markerSizeInputRef = useRef<InputBindingApi<number> | null>(null);
  const frameCloseInputRef = useRef<InputBindingApi<number> | null>(null);
  const colorInputRef = useRef<InputBindingApi<string> | null>(null);
  const colorListRef = useRef<any | null>(null);
  const colorEditLabelRef = useRef<string>(colorEditLabel);
  const onChangeColorRef = useRef<(label: string, hex: string) => void>(onChangeColor);
  const groupsFolderRef = useRef<any | null>(null);
  const groupsListFolderRef = useRef<any | null>(null);
  const groupsDynamicStartIndexRef = useRef<number>(0);
  const groupUiMapRef = useRef<Map<number, {
    folder: any;
    nameBinding: InputBindingApi<string> | null;
    params?: { p: {x:number;y:number;z:number}; u: {x:number;y:number;z:number}; v: {x:number;y:number;z:number} };
    bindings?: {
      p?: InputBindingApi<{x:number;y:number;z:number}>;
      u?: InputBindingApi<{x:number;y:number;z:number}>;
      v?: InputBindingApi<{x:number;y:number;z:number}>;
    };
    // View elements for highlight styling
    folderEl?: HTMLElement | null;
    rowEls?: { p?: HTMLElement | null; u?: HTMLElement | null; v?: HTMLElement | null };
  }>>(new Map());
  // New group naming UI refs
  const nameParamsRef = useRef<{ kind: string; custom: string }>({ kind: newGroupNameKind, custom: customName });
  const nameKindListRef = useRef<any | null>(null);
  const customNameBindingRef = useRef<InputBindingApi<string> | null>(null);
  const topGridRef = useRef<ButtonGridApi | null>(null);
  // Markers folder refs
  const markersFolderRef = useRef<any | null>(null);
  const markerInfoRef = useRef<{ range: string }>({ range: '' });
  const mkCustomElRef = useRef<HTMLElement | null>(null);
  const mkCustomParamsRef = useRef<{ text: string }>({ text: '' });
  const mkCountParamsRef = useRef<{ count: number }>({ count: 1 });
  const markerListRef = useRef<any | null>(null);
  const markersListFolderRef = useRef<any | null>(null);
  const markersDynamicStartIndexRef = useRef<number>(0);
  const markerRowApisRef = useRef<any[]>([]); // hold created row apis to dispose on rebuild
  // No-op placeholder for legacy diagnostics (kept to avoid ref errors)
  const dxTestRef = useRef<any>(null);
  // Live drag sensitivity (value per pixel for custom knob drag)
  const liveScaleRef = useRef<number>(0.001);

  // Keep tweakpane params separate from React state to avoid feedback loops
  const paramsRef = useRef({
    tau,
    start,
    end,
    pointSizePx,
    markerPointSizePx,
    frameCloseness,
    editColor: currentEditColor,
  });
  const tauInputRef = useRef<InputBindingApi<number> | null>(null);
  const startInputRef = useRef<InputBindingApi<number> | null>(null);
  const endInputRef = useRef<InputBindingApi<number> | null>(null);

  useEffect(() => {
    const container = hostRef.current;
    if (!container) return;

    const pane = new Pane({ container, title: '条件编辑' });
    // Register essentials plugin (button grid, etc.)
    pane.registerPlugin(EssentialsPlugin as any);
    // Register a CSS-only helper bundle to scope container-fit rules (no visual override)
    try {
      pane.registerPlugin({
        id: 'blade-helpers',
        css: `
          /* Let TP value views respect container width inside BladeLayout slots */
          .tp-bl-slot .tp-lblv, .tp-bl-slot .tp-lblv_v { min-width: 0; max-width: 100%; box-sizing: border-box; }
          /* Add subtle 4px vertical breathing space per slot */
          .tp-bl-slot { padding-top: 4px; padding-bottom: 4px; }
          /* Zero vertical gaps inside slots to eliminate extra spacing */
          .tp-bl-slot .tp-lblv { margin-top: 0 !important; margin-bottom: 0 !important; }
          .tp-bl-slot .tp-rotv, .tp-bl-slot .tp-rotv_c, .tp-bl-slot .tp-cntv { padding-top: 0 !important; padding-bottom: 0 !important; }
          .tp-bl-slot .tp-rotv_c > * { margin-top: 0 !important; margin-bottom: 0 !important; }
          .tp-bl-slot .tp-fldv { margin-top: 0 !important; margin-bottom: 0 !important; }
          .tp-bl-slot .tp-fldv_c { padding-top: 0 !important; padding-bottom: 0 !important; }
          .tp-bl-slot .tp-v-fst, .tp-bl-slot .tp-v-vfst, .tp-bl-slot .tp-v-lst, .tp-bl-slot .tp-v-vlst {
            padding-top: 0 !important; padding-bottom: 0 !important;
            margin-top: 0 !important; margin-bottom: 0 !important;
          }
          /* Ensure nested row cells clip overflow and don't bleed across columns */
          .tp-bl-row > .tp-bl-cell { overflow: hidden; box-sizing: border-box; }
          /* Remove left label box for all non-checkbox controls within blade slots */
          .tp-bl-slot .tp-lblv:not(:has(.tp-ckbv)) { padding-left: 0; }
          .tp-bl-slot .tp-lblv:not(:has(.tp-ckbv)) .tp-lblv_l { display: none; width: 0; margin: 0; padding: 0; }
          .tp-bl-slot .tp-lblv:not(:has(.tp-ckbv)) .tp-lblv_v { margin-left: 0; }
        `,
      } as any);
    } catch {}
    pane.element.style.maxHeight = '100%';
    pane.element.style.overflowY = 'auto';
    paneRef.current = pane;
    // Local child panes to dispose for demo split-layout
    const demoPanesLocal: Pane[] = [];

    const folder = pane.addFolder({ title: '相空间参数', expanded: true });

    // Initialize params snapshot
    paramsRef.current = { tau, start, end, pointSizePx, markerPointSizePx, frameCloseness, editColor: currentEditColor, knobSensitivity: liveScaleRef.current } as any;

    const tauInput = folder.addBinding(paramsRef.current, 'tau', {
      label: 'τ (Tau)',
      min: 1,
      max: 50,
      step: 1,
    });
    tauInputRef.current = tauInput as InputBindingApi<number>;
    tauInput.on('change', (ev: TpChangeEvent<number>) => {
      const value = clamp(Math.round(ev.value), 1, 50);
      if (value !== paramsRef.current.tau) paramsRef.current.tau = value;
      if (value !== tau) setTau(value);
    });

    const startMax = Math.max(0, signalLength - 2);
    const startInput = folder.addBinding(paramsRef.current, 'start', {
      label: '开始',
      min: 0,
      max: startMax,
      step: 1,
    });
    startInputRef.current = startInput as InputBindingApi<number>;
    startInput.on('change', (ev: TpChangeEvent<number>) => {
      const raw = Number.isFinite(ev.value) ? Math.round(ev.value) : start;
      const value = clamp(raw, 0, Math.max(0, signalLength - 2));
      if (value !== paramsRef.current.start) paramsRef.current.start = value;
      if (value !== start) setStart(value);
    });

    const endMax = Math.max(1, signalLength - 1);
    const endInput = folder.addBinding(paramsRef.current, 'end', {
      label: '结束',
      min: 1,
      max: endMax,
      step: 1,
    });
    endInputRef.current = endInput as InputBindingApi<number>;
    endInput.on('change', (ev: TpChangeEvent<number>) => {
      const raw = Number.isFinite(ev.value) ? Math.round(ev.value) : end;
      const value = clamp(raw, 1, Math.max(1, signalLength - 1));
      if (value !== paramsRef.current.end) paramsRef.current.end = value;
      if (value !== end) setEnd(value);
    });

    folder.addButton({ title: '重新生成信号' }).on('click', () => {
      onRegenerateSignal();
    });

    // Interaction mode folder with button grid (1 row x 4 columns)
    const folderInteract = pane.addFolder({ title: '交互模式', expanded: true });
    const modes: TransformMode[] = ['translate', 'rotate', 'scale', 'uv'];
    const baseTitles = ['移动 (W)', '旋转 (E)', '缩放 (R)', '沿u/v平移'];
    const grid = folderInteract.addBlade({
      view: 'buttongrid',
      size: [4, 1], // 4 columns, 1 row
      // no label to avoid leading space
      cells: (x: number, y: number) => ({
        title: baseTitles[x] ?? ''
      }),
    }) as unknown as ButtonGridApi;
    grid.on('click', (ev) => {
      const [x] = ev.index;
      const m = modes[x] ?? 'translate';
      onChangeToolMode(m);
    });

    // Keep grid instance for later updates
    gridRef.current = grid;

    // Make buttons taller and close-to-square
    try {
      const gridEl: HTMLElement | undefined = (grid as any)?.controller?.valueController?.view?.element;
      if (gridEl) {
        // One row height ~48px (about 2x default), ensure buttons fill the row height
        gridEl.style.gridTemplateRows = 'repeat(1, 48px)';
        const btns = Array.from(gridEl.querySelectorAll('button')) as HTMLElement[];
        btns.forEach((b) => {
          b.style.height = '48px';
          b.style.padding = '0 8px';
          b.style.lineHeight = '48px';
          // slightly increase font weight for visibility
          b.style.fontWeight = '600';
        });
      }
    } catch { /* noop styling guard */ }

    // Display settings folder
    const folderDisplay = pane.addFolder({ title: '显示设置', expanded: true });
    // Group point size
    const psInput = folderDisplay.addBinding(paramsRef.current, 'pointSizePx', {
      label: '组点大小(px)',
      min: 4,
      max: 64,
      step: 1,
    });
    pointSizeInputRef.current = psInput as InputBindingApi<number>;
    psInput.on('change', (ev: TpChangeEvent<number>) => {
      const value = clamp(Math.round(ev.value), 4, 64);
      if (value !== paramsRef.current.pointSizePx) paramsRef.current.pointSizePx = value;
      if (value !== pointSizePx) setPointSizePx(value);
    });
    // Marker point size
    const msInput = folderDisplay.addBinding(paramsRef.current, 'markerPointSizePx', {
      label: '标记点大小(px)',
      min: 2,
      max: 40,
      step: 1,
    });
    markerSizeInputRef.current = msInput as InputBindingApi<number>;
    msInput.on('change', (ev: TpChangeEvent<number>) => {
      const value = clamp(Math.round(ev.value), 2, 40);
      if (value !== paramsRef.current.markerPointSizePx) paramsRef.current.markerPointSizePx = value;
      if (value !== markerPointSizePx) setMarkerPointSizePx(value);
    });
    // Frame closeness
    const fcInput = folderDisplay.addBinding(paramsRef.current, 'frameCloseness', {
      label: '近景倍数',
      min: 2,
      max: 100,
      step: 1,
    });
    frameCloseInputRef.current = fcInput as InputBindingApi<number>;
    fcInput.on('change', (ev: TpChangeEvent<number>) => {
      const raw = Math.round(ev.value);
      const value = clamp(raw, 2, 100);
      if (value !== paramsRef.current.frameCloseness) paramsRef.current.frameCloseness = value;
      if (value !== frameCloseness) setFrameCloseness(value);
    });

    // Drag sensitivity for numeric knob (value per pixel)
    const ksInput = folderDisplay.addBinding(paramsRef.current as any, 'knobSensitivity', {
      label: '拖拽灵敏度',
      min: 0.0001,
      max: 0.01,
      step: 0.0001,
    });
    ksInput.on('change', (ev: TpChangeEvent<number>) => {
      const v = Number(ev.value);
      const clamped = Math.max(0.0001, Math.min(0.01, isFinite(v) ? v : liveScaleRef.current));
      if (clamped !== liveScaleRef.current) liveScaleRef.current = clamped;
      (paramsRef.current as any).knobSensitivity = liveScaleRef.current;
    });

    // ECG color editing
    const listOptions = (colorOptions || []).map((val) => ({ text: val === 'custom' ? '自定义默认' : val, value: val }));
    const colorList = folderDisplay.addBlade({
      view: 'list',
      label: '名称',
      options: listOptions,
      value: colorEditLabel,
    } as any);
    colorListRef.current = colorList as any;
    colorList.on('change', (ev: any) => {
      const next = ev?.value ?? colorEditLabel;
      if (typeof next === 'string' && next !== colorEditLabel) {
        setColorEditLabel(next);
      }
    });

    const colorInput = folderDisplay.addBinding(paramsRef.current, 'editColor', {
      label: '颜色',
      color: { type: 'int' },
    });
    colorInputRef.current = colorInput as InputBindingApi<string>;
    colorInput.on('change', (ev: any) => {
      let hex = '';
      const v = ev?.value;
      if (typeof v === 'string') {
        hex = v.trim();
      } else if (v && typeof v === 'object' && typeof v.getComponents === 'function') {
        try {
          const comps = v.getComponents('rgb'); // [r,g,b,a], int 0..255
          const to2 = (n: number) => {
            const h = Math.max(0, Math.min(255, Math.floor(n))).toString(16);
            return h.length === 1 ? '0' + h : h;
          };
          hex = '#' + to2(comps[0]) + to2(comps[1]) + to2(comps[2]);
        } catch {}
      }
      if (!hex) return;
      if (hex !== paramsRef.current.editColor) paramsRef.current.editColor = hex;
      // Use latest selected label to avoid stale-closure bug
      const label = colorEditLabelRef.current || colorEditLabel;
      onChangeColorRef.current(label, hex);
    });

    // Save refs for syncing
    paneRef.current = pane;
    tauInputRef.current = tauInput;
    startInputRef.current = startInput;
    endInputRef.current = endInput;
    pointSizeInputRef.current = psInput as InputBindingApi<number>;
    markerSizeInputRef.current = msInput as InputBindingApi<number>;
    frameCloseInputRef.current = fcInput as InputBindingApi<number>;
    colorInputRef.current = colorInput as InputBindingApi<string>;
    colorListRef.current = colorList;

    // Align operations folder
    const folderAlign = pane.addFolder({ title: '对齐操作', expanded: true });
    // 12-op grid (3x4)
    const alignOps = [
      { key: 'AX_X', title: 'X', tooltip: 'X轴对齐', icon: axisFocusXSvg },
      { key: 'AX_Y', title: 'Y', tooltip: 'Y轴对齐', icon: axisFocusYSvg },
      { key: 'AX_Z', title: 'Z', tooltip: 'Z轴对齐', icon: axisFocusZSvg },
      { key: 'PL_XY', title: 'XY', tooltip: 'XY平面对齐', icon: axisPlaneXYSvg },
      { key: 'PL_YZ', title: 'YZ', tooltip: 'YZ平面对齐', icon: axisPlaneYZSvg },
      { key: 'PL_ZX', title: 'ZX', tooltip: 'ZX平面对齐', icon: axisPlaneZXSvg },
      { key: 'DG_XY', title: 'XY斜', tooltip: 'XY斜线对齐', icon: axisDimXYSvg },
      { key: 'DG_YZ', title: 'YZ斜', tooltip: 'YZ斜线对齐', icon: axisDimYZSvg },
      { key: 'DG_ZX', title: 'ZX斜', tooltip: 'ZX斜线对齐', icon: axisDimZXSvg },
      { key: 'DP_XY', title: 'XY斜面', tooltip: 'XY斜面对齐', icon: axisPlaneXYDiagSvg },
      { key: 'DP_YZ', title: 'YZ斜面', tooltip: 'YZ斜面对齐', icon: axisPlaneYZDiagSvg },
      { key: 'DP_ZX', title: 'ZX斜面', tooltip: 'ZX斜面对齐', icon: axisPlaneZXDiagSvg },
    ] as const;
    const gridAlign = folderAlign.addBlade({
      view: 'buttongrid',
      size: [3, 4],
      cells: (x: number, y: number) => {
        const idx = y * 3 + x;
        const item = alignOps[idx];
        // Initially empty title, will be replaced with SVG
        return { title: '' };
      },
    }) as unknown as ButtonGridApi;
    gridAlign.on('click', (ev: any) => {
      const [x, y] = ev.index as [number, number];
      const idx = y * 3 + x;
      const item = alignOps[idx] as any;
      if (!item) return;
      if (!alignEnabledRef.current) return; // ignore when disabled
      onApplyAlignOpRef.current(item.key);
    });
    alignGridRef.current = gridAlign;

    // Setup SVG icons for align grid buttons
    try {
      const gridEl: HTMLElement | undefined = (gridAlign as any)?.controller?.valueController?.view?.element;
      if (gridEl) {
        // Set grid row height and button styles
        gridEl.style.gridTemplateRows = 'repeat(4, 104px)';
        const btns = Array.from(gridEl.querySelectorAll('button')) as HTMLElement[];
        btns.forEach((btn, idx) => {
          // Style button container
          btn.style.height = '104px';
          btn.style.padding = '2px';
          btn.style.display = 'flex';
          btn.style.alignItems = 'center';
          btn.style.justifyContent = 'center';
          const item = alignOps[idx];
          if (item && item.icon) {
            // Clear button text
            btn.textContent = '';
            // Fetch and insert SVG
            fetch(item.icon)
              .then(res => res.text())
              .then(svgText => {
                btn.innerHTML = svgText;
                // Style the SVG - 4x original size
                const svg = btn.querySelector('svg');
                if (svg) {
                  svg.style.width = '96px';
                  svg.style.height = '96px';
                  svg.style.fill = 'currentColor';
                }
                // Add tooltip
                btn.title = item.tooltip;
              })
              .catch(err => {
                console.error('Failed to load icon:', err);
                btn.textContent = item.title; // Fallback to text
              });
          }
        });
      }
    } catch (e) {
      console.error('Failed to setup align grid icons:', e);
    }

    // Single main diagonal button as a 1x1 grid for consistent look
    const gridMain = folderAlign.addBlade({
      view: 'buttongrid',
      size: [1, 1],
      cells: () => ({ title: '' }),
    }) as unknown as ButtonGridApi;
    gridMain.on('click', () => { if (alignEnabledRef.current) onApplyAlignOpRef.current('MAIN_D'); });
    mainDiagGridRef.current = gridMain;

    // Setup SVG icon for main diagonal button
    try {
      const gridEl: HTMLElement | undefined = (gridMain as any)?.controller?.valueController?.view?.element;
      if (gridEl) {
        // Set grid height and button style
        gridEl.style.gridTemplateRows = '104px';
        const btn = gridEl.querySelector('button') as HTMLElement;
        if (btn) {
          btn.style.height = '104px';
          btn.style.padding = '2px';
          btn.style.display = 'flex';
          btn.style.alignItems = 'center';
          btn.style.justifyContent = 'center';
          btn.textContent = '';
          fetch(axisDiag111Svg)
            .then(res => res.text())
            .then(svgText => {
              btn.innerHTML = svgText;
              const svg = btn.querySelector('svg');
              if (svg) {
                svg.style.width = '96px';
                svg.style.height = '96px';
                svg.style.fill = 'currentColor';
              }
              btn.title = '主对角线对齐';
            })
            .catch(err => {
              console.error('Failed to load main diagonal icon:', err);
              btn.textContent = '主对角线';
            });
        }
      }
    } catch (e) {
      console.error('Failed to setup main diagonal icon:', e);
    }

    // Groups list folder (dynamic)
    const folderGroups = pane.addFolder({ title: '组列表', expanded: true });
    groupsFolderRef.current = folderGroups;
    // New group naming controls
    nameParamsRef.current = { kind: newGroupNameKind, custom: customName };
    const kindList = folderGroups.addBlade({
      view: 'list',
      label: '新组名称',
      options: (groupNameOptions && groupNameOptions.length > 0 ? groupNameOptions : DEFAULT_GROUP_OPTIONS)
        .map(v => ({ text: v === 'custom' ? '自定义' : v, value: v })),
      value: nameParamsRef.current.kind,
    } as any);
    kindList.on('change', (ev: any) => {
      const v = ev?.value as any; if (!v) return;
      if (v !== nameParamsRef.current.kind) nameParamsRef.current.kind = v;
      if (v !== newGroupNameKind) onSetNewGroupNameKind(v);
    });
    nameKindListRef.current = kindList;
    const customBind = folderGroups.addBinding(nameParamsRef.current, 'custom', { label: '自定义名称' });
    customBind.on('change', (ev: TpChangeEvent<string>) => {
      const v = (ev.value ?? '').toString();
      if (v !== customName) onSetCustomName(v);
    });
    customNameBindingRef.current = customBind as InputBindingApi<string>;

    // Top actions: 增加/删除选中/删除全部（3列）
    const topGrid = folderGroups.addBlade({
      view: 'buttongrid',
      size: [3, 1],
      cells: (x: number) => ({ title: x === 0 ? '增加' : x === 1 ? '删除选中' : '删除全部' }),
    }) as unknown as ButtonGridApi;
    topGrid.on('click', (ev: any) => {
      const [x] = ev.index as [number, number?];
      const addingCustomInvalid = (nameParamsRef.current.kind === 'custom') && !!(customNameError && customNameError.trim());
      if (x === 0) { if (!addingCustomInvalid) onAddGroupWithPlan(nameParamsRef.current.kind, nameParamsRef.current.custom || ''); }
      else if (x === 1) onDeleteSelectedGroup();
      else onDeleteAllGroups();
    });
    topGridRef.current = topGrid;

    // Markers (points) folder, placed after groups
    const folderMarkers = pane.addFolder({ title: '点列表', expanded: true });
    markersFolderRef.current = folderMarkers;
    // Range monitor (or fallback)
    markerInfoRef.current.range = hasMarkerRange ? `${minMarkerIndex} ~ ${maxMarkerIndex}` : '不可用';
    try {
      (folderMarkers as any).addMonitor?.(markerInfoRef.current, 'range', { label: '有效范围' });
    } catch { folderMarkers.addBlade({ view: 'separator' }); }
    // Name list
    const mkList = folderMarkers.addBlade({
      view: 'list',
      label: '名称',
      options: (markerNameOptions || []).map(v => ({ text: v === customOptionValue ? '自定义' : v, value: v })),
      value: markerLabelOption,
    } as any);
    mkList.on('change', (ev: any) => {
      const v = ev?.value ?? markerLabelOption;
      if (typeof v === 'string' && v !== markerLabelOption) onSetMarkerLabelOption(v);
    });
    markerListRef.current = mkList;
    // Custom name input
    const mkCustomParams = { text: markerCustomLabel } as { text: string };
    mkCustomParamsRef.current = mkCustomParams;
    const mkCustom = folderMarkers.addBinding(mkCustomParams, 'text', { label: '自定义名称' });
    mkCustom.on('change', (ev: TpChangeEvent<string>) => { const v = (ev.value ?? '').toString(); onSetMarkerCustomLabel(v); });
    try { mkCustomElRef.current = (mkCustom as any)?.controller?.view?.element || null; if (mkCustomElRef.current) mkCustomElRef.current.style.display = (markerLabelOption === customOptionValue) ? '' : 'none'; } catch { mkCustomElRef.current = null; }
    // Count input
    const mkCountParams = { count: markerCount } as { count: number };
    mkCountParamsRef.current = mkCountParams;
    const mkCount = folderMarkers.addBinding(mkCountParams, 'count', { label: '数量', min: 1, max: 200, step: 1 });
    mkCount.on('change', (ev: TpChangeEvent<number>) => {
      const val = Math.max(1, Math.min(200, Math.floor(Number(ev.value) || 1)));
      if (val !== markerCount) onSetMarkerCount(val);
    });
    // Actions
    const mkActions = folderMarkers.addBlade({ view: 'buttongrid', size: [2, 1], cells: (x: number) => ({ title: x === 0 ? '添加点' : '删除全部点' }) }) as unknown as ButtonGridApi;
    mkActions.on('click', (ev: any) => {
      const [x] = ev.index as [number, number?];
      const invalid = (markerLabelOption === customOptionValue) && !!(markerNameError2 && markerNameError2.trim());
      if (x === 0) {
        if (!invalid && hasMarkerRange) {
          const countNow = Math.max(1, Math.min(200, Math.floor(Number(mkCountParamsRef.current?.count ?? markerCount) || 1)));
          const listVal = (markerListRef.current as any)?.value ?? markerLabelOption;
          const baseLabelRaw = (listVal === (customOptionValue || '__custom__'))
            ? (mkCustomParamsRef.current?.text ?? markerCustomLabel)
            : (listVal ?? markerLabelOption);
          onAddMarkers(countNow, String(baseLabelRaw ?? ''));
        }
      } else {
        onClearMarkers();
      }
    });
    // Remember dynamic start index after static controls (monitor/list/custom/count/actions)
    try {
      const children = (folderMarkers as any).children || [];
      markersDynamicStartIndexRef.current = children.length;
    } catch { markersDynamicStartIndexRef.current = 0; }
    // rows under markers folder will be rebuilt via markerRowApisRef; keep nothing implicitly

    // Playground moved to a separate panel (LayoutPlaygroundPanel)
    const ENABLE_PLAYGROUND_IN_THIS_PANEL = false as const;
    if (ENABLE_PLAYGROUND_IN_THIS_PANEL) {
      // (Disabled) Old inline playground was here
    }

    // Helper: create a full-size tweakpane button inside a Pane
    const createFullButton = (paneInst: Pane, title: string, onClick?: () => void) => {
      // Make pane container fill the grid cell
      paneInst.element.style.height = '100%';
      paneInst.element.style.display = 'flex';
      paneInst.element.style.flexDirection = 'column';
      // Hide inner header/indent to remove reserved heights
      try {
        const header = paneInst.element.querySelector('.tp-rotv_b') as HTMLElement | null;
        const indent = paneInst.element.querySelector('.tp-rotv_i') as HTMLElement | null;
        if (header) header.style.display = 'none';
        if (indent) indent.style.display = 'none';
        const content = paneInst.element.querySelector('.tp-rotv_c') as HTMLElement | null;
        if (content) {
          content.style.height = '100%';
          content.style.display = 'flex';
          content.style.flexDirection = 'column';
        }
      } catch {}
      const btnApi: any = paneInst.addButton({ title });
      if (onClick) btnApi.on('click', onClick);
      try {
        // Stretch labeled view and the inner button to fill
        const rootEl: HTMLElement | undefined = btnApi?.controller?.labelController?.view?.element;
        if (rootEl) {
          rootEl.style.height = '100%';
          const bEl = rootEl.querySelector('button') as HTMLElement | null;
          if (bEl) {
            bEl.style.height = '100%';
            bEl.style.width = '100%';
            bEl.style.display = 'flex';
            bEl.style.alignItems = 'center';
            bEl.style.justifyContent = 'center';
          }
        }
      } catch {}
      return btnApi;
    };

    // Helper: create a fixed-height (N blades) button inside a Pane
    const createSizedButton = (paneInst: Pane, title: string, units: number, onClick?: () => void) => {
      // Keep default auto height so content can drive natural size
      try {
        const header = paneInst.element.querySelector('.tp-rotv_b') as HTMLElement | null;
        const indent = paneInst.element.querySelector('.tp-rotv_i') as HTMLElement | null;
        if (header) header.style.display = 'none';
        if (indent) indent.style.display = 'none';
        const content = paneInst.element.querySelector('.tp-rotv_c') as HTMLElement | null;
        if (content) {
          content.style.height = 'auto';
          content.style.display = 'block';
        }
      } catch {}
      const btnApi: any = paneInst.addButton({ title });
      if (onClick) btnApi.on('click', onClick);
      try {
        const rootEl: HTMLElement | undefined = btnApi?.controller?.labelController?.view?.element;
        if (rootEl) {
          rootEl.style.height = `calc(var(--cnt-usz) * ${Math.max(1, Math.floor(units || 1))})`;
          rootEl.style.margin = '0';
          const bEl = rootEl.querySelector('button') as HTMLElement | null;
          if (bEl) {
            bEl.style.height = '100%';
            bEl.style.width = '100%';
            bEl.style.display = 'flex';
            bEl.style.alignItems = 'center';
            bEl.style.justifyContent = 'center';
          }
        }
      } catch {}
      return btnApi;
    };

    // Random helpers
    let layoutApi: any = null;
    const childPanes: Pane[] = [];
    let currentSpec: BladeLayoutSpec | null = null;

    const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const sample = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    const buildRandomSpec = (): BladeLayoutSpec => {
      const mode = sample(['eq2', 'eq3', 'eq4', 'ratio']);
      let split: any;
      const rowsPerCol: number[] = [];
      if (mode === 'ratio') {
        const r = Math.random() * 0.4 + 0.3; // 0.3..0.7
        split = { mode: 'ratio', ratio: Number(r.toFixed(2)) };
        rowsPerCol.push(randomInt(1, 4), randomInt(1, 4));
      } else {
        const n = Number(mode.replace('eq', ''));
        split = { mode: 'equal', count: n };
        for (let i = 0; i < n; i++) rowsPerCol.push(randomInt(1, 4));
      }
      const totalUnits = Math.max(...rowsPerCol);
      const baseUnits = 2; // initial displayed height (in blade units); rows may grow beyond
      const children = rowsPerCol.map((rc) => ({
        layout: {
          units: rc,
          rows: Array.from({ length: rc }, () => ({ units: 1, cols: { mode: 'equal', count: 1 }, children: ['leaf'] })),
          // Make rows compact by default: no extra row gap
          gutter: { row: { value: 0, unit: 'px' } },
        },
      }));
      return {
        units: baseUnits,
        rows: [{ units: baseUnits, cols: split, children }],
        // Compact columns by default; no gap between columns
        gutter: { col: { value: 0, unit: 'px' } },
        sizing: { container: 'grow', row: 'grow', snap: 'ceil' },
      } as BladeLayoutSpec;
    };

    // (Playground controls removed from this panel)

    const rebuild = () => {
      // dispose old
      childPanes.splice(0).forEach((cp) => { try { cp.dispose(); } catch {} });
      if (layoutApi) { try { layoutApi.dispose(); } catch {} layoutApi = null; }
      if (!currentSpec) { /* no-op when playground disabled */ }
      const slots: HTMLElement[] = [];
      const createDropdown = (paneInst: Pane) => {
        const pool = ['A', 'B', 'C'];
        const count = randomInt(2, 3);
        const sel = pool.slice(0).sort(() => Math.random() - 0.5).slice(0, count);
        const opts = sel.map((t) => ({ text: t, value: t.toLowerCase() }));
        (paneInst as any).addBlade?.({ view: 'list', options: opts, value: opts[0]?.value ?? 'a' });
      };
      const fillSlot = (slot: HTMLElement) => {
        const p = new Pane({ container: slot });
        childPanes.push(p);
        try {
          const header = p.element.querySelector('.tp-rotv_b') as HTMLElement | null;
          const indent = p.element.querySelector('.tp-rotv_i') as HTMLElement | null;
          if (header) header.style.display = 'none';
          if (indent) indent.style.display = 'none';
        } catch {}
        // t: 0:button, 1:slider, 2:dropdown, 3:checkbox, 4:folder, 5:text, 6:number, 7:color
        const t = randomInt(0, 7);
        if (t === 0) {
          const units = randomInt(1, 4);
          // Show how many blade rows this button consumes
          try { addSizedButton(p, { title: `按钮（${units} 行）`, units }); }
          catch { p.addButton({ title: `按钮 ${randomInt(1, 99)}` }); }
        } else if (t === 1) {
          const obj = { v: Math.random() } as { v: number };
          p.addBinding(obj, 'v', { min: 0, max: 1, step: 0.01 });
        } else if (t === 2) {
          createDropdown(p);
        } else if (t === 3) {
          const obj = { b: Math.random() < 0.5 } as { b: boolean };
          p.addBinding(obj, 'b');
        } else if (t === 5) {
          const o = { s: `文本${randomInt(1, 99)}` } as { s: string };
          p.addBinding(o, 's');
        } else if (t === 6) {
          const o = { n: randomInt(-50, 50) } as { n: number };
          p.addBinding(o, 'n', { min: -100, max: 100, step: 1 });
        } else if (t === 7) {
          const o = { c: '#'+Math.floor(Math.random()*0xffffff).toString(16).padStart(6,'0') } as { c: string };
          try { p.addBinding(o, 'c'); } catch { /* fallback: ignore if color view unsupported */ }
        } else {
          const f = p.addFolder({ title: '分组', expanded: Math.random() < 0.5 });
          const n = randomInt(2, 3);
          for (let i = 0; i < n; i++) {
            const subt = randomInt(0, 6); // diversify folder contents
            if (subt === 0) {
              const u = randomInt(1, 3);
              try { (f as any).addButton?.({ title: `子按钮 ${i + 1}` }); } catch {}
            } else if (subt === 1) {
              const o = { v: Math.random() } as { v: number };
              (f as any).addBinding?.(o, 'v', { min: 0, max: 1 });
            } else if (subt === 2) {
              const o = { b: Math.random() < 0.5 } as { b: boolean };
              (f as any).addBinding?.(o, 'b');
            } else if (subt === 3) {
              createDropdown(f as any);
            } else if (subt === 4) {
              const o = { s: `子文本${i+1}` } as { s: string };
              (f as any).addBinding?.(o, 's');
            } else if (subt === 5) {
              const o = { n: randomInt(0, 100) } as { n: number };
              (f as any).addBinding?.(o, 'n', { min: 0, max: 100, step: 1 });
            } else {
              const o = { c: '#'+Math.floor(Math.random()*0xffffff).toString(16).padStart(6,'0') } as { c: string };
              try { (f as any).addBinding?.(o, 'c'); } catch {}
            }
          }
        }
      };
      // no-op when playground disabled
    };

    // initial (disabled)

    // Batch coord mode: 全部绝对/全部相对（2列）
    const modeGrid = folderGroups.addBlade({
      view: 'buttongrid',
      size: [2, 1],
      cells: (x: number) => ({ title: x === 0 ? '全部绝对' : '全部相对' }),
    }) as unknown as ButtonGridApi;
    modeGrid.on('click', (ev: any) => {
      const [x] = ev.index as [number, number?];
      onSetAllCoordMode(x === 0 ? 'global' : 'local');
    });
    try {
      const children = (folderGroups as any).children || [];
      groupsDynamicStartIndexRef.current = children.length;
    } catch { groupsDynamicStartIndexRef.current = 4; }
    groupsListFolderRef.current = null;
    // Build items initially
    try {
      // initial build based on current patches
      // actual content is built in dedicated effect below
    } catch {}

    return () => {
      // Dispose demo child panes first
      demoPanesLocal.forEach((p) => { try { p.dispose(); } catch {} });
      pane.dispose();
      paneRef.current = null;
      tauInputRef.current = null;
      startInputRef.current = null;
      endInputRef.current = null;
      gridRef.current = null;
      pointSizeInputRef.current = null;
      markerSizeInputRef.current = null;
      frameCloseInputRef.current = null;
      colorInputRef.current = null;
      colorListRef.current = null;
      groupsFolderRef.current = null;
      groupUiMapRef.current.clear();
      nameKindListRef.current = null;
      customNameBindingRef.current = null;
      markersFolderRef.current = null;
      markerRowApisRef.current.forEach(api => { try { api.dispose?.(); } catch {} });
      markerRowApisRef.current = [];
    };
  }, []); // mount once

  // Optional: keep folder title reflecting current mode (simple visual cue)
  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;
    // Try to find the '交互模式' folder and annotate title
    // Note: Tweakpane does not expose a direct query API; we rely on order.
    // Folder order: [相空间参数, 交互模式]
    try {
      const folders = (pane as any).children ?? [];
      const interactFolder = folders[1];
      if (interactFolder && typeof interactFolder === 'object') {
        const label = toolMode === 'translate' ? '移动'
          : toolMode === 'rotate' ? '旋转'
          : toolMode === 'scale' ? '缩放'
          : '沿u/v平移';
        interactFolder.title = `交互模式（当前：${label}）`;
      }
    } catch {}
  }, [toolMode]);

  // Sync grid button labels to reflect active mode (simple visual cue)
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    try {
      const titles = ['移动 (W)', '旋转 (E)', '缩放 (R)', '沿u/v平移'];
      const mIndex = { translate: 0, rotate: 1, scale: 2, uv: 3 }[toolMode] ?? 0;
      titles.forEach((t, i) => {
        const cell = grid.cell(i, 0);
        if (cell) {
          // Add a small indicator for the active button
          cell.title = i === mIndex ? `${t} •` : t;
        }
      });
      // Optional highlight via DOM style
      const gridEl: HTMLElement | undefined = (grid as any)?.controller?.valueController?.view?.element;
      if (gridEl) {
        const btns = Array.from(gridEl.querySelectorAll('button')) as HTMLElement[];
        btns.forEach((b, i) => {
          b.style.background = i === mIndex ? 'var(--tp-button-bg, #4a4a4a)' : '';
        });
      }
    } catch { /* ignore */ }
  }, [toolMode]);

  // Sync external state to pane controls when React state changes
  useEffect(() => {
    if (!tauInputRef.current) return;
    if (paramsRef.current.tau !== tau) {
      paramsRef.current.tau = tau;
      tauInputRef.current.refresh();
    }
  }, [tau]);

  useEffect(() => {
    if (!startInputRef.current) return;
    if (paramsRef.current.start !== start) {
      paramsRef.current.start = start;
      startInputRef.current.refresh();
    }
  }, [start]);

  useEffect(() => {
    if (!endInputRef.current) return;
    if (paramsRef.current.end !== end) {
      paramsRef.current.end = end;
      endInputRef.current.refresh();
    }
  }, [end]);

  // Sync display controls
  useEffect(() => {
    const c = pointSizeInputRef.current;
    if (!c) return;
    if (paramsRef.current.pointSizePx !== pointSizePx) {
      paramsRef.current.pointSizePx = pointSizePx;
      c.refresh();
    }
  }, [pointSizePx]);

  useEffect(() => {
    const c = markerSizeInputRef.current;
    if (!c) return;
    if (paramsRef.current.markerPointSizePx !== markerPointSizePx) {
      paramsRef.current.markerPointSizePx = markerPointSizePx;
      c.refresh();
    }
  }, [markerPointSizePx]);

  useEffect(() => {
    const c = frameCloseInputRef.current;
    if (!c) return;
    if (paramsRef.current.frameCloseness !== frameCloseness) {
      paramsRef.current.frameCloseness = frameCloseness;
      c.refresh();
    }
  }, [frameCloseness]);

  // No external prop for knobSensitivity; keep binding display in sync with ref
  useEffect(() => {
    const pane = paneRef.current; if (!pane) return;
    try {
      // Find the display folder and refresh knobSensitivity binding if present
      const folders: any[] = (pane as any).children || [];
      // naive scan through children bindings: safe and cheap for this demo size
      folders.forEach((fld: any) => {
        const kids: any[] = (fld && fld.children) ? fld.children : [];
        kids.forEach((child: any) => {
          if (child && child.label === '拖拽灵敏度') {
            const tgt = (child as any).binding?.target || (child as any).o?.object;
            if (tgt && Math.abs((tgt as any).knobSensitivity - liveScaleRef.current) > 1e-9) {
              (tgt as any).knobSensitivity = liveScaleRef.current;
              child.refresh?.();
            }
          }
        });
      });
    } catch {}
  }, [liveScaleRef.current]);

  // Sync color list options and selection
  useEffect(() => {
    const list = colorListRef.current as any;
    if (!list) return;
    try {
      const opts = (colorOptions || []).map((val) => ({ text: val === 'custom' ? '自定义默认' : val, value: val }));
      list.options = opts;
    } catch {}
  }, [colorOptions]);

  useEffect(() => {
    const list = colorListRef.current as any;
    if (!list) return;
    try {
      if (list.value !== colorEditLabel) list.value = colorEditLabel;
    } catch {}
    colorEditLabelRef.current = colorEditLabel;
  }, [colorEditLabel]);

  useEffect(() => {
    const c = colorInputRef.current;
    if (!c) return;
    if (paramsRef.current.editColor !== currentEditColor) {
      paramsRef.current.editColor = currentEditColor;
      c.refresh();
    }
  }, [currentEditColor]);

  // Keep latest onChangeColor ref
  useEffect(() => { onChangeColorRef.current = onChangeColor; }, [onChangeColor]);

  // Visually disable '增加' button when custom invalid
  useEffect(() => {
    const grid = topGridRef.current; if (!grid) return;
    try {
      const el: HTMLElement | undefined = (grid as any)?.controller?.valueController?.view?.element;
      if (!el) return;
      const btns = Array.from(el.querySelectorAll('button')) as HTMLElement[];
      const first = btns[0];
      const invalid = (nameParamsRef.current.kind === 'custom') && !!(customNameError && customNameError.trim());
      if (first) {
        first.style.opacity = invalid ? '0.5' : '';
        (first.style as any).pointerEvents = invalid ? 'none' : 'auto';
      }
    } catch {}
  }, [newGroupNameKind, customName, customNameError]);

  // Style and enable/disable align grids visually
  useEffect(() => {
    const setGridSquare = (grid: ButtonGridApi | null, rows: number) => {
      if (!grid) return;
      try {
        const el: HTMLElement | undefined = (grid as any)?.controller?.valueController?.view?.element;
        if (!el) return;
        el.style.gridTemplateRows = `repeat(${rows}, 104px)`;
        const btns = Array.from(el.querySelectorAll('button')) as HTMLElement[];
        btns.forEach((b) => {
          b.style.height = '104px';
          b.style.padding = '2px';
          b.style.lineHeight = '1';
          b.style.display = 'flex';
          b.style.alignItems = 'center';
          b.style.justifyContent = 'center';
        });
      } catch {}
    };
    setGridSquare(alignGridRef.current, 4);
    setGridSquare(mainDiagGridRef.current, 1);
    // Visual disabled state
    const setDisabled = (grid: ButtonGridApi | null, disabled: boolean) => {
      if (!grid) return;
      try {
        const el: HTMLElement | undefined = (grid as any)?.controller?.valueController?.view?.element;
        if (!el) return;
        el.style.opacity = disabled ? '0.5' : '1';
        (el.style as any).pointerEvents = disabled ? 'none' : 'auto';
        // Also update SVG colors for better visibility
        const svgs = el.querySelectorAll('svg');
        svgs.forEach(svg => {
          (svg as HTMLElement).style.opacity = disabled ? '0.5' : '1';
        });
      } catch {}
    };
    setDisabled(alignGridRef.current, !alignEnabled);
    setDisabled(mainDiagGridRef.current, !alignEnabled);
  }, [alignEnabled]);

  // Sync new group naming UI from external state
  useEffect(() => {
    const list = nameKindListRef.current as any;
    if (list && list.value !== newGroupNameKind) {
      try { list.value = newGroupNameKind; } catch {}
    }
    if (nameParamsRef.current.kind !== newGroupNameKind) nameParamsRef.current.kind = newGroupNameKind;
  }, [newGroupNameKind]);

  // Sync group name options when usedCustomNames changes in App
  useEffect(() => {
    const list = nameKindListRef.current as any;
    if (!list) return;
    try {
      const opts = (groupNameOptions && groupNameOptions.length > 0 ? groupNameOptions : DEFAULT_GROUP_OPTIONS)
        .map(v => ({ text: v === 'custom' ? '自定义' : v, value: v }));
      // Update options and ensure current selection is valid
      list.options = opts;
      const current = nameParamsRef.current.kind;
      const has = opts.some(o => o.value === current);
      if (!has) {
        const fallback = (opts[0]?.value) ?? 'P';
        nameParamsRef.current.kind = fallback;
        try { list.value = fallback; } catch {}
        if (fallback !== newGroupNameKind) onSetNewGroupNameKind(fallback);
      }
    } catch {}
  }, [groupNameOptions]);
  useEffect(() => {
    const b = customNameBindingRef.current;
    if (b) {
      try {
        if ((nameParamsRef.current.custom ?? '') !== (customName ?? '')) {
          nameParamsRef.current.custom = customName ?? '';
          b.refresh();
        }
        // Show/hide custom when kind === 'custom'
        const el: HTMLElement | null = (b as any)?.controller?.view?.element || (b as any)?.controller_?.view?.element || null;
        if (el) {
          el.style.display = (nameParamsRef.current.kind === 'custom') ? '' : 'none';
          // Error styling
          const hasErr = !!(customNameError && customNameError.trim());
          const inputEl = el.querySelector('input') as HTMLElement | null;
          if (inputEl) {
            (inputEl as any).style.borderColor = hasErr ? '#f07167' : '';
          }
          const labelEl = el.querySelector('.tp-lblv_l') as HTMLElement | null;
          if (labelEl) labelEl.style.color = hasErr ? '#f07167' : '';
        }
      } catch {}
    }
  }, [customName]);

  useEffect(() => {
    // Ensure visibility toggles immediately when kind changes
    const b = customNameBindingRef.current;
    if (!b) return;
    try {
      const el: HTMLElement | null = (b as any)?.controller?.view?.element || (b as any)?.controller_?.view?.element || null;
      if (el) el.style.display = (nameParamsRef.current.kind === 'custom') ? '' : 'none';
    } catch {}
  }, [newGroupNameKind]);

  // Markers list/list options sync (keep UI in sync with state)
  useEffect(() => {
    const list = markerListRef.current as any;
    if (!list) return;
    try {
      const opts = (markerNameOptions || []).map(v => ({ text: v === (customOptionValue || '__custom__') ? '自定义' : v, value: v }));
      list.options = opts;
      if (list.value !== markerLabelOption) list.value = markerLabelOption;
    } catch {}
  }, [markerNameOptions, markerLabelOption, customOptionValue]);

  // Markers top controls sync
  useEffect(() => {
    // range string
    markerInfoRef.current.range = hasMarkerRange ? `${minMarkerIndex} ~ ${maxMarkerIndex}` : '不可用';
  }, [minMarkerIndex, maxMarkerIndex, hasMarkerRange]);
  useEffect(() => {
    // show/hide custom name input under markers folder using stored element
    const el = mkCustomElRef.current;
    if (el) {
      el.style.display = (markerLabelOption === (customOptionValue || '__custom__')) ? '' : 'none';
      const hasErr = !!(markerNameError2 && markerNameError2.trim());
      const inputEl = el.querySelector('input') as HTMLElement | null;
      if (inputEl) (inputEl as any).style.borderColor = hasErr ? '#f07167' : '';
      const labelEl = el.querySelector('.tp-lblv_l') as HTMLElement | null;
      if (labelEl) labelEl.style.color = hasErr ? '#f07167' : '';
    }
    // keep local params in sync for click-time reads
    if ((mkCustomParamsRef.current?.text ?? '') !== (markerCustomLabel ?? '')) {
      mkCustomParamsRef.current.text = markerCustomLabel ?? '';
    }
  }, [markerLabelOption, markerCustomLabel, markerNameError2, customOptionValue]);

  // Sync marker count binding display with external state
  useEffect(() => {
    const folder = markersFolderRef.current as any; if (!folder) return;
    // Find the "数量" binding and refresh it
    try {
      const children = (folder as any).children || [];
      for (const ch of children) {
        const label = (ch as any)?.label;
        if (label === '数量') {
          const b: any = ch;
          const target = (b as any).binding?.target || (b as any).o?.object;
          if (target && typeof target === 'object' && 'count' in target) {
            if ((target as any).count !== markerCount) { (target as any).count = markerCount; b.refresh?.(); }
          }
          break;
        }
      }
    } catch {}
    // keep local params in sync for click-time reads
    if ((mkCountParamsRef.current?.count ?? 1) !== (markerCount ?? 1)) {
      mkCountParamsRef.current.count = Math.max(1, Math.min(200, Math.floor(Number(markerCount) || 1)));
    }
  }, [markerCount]);

  // Rebuild markers list as single-line rows with delete button on right，全部包进子 folder
  useEffect(() => {
    const folder = markersFolderRef.current as any; if (!folder) return;
    // Dispose previous dynamic rows (including any legacy per-point folders)
    try {
      const children = (folder as any).children || [];
      for (let i = children.length - 1; i >= (markersDynamicStartIndexRef.current || 0); i--) {
        try { children[i].dispose?.(); } catch {}
      }
    } catch {}
    markerRowApisRef.current.forEach(api => { try { api.dispose?.(); } catch {} });
    markerRowApisRef.current = [];
    // Create list sub-folder to contain all marker rows
    const listFolder = (folder as any).addFolder?.({ title: `已添加点（${(markers || []).length}）`, expanded: true });
    markersListFolderRef.current = listFolder || null;
    // Append one row per marker: label (left) + 删除按钮（right）
    (markers || []).forEach(m => {
      const api = (listFolder || folder).addButton?.({ title: '删除', label: `ID ${m.id} · ${m.label} · 序列 ${m.index}` });
      if (api) {
        api.on('click', () => onRemoveMarker(m.id));
        markerRowApisRef.current.push(api);
      }
    });
  }, [markers]);

  // Helper to rebuild group list UI (keep top action grid at index 0)
  const rebuildGroups = () => {
    const folder: any = groupsFolderRef.current;
    if (!folder) return;
    try {
      const children = (folder as any).children || [];
      const startIdx = groupsDynamicStartIndexRef.current || 4;
      for (let i = children.length - 1; i >= startIdx; i--) {
        try { children[i].dispose?.(); } catch {}
      }
      groupUiMapRef.current.clear();
      groupsListFolderRef.current = null;
    } catch {}

    const parentFolder = (() => {
      const lf = (folder as any).addFolder?.({ title: `已添加组（${patches.length}）`, expanded: true });
      if (lf) {
        groupsListFolderRef.current = lf;
        return lf;
      }
      return folder;
    })();

    patches.forEach((p) => {
      const id = p.id;
      const pf = parentFolder.addFolder({ title: makeGroupTitle(id, p.name, selection.patchId) });
      // name binding
      const params = { name: p.name ?? '' };
      const nameBinding = pf.addBinding(params, 'name', { label: '名称' });
      nameBinding.on('change', (ev: TpChangeEvent<string>) => {
        const v = (ev.value ?? '').toString();
        if (v !== (p.name ?? '')) onRenamePatch(id, v);
      });
      // coord mode list
      const cmode = coordModeById[id] ?? 'global';
      const coordParams = { mode: cmode } as { mode: 'global'|'local' };
      const coordList = pf.addBlade({
        view: 'list',
        label: '坐标显示',
        options: [
          { text: '绝对', value: 'global' },
          { text: '相对', value: 'local' },
        ],
        value: coordParams.mode,
      } as any);
      coordList.on('change', (ev: any) => {
        const nv = ev?.value === 'local' ? 'local' : 'global';
        if (nv !== (coordModeById[id] ?? 'global')) onSetCoordMode(id, nv);
      });
      // lock main toggle
      const lockParams = { locked: !!lockMainById[id] };
      const lockBinding = pf.addBinding(lockParams, 'locked', { label: '锁定主点' });
      lockBinding.on('change', (ev: TpChangeEvent<boolean>) => {
        const nv = !!ev.value;
        if (nv !== !!lockMainById[id]) onSetLockMain(id, nv);
      });
      // action buttons row
      const actGrid = pf.addBlade({
        view: 'buttongrid',
        label: '操作',
        size: [3, 1],
        cells: (x: number) => ({ title: x === 0 ? '反转' : x === 1 ? '轮换' : '删除组' }),
      }) as unknown as ButtonGridApi;
      actGrid.on('click', (ev: any) => {
        const [x] = ev.index as [number, number?];
        if (x === 0) onReverse(id);
        else if (x === 1) onRotate(id);
        else onDeletePatch(id);
      });

      // coordinate editors for p/u/v (single row per role: x,y,z)
      const toParams = (dto: PatchDTO) => {
        const [px,py,pz] = dto.main; const [ux,uy,uz] = dto.u; const [vx,vy,vz] = dto.v;
        const modeNow = coordModeById[id] ?? 'global';
        const uRel = modeNow === 'local' ? [ux-px, uy-py, uz-pz] : [ux,uy,uz];
        const vRel = modeNow === 'local' ? [vx-px, vy-py, vz-pz] : [vx,vy,vz];
        return {
          p: { x: px, y: py, z: pz },
          u: { x: uRel[0], y: uRel[1], z: uRel[2] },
          v: { x: vRel[0], y: vRel[1], z: vRel[2] },
        };
      };
      const coordParamsAll = toParams(p);
      const makeRoleLabel = (role: 'p'|'u'|'v') => (role === 'p' ? 'p' : role);
      const bindings: { p?: InputBindingApi<any>; u?: InputBindingApi<any>; v?: InputBindingApi<any> } = {};
      const pBind = pf.addBinding(coordParamsAll, 'p', {
        label: makeRoleLabel('p'),
        // Pointer has fine scale; snapping handled in onChange when dragging
        x: { pointerScale: 0.0001, keyScale: 0.0001, format: (v: number) => (Number.isFinite(v) ? Number(v).toFixed(4) : '0.0000') },
        y: { pointerScale: 0.0001, keyScale: 0.0001, format: (v: number) => (Number.isFinite(v) ? Number(v).toFixed(4) : '0.0000') },
        z: { pointerScale: 0.0001, keyScale: 0.0001, format: (v: number) => (Number.isFinite(v) ? Number(v).toFixed(4) : '0.0000') },
      });
      pBind.on('change', (ev: TpChangeEvent<{x:number;y:number;z:number}>) => {
        if (uiSyncingRef.current) return;
        const v = ev.value || coordParamsAll.p;
        // Reflect current values and refresh
        const prev = { x: coordParamsAll.p.x, y: coordParamsAll.p.y, z: coordParamsAll.p.z };
        const rx = roundTo(Number(v.x), 4);
        const ry = roundTo(Number(v.y), 4);
        const rz = roundTo(Number(v.z), 4);
        coordParamsAll.p.x = rx; coordParamsAll.p.y = ry; coordParamsAll.p.z = rz;
        if (!ev.last) {
          // Live-edit Three.js without committing history
          if (rx !== prev.x) onLiveEditCoord(id, 'main', 'x', rx);
          if (ry !== prev.y) onLiveEditCoord(id, 'main', 'y', ry);
          if (rz !== prev.z) onLiveEditCoord(id, 'main', 'z', rz);
          return;
        }
        uiSyncingRef.current = true;
        try { (pBind as any).refresh?.(); } catch {}
        uiSyncingRef.current = false;
        onEditCoord(id, 'main', 'x', rx);
        onEditCoord(id, 'main', 'y', ry);
        onEditCoord(id, 'main', 'z', rz);
        onCommitCoords();
      });
      bindings.p = pBind as any;
      const uBind = pf.addBinding(coordParamsAll, 'u', {
        label: makeRoleLabel('u'),
        x: { pointerScale: 0.0001, keyScale: 0.0001, format: (v: number) => (Number.isFinite(v) ? Number(v).toFixed(4) : '0.0000') },
        y: { pointerScale: 0.0001, keyScale: 0.0001, format: (v: number) => (Number.isFinite(v) ? Number(v).toFixed(4) : '0.0000') },
        z: { pointerScale: 0.0001, keyScale: 0.0001, format: (v: number) => (Number.isFinite(v) ? Number(v).toFixed(4) : '0.0000') },
      });
      uBind.on('change', (ev: TpChangeEvent<{x:number;y:number;z:number}>) => {
        if (uiSyncingRef.current) return;
        const v = ev.value || coordParamsAll.u;
        const prev = { x: coordParamsAll.u.x, y: coordParamsAll.u.y, z: coordParamsAll.u.z };
        const rx = roundTo(Number(v.x), 4);
        const ry = roundTo(Number(v.y), 4);
        const rz = roundTo(Number(v.z), 4);
        coordParamsAll.u.x = rx; coordParamsAll.u.y = ry; coordParamsAll.u.z = rz;
        if (!ev.last) {
          if (rx !== prev.x) onLiveEditCoord(id, 'u', 'x', rx);
          if (ry !== prev.y) onLiveEditCoord(id, 'u', 'y', ry);
          if (rz !== prev.z) onLiveEditCoord(id, 'u', 'z', rz);
          return;
        }
        uiSyncingRef.current = true;
        try { (uBind as any).refresh?.(); } catch {}
        uiSyncingRef.current = false;
        onEditCoord(id, 'u', 'x', rx);
        onEditCoord(id, 'u', 'y', ry);
        onEditCoord(id, 'u', 'z', rz);
        onCommitCoords();
      });
      bindings.u = uBind as any;
      const vBind = pf.addBinding(coordParamsAll, 'v', {
        label: makeRoleLabel('v'),
        x: { pointerScale: 0.0001, keyScale: 0.0001, format: (v: number) => (Number.isFinite(v) ? Number(v).toFixed(4) : '0.0000') },
        y: { pointerScale: 0.0001, keyScale: 0.0001, format: (v: number) => (Number.isFinite(v) ? Number(v).toFixed(4) : '0.0000') },
        z: { pointerScale: 0.0001, keyScale: 0.0001, format: (v: number) => (Number.isFinite(v) ? Number(v).toFixed(4) : '0.0000') },
      });
      vBind.on('change', (ev: TpChangeEvent<{x:number;y:number;z:number}>) => {
        if (uiSyncingRef.current) return;
        const v = ev.value || coordParamsAll.v;
        const prev = { x: coordParamsAll.v.x, y: coordParamsAll.v.y, z: coordParamsAll.v.z };
        const rx = roundTo(Number(v.x), 4);
        const ry = roundTo(Number(v.y), 4);
        const rz = roundTo(Number(v.z), 4);
        coordParamsAll.v.x = rx; coordParamsAll.v.y = ry; coordParamsAll.v.z = rz;
        if (!ev.last) {
          if (rx !== prev.x) onLiveEditCoord(id, 'v', 'x', rx);
          if (ry !== prev.y) onLiveEditCoord(id, 'v', 'y', ry);
          if (rz !== prev.z) onLiveEditCoord(id, 'v', 'z', rz);
          return;
        }
        uiSyncingRef.current = true;
        try { (vBind as any).refresh?.(); } catch {}
        uiSyncingRef.current = false;
        onEditCoord(id, 'v', 'x', rx);
        onEditCoord(id, 'v', 'y', ry);
        onEditCoord(id, 'v', 'z', rz);
        onCommitCoords();
      });
      bindings.v = vBind as any;

      // remember references
      const safeGetEl = (api: any): HTMLElement | null => {
        try { return api?.controller?.view?.element || api?.controller_?.view?.element || null; } catch { return null; }
      };
      const folderEl = safeGetEl(pf);
      const rowEls = { p: safeGetEl(pBind), u: safeGetEl(uBind), v: safeGetEl(vBind) };
      groupUiMapRef.current.set(id, { folder: pf, nameBinding, params: coordParamsAll, bindings, folderEl, rowEls });

      // Attach custom drag harness on knob elements to fully bypass Tweakpane native pointer handling
      const attachCustomDragToRow = (
        rowEl: HTMLElement | null,
        roleTag: 'p'|'u'|'v',
        bindApi: InputBindingApi<any> | undefined | null,
      ) => {
        if (!rowEl) return;
        const knobEls = Array.from(rowEl.querySelectorAll('.tp-txtv_k')) as HTMLElement[];
        if (knobEls.length !== 3) return;
        const axes: ('x'|'y'|'z')[] = ['x','y','z'];
        const LIVE_SCALE = 0.001; // px -> value
        knobEls.forEach((knobEl, idx) => {
          const axis = axes[idx] || 'x';
          const onMouseDownCapture = (ev: MouseEvent) => {
            // capture phase: stop native Tweakpane pointer handling
            ev.preventDefault(); ev.stopPropagation();
            try { (ev as any).stopImmediatePropagation?.(); } catch {}
            const origin = (() => {
              const params = (roleTag === 'p' ? coordParamsAll.p : roleTag === 'u' ? coordParamsAll.u : coordParamsAll.v);
              return Number((params as any)[axis]) || 0;
            })();
            const startX = ev.clientX;
            const onMove = (mv: MouseEvent) => {
              const dx = mv.clientX - startX;
              const scale = Math.max(0.0001, Math.min(0.01, Number(liveScaleRef.current) || 0.001));
              // live update uses sensitivity only (rounded to 4 decimals), no 0.01 snapping
              let next = roundTo(origin + dx * scale, 4);
              // update UI binding target without triggering onChange
              const params = (roleTag === 'p' ? coordParamsAll.p : roleTag === 'u' ? coordParamsAll.u : coordParamsAll.v);
              const prevVal = Number((params as any)[axis]) || 0;
              if (Math.abs(prevVal - next) < 1e-9) return;
              (params as any)[axis] = next;
              try { uiSyncingRef.current = true; (bindApi as any)?.refresh?.(); } finally { uiSyncingRef.current = false; }
              // drive Three live
              onLiveEditCoord(id, roleTag === 'p' ? 'main' : roleTag, axis, next);
            };
            const onUp = () => {
              document.removeEventListener('mousemove', onMove, true);
              document.removeEventListener('mouseup', onUp, true);
              // final commit using current params
              const params = (roleTag === 'p' ? coordParamsAll.p : roleTag === 'u' ? coordParamsAll.u : coordParamsAll.v) as any;
              // no step snapping on commit; use current value as-is
              const cur = Number(params[axis]);
              const finalVal = Number.isFinite(cur) ? cur : origin;
              onEditCoord(id, roleTag === 'p' ? 'main' : roleTag, axis, finalVal);
              onCommitCoords();
            };
            document.addEventListener('mousemove', onMove, { capture: true } as any);
            document.addEventListener('mouseup', onUp, { capture: true } as any);
          };
          // Use capture to preempt Tweakpane internal listener
          try { knobEl.addEventListener('mousedown', onMouseDownCapture, { capture: true } as any); } catch {}
        });
      };

      attachCustomDragToRow(rowEls.p as HTMLElement | null, 'p', bindings.p as any);
      attachCustomDragToRow(rowEls.u as HTMLElement | null, 'u', bindings.u as any);
      attachCustomDragToRow(rowEls.v as HTMLElement | null, 'v', bindings.v as any);
    });
  };  // Rebuild when patches array changed (add/remove/rename) or selection changed (for titles), or coord mode changed
  useEffect(() => { rebuildGroups(); }, [patches, selection.patchId, selection.role, coordModeById]);
  // Also build once after mount
  useEffect(() => { rebuildGroups(); }, []);

  // Keep group titles reflecting selection (in case rebuild was not triggered)
  useEffect(() => {
    const m = groupUiMapRef.current; if (!m) return;
    const sel = selection;
    const setRowActive = (el: HTMLElement | null | undefined, active: boolean) => {
      if (!el) return;
      try {
        el.style.borderRadius = active ? '6px' : '';
        
        
        const label = el.querySelector('.tp-lblv_l') as HTMLElement | null;
        if (label) { label.style.color = active ? '#4d96ff' : ''; label.style.fontWeight = active ? '700' : ''; }
      } catch {}
    };
    const setFolderActive = (el: HTMLElement | null | undefined, active: boolean) => {
      if (!el) return;
      try {
        // folder header element has class tp-fldv_t
        const header = el.querySelector('.tp-fldv_t') as HTMLElement | null;
        const target = header || el;
        target.style.borderRadius = active ? '6px' : '';
        target.style.background = active ? 'rgba(77, 150, 255, 0.12)' : '';
        
      } catch {}
    };
    m.forEach((entry, id) => {
      try {
        const p = (patches || []).find(pp => pp.id === id);
        if (!p) return;
        entry.folder.title = makeGroupTitle(id, p.name, sel.patchId);
        const activeGroup = sel.patchId === id;
        setFolderActive(entry.folderEl, activeGroup);
        const activeP = sel.patchId === id && (sel.role === 'main' || sel.role === 'edge_u' || sel.role === 'edge_v');
        const activeU = sel.patchId === id && (sel.role === 'u' || sel.role === 'edge_u');
        const activeV = sel.patchId === id && (sel.role === 'v' || sel.role === 'edge_v');
        setRowActive(entry.rowEls?.p, activeP);
        setRowActive(entry.rowEls?.u, activeU);
        setRowActive(entry.rowEls?.v, activeV);
      } catch {}
    });
  }, [selection.patchId, selection.role, patches]);

  // Keep lock and coord list values in sync when external state changes
  useEffect(() => {
    const m = groupUiMapRef.current; if (!m) return;
    m.forEach((entry, id) => {
      const folder: any = entry.folder;
      try {
        const children = (folder as any).children || [];
        // children layout: [name, coord list, locked, buttons]
        const coordList = children[1];
        const lockBinding = children[2];
        const curMode = coordModeById[id] ?? 'global';
        if (coordList && coordList.value !== curMode) coordList.value = curMode;
        const curLocked = !!lockMainById[id];
        if (lockBinding && lockBinding.value !== curLocked) lockBinding.value = curLocked;
      } catch {}
    });
  }, [coordModeById, lockMainById]);

  // Sync displayed coordinate params when patches/coord mode changes
  useEffect(() => {
    const m = groupUiMapRef.current; if (!m) return;
    try {
      uiSyncingRef.current = true;
      m.forEach((entry, id) => {
        const dto = (patches || []).find(pp => pp.id === id);
        if (!dto || !entry.params || !entry.bindings) return;
        try {
          const [px,py,pz] = dto.main; const [ux,uy,uz] = dto.u; const [vx,vy,vz] = dto.v;
          const modeNow = coordModeById[id] ?? 'global';
          const uRel = modeNow === 'local' ? [ux-px, uy-py, uz-pz] : [ux,uy,uz];
          const vRel = modeNow === 'local' ? [vx-px, vy-py, vz-pz] : [vx,vy,vz];
          const next = {
            p: { x: px, y: py, z: pz },
            u: { x: uRel[0], y: uRel[1], z: uRel[2] },
            v: { x: vRel[0], y: vRel[1], z: vRel[2] },
          };
          // mutate in place to keep binding target stable
          (['p','u','v'] as const).forEach((rk) => {
            const cur = (entry.params as any)[rk];
            const nxt = (next as any)[rk];
            const changed = cur.x !== nxt.x || cur.y !== nxt.y || cur.z !== nxt.z;
            cur.x = nxt.x; cur.y = nxt.y; cur.z = nxt.z;
            if (changed) (entry.bindings as any)[rk]?.refresh();
          });
        } catch {}
      });
    } finally {
      uiSyncingRef.current = false;
    }
  }, [patches, coordModeById]);

  // Keep patch names synced when changed externally
  useEffect(() => {
    const m = groupUiMapRef.current; if (!m) return;
    m.forEach((entry, id) => {
      const p = (patches || []).find(pp => pp.id === id);
      if (!p || !entry.nameBinding) return;
      try {
        const params: any = (entry.nameBinding as any).o?.object ?? (entry.nameBinding as any).binding?.target;
        if (params && params.name !== (p.name ?? '')) { params.name = p.name ?? ''; entry.nameBinding.refresh(); }
      } catch {}
    });
  }, [patches]);

  function makeGroupTitle(id: number, name: string | undefined, _selectedId: number | null) {
    return `ID ${id}${name ? ` · ${name}` : ''}`;
  }

  // Keep latest props in refs to avoid stale closures inside grid handlers
  useEffect(() => { alignEnabledRef.current = alignEnabled; }, [alignEnabled]);
  useEffect(() => { onApplyAlignOpRef.current = onApplyAlignOp; }, [onApplyAlignOp]);

  return (
    <div ref={hostRef} style={{ width: '100%', height: '100%' }} />
  );
};

export default ConditionEditorPanel;
