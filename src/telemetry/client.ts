/**
 * Telemetry client for anonymous usage statistics
 *
 * All data is:
 * - Anonymous (no PII, hashed identifiers)
 * - Opt-out via --no-telemetry flag
 * - Stored in Cloudflare D1
 */

import { platform } from '../utils/platform';

const TELEMETRY_ENDPOINT = 'https://shell.ocodista.com/api/telemetry';
const CLI_VERSION = '1.0.0';

export interface TelemetryPayload {
  sessionHash: string;
  os: string;
  osVersion: string;
  arch: string;
  cliVersion: string;
  interactive: boolean;
  minimal: boolean;
  status: 'started' | 'completed' | 'failed' | 'cancelled';
  durationMs?: number;
  tools: ToolResult[];
}

export interface ToolResult {
  toolId: string;
  status: 'installed' | 'skipped' | 'failed';
  durationMs?: number;
  errorMessage?: string;
}

/**
 * Generate an anonymous session hash
 * Uses platform info + random component, not tied to any user identity
 */
function generateSessionHash(): string {
  const data = `${platform.current}-${platform.arch}-${Date.now()}-${Math.random()}`;
  // Simple hash function (FNV-1a)
  let hash = 2166136261;
  for (let i = 0; i < data.length; i++) {
    hash ^= data.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Get OS version string
 */
async function getOsVersion(): Promise<string> {
  try {
    if (platform.isMac()) {
      const result = Bun.spawnSync(['sw_vers', '-productVersion']);
      if (result.success) {
        return new TextDecoder().decode(result.stdout).trim();
      }
    } else if (platform.isLinux()) {
      // Try to read /etc/os-release
      try {
        const file = Bun.file('/etc/os-release');
        const content = await file.text();
        const match = content.match(/PRETTY_NAME="([^"]+)"/);
        if (match) return match[1];
        const idMatch = content.match(/^ID=(.+)$/m);
        const versionMatch = content.match(/^VERSION_ID="?([^"\n]+)"?$/m);
        if (idMatch) {
          return versionMatch ? `${idMatch[1]} ${versionMatch[1]}` : idMatch[1];
        }
      } catch {
        // Fall through
      }
    }
  } catch {
    // Ignore errors
  }
  return 'unknown';
}

/**
 * Telemetry collector class
 */
export class TelemetryCollector {
  private sessionHash: string;
  private startTime: number;
  private tools: ToolResult[] = [];
  private enabled: boolean;
  private osVersion: string = 'unknown';
  private interactive: boolean;
  private minimal: boolean;

  constructor(options: { enabled?: boolean; interactive?: boolean; minimal?: boolean } = {}) {
    this.enabled = options.enabled ?? true;
    this.interactive = options.interactive ?? false;
    this.minimal = options.minimal ?? false;
    this.sessionHash = generateSessionHash();
    this.startTime = Date.now();
  }

  /**
   * Initialize async data
   */
  async init(): Promise<void> {
    if (!this.enabled) return;
    this.osVersion = await getOsVersion();
  }

  /**
   * Record tool installation result
   */
  recordTool(
    toolId: string,
    status: 'installed' | 'skipped' | 'failed',
    durationMs?: number,
    errorMessage?: string
  ): void {
    if (!this.enabled) return;
    this.tools.push({ toolId, status, durationMs, errorMessage });
  }

  /**
   * Get current duration in milliseconds
   */
  getDurationMs(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Build the telemetry payload
   */
  private buildPayload(status: TelemetryPayload['status']): TelemetryPayload {
    return {
      sessionHash: this.sessionHash,
      os: platform.current,
      osVersion: this.osVersion,
      arch: platform.arch,
      cliVersion: CLI_VERSION,
      interactive: this.interactive,
      minimal: this.minimal,
      status,
      durationMs: this.getDurationMs(),
      tools: this.tools,
    };
  }

  /**
   * Send telemetry event (fire and forget)
   */
  async send(status: TelemetryPayload['status']): Promise<void> {
    if (!this.enabled) return;

    const payload = this.buildPayload(status);

    try {
      // Fire and forget - don't block installation
      fetch(TELEMETRY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {
        // Silently ignore network errors
      });
    } catch {
      // Silently ignore any errors
    }
  }

  /**
   * Get summary of collected data (for debugging/transparency)
   */
  getSummary(): { installed: number; skipped: number; failed: number } {
    return {
      installed: this.tools.filter((t) => t.status === 'installed').length,
      skipped: this.tools.filter((t) => t.status === 'skipped').length,
      failed: this.tools.filter((t) => t.status === 'failed').length,
    };
  }
}

/**
 * Check if telemetry has been shown before
 * Uses a file in ~/.config/better-shell/
 */
export async function hasSeenTelemetryNotice(): Promise<boolean> {
  try {
    const configDir = `${platform.homeDir}/.config/better-shell`;
    const noticeFile = `${configDir}/.telemetry-notice-shown`;
    return await Bun.file(noticeFile).exists();
  } catch {
    return false;
  }
}

/**
 * Mark telemetry notice as shown
 */
export async function markTelemetryNoticeShown(): Promise<void> {
  try {
    const configDir = `${platform.homeDir}/.config/better-shell`;
    const noticeFile = `${configDir}/.telemetry-notice-shown`;

    // Create config directory if needed
    await Bun.spawn(['mkdir', '-p', configDir]).exited;

    // Write marker file
    await Bun.write(noticeFile, new Date().toISOString());
  } catch {
    // Ignore errors
  }
}

/**
 * Check if telemetry is disabled via environment variable
 */
export function isTelemetryDisabledByEnv(): boolean {
  const env = process.env.BETTER_SHELL_TELEMETRY;
  return env === '0' || env === 'false' || env === 'off';
}
