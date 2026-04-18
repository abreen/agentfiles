# ast-grep Rule Reference (Compact)

Use this file when writing or debugging non-trivial `sg scan` YAML rules.
For basic command flow and safety, use `rule-workflows.md` first.

## Rule Types

- Atomic: `pattern`, `kind`, `regex`, `nthChild`, `range`
- Relational: `inside`, `has`, `precedes`, `follows`
- Composite: `all`, `any`, `not`, `matches`

A rule object behaves like implicit AND across its fields.
If metavariable dependencies depend on ordering, use `all` explicitly.

## Quick Rule Key Guide

- `pattern`: best default for direct structure matching
- `kind`: pin node type when pattern is too broad
- `has`: require matching descendant
- `inside`: require matching ancestor
- `all`: combine required conditions
- `any`: match alternatives
- `not`: exclude a condition
- `matches`: reuse utility rule by id

## Start-Simple Progression

1. Write `pattern` only.
2. Add `kind` to reduce false positives.
3. Add `has` or `inside` for structural relations.
4. Add `all` / `any` / `not` only when needed.

## Relational Rules: `stopBy` Default Strategy

For `inside` and `has`, prefer:

```yaml
stopBy: end
```

Reason: avoids early cutoff from the default neighbor behavior.
Use custom `stopBy` rules only when you need bounded traversal.

## Core Snippets

### Atomic pattern

```yaml
rule:
  pattern: console.log($ARG)
```

### Relational descendant match

```yaml
rule:
  kind: function_declaration
  has:
    pattern: await $EXPR
    stopBy: end
```

### Relational ancestor match

```yaml
rule:
  pattern: console.log($$$)
  inside:
    kind: method_definition
    stopBy: end
```

### Composite rule

```yaml
rule:
  all:
    - kind: function_declaration
    - has:
        pattern: await $EXPR
        stopBy: end
    - not:
        has:
          pattern: try { $$$ } catch ($E) { $$$ }
          stopBy: end
```

## Metavariables

- `$VAR`: one named node capture
- `$$VAR`: one unnamed node capture (operators, punctuation fields)
- `$$$VAR`: zero or more sibling nodes
- `$_VAR`: non-capturing metavariable

### Validity rules

- Metavariable text must be the only content in its AST node.
- Reused metavariables require equal matched content.
- In double-quoted shell strings, escape as `\\$VAR` for inline rules.

## Pattern Object Form

Use object form when plain string pattern is ambiguous.

```yaml
rule:
  pattern:
    context: class A { $F }
    selector: field_definition
    strictness: relaxed
```

Useful `strictness` values include `cst`, `smart`, `ast`, `relaxed`, `signature`.

## Inline Rule Testing

```bash
echo "async function x(){ await fetch(); }" | sg scan --inline-rules 'id: t
language: JavaScript
rule:
  kind: function_declaration
  has:
    pattern: await $EXPR
    stopBy: end' --stdin
```

## Debugging Checklist

1. Inspect parse with `sg run --debug-query=pattern|ast|cst`.
2. Confirm language and node `kind` names.
3. Add or verify `stopBy: end` on relational rules.
4. Reduce rule to a minimal matching subset, then rebuild.
5. Use JSON output (`--json=stream`) for deterministic inspection.
