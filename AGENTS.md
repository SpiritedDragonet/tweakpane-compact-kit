# Repository Guidelines

本仓库是一个 Tweakpane v4 插件库，提供紧凑布局与多行按钮：
- SplitLayoutPlugin：分割布局（行/列），支持嵌套、拖拽、紧凑化滑块显示、语义分类插槽。
- SizedButtonPlugin：按“单位”高度的多行按钮，自动根据 `--cnt-usz` 与栅格补偿计算高度。
- CompactKitBundle：便捷打包导出，便于一次 `registerPlugin` 使用两者。

## Project Structure & Module Organization
- `src/`
  - `src/index.ts`：库入口与导出（插件与 `CompactKitBundle`）。
  - `src/core/SplitLayoutPlugin.ts`：分割布局插件实现与 API（`getSlots`、按分类获取等）。
  - `src/core/SizedButtonPlugin.ts`：多行按钮插件实现与 API。
- `demo/`：最小演示（纯 TypeScript + Vite）。
- `dist/`：库产物（ES/UMD 与 d.ts，由 `npm run build` 产出）。

## Build, Test, and Development Commands
- 安装依赖：`npm install`
- 启动演示：`npm run demo`（或 `npm run dev`）→ 打开的本地 URL
- 打包库：`npm run build` → 产物在 `dist/`
- 依赖约束：`tweakpane^4`；演示用 `@tweakpane/plugin-essentials`。不依赖 React/Three。

## Coding Style & Naming Conventions
- 缩进 2 空格；优先 `const`；必须分号；约 100 列以内。
- 文件命名：库源码为 TypeScript；演示为 TS（无 JSX）。
- 类型：对外导出的类型需窄化并文档化；插件内部可为降低耦合适度使用 `any`。

## Testing Guidelines
- 本仓库无测试框架；若添加单元测试，建议 Vitest。
- 手动验证（演示页）：
  - 行布局：equal/比例/1:2/66:34/嵌套渲染与拖拽分割是否按预期工作。
  - 多行按钮：按单位高度与 DOM 盒子对齐，无“跳动”。
  - 紧凑滑块：切换开关后布局立即改变，数值输入正常。

## Commit & Pull Request Guidelines
- 遵循 Conventional Commits：
  - `feat(SplitLayout): …`、`fix(SizedButton): …`、`docs(README): …`、`chore: …` 等。
- PR 需包含：
  - 变更摘要与动机；视觉改动提供前/后截图。
  - 本地验证步骤（命令与预期行为）。
  - 影响范围（文件/模块）。

## Security & Configuration Tips
- 不包含服务端逻辑；请勿加入密钥/凭据。
- 若引入网络数据加载，请放在明确的用户操作之后。
- 升级 Tweakpane 或 Essentials 时，注意 CSS/内部类名的兼容性回归。

## Agent-Specific Instructions
- 与用户交流时使用中文；代码中的注释请使用英文。
- 禁止在任何时候使用 emoji。
