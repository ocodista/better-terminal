/**
 * Interactive prompt utilities for CLI
 */

import { colors, logger } from './logger';

export type PromptChoice = 'yes' | 'no' | 'all' | 'quit';

export interface ToolPromptInfo {
  name: string;
  description: string;
  changes: string[];
  critical?: boolean;
}

/**
 * Check if running in a TTY (interactive terminal)
 */
export const isTTY = (): boolean => {
  return process.stdin.isTTY === true && process.stdout.isTTY === true;
};

/**
 * Read a single keypress from stdin
 */
const readKeypress = async (): Promise<string> => {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;

    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const onData = (key: string) => {
      stdin.setRawMode?.(wasRaw ?? false);
      stdin.pause();
      stdin.removeListener('data', onData);
      resolve(key.toLowerCase());
    };

    stdin.once('data', onData);
  });
};

/**
 * Prompt user with [Y]es / [N]o / [A]ll / [Q]uit options
 */
export const promptInstall = async (tool: ToolPromptInfo): Promise<PromptChoice> => {
  // If not a TTY, default to yes (non-interactive mode)
  if (!isTTY()) {
    return 'yes';
  }

  console.log('');
  console.log(`${colors.bright}${colors.cyan}┌─ ${tool.name}${colors.reset}`);
  console.log(`${colors.dim}│${colors.reset} ${tool.description}`);

  if (tool.changes.length > 0) {
    console.log(`${colors.dim}│${colors.reset}`);
    console.log(`${colors.dim}│${colors.reset} ${colors.yellow}Changes:${colors.reset}`);
    for (const change of tool.changes) {
      console.log(`${colors.dim}│${colors.reset}   • ${change}`);
    }
  }

  if (tool.critical) {
    console.log(`${colors.dim}│${colors.reset}`);
    console.log(`${colors.dim}│${colors.reset} ${colors.red}⚠ Required for installation${colors.reset}`);
  }

  console.log(`${colors.dim}└─${colors.reset}`);
  console.log('');

  process.stdout.write(
    `${colors.cyan}?${colors.reset} Install ${tool.name}? ` +
      `[${colors.green}Y${colors.reset}]es / ` +
      `[${colors.red}N${colors.reset}]o / ` +
      `[${colors.blue}A${colors.reset}]ll / ` +
      `[${colors.yellow}Q${colors.reset}]uit: `
  );

  while (true) {
    const key = await readKeypress();

    // Handle Ctrl+C
    if (key === '\u0003') {
      console.log('');
      return 'quit';
    }

    switch (key) {
      case 'y':
      case '\r':
      case '\n':
        console.log(`${colors.green}Yes${colors.reset}`);
        return 'yes';
      case 'n':
        console.log(`${colors.red}No${colors.reset}`);
        return 'no';
      case 'a':
        console.log(`${colors.blue}All${colors.reset}`);
        return 'all';
      case 'q':
        console.log(`${colors.yellow}Quit${colors.reset}`);
        return 'quit';
      default:
        // Invalid key, continue waiting
        break;
    }
  }
};

/**
 * Display a progress bar
 */
export const progressBar = {
  current: 0,
  total: 0,
  width: 30,

  start: (total: number, label?: string) => {
    progressBar.current = 0;
    progressBar.total = total;
    progressBar.render(label);
  },

  update: (current: number, label?: string) => {
    progressBar.current = current;
    progressBar.render(label);
  },

  increment: (label?: string) => {
    progressBar.current++;
    progressBar.render(label);
  },

  render: (label?: string) => {
    if (!isTTY()) return;

    const { current, total, width } = progressBar;
    const percent = Math.min(current / total, 1);
    const filled = Math.round(width * percent);
    const empty = width - filled;

    const bar = `${colors.green}${'█'.repeat(filled)}${colors.dim}${'░'.repeat(empty)}${colors.reset}`;
    const percentText = `${Math.round(percent * 100)}%`;
    const countText = `${current}/${total}`;
    const labelText = label ? ` ${colors.dim}${label}${colors.reset}` : '';

    process.stdout.write(`\r${bar} ${percentText} (${countText})${labelText}  `);
  },

  finish: () => {
    if (isTTY()) {
      console.log('');
    }
  },
};

/**
 * Interactive installer state machine
 */
export class InteractiveInstaller {
  private installAll = false;
  private skippedTools: string[] = [];

  /**
   * Ask whether to install a tool
   * Returns true if should install, false if should skip
   * Throws if user wants to quit
   */
  async shouldInstall(tool: ToolPromptInfo): Promise<boolean> {
    if (this.installAll) {
      logger.step(`Installing ${tool.name}...`);
      return true;
    }

    const choice = await promptInstall(tool);

    switch (choice) {
      case 'yes':
        return true;
      case 'no':
        this.skippedTools.push(tool.name);
        logger.dim(`Skipping ${tool.name}`);
        return false;
      case 'all':
        this.installAll = true;
        return true;
      case 'quit':
        throw new InteractiveQuitError();
    }
  }

  getSkippedTools(): string[] {
    return [...this.skippedTools];
  }
}

/**
 * Error thrown when user quits interactive installation
 */
export class InteractiveQuitError extends Error {
  constructor() {
    super('Installation cancelled by user');
    this.name = 'InteractiveQuitError';
  }
}
