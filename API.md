# Tweakpane Split Layout Plugin API

## 安装

```bash
npm install tweakpane-compact-kit
```

```typescript
import { Pane } from 'tweakpane';
import { SplitLayoutPlugin } from 'tweakpane-compact-kit';

const pane = new Pane();
pane.registerPlugin(SplitLayoutPlugin);
```

## 基础用法

### 最简单的布局
```typescript
// 自动2等分
pane.addBlade({ view: 'split-layout', direction: 'row' });
pane.addBlade({
  view: 'split-layout',
  direction: 'column',
  units: 2,
  children: ['leaf']
});
```

## 尺寸表达式

### 1. 数字数组（最简单）
```typescript
// 比例分配
pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: [66, 34]  // 66:34 比例
});

pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: [1, 2, 1]  // 1:2:1 比例
});
```

### 2. fr单位（推荐）
```typescript
// 1:1 比例
pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: '1fr 1fr'
});

// 1:2:1 比例
pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: '1fr 2fr 1fr'
});

// 混合单位
pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: '200px 1fr 30%'  // 200px固定 + 自适应 + 30%
});
```

### 3. 等分布局
```typescript
// 根据children数量自动等分
pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: 'equal',
  children: ['leaf', 'leaf', 'leaf']  // 3等分
});
```

## 高级选项

```typescript
pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: '1fr 2fr 1fr',

  // 间距（px）
  gutter: 12,

  // 交互
  interactive: true,    // 可拖拽调整大小

  // 样式
  compactSliders: false, // 关闭紧凑slider样式

  // 约束 / 基线
  minSize: 50,          // 最小尺寸
  units: 4,             // 纵向基线跨度；内容可超过它
});
```

## 垂直布局的特殊配置

```typescript
pane.addBlade({
  view: 'split-layout',
  direction: 'column',
  units: 3,  // 收缩时至少保留 3u
  children: [
    'header',
    {
      view: 'split-layout',
      direction: 'row',
      sizes: '1fr 2fr',
      units: 2,
      children: ['left', 'right'],
    },
    'footer',
  ],
});
```

- `units` 是唯一的纵向字段
- `row.liveUnits = max(baseUnits, max(children.liveUnits))`
- `column.liveUnits = max(baseUnits, sum(children.liveUnits))`
- 已知 compact-kit 控件会直接发布自己的 `units`
- 陌生 DOM / 第三方控件会走测量回退，默认使用 `safe` 向上取整

## 支持面

- `sizes` 支持 `number[]`、`'equal'`、纯 `fr` 字符串，以及 `200px 1fr 30%` 这类混合字符串
- `units` 是唯一公开的纵向基线语义
- `gutter` 是公开的间距参数
- `compactSliders` 是唯一公开的紧凑 slider 开关
- slot 可以作为 custom control host；未知内容会按测量结果换算成整 `units`

## 嵌套布局

```typescript
pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: '300px 1fr',
  children: [
    'leaf',  // 左侧面板
    {        // 右侧嵌套布局
      view: 'split-layout',
      direction: 'column',
      sizes: '60px 1fr 60px',  // 头部 | 主内容 | 底部
      children: ['leaf', 'leaf', 'leaf']
    }
  ]
});
```

## 使用slots

创建布局后，获取slots并填充内容：

```typescript
const api = pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: '1fr 1fr'
});

const slots = api.getSlots();

// 方法1：直接添加DOM
slots[0].appendChild(document.getElementById('my-element'));

// 方法2：创建新的Pane
const pane1 = new Pane({ container: slots[0] });
const pane2 = new Pane({ container: slots[1] });

pane1.addBinding(obj, 'value1');
pane2.addBinding(obj, 'value2');
```

## 完整示例

```typescript
import { Pane } from 'tweakpane';
import { SplitLayoutPlugin } from 'tweakpane-compact-kit';

const pane = new Pane();
pane.registerPlugin(SplitLayoutPlugin);

// 创建复杂布局
const layout = pane.addBlade({
  view: 'split-layout',
  direction: 'column',
  sizes: '60px 1fr 100px',
  gutter: 8,
  interactive: true,
  children: [
    // 头部
    'leaf',
    // 主内容区
    {
      view: 'split-layout',
      direction: 'row',
      sizes: [30, 70],  // 30:70比例
      children: [
        // 侧边栏
        'leaf',
        // 内容区
        {
          view: 'split-layout',
          direction: 'row',
          sizes: '1fr 1fr',
          children: ['leaf', 'leaf']
        }
      ]
    },
    // 底部
    'leaf'
  ]
});

// 获取所有slots并填充内容
const [headerSlot, sidebarSlot, content1Slot, content2Slot, footerSlot] = layout.getSlots();

// 创建子pane
new Pane({ container: headerSlot }).addBinding(settings, 'title');
new Pane({ container: sidebarSlot }).addBinding(settings, 'menu');
new Pane({ container: content1Slot }).addBinding(data, 'chart1');
new Pane({ container: content2Slot }).addBinding(data, 'chart2');
new Pane({ container: footerSlot }).addBinding(status, 'info');
```

## 类型定义

```typescript
type SizeExpression =
  | number[]    // [66, 34] or [1, 2, 1] - ratio-based
  | string;     // '1fr 2fr' or 'equal'

type SplitLayoutParams = {
  view: 'split-layout';
  direction: 'row' | 'column';
  sizes?: SizeExpression;
  children?: SplitLayoutNode[];
  units?: number;
  gutter?: number | string;
  minSize?: number;
  interactive?: boolean;
  compactSliders?: boolean;
};
```
