export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Redirect /install.sh to GitHub raw file
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

    // Root path - show simple landing page
    if (url.pathname === '/') {
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
    </style>
</head>
<body>
    <h1>better-shell</h1>
    <p>One command to install a modern shell environment.</p>

    <h2>Installation</h2>
    <pre><code>curl -fsSL https://shell.ocodista.com/install.sh | bash</code></pre>

    <p>
        <a href="https://github.com/ocodista/better-shell">View on GitHub</a>
    </p>
</body>
</html>`;
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Everything else redirects to GitHub
    return Response.redirect('https://github.com/ocodista/better-shell', 302);
  },
};
