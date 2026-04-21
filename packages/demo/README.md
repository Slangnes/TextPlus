# @textplus/demo

Status: empty workspace for example games and teaching materials.

## Purpose

`@textplus/demo` will hold playable reference games, smoke-test content, and later teaching materials that exercise the package stack in realistic combinations.

## Current Surface

| Path | Status | Notes |
|---|---|---|
| `package.json` | Minimal | Build/dev/lint scripts are placeholder shell echoes for now |
| `hello-world/` | Missing | First required demo slice for core E2E work |

## Verification

Run these from the repository root:

```bash
npm run build
npm run test:core:e2e
```

## Drift Rules

- Add one README section per demo once the folder exists.
- Keep demos tied to real package capabilities, not aspirational features.
- Use the repository `ROADMAP.md` for milestone sequencing and completion state.