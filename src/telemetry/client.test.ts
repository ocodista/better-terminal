import { describe, expect, test } from 'bun:test';
import { TelemetryCollector, isTelemetryDisabledByEnv } from './client';

describe('TelemetryCollector', () => {
  test('creates instance with default options', () => {
    const collector = new TelemetryCollector();
    expect(collector).toBeDefined();
  });

  test('creates instance with telemetry disabled', () => {
    const collector = new TelemetryCollector({ enabled: false });
    expect(collector).toBeDefined();
  });

  test('creates instance with custom options', () => {
    const collector = new TelemetryCollector({
      enabled: true,
      interactive: true,
      minimal: true,
    });
    expect(collector).toBeDefined();
  });

  test('getDurationMs returns positive number', async () => {
    const collector = new TelemetryCollector();
    // Wait a small amount
    await new Promise((resolve) => setTimeout(resolve, 10));
    const duration = collector.getDurationMs();
    expect(duration).toBeGreaterThan(0);
  });

  test('recordTool does not throw when disabled', () => {
    const collector = new TelemetryCollector({ enabled: false });
    expect(() => collector.recordTool('fzf', 'installed', 1000)).not.toThrow();
  });

  test('recordTool stores results when enabled', () => {
    const collector = new TelemetryCollector({ enabled: true });
    collector.recordTool('fzf', 'installed', 1000);
    collector.recordTool('eza', 'skipped');
    collector.recordTool('tmux', 'failed', 500, 'Some error');

    const summary = collector.getSummary();
    expect(summary.installed).toBe(1);
    expect(summary.skipped).toBe(1);
    expect(summary.failed).toBe(1);
  });

  test('getSummary returns correct counts', () => {
    const collector = new TelemetryCollector({ enabled: true });
    collector.recordTool('a', 'installed');
    collector.recordTool('b', 'installed');
    collector.recordTool('c', 'installed');
    collector.recordTool('d', 'skipped');
    collector.recordTool('e', 'failed');
    collector.recordTool('f', 'failed');

    const summary = collector.getSummary();
    expect(summary.installed).toBe(3);
    expect(summary.skipped).toBe(1);
    expect(summary.failed).toBe(2);
  });

  test('send does not throw when disabled', async () => {
    const collector = new TelemetryCollector({ enabled: false });
    await expect(collector.send('completed')).resolves.toBeUndefined();
  });
});

describe('isTelemetryDisabledByEnv', () => {
  const originalEnv = process.env.BETTER_SHELL_TELEMETRY;

  test('returns false when env not set', () => {
    delete process.env.BETTER_SHELL_TELEMETRY;
    expect(isTelemetryDisabledByEnv()).toBe(false);
    process.env.BETTER_SHELL_TELEMETRY = originalEnv;
  });

  test('returns true when env is 0', () => {
    process.env.BETTER_SHELL_TELEMETRY = '0';
    expect(isTelemetryDisabledByEnv()).toBe(true);
    process.env.BETTER_SHELL_TELEMETRY = originalEnv;
  });

  test('returns true when env is false', () => {
    process.env.BETTER_SHELL_TELEMETRY = 'false';
    expect(isTelemetryDisabledByEnv()).toBe(true);
    process.env.BETTER_SHELL_TELEMETRY = originalEnv;
  });

  test('returns true when env is off', () => {
    process.env.BETTER_SHELL_TELEMETRY = 'off';
    expect(isTelemetryDisabledByEnv()).toBe(true);
    process.env.BETTER_SHELL_TELEMETRY = originalEnv;
  });
});
