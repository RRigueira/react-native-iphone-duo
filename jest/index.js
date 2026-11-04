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

function useFoldRegion() {
  const { regions, hingeStatus } = useIphoneDuo();
  if (hingeStatus !== 'partiallyOpen') {
    return null;
  }
  return regions.find((r) => r.kind === 'division' && r.active) ?? null;
}

function __setState(partial) {
  _state = { ..._state, ...partial };
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
  __setState,
  __reset,
};
