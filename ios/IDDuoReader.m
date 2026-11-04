#import "IDDuoReader.h"

@implementation IDDuoReader

+ (UIView *)rootView
{
  UIWindow *fallback = nil;
  for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
    if (![scene isKindOfClass:UIWindowScene.class]) {
      continue;
    }
    for (UIWindow *window in ((UIWindowScene *)scene).windows) {
      if (window.isKeyWindow) {
        return window.rootViewController.view ?: window;
      }
      fallback = fallback ?: window;
    }
  }
  return fallback.rootViewController.view ?: fallback;
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
