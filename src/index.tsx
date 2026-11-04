import { useSyncExternalStore } from 'react';

import native from './NativeIphoneDuo';
import type { NativeDuoState } from './NativeIphoneDuo';
import type {
  DuoState,
  HingeStatus,
  ReservedRegion,
  VerticalBarEdge,
} from './types';

export type * from './types';

export const DEFAULT_STATE: DuoState = {
  isSupported: false,
  verticalBarEdge: 'unspecified',
  hingeStatus: 'unknown',
  hingeAngle: 0,
  regions: [],
};

const EDGES: readonly VerticalBarEdge[] = ['leading', 'trailing'];
const HINGES: readonly HingeStatus[] = ['closed', 'partiallyOpen', 'fullyOpen'];

export function _normalize(raw: NativeDuoState): DuoState {
  return {
    isSupported: raw.isSupported === true,
    verticalBarEdge:
      EDGES.find((edge) => edge === raw.verticalBarEdge) ?? 'unspecified',
    hingeStatus: HINGES.find((s) => s === raw.hingeStatus) ?? 'unknown',
    // UIHinge.angle is in radians (pi when flat, verified on the simulator).
    hingeAngle: Number.isFinite(raw.hingeAngle)
      ? (raw.hingeAngle * 180) / Math.PI
      : 0,
    regions: (raw.regions ?? []).map((r): ReservedRegion => ({
      kind: r.kind === 'division' ? 'division' : 'occlusion',
      frame: { x: r.x, y: r.y, width: r.width, height: r.height },
      margins: {
        top: r.marginTop,
        left: r.marginLeft,
        bottom: r.marginBottom,
        right: r.marginRight,
      },
      active: r.active === true,
    })),
  };
}

// The snapshot must be referentially stable between native events, so it is
// cached here instead of being rebuilt on every read.
let _state: DuoState = DEFAULT_STATE;
let _started = false;
const _listeners = new Set<() => void>();

function _set(raw: NativeDuoState): void {
  _state = _normalize(raw);
  _listeners.forEach((listener) => listener());
}

function _start(): void {
  if (_started || native == null) {
    return;
  }
  _started = true;
  try {
    _state = _normalize(native.getState());
    native.onChange(_set);
  } catch {
    // A native failure must never take the app down: keep the defaults.
    _state = DEFAULT_STATE;
  }
}

export function getState(): DuoState {
  _start();
  return _state;
}

export function subscribe(listener: () => void): () => void {
  _start();
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}

export function useIphoneDuo(): DuoState {
  return useSyncExternalStore(subscribe, getState, getState);
}

// Physical side of the vertical bar, or null when the system has no preference.
// Resolved in LTR: `leading` is left. RTL is unverified, the HIG says bars stay
// on the same hardware side there.
export function useVerticalBarSide(): 'left' | 'right' | null {
  const { verticalBarEdge } = useIphoneDuo();
  if (verticalBarEdge === 'leading') {
    return 'left';
  }
  return verticalBarEdge === 'trailing' ? 'right' : null;
}

// The active fold region, present only while the device is partially open.
// UIKit can leave the region flagged active for a moment after the hinge has
// opened fully, so the hinge status is checked too.
export function useFoldRegion(): ReservedRegion | null {
  const { regions, hingeStatus } = useIphoneDuo();
  if (hingeStatus !== 'partiallyOpen') {
    return null;
  }
  return regions.find((r) => r.kind === 'division' && r.active) ?? null;
}

// Test helper: drops the cached state so each test starts clean.
export function _reset(): void {
  _state = DEFAULT_STATE;
  _started = false;
  _listeners.clear();
}
