# Review rhythm

- Every system has `last_reviewed` and `next_review`. The validator checks that the next date is after the last, and with `--today` warns when it has passed.
- Suggested rhythm: high-risk and customer-facing systems every three to six months; internal and minimal systems yearly. Choose your own, and write it in your AI policy.
- Review sooner when: the model or vendor changes, the purpose changes, new data categories are added, an incident happens, or the law changes.
- At each review: rescan, compare with the previous `ai-usage.json`, ask the owner what changed, update risks and gaps, revalidate.
- Retire systems properly: set `status` to `retired`, keep the record, and note what was done with the data.
- Keep the register in version control. The diff is the audit trail.

## What the register is not

It is not a conformity assessment, a legal opinion, a certification or a substitute for a data protection impact assessment. It is the list that makes those things possible.
