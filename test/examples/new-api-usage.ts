// API使用示例
import { Pane } from 'tweakpane';
import { SplitLayoutPlugin } from 'tweakpane-plugin-split-layout';

const pane = new Pane();
pane.registerPlugin(SplitLayoutPlugin);

// 1. 基础语法（最简洁）
// 等分2列
pane.addBlade({ view: 'split-layout', direction: 'row' });

// 2. CSS Grid风格的尺寸表达式
// 使用fr单位（灵活比例）
pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: '1fr 2fr 1fr'  // 1:2:1比例
});

// 混合单位
pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: '200px 1fr 30%'  // 固定200px + 剩余空间 + 30%
});

// 3. 预设模板（常用布局）
pane.addBlade({
  view: 'split-layout',
  preset: 'sidebar',     // 侧边栏布局
  direction: 'row'
});

pane.addBlade({
  view: 'split-layout',
  preset: 'header-main', // 头部+主内容
  direction: 'column'
});

pane.addBlade({
  view: 'split-layout',
  preset: 'golden',      // 黄金比例
  direction: 'row'
});

pane.addBlade({
  view: 'split-layout',
  preset: 'nested',      // 自动嵌套
  direction: 'row'
});

// 4. 对象式尺寸定义
pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: { equal: 3 }     // 3等分
});

pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: { ratio: [1, 3, 1] }  // 1:3:1比例
});

pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: { auto: 4 }     // 4个自动大小的列
});

// 5. 数组形式
pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: [100, 200, 300] // 数字数组（总和为600，比例1:2:3）
});

pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: ['100px', '2fr', '30%']  // 带单位的字符串数组
});

// 6. 高级选项
pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: '1fr 1fr 1fr',
  gap: 12,               // 间距12px
  interactive: true,     // 可拖拽调整
  compactSliders: false, // 关闭紧凑slider样式
  align: 'center',       // 居中对齐
  className: 'my-layout' // 添加CSS类
});

// 7. 垂直布局与单位分配
pane.addBlade({
  view: 'split-layout',
  direction: 'column',
  sizes: '1fr 2fr',     // 垂直方向的比例
  rowUnits: 'equal',     // 每行等高
  height: 400            // 总高度400px
});

// 8. 嵌套布局
pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: '300px 1fr',
  children: [
    'leaf',  // 左侧面板
    {        // 右侧嵌套布局
      view: 'split-layout',
      direction: 'column',
      preset: 'header-main'
    }
  ]
});

// 9. 配合其他参数
const api = pane.addBlade({
  view: 'split-layout',
  direction: 'row',
  sizes: '1fr 1fr',
  gutter: 8,             // 间距8px
  minSize: 50,           // 最小尺寸50px
  interactive: true      // 可调整
});

// 获取slots并填充内容
const slots = api.getSlots();
slots[0].appendChild(myCustomElement1);
slots[1].appendChild(myCustomElement2);