import { describe, expect, test } from 'bun:test';
import {
  isTTY,
  progressBar,
  InteractiveInstaller,
  InteractiveQuitError,
} from './prompt';

describe('isTTY detection', () => {
  test('returns a boolean', () => {
    const result = isTTY();
    expect(typeof result).toBe('boolean');
  });
});

describe('progressBar', () => {
  test('has required properties', () => {
    expect(progressBar).toHaveProperty('current');
    expect(progressBar).toHaveProperty('total');
    expect(progressBar).toHaveProperty('width');
    expect(progressBar).toHaveProperty('start');
    expect(progressBar).toHaveProperty('update');
    expect(progressBar).toHaveProperty('increment');
    expect(progressBar).toHaveProperty('render');
    expect(progressBar).toHaveProperty('finish');
  });

  test('start initializes values', () => {
    progressBar.start(10);
    expect(progressBar.total).toBe(10);
    expect(progressBar.current).toBe(0);
  });

  test('update changes current value', () => {
    progressBar.start(10);
    progressBar.update(5);
    expect(progressBar.current).toBe(5);
  });

  test('increment advances by one', () => {
    progressBar.start(10);
    progressBar.current = 0;
    progressBar.increment();
    expect(progressBar.current).toBe(1);
  });

  test('finish does not throw', () => {
    progressBar.start(5);
    expect(() => progressBar.finish()).not.toThrow();
  });
});

describe('InteractiveInstaller', () => {
  test('creates instance', () => {
    const installer = new InteractiveInstaller();
    expect(installer).toBeDefined();
  });

  test('tracks skipped tools', () => {
    const installer = new InteractiveInstaller();
    const skipped = installer.getSkippedTools();
    expect(Array.isArray(skipped)).toBe(true);
    expect(skipped.length).toBe(0);
  });

  test('returns copy of skipped tools', () => {
    const installer = new InteractiveInstaller();
    const skipped1 = installer.getSkippedTools();
    const skipped2 = installer.getSkippedTools();
    expect(skipped1).not.toBe(skipped2);
  });
});

describe('InteractiveQuitError', () => {
  test('creates error with message', () => {
    const error = new InteractiveQuitError();
    expect(error.message).toBe('Installation cancelled by user');
    expect(error.name).toBe('InteractiveQuitError');
  });

  test('is instanceof Error', () => {
    const error = new InteractiveQuitError();
    expect(error instanceof Error).toBe(true);
  });
});
