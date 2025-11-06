#!/usr/bin/env bash
# Install better-terminal from GitHub releases

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 better-terminal installer${NC}"
echo ""

# Detect OS
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
case "$OS" in
  darwin) OS="darwin" ;;
  linux) OS="linux" ;;
  *)
    echo -e "${RED}❌ Unsupported OS: $OS${NC}"
    echo "better-terminal supports macOS and Linux only"
    exit 1
    ;;
esac

# Detect architecture
ARCH=$(uname -m)
case "$ARCH" in
  x86_64) ARCH="x64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *)
    echo -e "${RED}❌ Unsupported architecture: $ARCH${NC}"
    exit 1
    ;;
esac

echo -e "Platform: ${GREEN}$OS-$ARCH${NC}"

# Get latest release info
REPO="ocodista/better-terminal"
RELEASE_URL="https://api.github.com/repos/$REPO/releases/latest"

echo "Fetching latest release..."
RELEASE_DATA=$(curl -sL "$RELEASE_URL")

# Extract version
VERSION=$(echo "$RELEASE_DATA" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
if [ -z "$VERSION" ]; then
  echo -e "${RED}❌ Failed to fetch latest release${NC}"
  echo "Check: https://github.com/$REPO/releases"
  exit 1
fi

echo -e "Latest version: ${GREEN}$VERSION${NC}"

# Construct download URL
if [ "$OS" = "darwin" ]; then
  BINARY_NAME="better-terminal-darwin-$ARCH"
else
  BINARY_NAME="better-terminal-linux-$ARCH"
fi

DOWNLOAD_URL="https://github.com/$REPO/releases/download/$VERSION/$BINARY_NAME"

# Download binary
TMP_DIR=$(mktemp -d)
TMP_FILE="$TMP_DIR/better-terminal"

echo "Downloading..."
if ! curl -fsSL "$DOWNLOAD_URL" -o "$TMP_FILE"; then
  echo -e "${RED}❌ Download failed${NC}"
  echo "URL: $DOWNLOAD_URL"
  exit 1
fi

# Make executable
chmod +x "$TMP_FILE"

echo -e "${GREEN}✓${NC} Downloaded successfully"
echo ""

# Run installation
echo "Starting installation..."
echo ""
"$TMP_FILE" install

# Cleanup
rm -rf "$TMP_DIR"

echo ""
echo -e "${GREEN}✨ Installation complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Restart your terminal or run: exec zsh"
echo "2. Press 'prefix + I' in tmux to install plugins"
echo "3. Set terminal font to FiraCode Nerd Font"
