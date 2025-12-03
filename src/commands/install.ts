/**
 * Main installation command
 */

import { logger } from '../utils/logger';
import { platform } from '../utils/platform';
import { shell } from '../utils/shell';
import { configWriter } from '../configs/writer';
import { installZsh, setZshAsDefault } from '../installers/zsh';
import { installOhMyZsh } from '../installers/oh-my-zsh';
import { installAntigen } from '../installers/antigen';
import { installFzf } from '../installers/fzf';
import { installAsdf, installNodeWithAsdf } from '../installers/asdf';
import { installTmux, installTpm } from '../installers/tmux';
import { installFiraCode } from '../installers/fonts';
import { installEza } from '../installers/eza';
import { installCarapace } from '../installers/carapace';
import {
  InteractiveInstaller,
  InteractiveQuitError,
  isTTY,
  progressBar,
} from '../utils/prompt';
import {
  TOOLS,
  TOOL_ORDER,
  filterTools,
  getToolPromptInfo,
  validateToolIds,
  parseToolList,
} from '../tools/registry';
import {
  TelemetryCollector,
  hasSeenTelemetryNotice,
  markTelemetryNoticeShown,
  isTelemetryDisabledByEnv,
} from '../telemetry/client';

export interface InstallOptions {
  skipBackup?: boolean;
  dryRun?: boolean;
  interactive?: boolean;
  minimal?: boolean;
  tools?: string;
  exclude?: string;
  noTelemetry?: boolean;
}

interface ToolInstaller {
  id: string;
  install: () => Promise<boolean>;
  critical: boolean;
}

const INSTALLERS: Record<string, () => Promise<boolean>> = {
  zsh: installZsh,
  'oh-my-zsh': installOhMyZsh,
  antigen: installAntigen,
  fonts: installFiraCode,
  fzf: installFzf,
  eza: installEza,
  carapace: installCarapace,
  asdf: installAsdf,
  nodejs: installNodeWithAsdf,
  tmux: installTmux,
  tpm: installTpm,
};

