# Repository Guidelines

## Project Structure & Module Organization
- `index.html`: Vite host page (mounts React root `#root`).
- `src/`: Application source
  - `src/App.tsx`: Layout (left 3D viewport box, right sidebar UI; generates signal; passes props to plot).
  - `src/components/PhaseSpacePlot.tsx`: All Three.js rendering logic encapsulated in a React component; exposes imperative API for patches.
  - `src/main.tsx`: App entry, bootstraps React.

## Build, Test, and Development Commands
- Install deps: `npm install`
- Start dev server: `npm run dev` → open the shown URL
- Production build: `npm run build` → static output in `dist/`
- Preview production build: `npm run preview`
- Three.js version is pinned (`three@0.165.0`). Keep versions pinned.

## Coding Style & Naming Conventions
- Indentation: 2 spaces; prefer `const`; semicolons required; max ~100 chars/line.
- React/TSX: `PascalCase` component files (e.g., `PhaseSpacePlot.tsx`), `camelCase` variables, `kebab-case` CSS class names.
- Types: avoid `any`; keep narrow types for props and public handles; document exported types.

## Testing Guidelines
- No test harness in this repo. If adding tests for TSX, prefer Vitest + React Testing Library; name files `*.test.tsx` alongside components.
- Manual checks for `index.html`:
  - Tau slider updates trajectory; start/end range trims data.
  - Add/Delete patch buttons modify scene; transform controls move points.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (observed in history):
  - `feat(PhaseSpacePlot): …`, `fix(index.html): …`, `chore: …`.
- PRs should include:
  - Summary, rationale, and before/after screenshots for visual changes.
  - Steps to verify locally (commands + expected behavior).
  - Linked issues and scope notes (which files/areas affected).

## Security & Configuration Tips
- Keep CDN versions pinned; prefer minor/patch bumps with quick sanity checks.
- This is a client-only demo; do not add secrets or credentials. If adding data loading, gate network calls behind explicit user actions.

## Agent-Specific Instructions
- 与用户交流时使用中文；代码中的注释请使用英文。
- 禁止在任何时候使用 emoji。
