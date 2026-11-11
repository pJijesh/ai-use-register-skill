import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scan } from '../skills/ai-use-register/scripts/scan.mjs';
import { validate, checkQuote, isRealDate, RULES, CONTROLS, ENUMS } from '../skills/ai-use-register/scripts/lib.mjs';
import { render } from '../skills/ai-use-register/scripts/report.mjs';
import { main as validateMain } from '../skills/ai-use-register/scripts/validate-register.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const S = join(ROOT, 'skills/ai-use-register/scripts');
const EX = join(ROOT, 'examples');
const TARGET = join(EX, 'target-app');
const tmp = () => mkdtempSync(join(tmpdir(), 'reg-'));
const clone = (o) => JSON.parse(JSON.stringify(o));
const REG = JSON.parse(readFileSync(join(EX, 'register.json'), 'utf8'));
const sys = (n = 0) => clone(REG.systems[n]);
const rulesFor = (system, opts = {}) => validate({ systems: [system] }, opts).map((f) => f.rule);
const withSystem = (mut, n = 0, opts) => { const s = sys(n); mut(s); return rulesFor(s, opts); };

test('scan finds the known evidence in the fictional app', () => {
  const r = scan(TARGET);
  assert.equal(r.summary.evidence, r.evidence.length);
  assert.deepEqual(r.summary.models, ['claude-sonnet-4-5', 'gpt-4o-mini', 'llama3.1:8b']);
  assert.deepEqual(r.summary.endpoints, ['api.openai.com', 'localhost:11434']);
  const kinds = new Set(r.evidence.map((e) => e.kind));
  for (const k of ['python_import', 'python_dependency', 'model_api', 'local_runtime', 'model_id', 'env_var', 'system_prompt', 'prompt_file', 'tool_definition', 'model_file', 'personal_data_hint']) assert.ok(kinds.has(k), k);
  const chat = r.evidence.find((e) => e.file === 'app/chat.py' && e.kind === 'tool_definition');
  assert.ok(chat && chat.line > 0);
});

test('scan output is deterministic and matches the committed file', () => {
  const a = JSON.stringify(scan(TARGET));
  assert.equal(a, JSON.stringify(scan(TARGET)));
  assert.equal(readFileSync(join(EX, 'ai-usage.json'), 'utf8'), JSON.stringify(scan(TARGET), null, 2) + '\n');
});

test('every scan quote is really on its line', () => {
  for (const e of scan(TARGET).evidence.filter((x) => x.line > 0)) {
    const line = readFileSync(join(TARGET, e.file), 'utf8').split('\n')[e.line - 1];
    assert.ok(line.includes(e.quote.slice(0, 40)), `${e.file}:${e.line}`);
  }
});

test('scan ignores dependency folders and binary files, and records model files by path only', () => {
  const dir = tmp();
  mkdirSync(join(dir, 'node_modules/x'), { recursive: true });
  writeFileSync(join(dir, 'node_modules/x/a.js'), "import OpenAI from 'openai';\n");
  writeFileSync(join(dir, 'a.py'), 'import openai\n');
  writeFileSync(join(dir, 'm.onnx'), 'binary-ish');
  const r = scan(dir);
  assert.deepEqual(r.evidence.map((e) => e.file).sort(), ['a.py', 'm.onnx']);
  assert.equal(r.evidence.find((e) => e.file === 'm.onnx').line, 0);
});

test('data hints only appear in files that also use AI', () => {
  const dir = tmp();
  writeFileSync(join(dir, 'plain.py'), 'candidate = 1\n');
  writeFileSync(join(dir, 'ai.py'), 'import anthropic\ncandidate = 1\n');
  const r = scan(dir);
  assert.deepEqual(r.evidence.filter((e) => e.kind === 'personal_data_hint').map((e) => e.file), ['ai.py']);
});

