# Security Policy

## Supported versions

The latest **0.x** minor release receives security fixes.

## Reporting a vulnerability

Please use [GitHub private vulnerability reporting](https://github.com/RRigueira/react-native-iphone-duo/security/advisories/new).

Do **not** open a public issue for security reports.

Acknowledgement is expected within **7 days** (best-effort; single maintainer).

## Scope

### In scope

- The iOS turbo module or ObjC bridge exposing unsafe behaviour, crashes, or denial of service through the documented JS API (`getState`, `subscribe`, hooks).
- Incorrect fallbacks that throw on unsupported platforms instead of returning inert defaults.
- Supply-chain issues in the published npm package (tampered tarball, unexpected files in the package manifest).
- Native code that uses private APIs in a way that risks App Store rejection.

### Out of scope

- Layout bugs in consumer apps that misread `DuoState` frames or bar edge semantics.
- Missing Android support (documented; Android intentionally receives defaults only).
- Behaviour of Apple's Duo APIs on simulators or hardware outside what this library documents.