export const install = async (options: InstallOptions = {}): Promise<boolean> => {
  const { skipBackup = false, dryRun = false, interactive = false, noTelemetry = false } = options;

  logger.header('🚀 Better Terminal Installation');

  // Initialize telemetry
  const telemetryEnabled = !noTelemetry && !isTelemetryDisabledByEnv() && !dryRun;
  const telemetry = new TelemetryCollector({
    enabled: telemetryEnabled,
    interactive,
    minimal: options.minimal,
  });
  await telemetry.init();

  // Show telemetry notice on first run
  if (telemetryEnabled && !(await hasSeenTelemetryNotice())) {
    logger.dim('📊 Anonymous usage statistics help improve better-shell.');
    logger.dim('   No personal data is collected. Use --no-telemetry to opt out.');
    logger.dim('   View stats at: https://shell.ocodista.com/stats');
    logger.newline();
    await markTelemetryNoticeShown();
  }

  if (dryRun) {
    logger.warn('DRY RUN MODE - No changes will be made');
    logger.newline();
  }

  if (interactive && !isTTY()) {
    logger.warn('Interactive mode disabled (not a TTY)');
    logger.newline();
  }

  // Check if running as root
  if (shell.isRoot()) {
    logger.warn('Running as root. This may cause permission issues.');
    logger.info('Consider running without sudo/root privileges.');
    logger.newline();
  }

  // Platform info
  logger.info(`Platform: ${platform.current} (${platform.arch})`);
  logger.info(`Home: ${platform.homeDir}`);
  logger.newline();

  // Parse and validate tool selection
  const toolsToInstall = parseToolList(options.tools || '');
  const toolsToExclude = parseToolList(options.exclude || '');

  if (toolsToInstall.length > 0) {
    const { invalid } = validateToolIds(toolsToInstall);
    if (invalid.length > 0) {
      logger.error(`Unknown tools: ${invalid.join(', ')}`);
      logger.info(`Available tools: ${TOOL_ORDER.join(', ')}`);
      return false;
    }
  }

  if (toolsToExclude.length > 0) {
    const { invalid } = validateToolIds(toolsToExclude);
    if (invalid.length > 0) {
      logger.error(`Unknown tools to exclude: ${invalid.join(', ')}`);
      logger.info(`Available tools: ${TOOL_ORDER.join(', ')}`);
      return false;
    }
  }

  // Get filtered list of tools
  const selectedTools = filterTools({
    tools: toolsToInstall.length > 0 ? toolsToInstall : undefined,
    exclude: toolsToExclude.length > 0 ? toolsToExclude : undefined,
    minimal: options.minimal,
  });

  if (selectedTools.length === 0) {
    logger.error('No tools selected for installation');
    return false;
  }

  logger.info(`Tools to install: ${selectedTools.map((id) => TOOLS[id].name).join(', ')}`);
  logger.newline();

  if (dryRun) {
    logger.info('Installation steps that would be performed:');
    if (!skipBackup) {
      logger.dim('1. Backup existing configurations');
    }
    let step = skipBackup ? 1 : 2;
    for (const toolId of selectedTools) {
      logger.dim(`${step}. Install ${TOOLS[toolId].name}`);
      step++;
    }
    logger.dim(`${step}. Write configuration files`);
    step++;
    if (selectedTools.includes('zsh')) {
      logger.dim(`${step}. Set zsh as default shell`);
    }
    logger.newline();
    logger.info('Run without --dry-run to perform installation');
    return true;
  }

  // Initialize interactive installer
  const interactiveInstaller = interactive && isTTY() ? new InteractiveInstaller() : null;

  try {
    // Step 1: Backup
    if (!skipBackup) {
      logger.header('Step 1: Backup');
      const backupResult = await configWriter.backup(skipBackup);
      if (!backupResult.success) {
        logger.error('Backup failed. Aborting installation.');
        return false;
      }
      logger.newline();
    }

    // Initialize progress bar for interactive mode
    if (interactiveInstaller) {
      progressBar.start(selectedTools.length, 'Starting installation...');
    }

    // Install tools
    logger.header('Installing Tools');

    const installedTools: string[] = [];
    const failedTools: string[] = [];
    const skippedTools: string[] = [];

    for (let i = 0; i < selectedTools.length; i++) {
      const toolId = selectedTools[i];
      const tool = TOOLS[toolId];
      const installer = INSTALLERS[toolId];

      if (!installer) {
        logger.warn(`No installer found for ${tool.name}, skipping...`);
        skippedTools.push(toolId);
        continue;
      }

      // Interactive mode: ask before each tool
      if (interactiveInstaller) {
        progressBar.finish();
        const shouldInstall = await interactiveInstaller.shouldInstall(getToolPromptInfo(toolId));

        if (!shouldInstall) {
          if (tool.critical) {
            logger.error(`${tool.name} is required. Aborting installation.`);
            return false;
          }
          skippedTools.push(toolId);
          progressBar.start(selectedTools.length, `Skipped ${tool.name}`);
          progressBar.update(i + 1);
          continue;
        }
        progressBar.start(selectedTools.length, `Installing ${tool.name}...`);
        progressBar.update(i + 1);
      }

      // Run the installer
      const toolStartTime = Date.now();
      const success = await installer();
      const toolDuration = Date.now() - toolStartTime;

      if (!success) {
        telemetry.recordTool(toolId, 'failed', toolDuration);
        if (tool.critical) {
          logger.error(`Failed to install ${tool.name}. Aborting.`);
          await telemetry.send('failed');
          return false;
        }
        logger.warn(`Failed to install ${tool.name}, continuing...`);
        failedTools.push(toolId);
      } else {
        telemetry.recordTool(toolId, 'installed', toolDuration);
        installedTools.push(toolId);
      }
    }

    if (interactiveInstaller) {
      progressBar.finish();
      const interactiveSkipped = interactiveInstaller.getSkippedTools();
      for (const toolName of interactiveSkipped) {
        // Find tool ID by name
        const toolId = Object.keys(TOOLS).find((id) => TOOLS[id].name === toolName);
        if (toolId) {
          telemetry.recordTool(toolId, 'skipped');
        }
      }
      skippedTools.push(...interactiveSkipped);
    }

    // Record skipped tools from install loop
    for (const toolId of skippedTools) {
      if (!TOOLS[toolId]) continue; // Already recorded by name above
      telemetry.recordTool(toolId, 'skipped');
    }

    logger.newline();

    // Write configurations
    logger.header('Writing Configuration Files');

    if (!(await configWriter.writeConfigs())) {
      logger.error('Failed to write configuration files. Aborting.');
      return false;
    }

    logger.newline();

    // Set zsh as default if installed
    if (installedTools.includes('zsh') || selectedTools.includes('zsh')) {
      logger.header('Finalizing Installation');
      await setZshAsDefault();
      logger.newline();
    }

    // Success!
    logger.header('✨ Installation Complete!');

    logger.success('Your terminal is now supercharged!');
    logger.newline();

    // Summary
    if (installedTools.length > 0) {
      logger.info(`Installed: ${installedTools.map((id) => TOOLS[id].name).join(', ')}`);
    }
    if (skippedTools.length > 0) {
      logger.dim(`Skipped: ${skippedTools.map((id) => TOOLS[id]?.name || id).join(', ')}`);
    }
    if (failedTools.length > 0) {
      logger.warn(`Failed: ${failedTools.map((id) => TOOLS[id].name).join(', ')}`);
    }
    logger.newline();

    logger.info('Next steps:');
    logger.dim('1. Restart your terminal or run: exec zsh');
    logger.dim('2. Open tmux and run "prefix + I" to install tmux plugins');
    logger.dim('3. Verify Node.js installation: node --version');
    logger.dim('4. Configure your terminal to use FiraCode Nerd Font');
    logger.newline();

    logger.info('Installed features:');
    logger.dim('✓ Auto-suggestions (type and see suggestions)');
    logger.dim('✓ Syntax highlighting (colored commands)');
    logger.dim('✓ Blazingly fast search (Ctrl+R)');
    logger.dim('✓ Smart directory jumping (z <directory>)');
    logger.dim('✓ Modern ls with icons (lsx alias)');
    logger.dim('✓ Package version management (asdf)');
    logger.dim('✓ Terminal multiplexing (tmux)');
    logger.newline();

    // Send completion telemetry
    await telemetry.send('completed');

    return true;
  } catch (error) {
    if (error instanceof InteractiveQuitError) {
      logger.newline();
      logger.warn('Installation cancelled by user.');
      await telemetry.send('cancelled');
      return false;
    }
    throw error;
  }
};
