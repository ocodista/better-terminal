/**
 * Update command - updates already installed tools
 */

import { logger } from '../utils/logger';
import { platform } from '../utils/platform';
import { shell } from '../utils/shell';
import { TOOLS, TOOL_ORDER, parseToolList, validateToolIds } from '../tools/registry';

export interface UpdateOptions {
  tools?: string;
  dryRun?: boolean;
}

interface UpdateResult {
  toolId: string;
  status: 'updated' | 'skipped' | 'failed' | 'not-installed';
  message?: string;
}

/**
 * Check if a tool is installed
 */
async function isToolInstalled(toolId: string): Promise<boolean> {
  switch (toolId) {
    case 'zsh':
      return shell.commandExists('zsh');
    case 'oh-my-zsh':
      return Bun.file(`${platform.homeDir}/.oh-my-zsh/oh-my-zsh.sh`).exists();
    case 'antigen':
      return Bun.file(`${platform.homeDir}/antigen.zsh`).exists();
    case 'fonts':
      // Fonts are hard to check, assume installed if system has fonts
      return true;
    case 'fzf':
      return shell.commandExists('fzf');
    case 'eza':
      return shell.commandExists('eza');
    case 'carapace':
      return shell.commandExists('carapace');
    case 'asdf':
      return Bun.file(`${platform.homeDir}/.asdf/asdf.sh`).exists();
    case 'nodejs':
      return shell.commandExists('node');
    case 'tmux':
      return shell.commandExists('tmux');
    case 'tpm':
      return Bun.file(`${platform.homeDir}/.tmux/plugins/tpm/tpm`).exists();
    default:
      return false;
  }
}

/**
 * Update a specific tool
 */
async function updateTool(toolId: string, dryRun: boolean): Promise<UpdateResult> {
  const tool = TOOLS[toolId];
  if (!tool) {
    return { toolId, status: 'failed', message: 'Unknown tool' };
  }

  // Check if installed
  if (!(await isToolInstalled(toolId))) {
    return { toolId, status: 'not-installed', message: 'Not installed' };
  }

  if (dryRun) {
    logger.dim(`  Would update: ${tool.name}`);
    return { toolId, status: 'updated', message: 'Dry run' };
  }

  logger.step(`Updating ${tool.name}...`);

  try {
    switch (toolId) {
      case 'zsh': {
        // Update via package manager
        if (platform.isMac()) {
          const result = await shell.exec('brew upgrade zsh', { silent: false, ignoreError: true });
          if (!result.success && !result.stderr?.includes('already installed')) {
            return { toolId, status: 'failed', message: result.stderr };
          }
        } else if (platform.isLinux()) {
          const pm = platform.packageManager;
          if (pm === 'apt') {
            await shell.exec('sudo apt update && sudo apt upgrade -y zsh', { silent: false });
          } else if (pm === 'dnf') {
            await shell.exec('sudo dnf upgrade -y zsh', { silent: false });
          } else if (pm === 'pacman') {
            await shell.exec('sudo pacman -Syu --noconfirm zsh', { silent: false });
          }
        }
        logger.success(`${tool.name} updated`);
        return { toolId, status: 'updated' };
      }

      case 'oh-my-zsh': {
        const omzDir = `${platform.homeDir}/.oh-my-zsh`;
        const result = await shell.exec('git pull --rebase', { cwd: omzDir, silent: false });
        if (result.success) {
          logger.success(`${tool.name} updated`);
          return { toolId, status: 'updated' };
        }
        return { toolId, status: 'failed', message: result.stderr };
      }

      case 'antigen': {
        const antigenUrl = 'https://git.io/antigen';
        const result = await shell.download(antigenUrl, `${platform.homeDir}/antigen.zsh`);
        if (result) {
          logger.success(`${tool.name} updated`);
          return { toolId, status: 'updated' };
        }
        return { toolId, status: 'failed', message: 'Download failed' };
      }

      case 'fzf': {
        if (platform.isMac()) {
          await shell.exec('brew upgrade fzf', { silent: false, ignoreError: true });
        } else {
          const fzfDir = `${platform.homeDir}/.fzf`;
          await shell.exec('git pull', { cwd: fzfDir, silent: false });
          await shell.exec(`${fzfDir}/install --all --no-bash --no-fish`, { silent: false });
        }
        logger.success(`${tool.name} updated`);
        return { toolId, status: 'updated' };
      }

      case 'eza': {
        if (platform.isMac()) {
          await shell.exec('brew upgrade eza', { silent: false, ignoreError: true });
        } else {
          // For Linux, reinstall from GitHub
          const result = await shell.exec('eza --version', { silent: true });
          logger.dim(`Current: ${result.stdout?.trim()}`);
          logger.dim('To update eza on Linux, reinstall using the install command');
          return { toolId, status: 'skipped', message: 'Manual update required on Linux' };
        }
        logger.success(`${tool.name} updated`);
        return { toolId, status: 'updated' };
      }

      case 'carapace': {
        if (platform.isMac()) {
          await shell.exec('brew upgrade carapace', { silent: false, ignoreError: true });
        } else {
          logger.dim('To update carapace on Linux, reinstall using the install command');
          return { toolId, status: 'skipped', message: 'Manual update required on Linux' };
        }
        logger.success(`${tool.name} updated`);
        return { toolId, status: 'updated' };
      }

      case 'asdf': {
        const asdfDir = `${platform.homeDir}/.asdf`;
        const result = await shell.exec('git fetch --tags && git checkout $(git describe --abbrev=0 --tags)', {
          cwd: asdfDir,
          silent: false,
        });
        if (result.success) {
          logger.success(`${tool.name} updated`);
          return { toolId, status: 'updated' };
        }
        return { toolId, status: 'failed', message: result.stderr };
      }

      case 'nodejs': {
        // Update to latest LTS via asdf
        const asdfPath = `${platform.homeDir}/.asdf`;
        const env = {
          ...process.env,
          ASDF_DIR: asdfPath,
          ASDF_DATA_DIR: asdfPath,
          PATH: `${asdfPath}/bin:${asdfPath}/shims:${process.env.PATH}`,
        };

        // Get current version
        const currentResult = await shell.exec('asdf current nodejs', { env, silent: true });
        const currentVersion = currentResult.stdout?.match(/(\d+\.\d+\.\d+)/)?.[1];
        if (currentVersion) {
          logger.dim(`Current: v${currentVersion}`);
        }

        // Install latest LTS
        const result = await shell.exec('asdf install nodejs latest:lts && asdf global nodejs latest:lts', {
          env,
          silent: false,
        });
        if (result.success) {
          logger.success(`${tool.name} updated`);
          return { toolId, status: 'updated' };
        }
        return { toolId, status: 'failed', message: result.stderr };
      }

      case 'tmux': {
        if (platform.isMac()) {
          await shell.exec('brew upgrade tmux', { silent: false, ignoreError: true });
        } else if (platform.isLinux()) {
          const pm = platform.packageManager;
          if (pm === 'apt') {
            await shell.exec('sudo apt update && sudo apt upgrade -y tmux', { silent: false });
          } else if (pm === 'dnf') {
            await shell.exec('sudo dnf upgrade -y tmux', { silent: false });
          } else if (pm === 'pacman') {
            await shell.exec('sudo pacman -Syu --noconfirm tmux', { silent: false });
          }
        }
        logger.success(`${tool.name} updated`);
        return { toolId, status: 'updated' };
      }

      case 'tpm': {
        const tpmDir = `${platform.homeDir}/.tmux/plugins/tpm`;
        const result = await shell.exec('git pull', { cwd: tpmDir, silent: false });
        if (result.success) {
          logger.success(`${tool.name} updated`);
          return { toolId, status: 'updated' };
        }
        return { toolId, status: 'failed', message: result.stderr };
      }

      case 'fonts': {
        logger.dim('Fonts should be updated via system package manager');
        return { toolId, status: 'skipped', message: 'Update via system package manager' };
      }

      default:
        return { toolId, status: 'skipped', message: 'No update mechanism' };
    }
  } catch (error) {
    return { toolId, status: 'failed', message: String(error) };
  }
}

