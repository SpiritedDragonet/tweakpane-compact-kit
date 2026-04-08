import {
  npmCommand,
  parseDemoOptions,
  runStep,
  viteCliPath,
} from './run-demo.mjs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);

export function resolvePublishedPackageSpec(env = process.env) {
  const explicit = env.PUBLISHED_PACKAGE_SPEC;
  return typeof explicit === 'string' && explicit.trim() ? explicit.trim() : 'tweakpane-compact-kit@latest';
}

export function createPublishedDemoSteps(options = {}) {
  const capture = options.capture === true;
  const packageSpec = options.packageSpec ?? resolvePublishedPackageSpec(options.env);
  const npm = options.npmCommand ?? npmCommand;

  return [
    {
      label: 'install:published-demo-deps',
      command: npm,
      args: ['install'],
      cwd: 'demo/published',
    },
    {
      label: 'install:published-package',
      command: npm,
      args: ['install', packageSpec, '--no-save'],
      cwd: 'demo/published',
    },
    {
      label: 'demo:published',
      args: [
        viteCliPath,
        '--config',
        'demo/published/vite.config.ts',
        '--host',
        ...(capture ? ['--open', '/?capture=1'] : []),
      ],
    },
  ];
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseDemoOptions(argv);

  for (const step of createPublishedDemoSteps(options)) {
    await runStep(step);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
