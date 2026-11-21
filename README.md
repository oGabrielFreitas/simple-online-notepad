# Simple Online Notepad

Static web notepad (plain HTML/CSS/JS). Text is stored in the browser's `localStorage`.

- Save: downloads as `.txt`, `.md` or any extension (Ctrl+S too).
- Open: opens a file from your computer; Save / Ctrl+S then writes straight back to it (Ctrl+Shift+S = save as). Chrome/Edge over HTTPS or localhost.
- Folders (Settings → Allow opening folders): file explorer on the right or left to browse, open and create files/folders.
- Settings: dark/light theme (Claude Code colors), custom theme (background and text), per-language colors, horizontal and vertical padding (px, %, vh, vw) and max width.

## Run locally

    docker build -t notepad . && docker run -p 8080:80 notepad

## Deploy on Coolify

1. Push this folder to a Git repository (GitHub/GitLab).
2. Coolify → New Resource → Public/Private Repository → pick the repo.
3. Build Pack: **Dockerfile**. Ports Exposes: **80**.
4. Set your domain and click Deploy.

## Local mode (works inside the Claude Code / Claude desktop browser pane)

Browsers without the File System Access API (including that pane) cannot open or save real files on their own.
`server.js` fixes that: it serves the app and reads/writes files in one folder through a small local API.

    node server.js [folder]      # default folder = current directory, http://localhost:5173

In Claude Code, `preview_start` with the `notepad` entry in `.claude/launch.json` does the same.
The explorer opens automatically; click a file to edit it, Ctrl+S saves in place, Ctrl+Shift+S = save as.
The folder button opens a chooser to switch to any folder on the computer. Listens on 127.0.0.1 only; it only touches files inside the chosen folder. Not needed (and not deployed) on Coolify or shared hosting.

### Config file (local mode)

`notepad.config.json` (next to `server.js`) sets the folder the server opens at start, so you don't have to pass it every time:

    { "folder": "D:/Projects/my-app", "port": 5173 }

`folder` may be absolute or relative to `server.js`; leave it empty to use the current directory. A command-line folder (`npm start -- <folder>`) or `NOTEPAD_ROOT` overrides it.
