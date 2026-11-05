#import "IDDuoReader.h"

@implementation IDDuoReader

// With several windows or scenes (iPad windows, Split View) the first key window
// is not necessarily the one the user is looking at. Prefer the foreground-active
// scene, then a foreground-inactive one, then anything that has a window.
+ (UIView *)rootView
{
  NSArray<NSNumber *> *preferredStates = @[
    @(UISceneActivationStateForegroundActive),
    @(UISceneActivationStateForegroundInactive),
  ];

  for (NSNumber *state in preferredStates) {
    UIWindow *window = [self windowInScenesWithState:state.integerValue];
    if (window != nil) {
      return window.rootViewController.view ?: window;
    }
  }

  UIWindow *fallback = [self windowInScenesWithState:NSNotFound];
  return fallback.rootViewController.view ?: fallback;
}

// The key window, or else the first window, of the first window scene in
// `state`. NSNotFound matches any scene.
+ (UIWindow *)windowInScenesWithState:(NSInteger)state
{
  for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
    if (![scene isKindOfClass:UIWindowScene.class]) {
      continue;
    }
    if (state != NSNotFound && scene.activationState != state) {
      continue;
    }
    UIWindow *first = nil;
    for (UIWindow *window in ((UIWindowScene *)scene).windows) {
      if (window.isKeyWindow) {
        return window;
      }
      first = first ?: window;
    }
    if (first != nil) {
      return first;
    }
  }
  return nil;
}

+ (NSDictionary *)stateForView:(UIView *)view hingeStatus:(NSString *)hingeStatus hingeAngle:(double)hingeAngle
{
  BOOL supported = NO;
  NSString *edge = @"unspecified";
  NSMutableArray<NSDictionary *> *regions = [NSMutableArray new];

#if ID_HAS_DUO_SDK
  if (@available(iOS 27.1, *)) {
    supported = YES;
    if (view != nil) {
      switch (view.traitCollection.verticalBarEdge) {
        case UIVerticalBarEdgeLeading:
          edge = @"leading";
          break;
        case UIVerticalBarEdgeTrailing:
          edge = @"trailing";
          break;
        default:
          break;
      }

      NSArray<NSString *> *names = @[ @"occlusion", @"division" ];
      NSArray<UIViewReservedRegionKind *> *kinds = @[
        [UIViewReservedRegionKind occlusionRegionKind],
        [UIViewReservedRegionKind divisionRegionKind],
      ];
      for (NSUInteger i = 0; i < kinds.count; i++) {
        // Inactive regions are included so JS can tell "no camera" from "camera idle".
        NSArray<UIViewReservedRegion *> *found =
            [view reservedRegionsOfKind:kinds[i] options:UIViewReservedRegionQueryOptionsIncludeInactive];
        for (UIViewReservedRegion *region in found) {
          [regions addObject:@{
            @"kind" : names[i],
            @"x" : @(region.frame.origin.x),
            @"y" : @(region.frame.origin.y),
            @"width" : @(region.frame.size.width),
            @"height" : @(region.frame.size.height),
            @"marginTop" : @(region.margins.top),
            @"marginLeft" : @(region.margins.left),
            @"marginBottom" : @(region.margins.bottom),
            @"marginRight" : @(region.margins.right),
            @"active" : @(region.isActive),
          }];
        }
      }
    }
  }
#endif

  return @{
    @"isSupported" : @(supported),
    @"verticalBarEdge" : edge,
    @"hingeStatus" : hingeStatus,
    @"hingeAngle" : @(hingeAngle),
    @"regions" : regions,
  };
}

@end
