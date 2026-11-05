'use strict';

/**
 * Jest mock for `react-native-iphone-duo`.
 *
 *   jest.mock(
 *     'react-native-iphone-duo',
 *     () => require('react-native-iphone-duo/jest')
 *   );
 */

const { useSyncExternalStore } = require('react');

const DEFAULT_STATE = {
  isSupported: false,
  verticalBarEdge: 'unspecified',
  hingeStatus: 'unknown',
  hingeAngle: 0,
  regions: [],
  foldOrientation: null,
};

let _state = DEFAULT_STATE;
const _listeners = new Set();

function _notify() {
  _listeners.forEach((listener) => listener());
}

function getState() {
  return _state;
}

function subscribe(listener) {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}

function useIphoneDuo() {
  return useSyncExternalStore(subscribe, getState, getState);
}

function useVerticalBarSide() {
  const { verticalBarEdge } = useIphoneDuo();
  if (verticalBarEdge === 'leading') {
    return 'left';
  }
  return verticalBarEdge === 'trailing' ? 'right' : null;
}

function getFoldOrientation(region) {
  return region.frame.width > region.frame.height ? 'horizontal' : 'vertical';
}

function _activeFold(regions, hingeStatus) {
  if (hingeStatus !== 'partiallyOpen') {
    return null;
  }
  return regions.find((r) => r.kind === 'division' && r.active) ?? null;
}

function useFoldRegion() {
  const { regions, hingeStatus } = useIphoneDuo();
  return _activeFold(regions, hingeStatus);
}

// Like the real module, the fold orientation follows the regions and hinge
// unless a test sets it explicitly.
function __setState(partial) {
  const next = { ..._state, ...partial };
  if (!('foldOrientation' in partial)) {
    const fold = _activeFold(next.regions, next.hingeStatus);
    next.foldOrientation = fold ? getFoldOrientation(fold) : null;
  }
  _state = next;
  _notify();
}

function __reset() {
  _state = DEFAULT_STATE;
  _notify();
}

module.exports = {
  __esModule: true,
  DEFAULT_STATE,
  getState,
  subscribe,
  useIphoneDuo,
  useVerticalBarSide,
  useFoldRegion,
  getFoldOrientation,
  __setState,
  __reset,
};
