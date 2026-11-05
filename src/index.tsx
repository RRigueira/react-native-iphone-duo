import { useSyncExternalStore } from 'react';

import native from './NativeIphoneDuo';
import type { NativeDuoState } from './NativeIphoneDuo';
import type {
  DuoState,
  FoldOrientation,
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
  foldOrientation: null,
};

const EDGES: readonly VerticalBarEdge[] = ['leading', 'trailing'];
const HINGES: readonly HingeStatus[] = ['closed', 'partiallyOpen', 'fullyOpen'];

// The fold runs along the long side of its region: a tall, narrow frame splits
// the display left and right, a wide, short one splits it top and bottom.
export function getFoldOrientation(region: ReservedRegion): FoldOrientation {
  return region.frame.width > region.frame.height ? 'horizontal' : 'vertical';
}

// The active fold region, present only while the device is partially open.
// UIKit can leave the region flagged active for a moment after the hinge has
// opened fully, so the hinge status is checked too.
function _activeFold(
  regions: ReservedRegion[],
  hingeStatus: HingeStatus
): ReservedRegion | null {
  if (hingeStatus !== 'partiallyOpen') {
    return null;
  }
  return regions.find((r) => r.kind === 'division' && r.active) ?? null;
}

export function _normalize(raw: NativeDuoState): DuoState {
  const hingeStatus = HINGES.find((s) => s === raw.hingeStatus) ?? 'unknown';
  const regions = (raw.regions ?? []).map((r): ReservedRegion => ({
    kind: r.kind === 'division' ? 'division' : 'occlusion',
    frame: { x: r.x, y: r.y, width: r.width, height: r.height },
    margins: {
      top: r.marginTop,
      left: r.marginLeft,
      bottom: r.marginBottom,
      right: r.marginRight,
    },
    active: r.active === true,
  }));
  const fold = _activeFold(regions, hingeStatus);

  return {
    isSupported: raw.isSupported === true,
    verticalBarEdge:
      EDGES.find((edge) => edge === raw.verticalBarEdge) ?? 'unspecified',
    hingeStatus,
    // UIHinge.angle is in radians (pi when flat, verified on the simulator).
    hingeAngle: Number.isFinite(raw.hingeAngle)
      ? (raw.hingeAngle * 180) / Math.PI
      : 0,
    regions,
    foldOrientation: fold ? getFoldOrientation(fold) : null,
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

// The active fold region, or null. See _activeFold for why the hinge status is
// part of the check.
export function useFoldRegion(): ReservedRegion | null {
  const { regions, hingeStatus } = useIphoneDuo();
  return _activeFold(regions, hingeStatus);
}

// Test helper: drops the cached state so each test starts clean.
export function _reset(): void {
  _state = DEFAULT_STATE;
  _started = false;
  _listeners.clear();
}
