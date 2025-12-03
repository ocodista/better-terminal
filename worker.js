/**
 * Cloudflare Worker for better-shell
 * - Serves install scripts
 * - Collects anonymous telemetry
 * - Displays stats dashboard
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS headers for API endpoints
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // API: Receive telemetry data
    if (url.pathname === '/api/telemetry' && request.method === 'POST') {
      return handleTelemetry(request, env, corsHeaders);
    }

    // API: Get aggregated stats
    if (url.pathname === '/api/stats') {
      return handleStats(env, corsHeaders);
    }

    // Stats dashboard page
    if (url.pathname === '/stats') {
      return serveDashboard();
    }

    // Serve install.sh (bash)
    if (url.pathname === '/install.sh') {
      const scriptUrl = 'https://raw.githubusercontent.com/ocodista/better-shell/main/install.sh';
      const response = await fetch(scriptUrl);
      return new Response(response.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    // Serve install.ps1 (PowerShell)
    if (url.pathname === '/install.ps1') {
      const scriptUrl = 'https://raw.githubusercontent.com/ocodista/better-shell/main/install.ps1';
      const response = await fetch(scriptUrl);
      return new Response(response.body, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    // Root path - show simple landing page
    if (url.pathname === '/') {
      return serveLandingPage();
    }

    // Everything else redirects to GitHub
    return Response.redirect('https://github.com/ocodista/better-shell', 302);
  },
};

/**
 * Handle incoming telemetry data
 */
