import type { NativeDuoState } from '../NativeIphoneDuo';

const RAW: NativeDuoState = {
  isSupported: true,
  verticalBarEdge: 'trailing',
  hingeStatus: 'partiallyOpen',
  hingeAngle: (2 * Math.PI) / 3,
  regions: [
    {
      kind: 'division',
      x: 300,
      y: 0,
      width: 40,
      height: 600,
      marginTop: 0,
      marginLeft: 8,
      marginBottom: 0,
      marginRight: 8,
      active: true,
    },
    {
      kind: 'occlusion',
      x: 0,
      y: 0,
      width: 30,
      height: 30,
      marginTop: 0,
      marginLeft: 0,
      marginBottom: 0,
      marginRight: 0,
      active: false,
    },
  ],
};

function _load(native: unknown) {
  jest.resetModules();
  jest.doMock('../NativeIphoneDuo', () => ({
    __esModule: true,
    default: native,
  }));
  // React and the renderer must come from the same registry as the module
  // under test, or hooks see two copies of React.
  return {
    duo: require('../index') as typeof import('../index'),
    React: require('react') as typeof import('react'),
    renderer:
      require('react-test-renderer') as typeof import('react-test-renderer'),
  };
}

describe('without the native module (Android, old iOS)', () => {
  it('returns inert defaults', () => {
    const { duo } = _load(null);
    expect(duo.getState()).toEqual(duo.DEFAULT_STATE);
    expect(duo.getState().isSupported).toBe(false);
  });

  it('subscribe is a safe no-op', () => {
    const { duo } = _load(null);
    const listener = jest.fn();
    duo.subscribe(listener)();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('with the native module', () => {
  it('normalizes the native payload', () => {
    const { duo } = _load({
      getState: () => RAW,
      onChange: jest.fn(),
    });
    const state = duo.getState();
    expect(state.verticalBarEdge).toBe('trailing');
    expect(state.hingeStatus).toBe('partiallyOpen');
    expect(state.hingeAngle).toBeCloseTo(120, 5);
    expect(state.regions[0]).toMatchObject({
      kind: 'division',
      active: true,
      frame: { x: 300, width: 40 },
      margins: { left: 8, right: 8 },
    });
  });

  it('maps unknown strings to safe values', () => {
    const { duo } = _load({
      getState: () => ({
        ...RAW,
        verticalBarEdge: 'sideways',
        hingeStatus: 'wobbly',
        hingeAngle: Number.NaN,
      }),
      onChange: jest.fn(),
    });
    expect(duo.getState()).toMatchObject({
      verticalBarEdge: 'unspecified',
      hingeStatus: 'unknown',
      hingeAngle: 0,
    });
  });

  it('treats a missing regions array as empty', () => {
    const { duo } = _load({
      getState: () => {
        const withoutRegions = { ...RAW };
        delete (withoutRegions as { regions?: unknown }).regions;
        return withoutRegions as NativeDuoState;
      },
      onChange: jest.fn(),
    });
    expect(duo.getState().regions).toEqual([]);
  });

  it('keeps the snapshot stable until the native side emits', () => {
    const { duo } = _load({
      getState: () => RAW,
      onChange: jest.fn(),
    });
    expect(duo.getState()).toBe(duo.getState());
  });

  it('falls back to defaults when getState throws', () => {
    const { duo } = _load({
      getState: () => {
        throw new Error('boom');
      },
      onChange: jest.fn(),
    });
    expect(duo.getState()).toEqual(duo.DEFAULT_STATE);
  });

  it('re-renders hooks on native events', () => {
    let emit: (s: NativeDuoState) => void = () => {};
    const { duo, React, renderer } = _load({
      getState: () => ({ ...RAW, verticalBarEdge: 'unspecified' }),
      onChange: (cb: (s: NativeDuoState) => void) => {
        emit = cb;
      },
    });
    const seen: Array<'left' | 'right' | null> = [];
    function Probe() {
      seen.push(duo.useVerticalBarSide());
      return null;
    }
    renderer.act(() => {
      renderer.create(React.createElement(Probe));
    });
    renderer.act(() => emit(RAW));
    expect(seen[0]).toBeNull();
    expect(seen[seen.length - 1]).toBe('right');
  });

  it('ignores a stale active fold region once the hinge is fully open', () => {
    // UIKit can flag the region active for a beat after the hinge opened.
    const { duo, React, renderer } = _load({
      getState: () => ({ ...RAW, hingeStatus: 'fullyOpen' }),
      onChange: jest.fn(),
    });
    let region: unknown = 'unset';
    function Probe() {
      region = duo.useFoldRegion();
      return null;
    }
    renderer.act(() => {
      renderer.create(React.createElement(Probe));
    });
    expect(region).toBeNull();
  });

  it('exposes the fold region only while it is active', () => {
    const { duo, React, renderer } = _load({
      getState: () => ({
        ...RAW,
        regions: RAW.regions.map((r) => ({ ...r, active: false })),
      }),
      onChange: jest.fn(),
    });
    let region: unknown = 'unset';
    function Probe() {
      region = duo.useFoldRegion();
      return null;
    }
    renderer.act(() => {
      renderer.create(React.createElement(Probe));
    });
    expect(region).toBeNull();
  });

  it('maps leading edge to the left bar side', () => {
    const { duo, React, renderer } = _load({
      getState: () => ({ ...RAW, verticalBarEdge: 'leading' }),
      onChange: jest.fn(),
    });
    let side: 'left' | 'right' | null = null;
    function Probe() {
      side = duo.useVerticalBarSide();
      return null;
    }
    renderer.act(() => {
      renderer.create(React.createElement(Probe));
    });
    expect(side).toBe('left');
  });

  it('useIphoneDuo returns the cached snapshot', () => {
    const { duo, React, renderer } = _load({
      getState: () => RAW,
      onChange: jest.fn(),
    });
    let snapshot: unknown;
    function Probe() {
      snapshot = duo.useIphoneDuo();
      return null;
    }
    renderer.act(() => {
      renderer.create(React.createElement(Probe));
    });
    expect(snapshot).toEqual(duo.getState());
  });

  it('unsubscribe stops native-driven updates', () => {
    let emit: (s: NativeDuoState) => void = () => {};
    const { duo } = _load({
      getState: () => RAW,
      onChange: (cb: (s: NativeDuoState) => void) => {
        emit = cb;
      },
    });
    const listener = jest.fn();
    const unsub = duo.subscribe(listener);
    unsub();
    emit({ ...RAW, hingeAngle: 999 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('_start runs only once when native is present', () => {
    const getState = jest.fn(() => RAW);
    const { duo } = _load({
      getState,
      onChange: jest.fn(),
    });
    duo.getState();
    duo.getState();
    expect(getState).toHaveBeenCalledTimes(1);
  });
});

describe('_reset', () => {
  it('drops listeners so stale callbacks are not notified', () => {
    let emit: (s: NativeDuoState) => void = () => {};
    const { duo } = _load({
      getState: () => RAW,
      onChange: (cb: (s: NativeDuoState) => void) => {
        emit = cb;
      },
    });
    const listener = jest.fn();
    duo.subscribe(listener);
    duo._reset();
    emit({ ...RAW, hingeAngle: 1 });
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('fold orientation', () => {
  const frameOf = (width: number, height: number) => ({
    kind: 'division' as const,
    frame: { x: 0, y: 0, width, height },
    margins: { top: 0, left: 0, bottom: 0, right: 0 },
    active: true,
  });

  it('getFoldOrientation reads the long side of the frame', () => {
    const { duo } = _load(null);
    expect(duo.getFoldOrientation(frameOf(40, 669))).toBe('vertical');
    expect(duo.getFoldOrientation(frameOf(669, 40))).toBe('horizontal');
    // A square frame has no long side: treated as vertical.
    expect(duo.getFoldOrientation(frameOf(40, 40))).toBe('vertical');
  });

  it('is vertical for the active fold of a book-style pose', () => {
    const { duo } = _load({ getState: () => RAW, onChange: jest.fn() });
    expect(duo.getState().foldOrientation).toBe('vertical');
  });

  it('is horizontal for a wide, short fold region', () => {
    const wide = {
      ...RAW,
      regions: RAW.regions.map((r) =>
        r.kind === 'division' ? { ...r, width: 669, height: 40 } : r
      ),
    };
    const { duo } = _load({ getState: () => wide, onChange: jest.fn() });
    expect(duo.getState().foldOrientation).toBe('horizontal');
  });

  it('is null when the hinge is fully open, even if the region is stale', () => {
    const stale = { ...RAW, hingeStatus: 'fullyOpen' };
    const { duo } = _load({ getState: () => stale, onChange: jest.fn() });
    expect(duo.getState().foldOrientation).toBeNull();
  });

  it('is null when the fold region is inactive', () => {
    const inactive = {
      ...RAW,
      regions: RAW.regions.map((r) => ({ ...r, active: false })),
    };
    const { duo } = _load({ getState: () => inactive, onChange: jest.fn() });
    expect(duo.getState().foldOrientation).toBeNull();
  });

  it('is null without the native module', () => {
    const { duo } = _load(null);
    expect(duo.getState().foldOrientation).toBeNull();
  });
});
