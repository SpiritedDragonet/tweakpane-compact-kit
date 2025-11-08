// Shared layout plan types and utilities for demos

export type LeafKind = 'button'|'sizedbutton'|'number'|'slider'|'range'|'dropdown'|'checkbox'|'color'|'point2d'|'text'|'buttongrid'|'folder'|'customDom';

export type LeafPlan = {
  kind: LeafKind;
  folderChildren?: number;
  customUnits?: number;
  sizedUnits?: number;
};

export type ColPlan = {
  rows: number;
  leaves: LeafPlan[];
  rowUnits: number[];
};

export type LayoutPlan = {
  colCount: number;
  cols: ColPlan[];
};

export const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const chooseLeaf = (): LeafPlan => {
  const kinds: LeafKind[] = ['button','sizedbutton','number','slider','range','dropdown','checkbox','color','point2d','text','buttongrid','folder','customDom'];
  const k = kinds[randomInt(0, kinds.length - 1)];
  if (k === 'folder') return { kind: 'folder', folderChildren: randomInt(2, 5) };
  if (k === 'customDom') return { kind: 'customDom', customUnits: randomInt(1, 4) };
  if (k === 'sizedbutton') return { kind: 'sizedbutton', sizedUnits: randomInt(2, 4) };
  return { kind: k };
};

export const estimateUnits = (leaf: LeafPlan): number => {
  switch (leaf.kind) {
    case 'folder': return Math.max(2, (leaf.folderChildren ?? 2) + 1);
    case 'customDom': return Math.max(1, leaf.customUnits ?? 1);
    case 'sizedbutton': return Math.max(2, leaf.sizedUnits ?? 2);
    case 'range': return 2;
    case 'point2d': return 2;
    case 'buttongrid': return 2;
    default: return 1;
  }
};

export const buildPlan = (): LayoutPlan => {
  const colCount = randomInt(1, 4);
  const cols: ColPlan[] = [];
  for (let c = 0; c < colCount; c++) {
    const rows = randomInt(1, 4);
    const leaves: LeafPlan[] = [];
    const rowUnits: number[] = [];
    for (let r = 0; r < rows; r++) {
      const leaf = chooseLeaf();
      leaves.push(leaf);
      rowUnits.push(estimateUnits(leaf));
    }
    cols.push({ rows, leaves, rowUnits });
  }
  return { colCount, cols };
};