export const update = async (options: UpdateOptions = {}): Promise<boolean> => {
  const { dryRun = false } = options;

  logger.header('🔄 Updating Tools');

  if (dryRun) {
    logger.warn('DRY RUN MODE - No changes will be made');
    logger.newline();
  }

  // Platform info
  logger.info(`Platform: ${platform.current} (${platform.arch})`);
  logger.newline();

  // Parse tool selection
  let toolIds: string[] = [...TOOL_ORDER];

  if (options.tools) {
    const requestedTools = parseToolList(options.tools);
    const { valid, invalid } = validateToolIds(requestedTools);

    if (invalid.length > 0) {
      logger.error(`Unknown tools: ${invalid.join(', ')}`);
      logger.info(`Available tools: ${TOOL_ORDER.join(', ')}`);
      return false;
    }

    toolIds = valid;
  }

  // Update each tool
  const results: UpdateResult[] = [];

  for (const toolId of toolIds) {
    const result = await updateTool(toolId, dryRun);
    results.push(result);
  }

  // Summary
  logger.newline();
  logger.header('Summary');

  const updated = results.filter((r) => r.status === 'updated');
  const skipped = results.filter((r) => r.status === 'skipped');
  const failed = results.filter((r) => r.status === 'failed');
  const notInstalled = results.filter((r) => r.status === 'not-installed');

  if (updated.length > 0) {
    logger.success(`Updated: ${updated.map((r) => TOOLS[r.toolId].name).join(', ')}`);
  }
  if (skipped.length > 0) {
    logger.dim(`Skipped: ${skipped.map((r) => TOOLS[r.toolId].name).join(', ')}`);
  }
  if (notInstalled.length > 0) {
    logger.dim(`Not installed: ${notInstalled.map((r) => TOOLS[r.toolId].name).join(', ')}`);
  }
  if (failed.length > 0) {
    logger.warn(`Failed: ${failed.map((r) => TOOLS[r.toolId].name).join(', ')}`);
  }

  logger.newline();

  return failed.length === 0;
};