test('scan CLI: help, usage errors and a missing folder', () => {
  const sh = (...a) => spawnSync(process.execPath, [join(S, 'scan.mjs'), ...a], { encoding: 'utf8' });
  assert.equal(sh('--help').status, 0);
  assert.equal(sh().status, 2);
  assert.equal(sh(join(tmpdir(), 'no-such-folder-xyz')).status, 2);
  const out = join(tmp(), 'u.json');
  assert.equal(sh(TARGET, '--out', out).status, 0);
  assert.equal(JSON.parse(readFileSync(out, 'utf8')).files_scanned, 9);
  assert.equal(sh('--out', out, TARGET).status, 0, 'a path after --out still works when listed first');
});

test('the worked example validates with no errors and exactly the expected warnings', () => {
  const f = validate(REG, { root: TARGET, today: '2026-11-11' });
  assert.deepEqual(f.filter((x) => x.severity === 'error'), []);
  assert.deepEqual(f.map((x) => `${x.system}:${x.rule}`), ['AI-002:REG020', 'AI-004:REG021']);
});

test('REG001 bad shape', () => {
  assert.deepEqual(validate({}, {}).map((f) => f.rule), ['REG001']);
  assert.deepEqual(validate({ systems: [null] }, {}).map((f) => f.rule), ['REG001']);
});
test('REG002 missing fields', () => {
  assert.ok(withSystem((s) => { delete s.purpose; }).includes('REG002'));
  assert.ok(withSystem((s) => { delete s.data.personal_data; }).includes('REG002'));
  assert.ok(withSystem((s) => { s.models[0].name = ''; }).includes('REG002'));
  assert.ok(withSystem((s) => { s.risks[0].mitigation = ''; }).includes('REG002'));
});
test('REG003 ids', () => {
  assert.ok(withSystem((s) => { s.id = 'X1'; }).includes('REG003'));
  assert.ok(validate({ systems: [sys(0), sys(0)] }).some((f) => f.rule === 'REG003'));
});
test('REG004 enums', () => {
  assert.ok(withSystem((s) => { s.status = 'live'; }).includes('REG004'));
  assert.ok(withSystem((s) => { s.eu_ai_act.tier = 'medium'; }).includes('REG004'));
  assert.ok(withSystem((s) => { s.users = ['martians']; }).includes('REG004'));
  assert.ok(withSystem((s) => { s.risks[0].impact = 'huge'; }).includes('REG004'));
});
test('REG005 dates', () => {
  assert.ok(withSystem((s) => { s.last_reviewed = '2026-02-31'; }).includes('REG005'));
  assert.ok(withSystem((s) => { s.eu_ai_act.assessed_on = 'yesterday'; }).includes('REG005'));
});
test('REG006 review order', () => assert.ok(withSystem((s) => { s.next_review = s.last_reviewed; }).includes('REG006')));
test('REG007 live system needs an owner', () => {
  assert.ok(withSystem((s) => { s.owner = 'unknown'; }).includes('REG007'));
  assert.ok(!withSystem((s) => { s.owner = 'unknown'; s.status = 'idea'; }).includes('REG007'));
});
test('REG008 minimal needs both checks', () => {
  assert.ok(withSystem((s) => { s.eu_ai_act.annex_iii_checked = false; }, 2).includes('REG008'));
  assert.ok(withSystem((s) => { delete s.eu_ai_act.prohibited_checked; }, 2).includes('REG008'));
});
test('REG009 high risk needs an Annex III area', () => assert.ok(withSystem((s) => { delete s.eu_ai_act.annex_iii_area; }, 1).includes('REG009')));
test('REG010 prohibited cannot be live', () => {
  assert.ok(withSystem((s) => { s.eu_ai_act.tier = 'prohibited'; }, 1).includes('REG010'));
  assert.ok(!withSystem((s) => { s.eu_ai_act.tier = 'prohibited'; s.status = 'retired'; }, 1).includes('REG010'));
});
test('REG011 lawful basis', () => assert.ok(withSystem((s) => { delete s.lawful_basis; }).includes('REG011')));
test('REG012 DPIA for special category or high risk', () => {
  assert.ok(withSystem((s) => { s.dpia.status = 'not_required'; }, 1).includes('REG012'));
  assert.ok(withSystem((s) => { s.data.special_category = true; }).includes('REG012'));
  assert.ok(!withSystem((s) => { s.data.special_category = true; s.dpia.status = 'in_progress'; }).includes('REG012'));
});
test('REG013 production needs risks', () => assert.ok(withSystem((s) => { s.risks = []; }).includes('REG013')));
test('REG014 high risk needs oversight text', () => assert.ok(withSystem((s) => { delete s.human_oversight; }, 1).includes('REG014')));
test('REG015 unknown ISO control', () => assert.ok(withSystem((s) => { s.iso42001.controls.push('A.99.9'); }).includes('REG015')));
test('REG016 quote not in the file', () => {
  assert.ok(withSystem((s) => { s.evidence[0].quote = 'this text is not there'; }, 0, { root: TARGET }).includes('REG016'));
  assert.ok(withSystem((s) => { s.evidence[0].start_line = 999; s.evidence[0].end_line = 999; }, 0, { root: TARGET }).includes('REG016'));
  assert.ok(withSystem((s) => { s.evidence[0].start_line = 5; s.evidence[0].end_line = 4; }, 0, { root: TARGET }).includes('REG016'));
});
test('REG017 missing evidence file', () => assert.ok(withSystem((s) => { s.evidence[0].file = 'app/nope.py'; }, 0, { root: TARGET }).includes('REG017')));
test('REG018 path escape', () => {
  assert.ok(withSystem((s) => { s.evidence[0].file = '../../package.json'; }, 0, { root: TARGET }).includes('REG018'));
  assert.ok(withSystem((s) => { s.evidence[0].file = '/etc/passwd'; }, 0, { root: TARGET }).includes('REG018'));
});
test('REG019 production still needs_assessment', () => assert.ok(withSystem((s) => { s.eu_ai_act.tier = 'needs_assessment'; }).includes('REG019')));
test('REG020 high risk acting autonomously', () => assert.ok(withSystem((s) => { s.autonomy = 'acts_autonomously'; }, 1).includes('REG020')));
test('REG021 overdue review needs --today', () => {
  assert.ok(withSystem((s) => { s.next_review = '2026-01-01'; s.last_reviewed = '2025-06-01'; }, 0, { today: '2026-11-11' }).includes('REG021'));
  assert.ok(!withSystem((s) => { s.next_review = '2026-01-01'; s.last_reviewed = '2025-06-01'; }).includes('REG021'));
  assert.ok(!withSystem((s) => { s.status = 'retired'; s.next_review = '2026-01-01'; s.last_reviewed = '2025-06-01'; }, 0, { today: '2026-11-11' }).includes('REG021'));
});
test('REG022 production without controls', () => assert.ok(withSystem((s) => { s.iso42001.controls = []; }).includes('REG022')));
test('REG023 no evidence', () => assert.ok(withSystem((s) => { s.evidence = []; }).includes('REG023')));
test('REG024 no models', () => assert.ok(withSystem((s) => { s.models = []; }).includes('REG024')));

