import { describe, expect, test } from 'bun:test';
import { platform } from './platform';

describe('platform detection', () => {
  test('consistently identifies the same platform', () => {
    const first = platform.current;
    const second = platform.current;

    expect(first).toBe(second);
  });

  test('consistently identifies the same architecture', () => {
    const first = platform.arch;
    const second = platform.arch;

    expect(first).toBe(second);
  });

  test('activates exactly one platform helper for known platforms', () => {
    const isMac = platform.isMac();
    const isLinux = platform.isLinux();
    const isWindows = platform.isWindows();

    const platformCount = [isMac, isLinux, isWindows].filter(Boolean).length;

    // On unknown platforms all would be false, otherwise exactly one is true
    if (platform.current !== 'unknown') {
      expect(platformCount).toBe(1);
    } else {
      expect(platformCount).toBe(0);
    }
  });

  test('matches helpers to platform.current', () => {
    if (platform.current === 'macos') {
      expect(platform.isMac()).toBe(true);
      expect(platform.isLinux()).toBe(false);
      expect(platform.isWindows()).toBe(false);
    } else if (platform.current === 'linux') {
      expect(platform.isMac()).toBe(false);
      expect(platform.isLinux()).toBe(true);
      expect(platform.isWindows()).toBe(false);
    } else if (platform.current === 'windows') {
      expect(platform.isMac()).toBe(false);
      expect(platform.isLinux()).toBe(false);
      expect(platform.isWindows()).toBe(true);
    }
  });
});

describe('home directory', () => {
  test('returns an absolute path', () => {
    const home = platform.homeDir;

    expect(home.startsWith('/')).toBe(true);
  });

  test('allows reading directory contents', () => {
    const home = platform.homeDir;

    const result = Bun.spawnSync(['ls', home]);
    expect(result.exitCode).toBe(0);
  });
});

describe('shell detection', () => {
  test('returns an absolute path to a shell', () => {
    const shell = platform.shell;

    expect(shell.startsWith('/')).toBe(true);
  });

  test('identifies an executable shell', () => {
    const shell = platform.shell;

    const result = Bun.spawnSync(['test', '-x', shell]);
    expect(result.exitCode).toBe(0);
  });
});

describe('package manager detection', () => {
  test('detects brew on macOS', () => {
    if (platform.isMac()) {
      expect(platform.packageManager).toBe('brew');
    }
  });

  test('returns consistent package manager', () => {
    const first = platform.packageManager;
    const second = platform.packageManager;

    expect(first).toBe(second);
  });

  test('detects Linux package manager on Linux', () => {
    if (platform.isLinux()) {
      const pm = platform.packageManager;
      const validLinuxPMs = ['apt', 'dnf', 'pacman', 'unknown'];

      expect(validLinuxPMs).toContain(pm);
    }
  });
});
