# Reading the scan

`scan.mjs` walks a folder, skips dependency and build folders and binary files, and records evidence with a file, a line and a quote. It is deterministic: the same folder gives the same output.

## Evidence kinds

| Category | Kinds | What it tells you | What it does not |
| --- | --- | --- | --- |
| sdk | python_import, js_import, python_dependency, js_dependency | A library for a model or machine learning is in use or declared | That the code path is live, or what it is used for |
| framework | agent_framework | An agent or orchestration framework | What tools the agent has |
| endpoint | model_api, local_runtime | A hosted model API or a local runtime is called | Which data is sent |
| model | model_id | A named model | Whether it is the one in production |
| prompt | system_prompt, prompt_file | Instructions given to a model | Whether the instructions are good |
| tools | tool_definition | The model may be given tools | Whether actions need approval |
| secret_reference | env_var | A key for a vendor is expected | Anything about the key itself |
| model_artifact | model_file | A trained model file is stored | How it was trained |
| data_hint | personal_data_hint | A word often linked to personal data appears in a file that also uses AI | That personal data is processed. Weak signal. |

## Cautions

- Absence is not evidence of absence. AI built into bought software, browser extensions, spreadsheets and chat tools used by staff does not appear in a code scan. Ask the owner about those separately.
- A dependency is not a use. Check that the code path is reached.
- A data hint is a prompt to ask a question, not a finding.
- Model identifiers go stale. Record what the code says and note the date of the scan.
- Never paste scan output that contains secrets into a report. The scanner records variable names only, but check anyway.

## Grouping into systems

Group by purpose and users. Two files calling the same model for the same customer-facing job are one system. One file serving two different purposes is two. Name the system in words the owner would use.
