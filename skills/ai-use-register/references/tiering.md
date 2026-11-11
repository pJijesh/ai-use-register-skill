# Working EU AI Act tier

This is a working assessment, not a legal opinion. Regulation (EU) 2024/1689 and its amendments change over time, including application dates; check the current text and a dated source before relying on any date, and take advice for anything that matters. The tiers below are the register's labels, not terms the Act defines in this form.

## Order of questions

1. Is it an AI system at all? A system that infers from its input how to generate outputs such as predictions, recommendations, content or decisions. Plain rules, thresholds and lookup tables are not.
2. Prohibited practices (Article 5). Does it do any of these: manipulate or exploit people in harmful ways, social scoring, certain predictive policing, untargeted scraping of facial images, emotion recognition in workplaces and schools, biometric categorisation of sensitive traits, certain real-time remote biometric identification? If yes or possibly, tier `prohibited` or `needs_assessment`, and stop the system until resolved. Record `prohibited_checked`.
3. Annex III areas. Is it used in: biometrics, critical infrastructure, education and vocational training, employment and worker management, access to essential private or public services and benefits, law enforcement, migration, asylum and border control, administration of justice and democratic processes? If yes, it is probably `high_risk`; record the area as `annex_iii_area`. There are narrow exceptions in the Act for systems that do not pose a significant risk; record your reasoning if you rely on one. Record `annex_iii_checked`.
4. Is it a product or safety component covered by listed EU product law? If so, high-risk rules may apply through that route. Needs specialist advice; use `needs_assessment`.
5. Transparency (Article 50). Does it talk to people (they must be told it is AI), generate or alter images, audio, video or text that could be mistaken for authentic, recognise emotions or categorise people biometrically? If yes, `transparency`.
6. General-purpose AI models (Articles 51 onwards). Did the organisation itself train and place a general-purpose model on the market? If yes, `gpai_provider`. Using someone else's model does not make you its provider.
7. Otherwise `minimal`, but only if steps 2 and 3 were checked and recorded.

## Role

- `deployer`: uses an AI system under its own authority. Most organisations, most of the time.
- `provider`: develops it, or has it developed, and puts it into service under its own name.
- `both`: builds and uses its own.
- `not_assessed`: you have not worked it out yet.

Substantial modification or putting your name on another's system can make a deployer a provider; flag it.

## What to record

- `tier`, `role`, `confidence` (low, medium, high), `basis` (the reasons, with article or annex references), `rationale` (plain words), `assessed_on`.
- For high risk: `annex_iii_area`, `human_oversight`, and a DPIA status.
- Low confidence means say so and use `needs_assessment` rather than picking the milder tier.

## Also check

- AI literacy (Article 4): people who operate or use AI systems need enough understanding for their role.
- Personal data under data protection law. A lawful basis is required and a data protection impact assessment is likely for high-risk uses and special category data.
