# Contributing

Contributions are always welcome, no matter how large or small!

We want this community to be friendly and respectful to each other. Please follow it in all your interactions with the project. Before contributing, please read the [code of conduct](./CODE_OF_CONDUCT.md).

## Development workflow

This repository is a single npm package (`src/`, `ios/`, published `lib/`). There is no Android implementation and no bundled example app.

Install the Node version from [`.nvmrc`](./.nvmrc), then:

```sh
yarn
```

Build TypeScript output before publishing or linking into an app:

```sh
yarn prepare
```

`lib/` is gitignored; a clean checkout needs `yarn prepare` (runs [react-native-builder-bob](https://github.com/callstack/react-native-builder-bob)).

> Use Yarn 4 as configured in the repo ([`packageManager`](./package.json)); do not use `npm install` for day-to-day development.

### Verifying native behaviour

CI runs JavaScript checks only (lint, typecheck, Jest, `bob build`). Compiling `ios/` against the iOS 27.1 SDK requires Xcode 27.1+ and is not run on every PR in GitHub Actions yet.

To exercise the turbo module on device or simulator:

1. Link this package into a React Native app with the New Architecture enabled (any app that supports iOS 27.1).
2. Run on the **iPhone Duo** simulator (iOS 27.1+) and confirm `getState()` / hooks update when folding, bar edge, or reserved regions change.
3. Confirm older iOS simulators and Android still receive inert defaults and never throw.

Document what you tested in the pull request template.

### Quality checks

```sh
yarn typecheck
yarn lint
yarn lint --fix   # formatting via eslint-plugin-prettier
yarn test
yarn test --coverage
```

Git hooks use [Lefthook](https://github.com/evilmartians/lefthook): pre-commit runs ESLint on staged files and `tsc`; commit-msg runs [commitlint](https://commitlint.js.org/) (conventional commits). After dependencies are installed, run `yarn lefthook install` once if hooks are not active (requires `lefthook` in devDependencies).

### Scripts

| Script | Purpose |
| --- | --- |
| `yarn` | Install dependencies (Yarn 4, immutable lockfile) |
| `yarn prepare` | Build `lib/` via bob |
| `yarn typecheck` | TypeScript (`tsc`) |
| `yarn lint` | ESLint on `src/` |
| `yarn test` | Jest unit tests |
| `yarn release` | [release-it](https://github.com/release-it/release-it) version bump (maintainers) |

### Sending a pull request

> **Working on your first pull request?** See [How to Contribute to an Open Source Project on GitHub](https://app.egghead.io/playlists/how-to-contribute-to-an-open-source-project-on-github).

When you open a PR:

- Prefer small, focused changes.
- Run `yarn typecheck`, `yarn lint`, and `yarn test`.
- Update the README when behaviour or the public API changes.
- Follow the pull request template.
- For large API or architecture changes, open an issue first.

## Releases

Maintainers use `yarn release` ([release-it](https://github.com/release-it/release-it)) on `main` with a clean working tree. It bumps the version, updates `CHANGELOG.md`, tags, and opens a GitHub release. npm publish runs from the Release workflow with OIDC trusted publishing when the release is published.

Commit messages should follow [Conventional Commits](https://www.conventionalcommits.org/) so changelog generation stays accurate.
