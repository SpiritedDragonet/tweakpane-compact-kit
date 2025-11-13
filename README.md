# Tweakpane Compact Kit

Compact layout toolkit for Tweakpane v4 — build dense, tidy panels in ~320px。

- SplitLayout：按行/列拆分，返回插槽，向每个插槽挂 Pane 或 DOM。
- SizedButton：多行按钮，按“单位”对齐 Tweakpane 栅格。
- Smart compaction：减少多余间距，可选紧凑滑块布局。

## 安装

```bash
npm install tweakpane-compact-kit
```

（需配合 tweakpane v4 使用）

## 快速开始（First Split）

<table><tr><td>

<pre><code class="language-ts">import { Pane } from 'tweakpane';
import { CompactKitBundle } from 'tweakpane-compact-kit';

const pane = new Pane();
pane.registerPlugin(CompactKitBundle); // per Pane

// 1fr | 1fr
const row = pane.addBlade({
  view: 'split-layout', direction: 'row', sizes: '1fr 1fr', children: ['leaf', 'leaf']
});
const [L, R] = (row as any).getSlots();

// Left: 3u button
const pL = new Pane({ container: L });
pL.registerPlugin(CompactKitBundle);
pL.addBlade({ view: 'sized-button', title: 'button (3u)', units: 3 });

// Right: 3u DOM
const box = document.createElement('div');
box.style.height = 'calc(3 * var(--cnt-usz) + 2 * 4px)';
box.style.display = 'grid';
box.style.placeItems = 'center';
box.textContent = '3u DOM';
R.appendChild(box);
</code></pre>

</td><td width="360" valign="top">

<img src="docs/images/basics-1.svg" width="360" alt="Basics 1/3" />

</td></tr></table>

## 尺寸表达式（Size Expressions）

<table><tr><td>

<pre><code class="language-ts">// 66 / 34
pane.addBlade({ view: 'split-layout', direction: 'row', sizes: [66, 34], children: ['leaf','leaf'] });

// equal (3 cols)
pane.addBlade({ view: 'split-layout', direction: 'row', sizes: 'equal', children: ['leaf','leaf','leaf'] });

// 1fr 2fr（左按钮标题 1fr，右按钮 2fr）
pane.addBlade({ view: 'split-layout', direction: 'row', sizes: '1fr 2fr', children: ['leaf','leaf'] });

// 40 10（归一化：40:10 → 80:20）
pane.addBlade({ view: 'split-layout', direction: 'row', sizes: [40, 10], children: ['leaf','leaf'] });
</code></pre>

</td><td width="360" valign="top">

<img src="docs/images/basics-2.svg" width="360" alt="Basics 2/3" />

</td></tr></table>

## Mixed DOM（Donut Gauge）

<table><tr><td>

<pre><code class="language-ts">const gRow = pane.addBlade({
  view: 'split-layout', direction: 'row', sizes: '1fr 1fr', gutter: 6, children: ['leaf','leaf']
});
const [gL, gR] = (gRow as any).getSlots();
const state = { value: 64, thickness: 10, rounded: true, color: '#22d3ee' };
const pL = new Pane({ container: gL });
pL.addBinding(state, 'value', { min: 0, max: 100, label: 'Value' });
pL.addBinding(state, 'thickness', { min: 4, max: 20, step: 1, label: 'Thickness' });
pL.addBinding(state, 'rounded', { label: 'Rounded' });
pL.addBinding(state, 'color', { label: '' }); // 仅隐藏此项的 label
// 右侧 DOM：4u 画布（示例省略绘制函数）
</code></pre>

</td><td width="360" valign="top">

<img src="docs/images/basics-3.svg" width="360" alt="Basics 3/3" />

</td></tr></table>

## Compact Sliders Toggle（紧凑滑块对比）

<table><tr><td>

<pre><code class="language-ts">const row = pane.addBlade({
  view: 'split-layout', direction: 'row', sizes: '1fr 1fr',
  compactSliders: true, children: ['leaf','leaf']
});
</code></pre>

</td><td width="360" valign="top">

<img src="docs/images/compact-toggle.svg" width="360" alt="Compact Toggle" />

</td></tr></table>

## Custom Categories（语义插槽）

<table><tr><td>

<pre><code class="language-ts">const api = pane.addBlade({
  view: 'split-layout', direction: 'row', sizes: 'equal',
  children: ['alpha','beta','gamma']
}) as any;
api.getSlotsByCategory?.('alpha');
</code></pre>

</td><td width="360" valign="top">

<img src="docs/images/categories.svg" width="360" alt="Custom Categories" />

</td></tr></table>

## API 速览（常用）

```ts
// 添加分割布局
pane.addBlade({ view: 'split-layout', direction: 'row', sizes: '1fr 2fr', children: ['leaf','leaf'] });

// 获取插槽
api.getSlots();
api.getSlotsByCategory?.('alpha');

// 垂直列布局按“单位”分配高度
pane.addBlade({ view: 'split-layout', direction: 'column', rowUnits: '1 1 2', children: ['leaf','leaf','leaf'] });

// 紧凑滑块
pane.addBlade({ view: 'split-layout', compactSliders: true, children: ['leaf'] });

// 多行按钮
pane.addBlade({ view: 'sized-button', title: 'Multi-line\nButton', units: 3 });
```

Size Expressions (pick what reads best for your case):

```ts
// Numeric arrays (auto-normalized ratios)
sizes: [66, 34]       // 66:34 ratio
sizes: [1, 2, 1]      // 1:2:1 ratio

// Fractions (CSS Grid-like, recommended)
sizes: '1fr 2fr'      // 1:2 ratio
sizes: '1fr 1fr 1fr'  // 1:1:1 ratio

// Equal split
sizes: 'equal'        // auto-equal from children count
```

Other options:

```ts
gutter?: number | string // default 6
minSize?: number         // default 20 (min % per panel)
height?: number | string // for column splits
interactive?: boolean    // enable dragging
compactSliders?: boolean // compact slider/value layout (default true)
```

Imperative API:

```ts
api.getSlots(): HTMLElement[]
api.getSlotsByCategory(name: string): HTMLElement[]
api.getSlotsByCategoryMap(): Map<string, HTMLElement[]>
api.getCategories(): string[]
```

Children can be strings (categories) or nested split nodes. Strings are user-defined categories (e.g. `'leaf'`, `'alpha'`, `'preview'`).

（更多用法见 demo/ 源码）

## 运行 Demo

```bash
# build the library first
npm run build

# start the demo dev server (aliases src to local source)
npm run demo
```

打开显示的地址，体验紧凑滑块、拖拽分割与混合 DOM。

## TypeScript 类型
导出常用类型以便补全与校验：`SplitDirection`、`SizeExpression`、`SizedButtonOptions`。

## 备注
- 仅支持 Tweakpane v4（core.major = 2）。
- 每个 Pane 都需要单独 `registerPlugin(CompactKitBundle)`。
- Pane 建议保持在 ~300–340px 宽以获得最佳紧凑观感（demo 约 320px）。

## 发布（手动）
Actions → Release (manual) → 运行，输入 `tag`（如 v0.1.0）。工作流会构建并上传 dist.zip 与 js-only.zip。

## License

MIT

## Contributing

Issues and PRs are welcome.
