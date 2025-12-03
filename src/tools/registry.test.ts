import { describe, expect, test } from 'bun:test';
import {
  TOOLS,
  TOOL_ORDER,
  getToolPromptInfo,
  filterTools,
  parseToolList,
  validateToolIds,
  getAllToolIds,
} from './registry';

describe('TOOLS registry', () => {
  test('contains all expected tools', () => {
    const expectedTools = [
      'zsh',
      'oh-my-zsh',
      'antigen',
      'fonts',
      'fzf',
      'eza',
      'carapace',
      'asdf',
      'nodejs',
      'tmux',
      'tpm',
    ];

    for (const toolId of expectedTools) {
      expect(TOOLS[toolId]).toBeDefined();
    }
  });

  test('each tool has required properties', () => {
    for (const [id, tool] of Object.entries(TOOLS)) {
      expect(tool.id).toBe(id);
      expect(tool.name).toBeDefined();
      expect(typeof tool.name).toBe('string');
      expect(tool.description).toBeDefined();
      expect(typeof tool.description).toBe('string');
      expect(Array.isArray(tool.changes)).toBe(true);
      expect(typeof tool.critical).toBe('boolean');
      expect(['core', 'cli', 'font', 'manager', 'config']).toContain(tool.category);
      expect(typeof tool.minimal).toBe('boolean');
    }
  });

  test('critical tools are marked correctly', () => {
    expect(TOOLS['zsh'].critical).toBe(true);
    expect(TOOLS['oh-my-zsh'].critical).toBe(true);
    expect(TOOLS['antigen'].critical).toBe(true);
    expect(TOOLS['asdf'].critical).toBe(true);
    expect(TOOLS['fzf'].critical).toBe(false);
  });
});

describe('TOOL_ORDER', () => {
  test('contains all tools', () => {
    const toolIds = Object.keys(TOOLS);
    expect(TOOL_ORDER.length).toBe(toolIds.length);

    for (const id of TOOL_ORDER) {
      expect(TOOLS[id]).toBeDefined();
    }
  });

  test('starts with core tools', () => {
    expect(TOOL_ORDER[0]).toBe('zsh');
    expect(TOOL_ORDER[1]).toBe('oh-my-zsh');
    expect(TOOL_ORDER[2]).toBe('antigen');
  });
});

describe('getToolPromptInfo', () => {
  test('returns prompt info for valid tool', () => {
    const info = getToolPromptInfo('fzf');

    expect(info.name).toBe('fzf');
    expect(info.description).toBeDefined();
    expect(Array.isArray(info.changes)).toBe(true);
    expect(info.critical).toBe(false);
  });

  test('throws for unknown tool', () => {
    expect(() => getToolPromptInfo('unknown-tool')).toThrow();
  });

  test('marks critical tools correctly', () => {
    const zshInfo = getToolPromptInfo('zsh');
    const fzfInfo = getToolPromptInfo('fzf');

    expect(zshInfo.critical).toBe(true);
    expect(fzfInfo.critical).toBe(false);
  });
});

describe('filterTools', () => {
  test('returns all tools by default', () => {
    const result = filterTools({});
    expect(result.length).toBe(TOOL_ORDER.length);
  });

  test('filters by tools option', () => {
    const result = filterTools({ tools: ['fzf', 'eza'] });

    expect(result).toContain('fzf');
    expect(result).toContain('eza');
    expect(result.length).toBe(2);
  });

  test('filters by minimal option', () => {
    const result = filterTools({ minimal: true });

    for (const id of result) {
      expect(TOOLS[id].minimal).toBe(true);
    }

    // Non-minimal tools should be excluded
    expect(result).not.toContain('fonts');
    expect(result).not.toContain('carapace');
  });

  test('filters by exclude option', () => {
    const result = filterTools({ exclude: ['fonts', 'carapace'] });

    expect(result).not.toContain('fonts');
    expect(result).not.toContain('carapace');
    expect(result).toContain('fzf');
  });

  test('includes dependencies when using tools filter', () => {
    const result = filterTools({ tools: ['nodejs'] });

    // nodejs depends on asdf
    expect(result).toContain('asdf');
    expect(result).toContain('nodejs');
  });
});

describe('parseToolList', () => {
  test('parses comma-separated list', () => {
    const result = parseToolList('fzf,eza,tmux');

    expect(result).toEqual(['fzf', 'eza', 'tmux']);
  });

  test('trims whitespace', () => {
    const result = parseToolList('fzf , eza , tmux');

    expect(result).toEqual(['fzf', 'eza', 'tmux']);
  });

  test('converts to lowercase', () => {
    const result = parseToolList('FZF,EZA,TMUX');

    expect(result).toEqual(['fzf', 'eza', 'tmux']);
  });

  test('filters empty strings', () => {
    const result = parseToolList('fzf,,eza,');

    expect(result).toEqual(['fzf', 'eza']);
  });

  test('handles empty input', () => {
    const result = parseToolList('');

    expect(result).toEqual([]);
  });
});

describe('validateToolIds', () => {
  test('separates valid and invalid ids', () => {
    const { valid, invalid } = validateToolIds(['fzf', 'unknown', 'eza', 'fake']);

    expect(valid).toEqual(['fzf', 'eza']);
    expect(invalid).toEqual(['unknown', 'fake']);
  });

  test('returns all valid for known tools', () => {
    const { valid, invalid } = validateToolIds(['zsh', 'fzf', 'tmux']);

    expect(valid).toEqual(['zsh', 'fzf', 'tmux']);
    expect(invalid).toEqual([]);
  });

  test('handles empty array', () => {
    const { valid, invalid } = validateToolIds([]);

    expect(valid).toEqual([]);
    expect(invalid).toEqual([]);
  });
});

describe('getAllToolIds', () => {
  test('returns all tool ids in order', () => {
    const result = getAllToolIds();

    expect(result).toEqual([...TOOL_ORDER]);
  });

  test('returns a new array each time', () => {
    const result1 = getAllToolIds();
    const result2 = getAllToolIds();

    expect(result1).not.toBe(result2);
    expect(result1).toEqual(result2);
  });
});
