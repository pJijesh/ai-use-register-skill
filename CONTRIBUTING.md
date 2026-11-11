# Contributing

Thanks for taking an interest. This is a small skill with small scripts: standard library only, deterministic output, plain wording.

## Ground rules

1. **Fictional examples only.** The example application and register describe an invented organisation. Never commit a real organisation's systems, owners, vendors, data or findings.
2. **No dependencies** in the skill or the scripts. Test tooling uses `node:test`.
3. **Every validator rule is tested and documented.** Add it to `rules.json` and `test/register.test.mjs`; a test fails if a rule has no test.
4. **Keep the scanner honest.** A new signature must have a fixture that shows it matching and a note on what it cannot tell you. Prefer precision over catching everything.
5. **Not legal advice.** Do not write guidance that states a legal conclusion as fact. Link to or name the article, and say it is a working assessment.
6. **Do not copy other projects.** Write your own wording and examples. Standard control titles are paraphrased; do not paste text from the standard.
7. **British English, plain tone, no long dashes.** A test fails if an em dash or en dash appears in a text file.

## Development

```bash
node --test                  # all tests
node scripts/build.mjs       # regenerate the adapters after editing core.md
node scripts/build.mjs --check
npm run verify:example
```

If you change `examples/target-app` or the signatures, regenerate `examples/ai-usage.json` with `scan.mjs`, update the register so the evidence lines still match, and re-render `examples/REGISTER.md` with `report.mjs --today 2026-11-11`.

## Suggesting a signature, rule or question

Open a suggestion. Show a short snippet the scanner should catch or a register mistake the validator should flag, and what it is commonly confused with.
