# Simple Online Notepad

Static web notepad (plain HTML/CSS/JS). Text is stored in the browser's `localStorage`.

- Save: downloads as `.txt`, `.md` or any extension (Ctrl+S too).
- Settings: dark/light theme (Claude Code colors), custom theme (background and text), per-language colors, horizontal and vertical padding (px, %, vh, vw) and max width.

## Run locally

    docker build -t notepad . && docker run -p 8080:80 notepad

## Deploy on Coolify

1. Push this folder to a Git repository (GitHub/GitLab).
2. Coolify → New Resource → Public/Private Repository → pick the repo.
3. Build Pack: **Dockerfile**. Ports Exposes: **80**.
4. Set your domain and click Deploy.
