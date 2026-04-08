import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
export const repoRoot = resolve(dirname(scriptPath), '..');
export const viteCliPath = 'node_modules/vite/bin/vite.js';
export const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

export function createDemoSteps(options = {}) {
  const capture = options.capture === true;

  return [
    {
      label: 'build:lib',
      args: [viteCliPath, 'build', '--config', 'vite.config.lib.ts'],
    },
    {
      label: 'demo',
      args: [
        viteCliPath,
        '--config',
        'demo/vite.config.ts',
        '--host',
        ...(capture ? ['--open', '/?capture=1'] : []),
      ],
    },
  ];
}

export function parseDemoOptions(argv = []) {
  const unsupported = argv.filter((arg) => arg !== '--capture');
  if (unsupported.length > 0) {
    throw new Error(`Unknown demo option: ${unsupported[0]}`);
  }

  return { capture: argv.includes('--capture') };
}

export function createSpawnLaunch(step, options = {}) {
  const cwd = resolve(options.cwd ?? repoRoot, step.cwd ?? '.');
  const platform = options.platform ?? process.platform;

  if (step.command) {
    const commandText = String(step.command);
    if (platform === 'win32' && /\.(cmd|bat)$/i.test(commandText)) {
      return {
        cwd,
        command: 'cmd.exe',
        args: ['/d', '/s', '/c', commandText, ...step.args],
      };
    }

    return {
      cwd,
      command: commandText,
      args: step.args,
    };
  }

  return {
    cwd,
    command: process.execPath,
    args: [resolve(cwd, step.args[0]), ...step.args.slice(1)],
  };
}

export function runStep(step, options = {}) {
  const launch = createSpawnLaunch(step, options);

  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(launch.command, launch.args, {
      cwd: launch.cwd,
      stdio: 'inherit',
      shell: false,
    });

    child.on('error', rejectPromise);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(
        new Error(
          signal
            ? `${step.label} exited with signal ${signal}`
            : `${step.label} exited with code ${code ?? 'unknown'}`,
        ),
      );
    });
  });
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseDemoOptions(argv);

  for (const step of createDemoSteps(options)) {
    await runStep(step);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
