export type VerticalBarEdge = 'leading' | 'trailing' | 'unspecified';

export type HingeStatus = 'unknown' | 'closed' | 'partiallyOpen' | 'fullyOpen';

// `occlusion` regions (cameras) are covered; `division` regions (the fold)
// split the display into usable halves.
export type ReservedRegionKind = 'occlusion' | 'division';

export type ReservedRegion = {
  kind: ReservedRegionKind;
  // Points, relative to the app's root view. Already includes the margins, so
  // do not add them again.
  frame: { x: number; y: number; width: number; height: number };
  margins: { top: number; left: number; bottom: number; right: number };
  active: boolean;
};

export type DuoState = {
  // True when the OS exposes the iOS 27.1 APIs. Says nothing about whether the
  // device actually folds: check `hingeStatus` or `regions` for that.
  isSupported: boolean;
  verticalBarEdge: VerticalBarEdge;
  hingeStatus: HingeStatus;
  // Degrees, 0 closed to 180 flat. 0 when unknown.
  hingeAngle: number;
  regions: ReservedRegion[];
};
