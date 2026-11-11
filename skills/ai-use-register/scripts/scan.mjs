#!/usr/bin/env node
// Static scan of a folder for evidence of AI use. Deterministic, read-only, zero dependencies.
//   scan.mjs <dir> [--out FILE]
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SIGS = JSON.parse(readFileSync(new URL('./signatures.json', import.meta.url), 'utf8'));
const SKIP_DIRS = new Set(['.git', 'node_modules', '.venv', 'venv', '__pycache__', 'dist', 'build', '.next', 'coverage', '.tox', 'vendor']);
const BINARY_EXT = /\.(?:png|jpe?g|gif|webp|ico|pdf|zip|gz|tgz|woff2?|ttf|otf|mp[34]|mov|exe|dll|so|dylib|class|jar|pyc|pkl|joblib|onnx|pt|pth|safetensors|gguf|h5|tflite|bin|lock)$/i;
const MAX_BYTES = 1024 * 1024;
const STRONG = new Set(['sdk', 'framework', 'endpoint', 'model', 'tools', 'model_artifact']);

const compile = (s) => ({ ...s, re: new RegExp(s.pattern, s.flags || ''), filesRe: (s.files || []).map((f) => new RegExp(f)) });
const LINE_SIGS = SIGS.signatures.map(compile);
const PATH_SIGS = SIGS.path_signatures.map(compile);

function* walk(root, dir = root) {
  const names = readdirSync(dir).sort();
  for (const n of names) {
    const p = join(dir, n);
    const st = statSync(p, { throwIfNoEntry: false });
    if (!st) continue;
    if (st.isDirectory()) { if (!SKIP_DIRS.has(n)) yield* walk(root, p); } else yield p;
  }
}

export function scan(root) {
  const base = resolve(root);
  const evidence = [];
  let filesScanned = 0;
  for (const abs of walk(base)) {
    const rel = relative(base, abs).split(sep).join('/');
    const size = statSync(abs).size;
    const fileEvidence = [];
    for (const ps of PATH_SIGS) {
      if (!ps.re.test(rel)) continue;
      let quote = '';
      if (!ps.fileOnly && size <= MAX_BYTES && !BINARY_EXT.test(rel)) quote = (readFileSync(abs, 'utf8').split('\n').find((l) => l.trim()) || '').trim().slice(0, 200);
      fileEvidence.push({ category: ps.category, kind: ps.kind, file: rel, line: ps.fileOnly ? 0 : 1, quote, match: rel.split('/').pop() });
    }
    if (!BINARY_EXT.test(rel) && size <= MAX_BYTES) {
      filesScanned += 1;
      const text = readFileSync(abs, 'utf8');
      if (!text.includes('\u0000')) {
        const lines = text.split('\n');
        const hint = [];
        lines.forEach((line, i) => {
          for (const s of LINE_SIGS) {
            if (s.filesRe.length && !s.filesRe.some((r) => r.test(rel))) continue;
            const m = s.re.exec(line);
            if (!m) continue;
            const item = { category: s.category, kind: s.kind, file: rel, line: i + 1, quote: line.trim().slice(0, 200), match: m[1] || m[0] };
            (s.onlyInFilesWithAiEvidence ? hint : fileEvidence).push(item);
          }
        });
        const strong = fileEvidence.some((e) => STRONG.has(e.category));
        evidence.push(...fileEvidence, ...(strong ? hint : []));
        continue;
      }
    }
    evidence.push(...fileEvidence);
  }
  evidence.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.kind.localeCompare(b.kind));
  const seen = new Set();
  const unique = evidence.filter((e) => { const k = `${e.file}:${e.line}:${e.kind}:${e.match}`; if (seen.has(k)) return false; seen.add(k); return true; });
  unique.forEach((e, i) => { e.id = `E${String(i + 1).padStart(3, '0')}`; });
  const byFile = new Map();
  for (const e of unique) { if (!byFile.has(e.file)) byFile.set(e.file, new Set()); byFile.get(e.file).add(e.kind); }
  const files = [...byFile.entries()].map(([file, kinds]) => ({ file, kinds: [...kinds].sort() }));
  const count = (cat) => unique.filter((e) => e.category === cat).length;
  const categories = [...new Set(unique.map((e) => e.category))].sort();
  const models = [...new Set(unique.filter((e) => e.category === 'model').map((e) => e.match))].sort();
  const providers = [...new Set(unique.filter((e) => e.kind === 'model_api' || e.kind === 'local_runtime').map((e) => e.match))].sort();
  return {
    scanner: 'ai-use-register scan 1',
    root: '.',
    files_scanned: filesScanned,
    summary: { evidence: unique.length, files_with_evidence: files.length, models, endpoints: providers, counts: Object.fromEntries(categories.map((c) => [c, count(c)])) },
    files,
    evidence: unique,
  };
}

const USAGE = 'usage: scan.mjs <dir> [--out FILE]\nexit codes: 0 ok, 2 usage error';

export function main(argv) {
  const out = argv.indexOf('--out');
  const outFile = out >= 0 ? argv[out + 1] : null;
  const pos = argv.filter((a, i) => !a.startsWith('--') && !(out >= 0 && i === out + 1));
  if (argv.includes('--help')) { console.log(USAGE); return 0; }
  if (pos.length !== 1 || (out >= 0 && !outFile)) { console.error(USAGE); return 2; }
  let result;
  try { result = scan(pos[0]); } catch (e) { console.error(`cannot scan ${pos[0]}: ${e.message}`); return 2; }
  const text = JSON.stringify(result, null, 2) + '\n';
  if (outFile) writeFileSync(outFile, text); else process.stdout.write(text);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
