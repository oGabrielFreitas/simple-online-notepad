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
    padYVal: store.get('padYVal', '24'), padYUnit: store.get('padYUnit', 'px'),
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
    root.style.setProperty('--pad-y', len(s.padYVal, s.padYUnit, 24));
    if (mw > 0) root.style.setProperty('--maxw', mw + s.maxUnit); else root.style.removeProperty('--maxw');
    const useHl =s.theme !== 'custom' && s.langOn && !!compiled[s.lang];
    document.body.classList.toggle('hl-on', useHl);
    $('customBox').hidden = s.theme !== 'custom';
    $('langBox').hidden = s.theme === 'custom';
    render();
  }

  /* ---------- Local text storage ---------- */
  ed.value = store.get('text', '');
  let t;
  ed.addEventListener('input', () => {
    render();
    clearTimeout(t);
    t = setTimeout(() => store.set('text', ed.value), 300);
  });
  ed.addEventListener('scroll', () => { hl.scrollTop = ed.scrollTop; });
  ed.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '  ');
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      openSave();
    }
  });

  /* ---------- Save (opens the system file explorer) ---------- */
  async function openSave() {
    const ext = (LANG_LIST.find((l) => l[0] === s.lang) || LANG_LIST[0])[2];
    const suggested = 'note.' + ext;
    const blob = new Blob([ed.value], { type: 'text/plain;charset=utf-8' });
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: suggested,
          types: [{ description: ext.toUpperCase() + ' file', accept: { 'text/plain': ['.' + ext] } }],
        });
        const w = await handle.createWritable();
        await w.write(blob);
        await w.close();
      } catch (err) { if (err.name !== 'AbortError') console.error(err); }
      return;
    }
    // Fallback (Firefox/Safari): the browser's own download flow
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = suggested;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  $('btnSave').onclick = openSave;

  /* ---------- Settings (UI) ---------- */
  const dlgSet = $('dlgSettings');
  $('btnSettings').onclick = () => {
    document.querySelector('input[name=theme][value=' + s.theme + ']').checked = true;
    $('cBg').value = s.bg; $('cFg').value = s.fg;
    $('langOn').checked = s.langOn; $('lang').value = s.lang;
    for (const k of ['padXVal', 'padXUnit', 'padYVal', 'padYUnit']) $(k).value = s[k];
    $('maxVal').value = s.maxVal; $('maxUnit').value = s.maxUnit;
    dlgSet.showModal();
  };
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
})();
