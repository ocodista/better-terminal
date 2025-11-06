import { describe, expect, test } from 'bun:test';
import { shell } from './shell';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('shell.exec', () => {
  test('executes valid commands', async () => {
    const result = await shell.exec('echo hello', { silent: true });

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('hello');
  });

  test('captures command output', async () => {
    const result = await shell.exec('echo test output', { silent: true });

    expect(result.stdout).toContain('test output');
  });

  test('fails on non-existent commands', async () => {
    const result = await shell.exec('this-command-does-not-exist-xyz', {
      silent: true,
      ignoreError: true,
    });

    expect(result.success).toBe(false);
    expect(result.exitCode).not.toBe(0);
  });

  test('respects working directory option', async () => {
    const result = await shell.exec('pwd', { cwd: '/tmp', silent: true });

    // On macOS, /tmp is a symlink to /private/tmp
    const output = result.stdout.trim();
    expect(output === '/tmp' || output === '/private/tmp').toBe(true);
  });

  test('separates stdout from stderr', async () => {
    const result = await shell.exec('ls /nonexistent-path-xyz', {
      silent: true,
      ignoreError: true,
    });

    expect(result.success).toBe(false);
    expect(result.stderr.length).toBeGreaterThan(0);
  });
});

describe('shell.commandExists', () => {
  test('finds common system commands', async () => {
    const exists = await shell.commandExists('ls');

    expect(exists).toBe(true);
  });

  test('returns false for non-existent commands', async () => {
    const exists = await shell.commandExists('this-command-definitely-does-not-exist-xyz123');

    expect(exists).toBe(false);
  });

  test('finds different commands consistently', async () => {
    const echoExists = await shell.commandExists('echo');
    const pwdExists = await shell.commandExists('pwd');

    expect(echoExists).toBe(true);
    expect(pwdExists).toBe(true);
  });
});

describe('shell.execMany', () => {
  test('executes multiple commands successfully', async () => {
    const success = await shell.execMany(['echo first', 'echo second', 'echo third'], {
      silent: true,
    });

    expect(success).toBe(true);
  });

  test('stops on first failure by default', async () => {
    const success = await shell.execMany(
      ['echo success', 'this-will-fail-xyz', 'echo third'],
      { silent: true, ignoreError: false }
    );

    expect(success).toBe(false);
  });

  test('continues on errors when ignoreError is true', async () => {
    const success = await shell.execMany(
      ['echo first', 'this-will-fail-xyz', 'echo third'],
      { silent: true, ignoreError: true }
    );

    expect(success).toBe(true);
  });

  test('handles empty command list', async () => {
    const success = await shell.execMany([], { silent: true });

    expect(success).toBe(true);
  });
});

describe('shell.download', () => {
  test('returns boolean result', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'shell-test-'));
    const destination = join(tempDir, 'test.txt');

    const result = await shell.download(
      'https://invalid-domain-xyz123.test/file.txt',
      destination
    );

    expect(typeof result).toBe('boolean');

    await rm(tempDir, { recursive: true, force: true });
  });

  test('handles invalid URLs gracefully', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'shell-test-'));
    const destination = join(tempDir, 'fail-test.txt');

    const success = await shell.download('not-even-a-url', destination);

    expect(success).toBe(false);

    await rm(tempDir, { recursive: true, force: true });
  });
});

describe('shell.isRoot', () => {
  test('returns a boolean', () => {
    const isRoot = shell.isRoot();

    expect(typeof isRoot).toBe('boolean');
  });

  test('consistently returns the same value', () => {
    const first = shell.isRoot();
    const second = shell.isRoot();

    expect(first).toBe(second);
  });

  test('returns false for normal user', () => {
    const isRoot = shell.isRoot();

    if (process.getuid && process.getuid() !== 0) {
      expect(isRoot).toBe(false);
    }
  });
});
