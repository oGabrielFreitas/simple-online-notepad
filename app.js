(() => {
  const $ = (id) => document.getElementById(id);
  const ed = $('ed'), hl = $('hl');
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };

  /* ---------- Syntax highlighting (light, regex-based) ---------- */
  const JS_KW = 'break|case|catch|class|const|continue|default|delete|do|else|export|extends|finally|for|from|function|if|import|in|instanceof|let|new|of|return|super|switch|this|throw|try|typeof|var|void|while|with|yield|async|await|null|undefined|true|false';
  const PY_KW = 'and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield|None|True|False|self';
  const NUM = '\\b\\d+(?:\\.\\d+)?\\b';
  // Each rule: [class, regex without capture groups]
  const LANGS = {
    javascript: [['t-c', '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/'], ['t-s', '"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\'|`(?:\\\\[\\s\\S]|[^`\\\\])*`'], ['t-n', NUM], ['t-k', '\\b(?:' + JS_KW + ')\\b'], ['t-f', '\\b[A-Za-z_$][\\w$]*(?=\\()']],
    python: [['t-c', '#[^\\n]*'], ['t-s', '"""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\'|"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\''], ['t-n', NUM], ['t-k', '\\b(?:' + PY_KW + ')\\b'], ['t-f', '\\b[A-Za-z_]\\w*(?=\\()']],
    json: [['t-f', '"(?:\\\\.|[^"\\\\\\n])*"(?=\\s*:)'], ['t-s', '"(?:\\\\.|[^"\\\\\\n])*"'], ['t-n', '-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b'], ['t-k', '\\b(?:true|false|null)\\b']],
    html: [['t-c', '<!--[\\s\\S]*?-->'], ['t-k', '<\\/?[A-Za-z][\\w-]*|\\/?>'], ['t-f', '\\b[\\w-]+(?==)'], ['t-s', '"[^"\\n]*"|\'[^\'\\n]*\'']],
    css: [['t-c', '\\/\\*[\\s\\S]*?\\*\\/'], ['t-s', '"[^"\\n]*"|\'[^\'\\n]*\''], ['t-k', '[.#]?[A-Za-z_-][\\w-]*(?=[^{}]*\\{)|@[\\w-]+'], ['t-f', '[\\w-]+(?=\\s*:)'], ['t-n', '#[0-9a-fA-F]{3,8}\\b|-?\\d*\\.?\\d+(?:px|em|rem|%|vh|vw|s|ms)?\\b']],
    markdown: [['t-s', '```[\\s\\S]*?```|`[^`\\n]+`'], ['t-k', '^#{1,6}[^\\n]*'], ['t-f', '\\[[^\\]\\n]*\\]\\([^)\\n]*\\)'], ['t-x', '\\*\\*[^*\\n]+\\*\\*|__[^_\\n]+__'], ['t-n', '^\\s*(?:[-*+]|\\d+\\.)\\s'], ['t-c', '^>[^\\n]*']],
  };

  // Extra languages built from shared building blocks
  const slashCom = '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/';
  const dqsq = '"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\'';
  const fnCall = '\\b[A-Za-z_]\\w*(?=\\()';
  const kw = (w) => ['t-k', '\\b(?:' + w + ')\\b'];
  const cLike = (w, str = dqsq, com = slashCom) => [['t-c', com], ['t-s', str], ['t-n', NUM], kw(w), ['t-f', fnCall]];
  const hashLike = (w) => [['t-c', '#[^\\n]*'], ['t-s', dqsq], ['t-n', NUM], kw(w), ['t-f', fnCall]];
  const C_KW = 'auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|inline|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while|NULL';
  const CPP_KW = C_KW + '|bool|catch|class|delete|namespace|new|nullptr|private|protected|public|template|this|throw|try|typename|using|virtual|true|false';
  LANGS.typescript = cLike(JS_KW + '|interface|type|enum|implements|public|private|protected|readonly|string|number|boolean|any|unknown|never', dqsq + '|`(?:\\\\[\\s\\S]|[^`\\\\])*`');
  LANGS.java = cLike('abstract|boolean|break|byte|case|catch|char|class|continue|default|do|double|else|enum|extends|final|finally|float|for|if|implements|import|instanceof|int|interface|long|new|package|private|protected|public|return|short|static|super|switch|this|throw|throws|try|void|while|null|true|false');
  LANGS.c = cLike(C_KW);
  LANGS.cpp = cLike(CPP_KW);
  LANGS.csharp = cLike('abstract|as|async|await|bool|break|case|catch|class|const|continue|default|do|double|else|enum|false|finally|float|for|foreach|if|in|int|interface|namespace|new|null|override|private|protected|public|return|static|string|struct|switch|this|throw|true|try|using|var|virtual|void|while');
  LANGS.go = cLike('break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var|nil|true|false', dqsq + '|`[^`]*`');
  LANGS.rust = cLike('as|async|await|break|const|continue|crate|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|true|type|unsafe|use|where|while');
  LANGS.php = cLike('abstract|and|array|as|break|case|catch|class|const|continue|echo|else|elseif|extends|false|final|finally|for|foreach|function|if|implements|include|namespace|new|null|or|private|protected|public|require|return|static|switch|throw|true|try|use|var|while', dqsq, slashCom + '|#[^\\n]*');
  LANGS.ruby = hashLike('alias|and|begin|break|case|class|def|do|else|elsif|end|ensure|false|for|if|in|module|next|nil|not|or|redo|rescue|retry|return|self|super|then|true|undef|unless|until|when|while|yield');
  LANGS.shell = hashLike('if|then|else|elif|fi|for|while|do|done|case|esac|function|in|return|exit|export|local|echo|cd|source');
  LANGS.yaml = [['t-c', '#[^\\n]*'], ['t-f', '^\\s*-?\\s*[\\w.-]+(?=:)'], ['t-s', dqsq], ['t-n', NUM], kw('true|false|null|yes|no')];
  LANGS.sql = [['t-c', '--[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/'], ['t-s', '\'(?:\'\'|[^\'])*\''], ['t-n', NUM], ['t-k', '\\b(?:(?:select|from|where|and|or|not|insert|into|values|update|set|delete|create|alter|drop|table|index|view|join|inner|left|right|outer|on|group|by|order|having|limit|offset|as|distinct|union|null|is|in|like|between|primary|key|foreign|references|default|case|when|then|else|end)\\b)']];
  LANGS.xml = LANGS.html;

  const LANG_LIST = [ // [id, label, default extension]
    ['txt', 'Plain text', 'txt'], ['markdown', 'Markdown', 'md'], ['javascript', 'JavaScript', 'js'],
    ['typescript', 'TypeScript', 'ts'], ['python', 'Python', 'py'], ['java', 'Java', 'java'],
    ['c', 'C', 'c'], ['cpp', 'C++', 'cpp'], ['csharp', 'C#', 'cs'], ['go', 'Go', 'go'],
    ['rust', 'Rust', 'rs'], ['php', 'PHP', 'php'], ['ruby', 'Ruby', 'rb'], ['shell', 'Shell', 'sh'],
    ['sql', 'SQL', 'sql'], ['json', 'JSON', 'json'], ['yaml', 'YAML', 'yml'], ['html', 'HTML', 'html'],
    ['xml', 'XML', 'xml'], ['css', 'CSS', 'css'],
  ];
  $('lang').innerHTML = LANG_LIST.map((l) => '<option value="' + l[0] + '">' + l[1] + '</option>').join('');
  const compiled = {};
  for (const [name, rules] of Object.entries(LANGS)) {
    compiled[name] = { re: new RegExp(rules.map((r) => '(' + r[1] + ')').join('|'), name === 'sql' ? 'gmi' : 'gm'), cls: rules.map((r) => r[0]) };
  }
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function highlight(text, lang) {
    const c = compiled[lang];
    if (!c) return esc(text);
    let out = '', last = 0;
    text.replace(c.re, (...m) => {
      const idx = m.slice(1, 1 + c.cls.length).findIndex((g) => g !== undefined);
      const offset = m[1 + c.cls.length];
      if (m[0] === '') return m[0];
      out += esc(text.slice(last, offset)) + '<span class="' + c.cls[idx] + '">' + esc(m[0]) + '</span>';
      last = offset + m[0].length;
      return m[0];
    });
    return out + esc(text.slice(last));
  }

  /* ---------- State / settings ---------- */
  const s = {
    theme: store.get('theme', 'dark'),
    bg: store.get('cBg', '#1f1f1f'),
    fg: store.get('cFg', '#ffffff'),
    langOn: store.get('langOn', '1') === '1',
    lang: store.get('lang', 'txt'),
    padXVal: store.get('padXVal', '24'), padXUnit: store.get('padXUnit', 'px'),
    padYVal: store.get('padYVal', '36'), padYUnit: store.get('padYUnit', 'px'),
    foldersOn: store.get('foldersOn', '0') === '1', side: store.get('side', 'right'),
    maxVal: store.get('maxVal', ''), maxUnit: store.get('maxUnit', 'px'),
  };

  function render() {
    hl.innerHTML = body_hl() + '\n';
    hl.scrollTop = ed.scrollTop;
  }
  function body_hl() {
    return highlight(ed.value, s.lang);
  }

  function applySettings() {
    const root = document.documentElement;
    root.dataset.theme = s.theme;
    if (s.theme === 'custom') {
      root.style.setProperty('--bg', s.bg);
      root.style.setProperty('--fg', s.fg);
    } else {
      root.style.removeProperty('--bg');
      root.style.removeProperty('--fg');
    }
    const mw = parseFloat(s.maxVal);
    const len = (v, u, d) => { const n = parseFloat(v); return n >= 0 ? n + u : d + 'px'; };
    root.style.setProperty('--pad-x', len(s.padXVal, s.padXUnit, 24));
    root.style.setProperty('--pad-y', len(s.padYVal, s.padYUnit, 36));
    if (mw > 0) root.style.setProperty('--maxw', mw + s.maxUnit); else root.style.removeProperty('--maxw');
    const useHl =s.theme !== 'custom' && s.langOn && !!compiled[s.lang];
    document.body.classList.toggle('hl-on', useHl);
    $('customBox').hidden = s.theme !== 'custom';
    $('langBox').hidden = s.theme === 'custom';
    render();
    $('app').className = 'side-' + s.side;
  }

  /* ---------- Local text storage ---------- */
  ed.value = store.get('text', '');
  let t;
  ed.addEventListener('input', () => {
    render();
    if (fileHandle && !dirty) { dirty = true; setLabel(); }
    clearTimeout(t);
    t = setTimeout(() => store.set('text', ed.value), 300);
  });
  ed.addEventListener('scroll', () => { hl.scrollTop = ed.scrollTop; });
  ed.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '  ');
    }
  });

  /* ---------- Files: open, save in place, folder explorer ---------- */
  let hasFS = !!window.showOpenFilePicker;
  let hasDir = !!window.showDirectoryPicker;
  let fsReason = !window.isSecureContext
    ? 'This page is not served over HTTPS (or localhost), so the browser blocks direct file access.'
    : (!hasFS || !hasDir)
      ? 'This browser does not support direct file access. Use Chrome or Edge (in Brave, enable brave://flags/#file-system-access-api).'
      : '';
  let warned = false;

  /* ----- Local mode: when served by server.js, files are read/written through its API.
         This works in any browser, including the Claude built-in browser pane. ----- */
  let local = false, localRoot = '';
  async function api(method, route, p, body) {
    const r = await fetch('/api/' + route + '?path=' + encodeURIComponent(p), { method, headers: { 'X-Notepad': '1' }, body });
    if (!r.ok) throw new Error((await r.text()) || 'HTTP ' + r.status);
    return r;
  }
  const baseName = (p) => p.split('/').pop();
  const joinPath = (a, b) => (a ? a + '/' + b : b);
  function mkFile(p) {
    return {
      kind: 'file', name: baseName(p), path: p,
      async getFile() { const text = await (await api('GET', 'file', p)).text(); return { text: async () => text }; },
      async createWritable() { let buf = ''; return { write: async (d) => { buf += d; }, close: async () => { await api('PUT', 'file', p, buf); } }; },
      async isSameEntry(o) { return !!o && o.path === p; },
    };
  }
  function mkDir(p) {
    return {
      kind: 'directory', name: p ? baseName(p) : localRoot, path: p,
      async *entries() {
        const list = await (await api('GET', 'tree', p)).json();
        for (const e of list) yield [e.name, e.kind === 'directory' ? mkDir(joinPath(p, e.name)) : mkFile(joinPath(p, e.name))];
      },
      async getFileHandle(name, opt) { const q = joinPath(p, name); if (opt && opt.create) await api('POST', 'new', q); return mkFile(q); },
      async getDirectoryHandle(name, opt) { const q = joinPath(p, name); if (opt && opt.create) await api('POST', 'mkdir', q); return mkDir(q); },
    };
  }
  // Folder chooser (local mode): browse the computer through the server and switch the edited folder
  const dlgPick = $('dlgPick');
  let pickPath = '', pickParent = '';
  async function pickLoad(p) {
    try {
      const r = await (await api('GET', 'dirs', p)).json();
      pickPath = r.path; pickParent = r.parent;
      $('pickPath').textContent = r.path || 'Drives';
      $('pickUp').disabled = !r.path;
      $('pickOk').disabled = !r.path;
      const list = $('pickList');
      list.innerHTML = '';
      for (const d of r.dirs) {
        const row = document.createElement('div');
        row.className = 'ex-row dir';
        row.textContent = '▸ ' + d.name;
        row.onclick = () => pickLoad(d.path);
        list.appendChild(row);
      }
      if (!r.dirs.length) list.innerHTML = '<div class="ex-row" style="color:var(--subtle)">No sub-folders</div>';
    } catch (err) { alert('Could not list folders: ' + err.message); }
  }
  async function chooseFolder() {
    await pickLoad('');            // start at the drives / filesystem root
    if (rootPathNow) await pickLoad(rootPathNow); // ...then jump to the current folder
    dlgPick.showModal();
  }
  let rootPathNow = '';
  $('pickUp').onclick = () => pickLoad(pickParent);
  $('pickCancel').onclick = () => dlgPick.close();
  $('pickOk').onclick = async () => {
    if (dirty && !confirm('Discard unsaved changes to ' + fileHandle.name + '?')) return;
    try {
      const info = await (await api('POST', 'root', pickPath)).json();
      localRoot = info.root; rootPathNow = info.path;
      fileHandle = null; dirty = false; setLabel();
      closeFolder();
      dlgPick.close();
      await openFolder();
    } catch (err) { alert('Could not open folder: ' + err.message); }
  };
  dlgPick.addEventListener('click', (e) => { if (e.target === dlgPick) dlgPick.close(); });

  async function detectLocal() {
    try {
      const r = await fetch('/api/info', { headers: { 'X-Notepad': '1' } });
      if (!r.ok) return;
      const info = await r.json();
      if (!info || !info.local) return;
      local = true; localRoot = info.root; rootPathNow = info.path; hasFS = hasDir = true; fsReason = '';
      applyFilesSettings();
      await openFolder();
    } catch { /* static hosting: no API, keep browser-only mode */ }
  }
  let fileHandle = null, dirty = false, rootDir = null, curDir = null;
  const boxes = new Map(); // directory handle -> {kids, depth}
  const defExt = () => (LANG_LIST.find((l) => l[0] === s.lang) || LANG_LIST[0])[2];

  function setLabel() {
    const l = $('fileLabel');
    l.hidden = !fileHandle;
    l.textContent = fileHandle ? fileHandle.name + (dirty ? ' •' : '') : '';
  }

  async function loadFile(handle) {
    if (dirty && !confirm('Discard unsaved changes to ' + fileHandle.name + '?')) return;
    const f = await handle.getFile();
    ed.value = await f.text();
    fileHandle = handle; dirty = false;
    store.set('text', ed.value);
    render(); setLabel(); markActive();
  }

  async function openFile() {
    if (local) { // pick the file in the explorer panel
      if (!rootDir) await openFolder();
      return;
    }
    if (hasFS) {
      try { const [h] = await window.showOpenFilePicker({ multiple: false }); await loadFile(h); }
      catch (err) { if (err.name !== 'AbortError') console.error(err); }
      return;
    }
    // Fallback: can read, but cannot write back in place
    if (!warned) { warned = true; alert(fsReason + '\n\nThe file will open, but Save will download a copy instead of overwriting the original.'); }
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.onchange = async () => { const f = inp.files[0]; if (f) { ed.value = await f.text(); fileHandle = null; dirty = false; render(); setLabel(); } };
    inp.click();
  }

  async function writeTo(handle) {
    const w = await handle.createWritable();
    await w.write(ed.value);
    await w.close();
    dirty = false; setLabel();
  }

  // Ctrl+S saves in place; Ctrl+Shift+S (or no open file) asks where.
  async function save(saveAs = false) {
    try {
      if (fileHandle && !saveAs) return await writeTo(fileHandle);
      if (local) {
        if (!rootDir) await openFolder();
        const dir = (!saveAs && curDir) || rootDir;
        const dflt = saveAs ? (fileHandle ? fileHandle.path : 'note.' + defExt()) : 'note.' + defExt();
        const name = prompt(saveAs ? 'Save as (path inside "' + localRoot + '")' : 'File name', dflt);
        if (!name || !name.trim()) return;
        fileHandle = await dir.getFileHandle(name.trim().replace(/\\/g, '/'), { create: true });
        await writeTo(fileHandle);
        await refreshDir(dir); markActive();
        return;
      }
      if (curDir && !saveAs) { // folder explorer open: create the file right there
        const name = prompt('File name', 'note.' + defExt());
        if (!name || !name.trim()) return;
        fileHandle = await curDir.getFileHandle(name.trim(), { create: true });
        await writeTo(fileHandle);
        await refreshDir(curDir); markActive();
        return;
      }
      if (hasFS) {
        fileHandle = await window.showSaveFilePicker({
          suggestedName: (fileHandle ? fileHandle.name : 'note.' + defExt()),
          types: [{ description: defExt().toUpperCase() + ' file', accept: { 'text/plain': ['.' + defExt()] } }],
        });
        await writeTo(fileHandle);
        return;
      }
      // Fallback (no direct file access): normal download
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([ed.value], { type: 'text/plain;charset=utf-8' }));
      a.download = 'note.' + defExt();
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (err) {
      if (err.name !== 'AbortError') { console.error(err); alert('Could not save: ' + err.message); }
    }
  }
  $('btnSave').onclick = () => save();
  $('btnOpen').onclick = openFile;
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(e.shiftKey); }
  });

  /* ----- Folder explorer ----- */
  const exTree = $('exTree');
  async function listDir(dir) {
    const arr = [];
    for await (const [, h] of dir.entries()) arr.push(h);
    return arr.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'directory' ? -1 : 1));
  }
  async function renderDir(dir, box, depth) {
    box.innerHTML = '';
    for (const h of await listDir(dir)) {
      const isDir = h.kind === 'directory';
      const row = document.createElement('div');
      row.className = 'ex-row ' + (isDir ? 'dir' : 'file');
      row.style.paddingLeft = 8 + depth * 14 + 'px';
      row.textContent = (isDir ? '▸ ' : '  ') + h.name;
      row._h = h;
      box.appendChild(row);
      if (isDir) {
        const kids = document.createElement('div');
        kids.hidden = true;
        box.appendChild(kids);
        boxes.set(h, { kids, depth: depth + 1 });
        row.onclick = async () => {
          curDir = h;
          if (kids.hidden) { await renderDir(h, kids, depth + 1); kids.hidden = false; row.textContent = '▾ ' + h.name; }
          else { kids.hidden = true; row.textContent = '▸ ' + h.name; }
          markActive();
        };
      } else {
        row.onclick = () => loadFile(h).catch((e) => alert(e.message));
      }
    }
    markActive();
  }
  async function refreshDir(dir) {
    if (dir === rootDir) return renderDir(rootDir, exTree, 0);
    const b = boxes.get(dir);
    if (b) await renderDir(dir, b.kids, b.depth);
  }
  async function markActive() {
    for (const row of exTree.querySelectorAll('.ex-row')) {
      row.classList.toggle('cur-dir', row._h === curDir);
      let on = false;
      if (fileHandle && row._h.kind === 'file') { try { on = await row._h.isSameEntry(fileHandle); } catch {} }
      row.classList.toggle('active', on);
    }
  }
  async function openFolder() {
    if (!hasDir) { alert(fsReason); return; }
    try {
      rootDir = curDir = local ? mkDir('') : await window.showDirectoryPicker({ mode: 'readwrite' });
      boxes.clear();
      $('explorer').hidden = false;
      $('exName').textContent = rootDir.name;
      await renderDir(rootDir, exTree, 0);
    } catch (err) { if (err.name !== 'AbortError') console.error(err); }
  }
  function closeFolder() { rootDir = curDir = null; boxes.clear(); exTree.innerHTML = ''; $('explorer').hidden = true; }
  async function createEntry(kind) {
    if (!curDir) return;
    const name = prompt(kind === 'file' ? 'New file name' : 'New folder name');
    if (!name || !name.trim()) return;
    try {
      if (kind === 'file') {
        const h = await curDir.getFileHandle(name.trim(), { create: true });
        await refreshDir(curDir);
        await loadFile(h);
      } else {
        await curDir.getDirectoryHandle(name.trim(), { create: true });
        await refreshDir(curDir);
      }
    } catch (err) { alert('Could not create: ' + err.message); }
  }
  $('btnFolder').onclick = () => (local ? chooseFolder() : openFolder());
  $('exClose').onclick = closeFolder;
  $('exRefresh').onclick = () => curDir && refreshDir(curDir);
  $('exNewFile').onclick = () => createEntry('file');
  $('exNewDir').onclick = () => createEntry('dir');

  function applyFilesSettings() {
    $('app').className = 'side-' + s.side;
    const on = s.foldersOn || local;
    $('btnFolder').hidden = !on;
    if (!on && rootDir) closeFolder();
  }

  /* ---------- Settings (UI) ---------- */
  const dlgSet = $('dlgSettings');
  $('btnSettings').onclick = () => {
    document.querySelector('input[name=theme][value=' + s.theme + ']').checked = true;
    $('cBg').value = s.bg; $('cFg').value = s.fg;
    $('langOn').checked = s.langOn; $('lang').value = s.lang;
    for (const k of ['padXVal', 'padXUnit', 'padYVal', 'padYUnit']) $(k).value = s[k];
    $('maxVal').value = s.maxVal; $('maxUnit').value = s.maxUnit;
    $('foldersOn').checked = s.foldersOn || local; $('foldersOn').disabled = local; $('side').value = s.side;
    const note = local ? 'Local mode: editing files in "' + localRoot + '" through server.js.' : fsReason;
    $('fsNote').hidden = !note; $('fsNote').textContent = note;
    dlgSet.showModal();
  };
  $('foldersOn').addEventListener('change', (e) => { s.foldersOn = e.target.checked; store.set('foldersOn', s.foldersOn ? '1' : '0'); applyFilesSettings(); });
  $('side').addEventListener('change', (e) => { s.side = e.target.value; store.set('side', s.side); applyFilesSettings(); });
  for (const k of ['padXVal', 'padXUnit', 'padYVal', 'padYUnit', 'maxVal', 'maxUnit']) {
    $(k).addEventListener('input', (e) => { s[k] = e.target.value; store.set(k, s[k]); applySettings(); });
  }
  document.querySelectorAll('input[name=theme]').forEach((r) => r.addEventListener('change', () => {
    s.theme = r.value; store.set('theme', s.theme); applySettings();
  }));
  $('cBg').addEventListener('input', (e) => { s.bg = e.target.value; store.set('cBg', s.bg); applySettings(); });
  $('cFg').addEventListener('input', (e) => { s.fg = e.target.value; store.set('cFg', s.fg); applySettings(); });
  $('langOn').addEventListener('change', (e) => { s.langOn = e.target.checked; store.set('langOn', s.langOn ? '1' : '0'); applySettings(); });
  $('lang').addEventListener('change', (e) => { s.lang = e.target.value; store.set('lang', s.lang); applySettings(); });

  // close dialogs on outside click
  dlgSet.addEventListener('click', (e) => { if (e.target === dlgSet) dlgSet.close(); });

  applySettings();
  applyFilesSettings();
  detectLocal();
})();
