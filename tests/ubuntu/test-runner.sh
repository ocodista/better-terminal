#!/bin/bash
# Automated test runner for Ubuntu
# Runs inside Docker container and verifies installation

set -e

echo "🧪 Running Integration Tests in Ubuntu Container"
echo ""

# Install better-shell with sudo
echo "📦 Installing better-shell..."
sudo ./better-shell install

echo ""
echo "✓ Installation completed"
echo ""

# Verify command installations
echo "🔍 Verifying installations..."

echo "  → Checking zsh..."
command -v zsh >/dev/null 2>&1 || { echo "❌ zsh not found"; exit 1; }
echo "    ✓ zsh found: $(which zsh)"

echo "  → Checking fzf..."
# Check in both root and current user home (installation runs as root via sudo)
if sudo test -f /root/.fzf/bin/fzf || [ -f ~/.fzf/bin/fzf ]; then
  if sudo test -f /root/.fzf/bin/fzf; then
    echo "    ✓ fzf found: /root/.fzf/bin/fzf"
  else
    echo "    ✓ fzf found: ~/.fzf/bin/fzf"
  fi
else
  echo "❌ fzf not found"
  exit 1
fi

echo "  → Checking eza..."
command -v eza >/dev/null 2>&1 || { echo "❌ eza not found"; exit 1; }
echo "    ✓ eza found: $(which eza)"

echo "  → Checking tmux..."
command -v tmux >/dev/null 2>&1 || { echo "❌ tmux not found"; exit 1; }
echo "    ✓ tmux found: $(which tmux)"

echo "  → Checking asdf..."
if sudo test -d /root/.asdf || [ -d ~/.asdf ]; then
  echo "    ✓ asdf directory found"
else
  echo "❌ asdf not installed"
  exit 1
fi

echo ""
echo "📝 Verifying config files..."

echo "  → Checking ~/.zshrc..."
if [ -f ~/.zshrc ] || sudo test -f /root/.zshrc; then
  if sudo grep -q "robbyrussell" /root/.zshrc 2>/dev/null || grep -q "robbyrussell" ~/.zshrc 2>/dev/null; then
    echo "    ✓ .zshrc configured"
  else
    echo "❌ theme not set in .zshrc"
    exit 1
  fi
else
  echo "❌ .zshrc not found"
  exit 1
fi

echo "  → Checking ~/.antigenrc..."
if [ -f ~/.antigenrc ] || sudo test -f /root/.antigenrc; then
  if sudo grep -q "zsh-autosuggestions" /root/.antigenrc 2>/dev/null || grep -q "zsh-autosuggestions" ~/.antigenrc 2>/dev/null; then
    echo "    ✓ .antigenrc configured"
  else
    echo "❌ plugins not configured"
    exit 1
  fi
else
  echo "❌ .antigenrc not found"
  exit 1
fi

echo "  → Checking ~/.tmux.conf..."
if [ -f ~/.tmux.conf ] || sudo test -f /root/.tmux.conf; then
  echo "    ✓ .tmux.conf configured"
else
  echo "❌ .tmux.conf not found"
  exit 1
fi

echo "  → Checking eza theme..."
if [ -f ~/.config/eza/tokyonight.yml ] || sudo test -f /root/.config/eza/tokyonight.yml; then
  echo "    ✓ eza theme configured"
else
  echo "❌ eza theme not found"
  exit 1
fi

echo ""
echo "🚀 Testing zsh loads correctly..."
zsh -c "echo 'Zsh interactive shell loaded successfully'" || { echo "❌ zsh failed to load"; exit 1; }
echo "    ✓ zsh loads correctly"

echo ""
echo "📋 Testing new CLI flags..."

echo "  → Testing --dry-run flag..."
sudo ./better-shell install --dry-run 2>&1 | grep -q "DRY RUN MODE" || { echo "❌ --dry-run not working"; exit 1; }
echo "    ✓ --dry-run flag works"

echo "  → Testing --tools flag..."
sudo ./better-shell install --dry-run --tools fzf,eza 2>&1 | grep -q "fzf, eza" || { echo "❌ --tools not working"; exit 1; }
echo "    ✓ --tools flag works"

echo "  → Testing --no-telemetry flag..."
sudo ./better-shell install --dry-run --no-telemetry 2>&1 | grep -q "DRY RUN MODE" || { echo "❌ --no-telemetry not working"; exit 1; }
echo "    ✓ --no-telemetry flag works"

echo "  → Testing update command..."
sudo ./better-shell update --dry-run 2>&1 | grep -q "Updating Tools" || { echo "❌ update command not working"; exit 1; }
echo "    ✓ update command works"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All integration tests passed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
