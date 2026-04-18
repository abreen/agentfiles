---
name: ast-grep-cli
description: Use ast-grep (`sg`) CLI for syntax-aware code search, codemods, and rule-based scanning. Trigger this skill when matching code by AST shape instead of plain text, rewriting code with metavariables, testing ast-grep rules, scaffolding sg projects/rules/tests, or exporting structured matches for automation.
---

# ast-grep CLI

## Overview

Use `sg` when plain text matching is ambiguous or brittle.
Translate user intent into AST patterns or YAML rules, test on focused examples, then search or rewrite safely.

## Workflow

1. Clarify target structure.
Collect language, inclusion rules, exclusion rules, and expected edge cases.

2. Build a minimal example snippet.
Create a short code sample that should match, plus one that should not match.

3. Choose mode before writing commands.
Use `sg run` for simple single-node pattern matching.
Use `sg scan` with YAML rule logic for relational or composite matching.

4. Validate rule behavior on the example first.
Start with the simplest rule, then add complexity only when needed.

5. Run on repository paths and verify results.
Use narrow paths and globs first, then broaden once confidence is high.

## Command Selection

Use `sg run` when:
- Pattern-only matching is enough
- You need quick one-off search or rewrite
- You do not need `has` / `inside` / `all` / `any` / `not`

Use `sg scan` when:
- You need relational logic such as `has` or `inside`
- You need composite logic such as `all`, `any`, or `not`
- You want reusable rules and tests in a project layout

## Rule Authoring Guardrails

1. Start simple.
Try `pattern` first, then add `kind`, then relational/composite rules.

2. Add `stopBy: end` for relational rules unless there is a specific reason not to.
This avoids premature traversal stops in `has` and `inside` queries.

3. Prefer explicit language selection.
Use `-l <lang>` for `sg run` and `language:` in YAML rules.

4. Escape metavariables in inline shell rule text.
Use `\\$EXPR` in double-quoted inline strings so shell expansion does not break the rule.

## Validate Before Full Scan

Use inline validation for fast iterations:

```bash
echo "async function test() { await fetch(); }" | sg scan --inline-rules 'id: test
language: JavaScript
rule:
  kind: function_declaration
  has:
    pattern: await $EXPR
    stopBy: end' --stdin
```

Use file-based validation for reusable rules:

```bash
sg scan --rule rules/async-with-await.yml path/to/example.js
```

Debug mismatches with query inspection:

```bash
sg run -p 'class $NAME { $$$BODY }' -l JavaScript --debug-query=pattern
sg run -p 'class User { constructor() {} }' -l JavaScript --debug-query=cst
```

## Search and Rewrite Patterns

```bash
# Simple pattern search
sg run -p 'console.log($$$ARGS)' -l TypeScript --globs '**/*.ts' .

# Interactive rewrite
sg run -p 'console.log($$$ARGS)' -r 'logger.debug($$$ARGS)' -l TypeScript -i .

# Apply all rewrites only after validation
sg run -p 'console.log($$$ARGS)' -r 'logger.debug($$$ARGS)' -l TypeScript -U .

# Rule-based scan
sg scan --rule rules/no-console-log.yml .

# Rule tests
sg test
```

## Safety Checklist

1. Narrow scope first with explicit paths, `-l`, and `--globs`.
2. Dry-run first by searching before rewriting, or use `-i`.
3. Prefer structured output (`--json=stream`) for automation.
4. Use `-U` only after manual or automated verification.
5. Re-run lint, typecheck, and tests after rewrites.
6. Use `--inspect=summary` to debug file and rule discovery.

## Troubleshooting

- No matches: set language explicitly and inspect the query AST.
- Too many matches: tighten pattern and path/glob scope.
- Missing files: inspect ignore behavior and add targeted `--no-ignore` flags.
- Unexpected rule test diffs: run `sg test` first, then `sg test -U` only for intentional updates.

## Resources

Use [rule-workflows.md](references/rule-workflows.md) for command templates and generated file skeletons.
Use [rule-reference.md](references/rule-reference.md) when writing or debugging YAML rule logic and metavariables.
