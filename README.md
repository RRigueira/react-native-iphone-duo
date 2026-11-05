# react-native-iphone-duo

iPhone Duo signals for React Native: which side the system puts its bars on, where the fold and cameras are, and the hinge posture. iOS-only, with inert defaults everywhere else.

[![npm version](https://img.shields.io/npm/v/react-native-iphone-duo.svg)](https://www.npmjs.com/package/react-native-iphone-duo)
[![npm license](https://img.shields.io/npm/l/react-native-iphone-duo.svg)](https://www.npmjs.com/package/react-native-iphone-duo)
[![CI](https://github.com/RRigueira/react-native-iphone-duo/actions/workflows/ci.yml/badge.svg)](https://github.com/RRigueira/react-native-iphone-duo/actions/workflows/ci.yml)
[![iOS 27.1+](https://img.shields.io/badge/iOS-27.1%2B-222)](https://developer.apple.com/iphone-duo/)
[![New Architecture](https://img.shields.io/badge/New%20Architecture-required-222)](https://reactnative.dev/docs/the-new-architecture/landing-page)

## What it does / doesn't

**Does:** expose three iOS 27.1 signals that React Native has no API for, as plain values and hooks:

| Signal | Native API | JS |
|---|---|---|
| Side the system puts its bars on | `UITraitCollection.verticalBarEdge` | `verticalBarEdge`, `useVerticalBarSide()` |
| Fold and camera regions | `UIView.reservedRegions(kind:)` | `regions`, `useFoldRegion()` |
| Hinge posture and angle | `UIHingeInteraction` | `hingeStatus`, `hingeAngle` |
| Which way the fold runs | derived from the fold region's frame | `foldOrientation`, `getFoldOrientation()` |

On Android, on iOS below 27.1 and on iPhones that do not fold, the module returns inert defaults (`isSupported: false`, `verticalBarEdge: 'unspecified'`, `hingeStatus: 'unknown'`, no regions). It never throws.

**Doesn't:** lay anything out for you (it reports where things are), replace the system's own bars (React Native views are not laid out by the system), move web content, run in **Expo Go**, or do anything on Android.

## Installation

### Expo

```sh
npx expo install react-native-iphone-duo
```

There is no config plugin: autolinking is enough. Run `npx expo prebuild` or use a development build. Expo Go is not supported.

### Bare React Native

```sh
yarn add react-native-iphone-duo
# or: npm install react-native-iphone-duo

cd ios && pod install
```

## Usage

```tsx
import {
  useIphoneDuo,
  useFoldRegion,
  useVerticalBarSide,
} from 'react-native-iphone-duo';

function Layout() {
  // 'left' | 'right' | null (null: the system has no preferred edge here)
  const side = useVerticalBarSide() ?? 'left';

  // Present only while the device is partially open.
  const fold = useFoldRegion();

  const { hingeStatus, hingeAngle, regions, foldOrientation } = useIphoneDuo();
  // foldOrientation: 'vertical' | 'horizontal' | null
  // ...
}
```

Typical uses:

- **Put your own bar where the system puts its bars.** Use `useVerticalBarSide()` for the side. The system reserves a strip along that edge for its status area and cameras, so start your bar below the lowest active `occlusion` region that overlaps the strip.
- **Keep a floating control off the fold.** While `useFoldRegion()` returns a region, clamp the control to one side of `region.frame`. `foldOrientation` tells you whether that means left/right (`'vertical'`) or above/below (`'horizontal'`).
- **Know when the device is a foldable.** `hingeStatus !== 'unknown'`, or `regions.length > 0`. `isSupported` only says the OS has the APIs.

## API reference

```ts
getState(): DuoState                       // cached snapshot, stable between native events
subscribe(listener): () => void            // notified when the snapshot changes
useIphoneDuo(): DuoState                   // the snapshot as a hook
useVerticalBarSide(): 'left' | 'right' | null
useFoldRegion(): ReservedRegion | null     // the active fold region, or null
getFoldOrientation(region): 'vertical' | 'horizontal'
DEFAULT_STATE: DuoState                    // the inert value used when unsupported
```

```ts
type DuoState = {
  isSupported: boolean;                    // the OS exposes the iOS 27.1 APIs
  verticalBarEdge: 'leading' | 'trailing' | 'unspecified';
  hingeStatus: 'unknown' | 'closed' | 'partiallyOpen' | 'fullyOpen';
  hingeAngle: number;                      // degrees, 0 closed to 180 flat; 0 when unknown
  regions: ReservedRegion[];
  foldOrientation: 'vertical' | 'horizontal' | null;  // null: no active fold
};

type ReservedRegion = {
  kind: 'occlusion' | 'division';          // occlusion: covered (cameras); division: the fold
  frame: { x: number; y: number; width: number; height: number };
  margins: { top: number; left: number; bottom: number; right: number };
  active: boolean;
};
```

Details that are easy to get wrong:

- **Units and space.** Frames are in points, relative to the app's root view, so they line up with `useWindowDimensions()`. A frame **already includes its margins** (Apple's `ReservedRegion` documentation), so do not add `margins` again.
- **Angle.** `UIHinge.angle` is radians natively; the library converts it to degrees.
- **Inactive regions are included.** The inner camera region is inactive until a camera is in use, and the fold region is inactive when the device is flat. Filter on `active`, or use `useFoldRegion()`.
- **`useFoldRegion()` also requires a partially open hinge**, because UIKit can leave the fold flagged active for a moment after the hinge opens fully.
- **Fold orientation.** A tall, narrow fold frame splits the display left and right (`'vertical'`, held like a book); a wide, short one splits it top and bottom (`'horizontal'`, held like a laptop). `foldOrientation` is `null` unless the hinge is partially open and the fold region is active.
- **`leading` / `trailing`** map to `left` / `right` in left-to-right layouts. Right-to-left is not verified (see Known gaps).
- **Lazy start.** The native observer starts on the first `getState()` or `subscribe()` call, which the hooks make for you.
- **Stable snapshot.** The same object is returned until the native side emits a change, so the hooks do not re-render needlessly.

## Testing with Jest

The package ships a mock with the same exports and in-memory state:

```ts
jest.mock('react-native-iphone-duo', () =>
  require('react-native-iphone-duo/jest')
);

const duo = require('react-native-iphone-duo/jest');

beforeEach(() => duo.__reset());

it('puts the bar on the right', () => {
  duo.__setState({ verticalBarEdge: 'trailing' });
  // render your component; hooks re-render on __setState
});
```

`__setState(partial)` merges into the state and notifies subscribers; `__reset()` restores `DEFAULT_STATE`.

## How this compares to similar packages

Several packages cover parts of the same ground. The table is based on each package's docs and npm metadata as of November 2026 and may be out of date; check their docs before choosing. "No" means the signal is not documented, not that it is impossible.

| | **react-native-iphone-duo** (this) | [`react-native-nitro-hinge`](https://www.npmjs.com/package/react-native-nitro-hinge) | [`expo-hinge`](https://docs.expo.dev/versions/latest/sdk/hinge/) | [`react-native-reserved-regions`](https://github.com/appandflow/react-native-reserved-regions) | [`@logicwind/react-native-fold-detection`](https://www.npmjs.com/package/@logicwind/react-native-fold-detection) | [`react-native-dualscreeninfo`](https://www.npmjs.com/package/react-native-dualscreeninfo) |
|---|---|---|---|---|---|---|
| Platforms | iOS 27.1+ (inert elsewhere) | iOS, iPadOS, Android | iOS 27.1+, Android 11+ | iOS 27.1+, Android 7+ (fold features need Jetpack WindowManager) | Android | Android (Surface Duo) |
| Hinge angle / posture | Yes | Yes | Yes (Android never reports `closed`) | No | Posture flags (tabletop, book, flat) | Spanning flag only |
| Fold region (`division`) | Yes, with active flag and orientation | Yes | No | Yes | Fold bounds on Android | Hinge component |
| Camera / status regions (`occlusion`) | Yes, with `active` and margins | No | No | Yes (frame only) | No | No |
| `verticalBarEdge` (side of the system bars) | **Yes** | No | No | No | No | No |
| Size classes, insets, font scale | No | Yes | No | No | No | No |
| Reanimated / UI-thread updates | No | No | Yes | No | No | No |
| Native layer | TurboModule | Nitro | Expo module | Fabric view | Native module | Native module |
| Jest mock | Yes (`/jest`) | Not checked | Not checked | Not checked | Not checked | Not checked |
| Last npm release seen | Not yet published | Nov 2026 | Oct 2026 | Sep 2026 | Aug 2025 | Sep 2026 |

Other options: Microsoft's dual-screen packages were Surface Duo only and `react-native-dual-screen` is deprecated on npm.

Use **this package** when you need to place your own UI where the Duo's system bars and cameras are: starting a side bar below the status area, ending it above a camera, or following the system's bar side. It is the only one here that exposes `verticalBarEdge`. Use **nitro-hinge** for one API across iOS and Android foldables, size classes and insets; **expo-hinge** for just the hinge angle with Reanimated support in an Expo app; **react-native-reserved-regions** for reserved regions on both iOS and Android through a provider view. They combine well, since this package does not replace any of that:

```tsx
import { useHinge } from 'react-native-nitro-hinge';
import { useVerticalBarSide, useFoldRegion } from 'react-native-iphone-duo';

function Shell() {
  const { widthClass } = useHinge();      // cross-platform size class
  const barSide = useVerticalBarSide();   // where the Duo puts its bars
  const fold = useFoldRegion();           // where the fold is, while it is open
  // ...
}
```

The fold orientation helper and the choice of the foreground-active scene were influenced by how nitro-hinge handles the same problems.

## Platform notes

### iOS

- The native module reads the signals from the app's root view. A transparent, non-interactive tracker view reads the reserved regions inside `updateConstraints`, which is the mechanism UIKit documents for re-running layout when a region changes. That covers the fold, the inner camera and the Dynamic Island growing for a Live Activity.
- The module reads the foreground-active scene's key window, falling back to a foreground-inactive scene and then to any window, so extra windows or scenes do not pick the wrong root view.
- Callbacks are delivered on the main queue and coalesced, since one fold gesture can produce dozens of native events.
- Measured on the iPhone Duo simulator (Xcode 27.2, iOS 27.2): the bar edge was `trailing` on the cover display and on the inner display in landscape, and `unspecified` on the inner display in portrait. The side safe-area inset was 84 pt on the bar edge. Treat these as observations, not guarantees: Apple has not published point sizes, so read the window and regions at runtime.

### Android

Not implemented. Every call returns the inert defaults.

## Requirements

- **New Architecture (TurboModule) required.** Developed and tested with React Native **0.88** and Expo SDK **58**; older versions are untested.
- **iOS 27.1 or later** for the signals. The iOS 27.1 calls are compiled behind a header check and an availability check; building against an older Xcode SDK has not been tested.
- **Expo Go is not supported**: use a development build or a bare native project.

## Known gaps

- Only verified on the iPhone Duo **simulator**, not on a physical device.
- Right-to-left: Apple says bars stay on the same hardware side; the `left` / `right` mapping here is not verified in RTL.
- No Android implementation, no example app.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
