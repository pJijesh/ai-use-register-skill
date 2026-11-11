# AI system register: Fernwood Services (fictional)

Register as of 2026-11-11. Generated from `register.json`; do not edit by hand. Tiers are working assessments, not legal advice.

4 system(s): 3 production, 1 pilot, 0 idea, 0 retired.

## Summary

| Id | System | Status | Owner | Tier | Confidence | Next review |
| --- | --- | --- | --- | --- | --- | --- |
| AI-001 | Customer chat assistant | production | Head of Customer Support | transparency | medium | 2027-05-10 |
| AI-002 | CV screening | pilot | Talent Acquisition Manager | high risk | high | 2027-02-10 |
| AI-003 | Meeting summariser | production | IT Operations Lead | minimal | medium | 2027-05-10 |
| AI-004 | Product recommender | production | E-commerce Manager | minimal | medium | 2026-10-01 |

## Tiers

prohibited: 0; high risk: 1; transparency: 1; gpai provider: 0; needs assessment: 0; minimal: 2.

## Needs attention

- AI-001 Customer chat assistant: gap, No evidence that customers are told they are talking to an AI system (A.8.2)
- AI-001 Customer chat assistant: gap, Refund approval step not evidenced (A.9.2)
- AI-002 CV screening: high-risk (employment); DPIA required not started.
- AI-002 CV screening: gap, No impact assessment on candidates yet (A.5.2, A.5.4)
- AI-002 CV screening: gap, No testing for biased outcomes (A.6.2.4)
- AI-002 CV screening: gap, Human review of rejections not evidenced
- AI-004 Product recommender: review was due 2026-10-01.

## Systems

### AI-001 Customer chat assistant

- Purpose: Answers customer questions about orders and returns in the help centre and can look up and refund orders.
- Status: production; owner: Head of Customer Support; users: customers
- Models: claude-sonnet-4-5 (Anthropic, vendor api)
- Data: customer messages, customer email address, order numbers; personal data yes; special category no; leaves the organisation yes
- Lawful basis: contract; DPIA: not required
- Autonomy: acts autonomously; oversight: Not evidenced in code. Owner to confirm whether a person approves refunds issued through the issue_refund tool.
- EU AI Act: transparency, role deployer, confidence medium, assessed 2026-11-10
- Rationale: A chatbot that talks to customers. No Annex III area applies on the facts available. The main obligation is to make clear to customers that they are talking to an AI system, which the code does not show.
- ISO/IEC 42001 controls: A.6.2.6 Operation and monitoring; A.8.2 User documentation and information; A.9.2 Processes for responsible use; A.9.4 Intended use; A.10.3 Suppliers
- Risks:
  - A customer message could instruct the assistant to issue refunds it should not (prompt injection). (likelihood medium, impact high). Mitigation: Cap refunds, require approval above a threshold, log every tool call.
  - The assistant gives a wrong answer about returns rights. (likelihood medium, impact medium). Mitigation: Ground answers in the published policy and offer a human route.
- Evidence: `app/chat.py:5`, `app/chat.py:17`, `app/chat.py:11`
- Last reviewed 2026-11-10; next review 2027-05-10

### AI-002 CV screening

- Purpose: Scores candidate CVs against a rubric and builds a shortlist for recruiters.
- Status: pilot; owner: Talent Acquisition Manager; users: staff, candidates
- Models: gpt-4o-mini (OpenAI, vendor api)
- Data: CV text, candidate name; personal data yes; special category no; leaves the organisation yes
- Lawful basis: legitimate interests; DPIA: required not started
- Autonomy: acts autonomously; oversight: Not evidenced in code: shortlist() drops candidates who score under 70 with no review step. Owner to confirm that recruiters review rejections.
- EU AI Act: high risk (employment), role deployer, confidence high, assessed 2026-11-10
- Rationale: The system filters and scores job applicants, which falls in the Annex III employment area. Deployer duties would apply, including human oversight and informing candidates. CVs can contain special category data even though none is requested.
- ISO/IEC 42001 controls: A.5.2 Impact assessment procedure; A.5.4 Effects on individuals and groups; A.6.2.4 Verification and validation; A.7.4 Data quality; A.9.4 Intended use; A.10.3 Suppliers
- Risks:
  - Candidates are rejected on a score no person has checked. (likelihood high, impact high). Mitigation: Require a person to review every rejection before it is acted on.
  - The model scores some groups of candidates lower for reasons unrelated to the job. (likelihood medium, impact high). Mitigation: Test outcomes by group on a sample before wider use, and keep the rubric job-related.
- Evidence: `app/cv_screen.py:10`, `app/cv_screen.py:13`, `app/cv_screen.py:26`
- Last reviewed 2026-11-10; next review 2027-02-10

### AI-003 Meeting summariser

- Purpose: Summarises internal meeting transcripts into five bullets using a model on the office server.
- Status: production; owner: IT Operations Lead; users: staff
- Models: llama3.1:8b (Meta (open weights), self hosted)
- Data: meeting transcripts; personal data yes; special category no; leaves the organisation no
- Lawful basis: legitimate interests; DPIA: not required
- Autonomy: suggests
- EU AI Act: minimal, role deployer, confidence medium, assessed 2026-11-10
- Rationale: Internal text summarisation that stays on the organisation's own server and informs no decision about a person.
- ISO/IEC 42001 controls: A.4.4 Tooling resources; A.6.2.6 Operation and monitoring; A.9.2 Processes for responsible use
- Risks:
  - A summary misstates a decision or an action owner. (likelihood medium, impact low). Mitigation: Label summaries as machine-generated and keep the transcript available.
- Evidence: `app/summarise.py:7`, `app/summarise.py:8`
- Last reviewed 2026-11-10; next review 2027-05-10

### AI-004 Product recommender

- Purpose: Suggests similar products from a nearest-neighbour model trained on browsing history.
- Status: production; owner: E-commerce Manager; users: customers
- Models: scikit-learn NearestNeighbors (in-house, embedded)
- Data: browsing history; personal data yes; special category no; leaves the organisation no
- Lawful basis: legitimate interests; DPIA: not required
- Autonomy: suggests
- EU AI Act: minimal, role provider, confidence medium, assessed 2026-04-01
- Rationale: A conventional machine learning recommender that shows product suggestions. The organisation built it and uses it, so it is both provider and deployer; the tier does not change.
- ISO/IEC 42001 controls: A.6.2.6 Operation and monitoring; A.7.4 Data quality
- Risks:
  - Recommendations narrow over time and favour popular items. (likelihood medium, impact low). Mitigation: Review click and purchase diversity each quarter.
- Evidence: `app/recommend.py:5`
- Last reviewed 2026-04-01; next review 2026-10-01
