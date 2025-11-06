import { describe, expect, test } from 'bun:test';
import { logger, colors } from './logger';

describe('color codes', () => {
  test('clears all formatting with reset', () => {
    const formatted = `${colors.red}text${colors.reset}`;

    expect(formatted).toContain('\x1b[0m');
  });

  test('applies color formatting', () => {
    const redText = `${colors.red}error${colors.reset}`;
    const greenText = `${colors.green}success${colors.reset}`;

    expect(redText).not.toBe(greenText);
    expect(redText).toContain('error');
    expect(greenText).toContain('success');
  });

  test('combines multiple styles', () => {
    const styled = `${colors.bright}${colors.cyan}header${colors.reset}`;

    expect(styled).toContain(colors.bright);
    expect(styled).toContain(colors.cyan);
    expect(styled).toContain('header');
  });
});

describe('logger message formatting', () => {
  test('includes content in info messages', () => {
    const originalLog = console.log;
    let captured = '';

    console.log = (msg: string) => {
      captured = msg;
    };

    logger.info('test message');
    console.log = originalLog;

    expect(captured).toContain('test message');
    expect(captured).toContain('ℹ');
  });

  test('distinguishes success from errors', () => {
    const originalLog = console.log;
    const originalError = console.error;
    let successMessage = '';
    let errorMessage = '';

    console.log = (msg: string) => {
      successMessage = msg;
    };
    console.error = (msg: string) => {
      errorMessage = msg;
    };

    logger.success('operation succeeded');
    logger.error('operation failed');

    console.log = originalLog;
    console.error = originalError;

    expect(successMessage).toContain('operation succeeded');
    expect(errorMessage).toContain('operation failed');
    expect(successMessage).toContain('✓');
    expect(errorMessage).toContain('✗');
    expect(successMessage).not.toBe(errorMessage);
  });

  test('assigns different icons to log levels', () => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    let infoMsg = '';
    let stepMsg = '';
    let warnMsg = '';

    console.log = (msg: string) => {
      if (msg.includes('ℹ')) infoMsg = msg;
      if (msg.includes('▸')) stepMsg = msg;
    };
    console.warn = (msg: string) => {
      warnMsg = msg;
    };

    logger.info('info');
    logger.step('step');
    logger.warn('warning');

    console.log = originalLog;
    console.warn = originalWarn;

    expect(infoMsg).toContain('ℹ');
    expect(stepMsg).toContain('▸');
    expect(warnMsg).toContain('⚠');
  });
});

describe('spinner behavior', () => {
  test('creates stoppable spinner', () => {
    const spinner = logger.spin.start('loading');

    expect(spinner).toHaveProperty('stop');
    expect(spinner).toHaveProperty('fail');
    expect(typeof spinner.stop).toBe('function');
    expect(typeof spinner.fail).toBe('function');

    spinner.stop();
  });

  test('stops without throwing', () => {
    const spinner = logger.spin.start('processing');

    expect(() => spinner.stop()).not.toThrow();
  });

  test('fails without throwing', () => {
    const spinner = logger.spin.start('task');

    expect(() => spinner.fail('task failed')).not.toThrow();
  });

  test('accepts custom message when stopping', () => {
    const spinner = logger.spin.start('working');

    expect(() => spinner.stop('completed')).not.toThrow();
  });

  test('provides animation frames', () => {
    expect(logger.spin.frames).toBeDefined();
    expect(logger.spin.frames.length).toBeGreaterThan(0);
    expect(Array.isArray(logger.spin.frames)).toBe(true);
  });

  test('uses unique frames', () => {
    const frames = logger.spin.frames;
    const uniqueFrames = new Set(frames);

    expect(uniqueFrames.size).toBe(frames.length);
    frames.forEach((frame) => {
      expect(typeof frame).toBe('string');
      expect(frame.length).toBeGreaterThan(0);
    });
  });

  test('sets positive interval', () => {
    expect(logger.spin.interval).toBeGreaterThan(0);
    expect(typeof logger.spin.interval).toBe('number');
  });
});

describe('logger utility methods', () => {
  test('outputs empty line', () => {
    const originalLog = console.log;
    let captured = '';

    console.log = (msg: string) => {
      captured = msg;
    };

    logger.newline();
    console.log = originalLog;

    expect(captured).toBe('');
  });

  test('applies dim formatting', () => {
    const originalLog = console.log;
    let captured = '';

    console.log = (msg: string) => {
      captured = msg;
    };

    logger.dim('subtle text');
    console.log = originalLog;

    expect(captured).toContain('subtle text');
    expect(captured).toContain(colors.dim);
    expect(captured).toContain(colors.reset);
  });

  test('adds spacing and formatting to headers', () => {
    const originalLog = console.log;
    let captured = '';

    console.log = (msg: string) => {
      captured = msg;
    };

    logger.header('Section Title');
    console.log = originalLog;

    expect(captured).toContain('Section Title');
    expect(captured).toMatch(/^\n/);
    expect(captured).toMatch(/\n$/);
  });
});
