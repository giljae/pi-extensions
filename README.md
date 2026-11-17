# pi-extensions

A monorepo of [Pi coding agent](https://pi.dev) packages published under the
`@giljae` npm scope.

## Packages

| Package | Description |
| --- | --- |
| [`@giljae/pi-egm`](packages/pi-egm) | Elephant-Goldfish Model spec-driven development for Pi, vendored from `google/elephant-goldfish-model` with a deterministic upstream sync. |

## Development

```bash
npm install
npm run check          # typecheck + tests
npm run sync-egm -- --ref v0.1.1 --package packages/pi-egm   # refresh vendored EGM
```

`packages/pi-egm/{skills,agents,resources,docs}` and `UPSTREAM.json` are
generated. Never hand-edit them; see [NOTICE](NOTICE).

This project is not an officially supported Google product.
