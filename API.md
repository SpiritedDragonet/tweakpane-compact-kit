# Tweakpane Split Layout Plugin API

## 安装

```bash
npm install tweakpane-plugin-split-layout
```

```typescript
import { Pane } from 'tweakpane';
import { SplitLayoutPlugin } from 'tweakpane-plugin-split-layout';

const pane = new Pane();
pane.registerPlugin(SplitLayoutPlugin);
```

## 基础用法

### 最简单的布局
```typescript
// 自动2等分
pane.addBlade({ view: 'split-layout', direction: 'row' });
pane.addBlade({ view: 'split-layout', direction: 'column' });
```

## 尺寸表达式

### 1. fr单位（推荐）
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
  sizes: '200px 1fr 30%'
});
```

### 2. 对象形式
```typescript
// 等分
pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: { equal: 3 }  // 3等分
});

// 比例
pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: { ratio: [1, 3, 1] }  // 1:3:1
});

// 自动大小
pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: { auto: 4 }  // 4个自动大小的列
});
```

### 3. 数组形式
```typescript
// 数字数组
pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: [1, 2, 1]  // 自动转换为比例
});

// 带单位数组
pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: ['100px', '2fr', '30%']
});
```

## 布局预设

预设提供了常用的布局模式：

```typescript
// 侧边栏布局 (30% | 70%)
pane.addBlade({
  view: 'split-layout',
  preset: 'sidebar',
  direction: 'row'
});

// 三面板布局 (33% | 33% | 33%)
pane.addBlade({
  view: 'split-layout',
  preset: 'panels',
  direction: 'row'
});

// 主内容+侧边栏 (70% | 30%)
pane.addBlade({
  view: 'split-layout',
  preset: 'main-sidebar',
  direction: 'row'
});

// 头部+主内容 (20% | 80%)
pane.addBlade({
  view: 'split-layout',
  preset: 'header-main',
  direction: 'column'
});

// 三栏布局 (25% | 50% | 25%)
pane.addBlade({
  view: 'split-layout',
  preset: 'triple',
  direction: 'row'
});

// 黄金比例 (38.2% | 61.8%)
pane.addBlade({
  view: 'split-layout',
  preset: 'golden',
  direction: 'row'
});

// 自动嵌套（50% | 嵌套的50/50垂直分割）
pane.addBlade({
  view: 'split-layout',
  preset: 'nested',
  direction: 'row'
});
```

## 高级选项

```typescript
pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: '1fr 2fr 1fr',

  // 间距（px或字符串）
  gap: 12,              // 同 gutter
  gutter: '12px',

  // 交互
  interactive: true,    // 可拖拽调整大小

  // 样式
  compactSliders: false, // 关闭紧凑slider样式
  align: 'center',       // start | center | end | stretch

  // 约束
  minSize: 50,          // 最小尺寸
  height: 400,          // 固定高度（仅row方向）

  // CSS
  className: 'my-layout' // 添加自定义类
});
```

## 垂直布局的特殊配置

```typescript
pane.addBlade({
  view: 'split-layout',
  direction: 'column',
  sizes: '1fr 2fr',

  // 每行的高度分配（支持所有尺寸表达式）
  rowUnits: 'equal',        // 每行等高
  rowUnits: '2fr 1fr 1fr',  // 比例分配
  rowUnits: { equal: 3 },   // 3等分

  // 固定总高度
  height: 600
});
```

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
import { SplitLayoutPlugin } from 'tweakpane-plugin-split-layout';

const pane = new Pane();
pane.registerPlugin(SplitLayoutPlugin);

// 创建复杂布局
const layout = pane.addBlade({
  view: 'split-layout',
  direction: 'column',
  sizes: '60px 1fr 100px',
  gap: 8,
  interactive: true,
  children: [
    // 头部
    'leaf',
    // 主内容区
    {
      view: 'split-layout',
      direction: 'row',
      preset: 'sidebar',
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
  | number[]                           // [100, 200] - pixels
  | string[]                          // ['100px', '2fr', '30%']
  | string                            // '1fr 2fr 1fr'
  | 'equal'                           // Equal distribution
  | { equal: number }                 // Equal split into N parts
  | { ratio: number[] }               // Ratio-based [1, 2, 1]
  | { auto: number }                  // N auto-sized columns

type LayoutPreset =
  | 'sidebar'                         // 300px | 1fr
  | 'panels'                          // 1fr | 1fr | 1fr
  | 'main-sidebar'                    // 1fr | 250px
  | 'header-main'                     // auto | 1fr
  | 'triple'                          // 1fr 2fr 1fr
  | 'golden'                          // 0.618fr | 1fr
  | 'nested';                         // Auto-generate nested layout
```