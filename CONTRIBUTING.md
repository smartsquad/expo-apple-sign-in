# CONTRIBUTING

Rules live in [CONVENTIONS.md](./CONVENTIONS.md). Agent entrypoint: [AGENTS.md](./AGENTS.md).

## Before you start

1. Read CONVENTIONS.md.
2. Confirm Node 22 and npm. The example app needs Expo SDK 58 (`expo@~58.0.12`).
3. Work on `develop`. `main` is release and GitHub Pages only.

## Verify

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run docs:build
```

Local docs: `npm run docs:dev` at `http://127.0.0.1:43173/`. VitePress in `docs/`, same GitHub Pages pattern as images-in-motion.

End-to-end tests: install the browser once with `npx @e2e-dev/web install chromium`, then run `npm run test:e2e`. The config in `e2e.config.ts` starts the example web app on port 43180 and the docs site on port 43173 by itself.

Example (Expo SDK 58, web):

```bash
cd example
npm install
npm run web
```

Serves `http://127.0.0.1:43180`.

## Git

- Subject only, lowercase English, form `type: summary`.
- No commit body and no `Co-authored-by` trailers.
- Update `CHANGELOG.md` `[Unreleased]` in the same commit when behaviour or docs change.

## License

Contributions are MIT. Copyright holder: Smart Squad Srl.