async function handleTelemetry(request, env, corsHeaders) {
  try {
    const payload = await request.json();

    // Validate required fields
    if (!payload.sessionHash || !payload.os || !payload.arch || !payload.status) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if D1 is available
    if (!env.DB) {
      // D1 not configured, just acknowledge
      return new Response(JSON.stringify({ ok: true, stored: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert installation record
    const installResult = await env.DB.prepare(
      `INSERT INTO installations
       (session_hash, os, os_version, arch, cli_version, interactive, minimal, status, duration_ms, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        payload.sessionHash,
        payload.os,
        payload.osVersion || 'unknown',
        payload.arch,
        payload.cliVersion || '1.0.0',
        payload.interactive ? 1 : 0,
        payload.minimal ? 1 : 0,
        payload.status,
        payload.durationMs || null,
        payload.status !== 'started' ? new Date().toISOString() : null
      )
      .run();

    const installationId = installResult.meta.last_row_id;

    // Insert tool results
    if (payload.tools && Array.isArray(payload.tools)) {
      for (const tool of payload.tools) {
        await env.DB.prepare(
          `INSERT INTO tool_results (installation_id, tool_id, status, duration_ms, error_message)
           VALUES (?, ?, ?, ?, ?)`
        )
          .bind(
            installationId,
            tool.toolId,
            tool.status,
            tool.durationMs || null,
            tool.errorMessage || null
          )
          .run();
      }
    }

    return new Response(JSON.stringify({ ok: true, id: installationId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Telemetry error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Get aggregated statistics
 */
async function handleStats(env, corsHeaders) {
  try {
    // Check if D1 is available
    if (!env.DB) {
      return new Response(
        JSON.stringify({
          error: 'Database not configured',
          totalInstalls: 0,
          osDistribution: {},
          toolStats: {},
          recentInstalls: [],
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Total installations
    const totalResult = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM installations`
    ).first();

    // Completed installations
    const completedResult = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM installations WHERE status = 'completed'`
    ).first();

    // OS distribution
    const osResult = await env.DB.prepare(
      `SELECT os, COUNT(*) as count FROM installations GROUP BY os ORDER BY count DESC`
    ).all();

    // Tool success rates
    const toolResult = await env.DB.prepare(
      `SELECT
         tool_id,
         COUNT(*) as total,
         SUM(CASE WHEN status = 'installed' THEN 1 ELSE 0 END) as installed,
         SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
       FROM tool_results
       GROUP BY tool_id
       ORDER BY total DESC`
    ).all();

    // Installations over time (last 30 days)
    const timeResult = await env.DB.prepare(
      `SELECT
         date(started_at) as day,
         COUNT(*) as count
       FROM installations
       WHERE started_at >= datetime('now', '-30 days')
       GROUP BY date(started_at)
       ORDER BY day ASC`
    ).all();

    // Average duration for successful installs
    const durationResult = await env.DB.prepare(
      `SELECT AVG(duration_ms) as avg_duration
       FROM installations
       WHERE status = 'completed' AND duration_ms IS NOT NULL`
    ).first();

    const stats = {
      totalInstalls: totalResult?.count || 0,
      completedInstalls: completedResult?.count || 0,
      successRate:
        totalResult?.count > 0
          ? Math.round((completedResult?.count / totalResult?.count) * 100)
          : 0,
      avgDurationMs: Math.round(durationResult?.avg_duration || 0),
      osDistribution: Object.fromEntries(
        (osResult?.results || []).map((r) => [r.os, r.count])
      ),
      toolStats: Object.fromEntries(
        (toolResult?.results || []).map((r) => [
          r.tool_id,
          {
            total: r.total,
            installed: r.installed,
            skipped: r.skipped,
            failed: r.failed,
            successRate: r.total > 0 ? Math.round((r.installed / r.total) * 100) : 0,
          },
        ])
      ),
      installsOverTime: (timeResult?.results || []).map((r) => ({
        day: r.day,
        count: r.count,
      })),
    };

    return new Response(JSON.stringify(stats), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Serve the stats dashboard
 */
function serveDashboard() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>better-shell stats</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f0f0f;
            color: #e0e0e0;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        header {
            text-align: center;
            margin-bottom: 40px;
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            background: linear-gradient(135deg, #00d4aa, #7c3aed);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .subtitle {
            color: #888;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .stat-card {
            background: #1a1a1a;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            border: 1px solid #2a2a2a;
        }
        .stat-value {
            font-size: 2.5rem;
            font-weight: 700;
            color: #00d4aa;
            margin-bottom: 8px;
        }
        .stat-label {
            color: #888;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .chart-card {
            background: #1a1a1a;
            border-radius: 12px;
            padding: 24px;
            border: 1px solid #2a2a2a;
        }
        .chart-title {
            font-size: 1.2rem;
            margin-bottom: 20px;
            color: #fff;
        }
        .chart-container {
            position: relative;
            height: 250px;
        }
        .tool-list {
            background: #1a1a1a;
            border-radius: 12px;
            padding: 24px;
            border: 1px solid #2a2a2a;
        }
        .tool-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #2a2a2a;
        }
        .tool-item:last-child {
            border-bottom: none;
        }
        .tool-name {
            font-weight: 500;
        }
        .tool-bar {
            flex: 1;
            margin: 0 20px;
            height: 8px;
            background: #2a2a2a;
            border-radius: 4px;
            overflow: hidden;
        }
        .tool-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #00d4aa, #7c3aed);
            border-radius: 4px;
        }
        .tool-percent {
            font-size: 0.9rem;
            color: #888;
            min-width: 50px;
            text-align: right;
        }
        .loading {
            text-align: center;
            padding: 40px;
            color: #888;
        }
        .error {
            text-align: center;
            padding: 40px;
            color: #ff6b6b;
        }
        footer {
            text-align: center;
            margin-top: 40px;
            color: #666;
        }
        footer a {
            color: #00d4aa;
            text-decoration: none;
        }
        footer a:hover {
            text-decoration: underline;
        }
        @media (max-width: 600px) {
            .charts-grid {
                grid-template-columns: 1fr;
            }
            .chart-container {
                height: 200px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>better-shell</h1>
            <p class="subtitle">Anonymous usage statistics</p>
        </header>

        <div id="content">
            <div class="loading">Loading stats...</div>
        </div>

        <footer>
            <p>
                <a href="/">← Back to home</a> ·
                <a href="https://github.com/ocodista/better-shell">GitHub</a>
            </p>
            <p style="margin-top: 10px; font-size: 0.85rem;">
                All data is anonymous. No personal information is collected.
            </p>
        </footer>
    </div>

    <script>
        async function loadStats() {
            const content = document.getElementById('content');

            try {
                const response = await fetch('/api/stats');
                const stats = await response.json();

                if (stats.error) {
                    content.innerHTML = '<div class="error">No data available yet</div>';
                    return;
                }

                renderStats(stats);
            } catch (error) {
                content.innerHTML = '<div class="error">Failed to load stats</div>';
            }
        }

        function renderStats(stats) {
            const content = document.getElementById('content');

            // Format duration
            const avgDuration = stats.avgDurationMs > 0
                ? (stats.avgDurationMs / 1000 / 60).toFixed(1) + ' min'
                : 'N/A';

            content.innerHTML = \`
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">\${stats.totalInstalls.toLocaleString()}</div>
                        <div class="stat-label">Total Installs</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">\${stats.successRate}%</div>
                        <div class="stat-label">Success Rate</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">\${avgDuration}</div>
                        <div class="stat-label">Avg Duration</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">\${Object.keys(stats.osDistribution).length}</div>
                        <div class="stat-label">Platforms</div>
                    </div>
                </div>

                <div class="charts-grid">
                    <div class="chart-card">
                        <h3 class="chart-title">OS Distribution</h3>
                        <div class="chart-container">
                            <canvas id="osChart"></canvas>
                        </div>
                    </div>
                    <div class="chart-card">
                        <h3 class="chart-title">Installations Over Time</h3>
                        <div class="chart-container">
                            <canvas id="timeChart"></canvas>
                        </div>
                    </div>
                </div>

                <div class="tool-list">
                    <h3 class="chart-title">Tool Success Rates</h3>
                    <div id="toolList"></div>
                </div>
            \`;

            // OS Distribution Chart
            const osCtx = document.getElementById('osChart').getContext('2d');
            new Chart(osCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(stats.osDistribution),
                    datasets: [{
                        data: Object.values(stats.osDistribution),
                        backgroundColor: ['#00d4aa', '#7c3aed', '#ff6b6b', '#ffd93d'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: { color: '#888' }
                        }
                    }
                }
            });

            // Time Chart
            const timeCtx = document.getElementById('timeChart').getContext('2d');
            new Chart(timeCtx, {
                type: 'line',
                data: {
                    labels: stats.installsOverTime.map(d => d.day),
                    datasets: [{
                        label: 'Installations',
                        data: stats.installsOverTime.map(d => d.count),
                        borderColor: '#00d4aa',
                        backgroundColor: 'rgba(0, 212, 170, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: {
                            grid: { color: '#2a2a2a' },
                            ticks: { color: '#888' }
                        },
                        y: {
                            grid: { color: '#2a2a2a' },
                            ticks: { color: '#888' }
                        }
                    }
                }
            });

            // Tool List
            const toolList = document.getElementById('toolList');
            const toolHtml = Object.entries(stats.toolStats)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([name, data]) => \`
                    <div class="tool-item">
                        <span class="tool-name">\${name}</span>
                        <div class="tool-bar">
                            <div class="tool-bar-fill" style="width: \${data.successRate}%"></div>
                        </div>
                        <span class="tool-percent">\${data.successRate}%</span>
                    </div>
                \`).join('');
            toolList.innerHTML = toolHtml || '<p style="color: #888; text-align: center; padding: 20px;">No tool data yet</p>';
        }

        loadStats();
    </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/**
 * Serve the landing page
 */
function serveLandingPage() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>better-shell</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 100px auto;
            padding: 20px;
            line-height: 1.6;
        }
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Monaco', 'Courier New', monospace;
        }
        pre {
            background: #f4f4f4;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
        a {
            color: #0066cc;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        h3 {
            margin-top: 30px;
        }
        .links {
            margin-top: 30px;
        }
    </style>
</head>
<body>
    <h1>better-shell</h1>
    <p>One command to install a modern shell environment.</p>

    <h3>macOS / Linux</h3>
    <pre><code>curl -fsSL https://shell.ocodista.com/install.sh | bash</code></pre>

    <h3>Windows (PowerShell)</h3>
    <pre><code>irm https://shell.ocodista.com/install.ps1 | iex</code></pre>

    <div class="links">
        <p>
            <a href="https://github.com/ocodista/better-shell">View on GitHub</a> ·
            <a href="/stats">View Stats</a>
        </p>
    </div>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
