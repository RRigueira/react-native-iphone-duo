import * as real from '../index';

const mock = require('../../jest/index.js') as typeof import('../../jest');

function _publicExportKeys(mod: Record<string, unknown>): string[] {
  return Object.keys(mod)
    .filter(
      (key) => !key.startsWith('__') && key !== '_normalize' && key !== '_reset'
    )
    .sort();
}

describe('jest mock (react-native-iphone-duo/jest)', () => {
  afterEach(() => {
    mock.__reset();
  });

  it('exports the same public names as the real module', () => {
    expect(_publicExportKeys(mock)).toEqual(_publicExportKeys(real));
  });

  it('starts from DEFAULT_STATE', () => {
    expect(mock.getState()).toEqual(mock.DEFAULT_STATE);
    expect(mock.getState()).toEqual(real.DEFAULT_STATE);
  });

  it('__setState merges and updates getState', () => {
    mock.__setState({
      isSupported: true,
      verticalBarEdge: 'leading',
      hingeAngle: 45,
    });
    expect(mock.getState()).toMatchObject({
      isSupported: true,
      verticalBarEdge: 'leading',
      hingeAngle: 45,
      hingeStatus: 'unknown',
      regions: [],
    });
  });

  it('__reset restores DEFAULT_STATE', () => {
    mock.__setState({ isSupported: true, verticalBarEdge: 'trailing' });
    mock.__reset();
    expect(mock.getState()).toEqual(mock.DEFAULT_STATE);
  });

  it('re-renders hooks when __setState runs', () => {
    const React = require('react') as typeof import('react');
    const renderer =
      require('react-test-renderer') as typeof import('react-test-renderer');

    const seen: Array<'left' | 'right' | null> = [];
    function Probe() {
      seen.push(mock.useVerticalBarSide());
      return null;
    }

    renderer.act(() => {
      renderer.create(React.createElement(Probe));
    });
    expect(seen).toEqual([null]);

    renderer.act(() => {
      mock.__setState({ verticalBarEdge: 'trailing' });
    });
    expect(seen[seen.length - 1]).toBe('right');

    renderer.act(() => {
      mock.__setState({ verticalBarEdge: 'leading' });
    });
    expect(seen[seen.length - 1]).toBe('left');
  });

  it('useFoldRegion reflects __setState regions', () => {
    const React = require('react') as typeof import('react');
    const renderer =
      require('react-test-renderer') as typeof import('react-test-renderer');

    let region: unknown = 'unset';
    function Probe() {
      region = mock.useFoldRegion();
      return null;
    }

    renderer.act(() => {
      renderer.create(React.createElement(Probe));
    });
    expect(region).toBeNull();

    const fold = {
      kind: 'division' as const,
      frame: { x: 1, y: 2, width: 3, height: 4 },
      margins: { top: 0, left: 0, bottom: 0, right: 0 },
      active: true,
    };

    renderer.act(() => {
      mock.__setState({ regions: [fold], hingeStatus: 'partiallyOpen' });
    });
    expect(region).toEqual(fold);
  });
});