test('every rule is documented and tested', () => {
  const self = readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const doc = readFileSync(join(ROOT, 'README.md'), 'utf8');
  for (const r of RULES) {
    assert.ok(self.includes(`'${r.id}`) || self.includes(`${r.id} `), `${r.id} has a test`);
  }
  assert.ok(doc.includes(`${RULES.length} rules`));
});

test('controls.json matches the register and docs, and the enums match the schema', () => {
  const doc = readFileSync(join(ROOT, 'skills/ai-use-register/references/iso42001.md'), 'utf8');
  for (const c of CONTROLS) assert.ok(doc.includes(c.id), c.id);
  const schema = JSON.parse(readFileSync(join(ROOT, 'skills/ai-use-register/schema/register.schema.json'), 'utf8'));
  const props = schema.properties.systems.items.properties;
  assert.deepEqual(props.status.enum, ENUMS.status);
  assert.deepEqual(props.autonomy.enum, ENUMS.autonomy);
  assert.deepEqual(props.eu_ai_act.properties.tier.enum, ENUMS.tier);
  assert.deepEqual(props.eu_ai_act.properties.annex_iii_area.enum, ENUMS.annex_iii_area);
  assert.deepEqual(props.lawful_basis.enum, ENUMS.lawful_basis);
});

test('report is deterministic and matches the committed one', () => {
  const a = render(REG, '2026-11-11');
  assert.equal(a, render(clone(REG), '2026-11-11'));
  assert.equal(readFileSync(join(EX, 'REGISTER.md'), 'utf8'), a);
  assert.ok(a.includes('CV screening') && a.includes('high-risk (employment)'));
  assert.ok(!render(REG).includes('review was due'));
});

