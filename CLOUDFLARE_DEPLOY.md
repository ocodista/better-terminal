# Deploy with Wrangler

Deploy the `shell.ocodista.com` redirect using Cloudflare Workers and Wrangler CLI.

## Setup

### 1. Install Wrangler

```bash
npm install -g wrangler
# or
bun add -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

This opens your browser to authenticate.

### 3. Add DNS Record (One-time)

In Cloudflare dashboard:
- Go to **DNS** for `ocodista.com`
- Add an **A record** or **AAAA record**:
  - Name: `shell`
  - IPv4: `192.0.2.1` (dummy IP, will be replaced by Worker route)
  - Proxy: **On** (orange cloud)

Or use Wrangler:
```bash
# This will be handled by the Worker route, so just ensure the subdomain exists
```

### 4. Deploy

```bash
wrangler deploy --env production
```

That's it! The worker will deploy and bind to `shell.ocodista.com`.

## Test

```bash
# Test redirect
curl -I https://shell.ocodista.com/install.sh

# Test install
curl -fsSL https://shell.ocodista.com/install.sh | head -5

# Test root
curl https://shell.ocodista.com/
```

## Development

Test locally:

```bash
wrangler dev
```

Then visit `http://localhost:8787/install.sh`

## Update Worker

Just commit changes and redeploy:

```bash
git add worker.js wrangler.toml
git commit -m "Update worker"
wrangler deploy --env production
```

## Troubleshooting

**"Route already exists" error:**
- Go to Cloudflare dashboard → Workers & Pages → better-shell
- Check Routes tab
- Remove duplicate routes if any

**404 on shell.ocodista.com:**
- Verify DNS record exists
- Check Worker route is active
- Wait 1-2 minutes for propagation

**Worker not updating:**
```bash
wrangler deploy --env production --force
```
