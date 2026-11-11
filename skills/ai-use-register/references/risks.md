# Recording risks

A production system needs at least one recorded risk, and a pilot should have some. Keep each risk concrete: who is harmed or what goes wrong, how likely, how bad, and what reduces it.

```json
{
  "description": "Candidates are rejected on a score no person has checked.",
  "likelihood": "high",
  "impact": "high",
  "mitigation": "Require a person to review every rejection before it is acted on."
}
```

## Prompts for finding risks

- Wrong output: a confident error that someone acts on.
- Unfair output: different results for different groups for reasons unrelated to the task.
- Over-reach: the system can take actions (refunds, emails, deletions) and something unexpected triggers them. Prompt injection belongs here.
- Data: personal or confidential data sent to a vendor, or leaking through prompts or logs.
- Dependency: a vendor outage, a price change or a retired model breaks a process.
- Transparency: people do not know they are dealing with AI, or cannot reach a person.
- Drift: behaviour changes when the model or data changes and nobody notices.
- Misuse: staff use the tool for something it was not approved for.

Use likelihood and impact values `low`, `medium` or `high`. These are judgements, not scores; say so in the report.
