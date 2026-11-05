#import "IphoneDuo.h"

#import "IDDuoReader.h"
#import "IDRegionTrackerView.h"

#import <React/RCTInvalidating.h>
#import <React/RCTUtils.h>
#import <UIKit/UIKit.h>

using namespace facebook::react;

#if ID_HAS_DUO_SDK
// Main queue only. Clears the callback first so a late region pass can't fire
// into the module being torn down.
API_AVAILABLE(ios(27.1))
static void _IDDetachUIKit(UIView *view, id traitRegistration, id hingeInteraction, IDRegionTrackerView *regionTracker)
{
  if (traitRegistration != nil) {
    [view unregisterForTraitChanges:traitRegistration];
  }
  if (hingeInteraction != nil) {
    [view removeInteraction:hingeInteraction];
  }
  regionTracker.onRegionsChanged = nil;
  [regionTracker removeFromSuperview];
}
#endif

@interface IphoneDuo () <RCTInvalidating>
@end

@implementation IphoneDuo {
  BOOL _invalidated;
  NSString *_hingeStatus;
  double _hingeAngle;
  NSDictionary *_lastState;
  BOOL _emitScheduled;
  __weak UIView *_observedView;
  id _hingeInteraction;
  id _traitRegistration;
  IDRegionTrackerView *_regionTracker;
}

- (instancetype)init
{
  if (self = [super init]) {
    _hingeStatus = @"unknown";
    // A new scene can bring a new root view, so look again when one activates.
    [NSNotificationCenter.defaultCenter addObserver:self
                                           selector:@selector(_sceneDidActivate)
                                               name:UISceneDidActivateNotification
                                             object:nil];
  }
  return self;
}

// The bridge invalidates the module on its method queue when it reloads, but
// UIKit only allows view and interaction changes on the main queue (removing a
// UIHingeInteraction elsewhere trips a dispatch assert and kills the app).
// Tearing down here rather than in `dealloc` lets the main-queue block keep
// `self` alive, so no KVO or notification callback can reach a dying object.
- (void)invalidate
{
  [NSNotificationCenter.defaultCenter removeObserver:self];
  dispatch_async(dispatch_get_main_queue(), ^{
    self->_invalidated = YES;
    UIView *view = self->_observedView;
    if (view != nil) {
      [self _detachFrom:view];
    }
  });
}

// Fallback for a module released without `invalidate`: KVO does not retain its
// observer, so it must be removed before `self` goes, even off the main queue.
- (void)dealloc
{
  [NSNotificationCenter.defaultCenter removeObserver:self];
#if ID_HAS_DUO_SDK
  if (@available(iOS 27.1, *)) {
    UIView *view = _observedView;
    if (view == nil) {
      return;
    }
    [view removeObserver:self forKeyPath:@"bounds"];

    id traitRegistration = _traitRegistration;
    id hingeInteraction = _hingeInteraction;
    IDRegionTrackerView *regionTracker = _regionTracker;
    dispatch_block_t detach = ^{
      _IDDetachUIKit(view, traitRegistration, hingeInteraction, regionTracker);
    };
    if (NSThread.isMainThread) {
      detach();
    } else {
      dispatch_async(dispatch_get_main_queue(), detach);
    }
  }
#endif
}

+ (NSString *)moduleName
{
  return @"IphoneDuo";
}

- (std::shared_ptr<TurboModule>)getTurboModule:(const ObjCTurboModule::InitParams &)params
{
  return std::make_shared<NativeIphoneDuoSpecJSI>(params);
}

- (NSDictionary *)getState
{
  __block NSDictionary *state = nil;
  RCTUnsafeExecuteOnMainQueueSync(^{
    [self _ensureObserving];
    state = [self _computeState];
    self->_lastState = state;
  });
  return state;
}

#pragma mark - Observation (main queue)

- (NSDictionary *)_computeState
{
  return [IDDuoReader stateForView:_observedView ?: [IDDuoReader rootView]
                       hingeStatus:_hingeStatus
                        hingeAngle:_hingeAngle];
}

// UIKit documents these callbacks as main-queue, but the ivars below are also
// read from `getState` on the main queue, so enforce it instead of assuming.
- (void)_onMain:(dispatch_block_t)block
{
  if (NSThread.isMainThread) {
    block();
  } else {
    dispatch_async(dispatch_get_main_queue(), block);
  }
}

