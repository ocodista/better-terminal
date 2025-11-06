# better-terminal

One command installs a complete terminal setup with auto-suggestions, fast search, and version management.

## Installation

```bash
curl -fsSL https://raw.githubusercontent.com/ocodista/better-terminal/main/install.sh | bash
```

Installs in 5-10 minutes. Backs up existing configs automatically.

## What You Get

**Auto-suggestions**: Type a command. See suggestions from your history. Press → to accept.

**Fast search**: Press Ctrl+R. Find any command instantly.

**Syntax highlighting**: Valid commands turn green. Invalid turn red.

**Directory jumping**: `z projects` jumps to your projects folder. No full paths needed.

**File icons**: `lsx` lists files with colors and icons.

**Version management**: Switch Node.js versions with `asdf`.

**Terminal splits**: Run multiple commands in one window with `tmux`.

## Requirements

- macOS or Linux
- Git installed
- Internet connection

## Usage

### Search History
Press `Ctrl+R`. Type keywords. Press Enter.

### Jump to Directories
```bash
z docs          # Jumps to ~/documents
z blog          # Jumps to ~/sites/blog
```

### List Files
```bash
lsx             # Shows files with icons
```

### Split Terminal
```bash
tmux            # Start tmux
# Ctrl+B then %  (split vertical)
# Ctrl+B then "  (split horizontal)
```

### Switch Node Versions
```bash
asdf install nodejs 20.0.0
asdf global nodejs 20.0.0
```

## After Installation

1. Restart your terminal
2. Press `prefix + I` in tmux to install plugins
3. Set your terminal font to FiraCode Nerd Font

## Tools Installed

- **Shell**: zsh + Oh My Zsh + Antigen
- **Search**: fzf
- **Files**: eza
- **Versions**: asdf (with Node.js LTS)
- **Multiplexer**: tmux
- **Font**: FiraCode Nerd Font

## Configuration

Edit these files to customize:
- `~/.zshrc` - Shell settings
- `~/.tmux.conf` - Tmux settings
- `~/.config/eza/tokyonight.yml` - File colors

Backups are saved to `~/.better-terminal-backups/` before installation.

## Development

```bash
# Clone and build
git clone https://github.com/ocodista/better-terminal.git
cd better-terminal
bun install
bun run build

# Run
./dist/better-terminal install
```

### Test in Docker
```bash
# Quick test (Ubuntu)
./tests/quick-test.sh

# Inside container
./install-and-test.sh
```

## Commands

```bash
better-terminal check          # Verify requirements
better-terminal install        # Install everything
better-terminal install --dry-run  # Preview changes
better-terminal backup         # Save current configs
better-terminal restore <path> # Restore from backup
```

## License

MIT
