import fs from 'fs';

const bundleFiles = fs.readdirSync('dist/assets')
  .filter((f) => f.startsWith('index-') && f.endsWith('.js'))
  .map((f) => ({ f, t: fs.statSync(`dist/assets/${f}`).mtimeMs }))
  .sort((a, b) => b.t - a.t);

const bundle = fs.readFileSync(`dist/assets/${bundleFiles[0].f}`, 'utf8');
console.log('Using bundle:', bundleFiles[0].f, `(${(bundle.length / 1024).toFixed(0)} kB)`);

// Locate each `translation:{` resource root (one per language)
function extractObjectAfter(haystack, anchor) {
  const ai = haystack.indexOf(anchor);
  if (ai === -1) throw new Error(`anchor not found: ${anchor}`);
  const start = haystack.indexOf('{', ai);
  let depth = 0;
  let inStr = false;
  let strCh = '';
  let esc = false;
  for (let i = start; i < haystack.length; i++) {
    const c = haystack[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (inStr) {
      if (c === strCh) inStr = false;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = true; strCh = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return haystack.slice(start, i + 1);
    }
  }
  throw new Error('unbalanced braces');
}

function parseObj(body) {
  // body is a JS object literal (possibly unquoted keys) -> eval safely
  return new Function(`return (${body})`)();
}

const results = {};
for (const [lang] of [['en'], ['sw']]) {
  const body = extractObjectAfter(bundle, `${lang}:{translation:{`);
  const obj = parseObj(body);
  results[lang] = obj.translation || obj;
}

for (const l of ['en', 'sw']) {
  const out = JSON.stringify(results[l], null, 2) + '\n';
  fs.writeFileSync(`src/locales/${l}/translation.json`, out);
  console.log(`${l}: recovered ${Object.keys(results[l]).length} top-level sections, ${out.length} bytes`);
}