test('isRealDate and checkQuote', () => {
  assert.ok(isRealDate('2026-11-11') && !isRealDate('2026-11-31'));
  assert.equal(checkQuote(TARGET, REG.systems[0].evidence[0]), null);
  assert.equal(checkQuote(TARGET, { file: 'app/chat.py', start_line: 1, quote: 'nope' }).rule, 'REG016');
});

test('validate CLI: exit codes, --strict, --json, --rules and bad input', () => {
  const sh = (...a) => spawnSync(process.execPath, [join(S, 'validate-register.mjs'), ...a], { encoding: 'utf8' });
  const ok = join(EX, 'register.json');
  assert.equal(sh(ok, '--root', TARGET).status, 0);
  assert.equal(sh(ok, '--root', TARGET, '--today', '2026-11-11').status, 0);
  assert.equal(sh(ok, '--root', TARGET, '--today', '2026-11-11', '--strict').status, 1);
  const j = JSON.parse(sh(ok, '--root', TARGET, '--today', '2026-11-11', '--json').stdout);
  assert.equal(j.errors, 0);
  assert.equal(j.warnings, 2);
  assert.equal(sh('--rules').status, 0);
  assert.equal(sh().status, 2);
  assert.equal(sh(ok, '--today', 'nope').status, 2);
  assert.equal(sh(ok, '--root').status, 2);
  assert.equal(sh(join(tmpdir(), 'missing-register.json')).status, 2);
  const bad = join(tmp(), 'bad.json');
  writeFileSync(bad, '{ not json');
  assert.equal(sh(bad).status, 1);
  const broken = clone(REG);
  broken.systems[0].eu_ai_act.tier = 'maybe';
  const bp = join(tmp(), 'b.json');
  writeFileSync(bp, JSON.stringify(broken));
  assert.equal(sh(bp).status, 1);
});

test('validateMain keeps the first positional argument', () => {
  const lines = [];
  assert.equal(validateMain([join(EX, 'register.json'), '--root', TARGET], (m) => lines.push(m)), 0);
  assert.match(lines.at(-1), /4 system\(s\): 0 error\(s\), 1 warning\(s\)/);
});

test('report CLI writes a file and rejects bad input', () => {
  const sh = (...a) => spawnSync(process.execPath, [join(S, 'report.mjs'), ...a], { encoding: 'utf8' });
  const out = join(tmp(), 'R.md');
  assert.equal(sh(join(EX, 'register.json'), '--today', '2026-11-11', '--out', out).status, 0);
  assert.equal(readFileSync(out, 'utf8'), readFileSync(join(EX, 'REGISTER.md'), 'utf8'));
  assert.equal(sh().status, 2);
  assert.equal(sh(join(EX, 'register.json'), '--today', 'x').status, 2);
  assert.equal(sh(join(tmpdir(), 'nope.json')).status, 2);
});

test('README example numbers match the example register', () => {
  const r = readFileSync(join(ROOT, 'README.md'), 'utf8');
  assert.ok(r.includes(`${REG.systems.length} system(s): 0 error(s), 2 warning(s)`));
  assert.ok(r.includes(`${scan(TARGET).summary.evidence} pieces of evidence`));
});
