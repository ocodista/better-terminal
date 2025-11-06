# Domain Setup Guide

To set up `shell.ocodista.com` to redirect to the install script:

## Option 1: Cloudflare Pages (Recommended)

1. **Create a Cloudflare Pages project**
   - Go to Cloudflare Pages
   - Create new project
   - Connect to this GitHub repo
   - Set custom domain: `shell.ocodista.com`

2. **Create `_redirects` file in repo root:**
```
/install.sh https://raw.githubusercontent.com/ocodista/better-shell/main/install.sh 200
/* https://github.com/ocodista/better-shell 302
```

## Option 2: Simple Redirect (DNS + Redirect Service)

1. **Add CNAME record:**
```
shell.ocodista.com → raw.githubusercontent.com
```

2. **Or use redirect.pizza / redirect.name:**
```
shell.ocodista.com → redirects to GitHub raw URL
```

## Option 3: Vercel/Netlify

1. **Deploy simple static site**
2. **Add `_redirects` file:**
```
/install.sh https://raw.githubusercontent.com/ocodista/better-shell/main/install.sh 200
/* https://github.com/ocodista/better-shell 302
```

## Verify It Works

```bash
curl -fsSL https://shell.ocodista.com/install.sh | head -5
```

Should output the install script.

## Fallback

If domain setup takes time, the GitHub raw URL still works:
```bash
curl -fsSL https://raw.githubusercontent.com/ocodista/better-shell/main/install.sh | bash
```