- (void)_sceneDidActivate
{
  [self _onMain:^{
    [self _ensureObserving];
    [self _scheduleEmit];
  }];
}

- (void)_emitIfChanged
{
  NSDictionary *state = [self _computeState];
  if ([state isEqualToDictionary:_lastState]) {
    return;
  }
  _lastState = state;
  [self emitOnChange:state];
}

- (void)_scheduleEmit
{
  if (_emitScheduled) {
    return;
  }
  _emitScheduled = YES;
  // Coalesce bursts (fold, trait and bounds changes arrive together).
  dispatch_async(dispatch_get_main_queue(), ^{
    self->_emitScheduled = NO;
    [self _emitIfChanged];
  });
}

- (void)_ensureObserving
{
  if (_invalidated) {
    return;
  }
  UIView *view = [IDDuoReader rootView];
  if (view == _observedView) {
    return;
  }
  if (view == nil) {
    // No root view any more (scene teardown): stop observing a dead hierarchy.
    UIView *stale = _observedView;
    if (stale != nil) {
      [self _detachFrom:stale];
    }
    return;
  }
  UIView *previous = _observedView;
  if (previous != nil) {
    [self _detachFrom:previous];
  }
  _observedView = view;

#if ID_HAS_DUO_SDK
  if (@available(iOS 27.1, *)) {
    __weak __typeof(self) weakSelf = self;

    UIHingeInteraction *hinge =
        [[UIHingeInteraction alloc] initWithUpdateHandler:^(UIHingeInteraction *interaction, UIHingeInteractionUpdate *update) {
          UIHinge *latest = update.hinge;
          [weakSelf _onMain:^{
            [weakSelf _applyHinge:latest];
          }];
        }];
    [view addInteraction:hinge];
    _hingeInteraction = hinge;

    NSMutableArray<UITrait> *traits = [NSMutableArray arrayWithArray:UITraitCollection.systemTraitsAffectingVerticalBarEdge];
    [traits addObject:UITraitHorizontalSizeClass.class];
    [traits addObject:UITraitVerticalSizeClass.class];
    _traitRegistration = [view registerForTraitChanges:traits
                                           withHandler:^(__kindof id<UITraitEnvironment> environment, UITraitCollection *previousTraits) {
                                             [weakSelf _onMain:^{
                                               [weakSelf _scheduleEmit];
                                             }];
                                           }];

    [view addObserver:self forKeyPath:@"bounds" options:0 context:nil];

    IDRegionTrackerView *tracker = [IDRegionTrackerView new];
    tracker.onRegionsChanged = ^{
      [weakSelf _onMain:^{
        [weakSelf _scheduleEmit];
      }];
    };
    [tracker attachTo:view];
    _regionTracker = tracker;
  }
#endif
}

- (void)_detachFrom:(UIView *)view
{
#if ID_HAS_DUO_SDK
  if (@available(iOS 27.1, *)) {
    [view removeObserver:self forKeyPath:@"bounds"];
    _IDDetachUIKit(view, _traitRegistration, _hingeInteraction, _regionTracker);
    _traitRegistration = nil;
    _hingeInteraction = nil;
    _regionTracker = nil;
  }
#endif
  // The hinge belongs to the hierarchy being left; the next interaction reports
  // the new one.
  _hingeStatus = @"unknown";
  _hingeAngle = 0;
  _observedView = nil;
}

- (void)observeValueForKeyPath:(NSString *)keyPath
                      ofObject:(id)object
                        change:(NSDictionary *)change
                       context:(void *)context
{
  [self _onMain:^{
    [self _scheduleEmit];
  }];
}

#if ID_HAS_DUO_SDK
- (void)_applyHinge:(UIHinge *)hinge API_AVAILABLE(ios(27.1))
{
  if (hinge == nil) {
    _hingeStatus = @"unknown";
    _hingeAngle = 0;
  } else {
    switch (hinge.status) {
      case UIHingeStatusClosed:
        _hingeStatus = @"closed";
        break;
      case UIHingeStatusPartiallyOpen:
        _hingeStatus = @"partiallyOpen";
        break;
      case UIHingeStatusFullyOpen:
        _hingeStatus = @"fullyOpen";
        break;
      default:
        _hingeStatus = @"unknown";
        break;
    }
    _hingeAngle = hinge.angle;
  }
  [self _scheduleEmit];
}
#endif

@end
