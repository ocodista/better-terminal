# better-shell

One command to supercharge your shell with modern developer tools.

## Installation

```bash
curl -fsSL https://shell.ocodista.com/install.sh | bash
```

**Alternative:**
```bash
curl -fsSL https://raw.githubusercontent.com/ocodista/better-shell/main/install.sh | bash
```

Installs in 5-10 minutes. Automatically backs up existing configs to `~/.better-shell-backups/`.

## What You Get

- **Auto-suggestions** - Type a command, see suggestions from history, press → to accept
- **Fast search** - Press Ctrl+R to find any command instantly with [fzf](https://github.com/junegunn/fzf)
- **Syntax highlighting** - Valid commands turn green, invalid turn red
- **Directory jumping** - `z projects` jumps to your projects folder, no full paths needed
- **Modern file listing** - `lsx` shows files with colors and icons via [eza](https://github.com/eza-community/eza)
- **Version management** - Switch Node.js versions seamlessly with [asdf](https://github.com/asdf-vm/asdf)
- **Terminal multiplexing** - Run multiple commands in split panes with [tmux](https://github.com/tmux/tmux)
- **Beautiful font** - [FiraCode Nerd Font](https://github.com/ryanoasis/nerd-fonts) with ligatures and icons

## Tools Installed

| Tool | Purpose | Repository |
|------|---------|------------|
| [zsh](https://www.zsh.org/) | Modern shell | - |
| [Oh My Zsh](https://ohmyz.sh/) | Zsh configuration framework | [ohmyzsh/ohmyzsh](https://github.com/ohmyzsh/ohmyzsh) |
| [Antigen](http://antigen.sharats.me/) | Plugin manager | [zsh-users/antigen](https://github.com/zsh-users/antigen) |
| [fzf](https://github.com/junegunn/fzf) | Fuzzy finder | [junegunn/fzf](https://github.com/junegunn/fzf) |
| [eza](https://eza.rocks/) | Modern ls replacement | [eza-community/eza](https://github.com/eza-community/eza) |
| [asdf](https://asdf-vm.com/) | Version manager | [asdf-vm/asdf](https://github.com/asdf-vm/asdf) |
| [tmux](https://github.com/tmux/tmux) | Terminal multiplexer | [tmux/tmux](https://github.com/tmux/tmux) |
| [zsh-autosuggestions](https://github.com/zsh-users/zsh-autosuggestions) | Fish-like suggestions | [zsh-users/zsh-autosuggestions](https://github.com/zsh-users/zsh-autosuggestions) |
| [zsh-syntax-highlighting](https://github.com/zsh-users/zsh-syntax-highlighting) | Command validation | [zsh-users/zsh-syntax-highlighting](https://github.com/zsh-users/zsh-syntax-highlighting) |
| [zsh-completions](https://github.com/zsh-users/zsh-completions) | Extra completions | [zsh-users/zsh-completions](https://github.com/zsh-users/zsh-completions) |
| [zsh-z](https://github.com/agkozak/zsh-z) | Directory jumper | [agkozak/zsh-z](https://github.com/agkozak/zsh-z) |
| [FiraCode Nerd Font](https://www.nerdfonts.com/) | Programming font | [ryanoasis/nerd-fonts](https://github.com/ryanoasis/nerd-fonts) |

## Requirements

- macOS or Linux
- Git installed
- Internet connection

## Quick Start

After installation:

### Search Command History
```bash
# Press Ctrl+R, start typing, fuzzy search your history
```

### Jump to Directories
```bash
z docs          # Jumps to ~/documents
z blog          # Jumps to ~/sites/blog
z project       # Fuzzy matches any directory you've visited
```

### List Files with Icons
```bash
lsx             # Modern ls with colors and icons
```

### Terminal Multiplexing
```bash
tmux            # Start tmux
# Ctrl+B then %  → split vertical
# Ctrl+B then "  → split horizontal
# Ctrl+B then c  → new window
```

### Version Management
```bash
asdf install nodejs 20.0.0
asdf global nodejs 20.0.0
asdf list
```

## After Installation

1. **Restart your terminal** or run `exec zsh`
2. **Install tmux plugins**: Open tmux and press `prefix + I` (Ctrl+B then Shift+I)
3. **Set terminal font**: Configure your terminal to use FiraCode Nerd Font

## Commands

```bash
better-shell check                  # Verify system requirements
better-shell install                # Install everything
better-shell install --dry-run      # Preview changes without installing
better-shell install --skip-backup  # Skip backing up existing configs
better-shell backup                 # Backup current configs
better-shell restore <path>         # Restore from backup
```

## Configuration

Customize your setup by editing:

- `~/.zshrc` - Shell settings and aliases
- `~/.tmux.conf` - Tmux keybindings and behavior
- `~/.config/eza/tokyonight.yml` - File listing colors
- `~/.antigenrc` - Zsh plugins

Backups are automatically saved to `~/.better-shell-backups/YYYY-MM-DD-HHMMSS` before installation.

## Development

Built with [Bun](https://github.com/oven-sh/bun) as a single-file executable.

### Build from Source

```bash
git clone https://github.com/ocodista/better-shell.git
cd better-shell
bun install
bun run build        # Build for current platform
bun run build:all    # Build for all platforms
./dist/better-shell install
```

### Test in Docker

```bash
# Quick test with Dockerfile
docker build -t better-shell .
docker run -it better-shell

# Run test suite
./tests/quick-test.sh
bun run test
```

### Binary Distribution

Pre-built binaries available for:
- macOS ARM64 (Apple Silicon)
- macOS x64 (Intel)
- Linux ARM64
- Linux x64
- Windows x64

Download from [releases](https://github.com/ocodista/better-shell/releases).

## Why better-shell?

- **Zero configuration** - Works out of the box
- **Safe** - Automatically backs up your existing configs
- **Fast** - Built with Bun, distributed as single executable
- **Modern** - Uses actively maintained tools
- **Customizable** - All configs are standard files you can edit
- **Cross-platform** - macOS and Linux support

## License

MIT

---

Made with [Bun](https://bun.sh) 🥟
