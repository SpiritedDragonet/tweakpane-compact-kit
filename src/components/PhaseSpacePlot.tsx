import React, { forwardRef, memo, useImperativeHandle } from 'react';

// NOTE: This is a lightweight stub to keep the app compiling
// after moving the real implementation to `history/components/PhaseSpacePlot.tsx`.
// It preserves the public types and ref API shape used by App.tsx.

export type PatchDTO = {
  id: number;
  name?: string;
  color?: string;
  main: [number, number, number];
  u: [number, number, number];
  v: [number, number, number];
};

export type MarkerDTO = {
  id: number;
  label: string;
  index: number;
  color: string;
};

export type PhaseSpacePlotHandle = {
  addPatch: (center?: { x?: number; y?: number; z?: number }) => number | null;
  deleteSelectedPatch: () => void;
  clearSelection: () => void;
  getPatches: () => PatchDTO[];
  setPatches: (patches: PatchDTO[]) => void;
  renamePatch: (patchId: number, name: string) => void;
  updatePointWorld: (patchId: number, role: 'main'|'u'|'v', coord: {x:number;y:number;z:number}) => void;
  updatePatchColor: (patchId: number, colorHex: string) => void;
  setTransformMode: (mode: 'translate'|'rotate'|'scale'|'uv') => void;
  setTransformSpace: (space: 'local'|'world') => void;
  focusOnTrajectory: () => void;
  deletePatchById: (patchId: number) => void;
  setMainLocked: (patchId: number, locked: boolean) => void;
  commit: (reason?: string) => void;
};

type ExternalControls = {
  signal?: Float32Array | Float64Array | number[];
  displayStartPosition?: number;
  displayEndPosition?: number;
  tau?: number;
};

type Props = {
  external: ExternalControls;
  debug?: boolean;
  pointPixelSize?: number;
  markerPointPixelSize?: number;
  onPatchesChange?: (patches: PatchDTO[], meta?: { commit?: boolean; reason?: string }) => void;
  frameCloseness?: number;
  onSelectionChange?: (sel: { patchId: number | null; role: 'main' | 'u' | 'v' | 'edge_u' | 'edge_v' | null }) => void;
  markers?: MarkerDTO[];
};

export const PhaseSpacePlot = memo(
  forwardRef<PhaseSpacePlotHandle, Props>(function PhaseSpacePlotImpl(
    { onPatchesChange },
    ref,
  ) {
    useImperativeHandle(ref, () => ({
      addPatch: () => null,
      deleteSelectedPatch: () => {},
      clearSelection: () => {},
      getPatches: () => [],
      setPatches: () => { /* no-op */ },
      renamePatch: () => {},
      updatePointWorld: () => {},
      updatePatchColor: () => {},
      setTransformMode: () => {},
      setTransformSpace: () => {},
      focusOnTrajectory: () => {},
      deletePatchById: () => {},
      setMainLocked: () => {},
      commit: () => {},
    }), [onPatchesChange]);

    // Placeholder view to indicate 3D plot is disabled in this build
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#888',
        fontSize: 12,
      }}>
        PhaseSpacePlot is moved to history/
      </div>
    );
  })
);

export default PhaseSpacePlot;

