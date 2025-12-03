/**
 * Tool registry - defines all installable tools with metadata
 */

import type { ToolPromptInfo } from '../utils/prompt';

export interface Tool {
  id: string;
  name: string;
  description: string;
  changes: string[];
  critical: boolean;
  category: 'core' | 'cli' | 'font' | 'manager' | 'config';
  minimal: boolean; // Include in --minimal install
  dependencies?: string[]; // Tool IDs this depends on
}

export const TOOLS: Record<string, Tool> = {
  zsh: {
    id: 'zsh',
    name: 'Zsh',
    description: 'Modern shell with better scripting and autocompletion',
    changes: ['Installs zsh via package manager', 'Sets zsh as default shell'],
    critical: true,
    category: 'core',
    minimal: true,
  },
  'oh-my-zsh': {
    id: 'oh-my-zsh',
    name: 'Oh My Zsh',
    description: 'Framework for managing zsh configuration',
    changes: ['Installs to ~/.oh-my-zsh', 'Creates initial ~/.zshrc'],
    critical: true,
    category: 'core',
    minimal: true,
    dependencies: ['zsh'],
  },
  antigen: {
    id: 'antigen',
    name: 'Antigen',
    description: 'Plugin manager for zsh',
    changes: ['Downloads to ~/antigen.zsh', 'Enables plugin management'],
    critical: true,
    category: 'core',
    minimal: true,
    dependencies: ['zsh', 'oh-my-zsh'],
  },
  fonts: {
    id: 'fonts',
    name: 'FiraCode Nerd Font',
    description: 'Programming font with ligatures and icons',
    changes: ['Installs FiraCode Nerd Font', 'Required for icons in terminal'],
    critical: false,
    category: 'font',
    minimal: false,
  },
  fzf: {
    id: 'fzf',
    name: 'fzf',
    description: 'Fuzzy finder for files, history, and more',
    changes: ['Installs fzf binary', 'Enables Ctrl+R history search', 'Adds key bindings'],
    critical: false,
    category: 'cli',
    minimal: true,
  },
  eza: {
    id: 'eza',
    name: 'eza',
    description: 'Modern replacement for ls with icons and git status',
    changes: ['Installs eza binary', 'Adds lsx alias'],
    critical: false,
    category: 'cli',
    minimal: true,
  },
  carapace: {
    id: 'carapace',
    name: 'Carapace',
    description: 'Multi-shell completion generator',
    changes: ['Installs carapace binary', 'Enables completions for 300+ commands'],
    critical: false,
    category: 'cli',
    minimal: false,
  },
  asdf: {
    id: 'asdf',
    name: 'asdf',
    description: 'Version manager for multiple runtimes (Node, Python, etc)',
    changes: ['Installs to ~/.asdf', 'Adds shell integration'],
    critical: true,
    category: 'manager',
    minimal: true,
  },
  nodejs: {
    id: 'nodejs',
    name: 'Node.js LTS',
    description: 'JavaScript runtime (latest LTS version)',
    changes: ['Installs via asdf', 'Sets as global default'],
    critical: false,
    category: 'manager',
    minimal: true,
    dependencies: ['asdf'],
  },
  tmux: {
    id: 'tmux',
    name: 'tmux',
    description: 'Terminal multiplexer for split panes and sessions',
    changes: ['Installs tmux via package manager', 'Creates ~/.tmux.conf'],
    critical: false,
    category: 'cli',
    minimal: true,
  },
  tpm: {
    id: 'tpm',
    name: 'TPM (Tmux Plugin Manager)',
    description: 'Plugin manager for tmux',
    changes: ['Installs to ~/.tmux/plugins/tpm', 'Enables tmux plugins'],
    critical: false,
    category: 'manager',
    minimal: true,
    dependencies: ['tmux'],
  },
};

export const TOOL_ORDER = [
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
] as const;

/**
 * Get tool prompt info for interactive mode
 */
export function getToolPromptInfo(toolId: string): ToolPromptInfo {
  const tool = TOOLS[toolId];
  if (!tool) {
    throw new Error(`Unknown tool: ${toolId}`);
  }
  return {
    name: tool.name,
    description: tool.description,
    changes: tool.changes,
    critical: tool.critical,
  };
}

/**
 * Filter tools based on options
 */
export function filterTools(options: {
  tools?: string[];
  exclude?: string[];
  minimal?: boolean;
}): string[] {
  let toolIds = [...TOOL_ORDER];

  // Filter by --tools flag
  if (options.tools && options.tools.length > 0) {
    const requestedTools = new Set(options.tools.map((t) => t.toLowerCase()));
    toolIds = toolIds.filter((id) => requestedTools.has(id));

    // Add dependencies
    const withDeps = new Set<string>();
    for (const id of toolIds) {
      addWithDependencies(id, withDeps);
    }
    toolIds = TOOL_ORDER.filter((id) => withDeps.has(id));
  }

  // Filter by --minimal flag
  if (options.minimal) {
    toolIds = toolIds.filter((id) => TOOLS[id].minimal);
  }

  // Filter by --exclude flag
  if (options.exclude && options.exclude.length > 0) {
    const excludeSet = new Set(options.exclude.map((t) => t.toLowerCase()));
    toolIds = toolIds.filter((id) => !excludeSet.has(id));
  }

  return toolIds;
}

function addWithDependencies(toolId: string, result: Set<string>) {
  const tool = TOOLS[toolId];
  if (!tool) return;

  // Add dependencies first
  for (const dep of tool.dependencies || []) {
    addWithDependencies(dep, result);
  }

  result.add(toolId);
}

/**
 * Parse comma-separated tool list
 */
export function parseToolList(input: string): string[] {
  return input
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);
}

/**
 * Validate tool IDs
 */
export function validateToolIds(toolIds: string[]): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const id of toolIds) {
    if (TOOLS[id]) {
      valid.push(id);
    } else {
      invalid.push(id);
    }
  }

  return { valid, invalid };
}

/**
 * Get list of all tool IDs
 */
export function getAllToolIds(): string[] {
  return [...TOOL_ORDER];
}
