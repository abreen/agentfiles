import { $ } from 'bun';

const REQUIRED_COMMANDS = ['rg', 'fd', 'sg', 'jq', 'yq'] as const;
const BREW_PACKAGES = ['ripgrep', 'fd', 'jq', 'yq', 'ast-grep'] as const;
const FEDORA_PACKAGES = ['ripgrep', 'fd-find', 'jq', 'yq'] as const;

type SupportedPlatform = 'macos' | 'fedora';

function fail(message: string): never {
  throw new Error(message);
}

async function commandExists(command: string): Promise<boolean> {
  const result = await $`which ${command}`.nothrow();
  return result.exitCode === 0;
}

async function runInteractive(command: string[], label: string): Promise<void> {
  console.log(label);

  const proc = Bun.spawn(command, {
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    fail(`Command failed with exit code ${exitCode}: ${command.join(' ')}`);
  }
}

async function detectPlatform(): Promise<SupportedPlatform> {
  if (process.platform === 'darwin') {
    return 'macos';
  }

  if (process.platform !== 'linux') {
    fail('Unsupported environment: only macOS and Fedora Linux are supported.');
  }

  if (!(await commandExists('dnf'))) {
    fail('Unsupported environment: Fedora Linux with dnf is required.');
  }

  let osRelease = '';

  try {
    osRelease = await Bun.file('/etc/os-release').text();
  } catch {
    fail('Unsupported environment: could not read /etc/os-release.');
  }

  const isFedora = osRelease
    .split('\n')
    .some((line) => line.trim() === 'ID=fedora' || line.trim() === 'ID="fedora"');

  if (!isFedora) {
    fail('Unsupported environment: only Fedora Linux is supported.');
  }

  return 'fedora';
}

async function installMacosPackages(): Promise<void> {
  if (!(await commandExists('brew'))) {
    fail('Homebrew is required on macOS. Install Homebrew first, then rerun this script.');
  }

  await runInteractive(
    ['brew', 'install', ...BREW_PACKAGES],
    `Installing packages with Homebrew: ${BREW_PACKAGES.join(', ')}`,
  );
}

async function installFedoraPackages(): Promise<void> {
  if (!(await commandExists('bun'))) {
    fail('Bun is required to install @ast-grep/cli on Fedora.');
  }

  await runInteractive(
    ['sudo', 'dnf', 'install', '-y', ...FEDORA_PACKAGES],
    `Installing packages with dnf: ${FEDORA_PACKAGES.join(', ')}`,
  );

  await runInteractive(
    ['bun', 'install', '--global', '--trust', '@ast-grep/cli'],
    'Installing @ast-grep/cli with Bun.',
  );
}

async function verifyCommands(): Promise<void> {
  const missing: string[] = [];

  for (const command of REQUIRED_COMMANDS) {
    if (!(await commandExists(command))) {
      missing.push(command);
    }
  }

  if (missing.length > 0) {
    fail(`Installation completed, but these commands are still missing: ${missing.join(', ')}.`);
  }
}

export async function main(): Promise<void> {
  const platform = await detectPlatform();
  console.log(`Detected supported platform: ${platform}`);

  if (platform === 'macos') {
    await installMacosPackages();
  } else {
    await installFedoraPackages();
  }

  await verifyCommands();
  console.log('All required tools are installed and available on PATH.');
}

if (import.meta.main) {
  await main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}
