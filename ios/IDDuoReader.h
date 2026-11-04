#import <UIKit/UIKit.h>

// The iOS 27.1 hinge, reserved-region and vertical-bar APIs only exist in newer
// SDKs. Guarding on the header keeps the pod compiling on older Xcode versions.
#if __has_include(<UIKit/UIHingeInteraction.h>)
#define ID_HAS_DUO_SDK 1
#else
#define ID_HAS_DUO_SDK 0
#endif

NS_ASSUME_NONNULL_BEGIN

@interface IDDuoReader : NSObject

// The view React content is mounted in. Regions are reported relative to it.
+ (nullable UIView *)rootView;

// Plain NSDictionary in the shape of `NativeDuoState`. The hinge API is event
// based, so the observer passes the latest status and angle in.
+ (NSDictionary *)stateForView:(nullable UIView *)view
                   hingeStatus:(NSString *)hingeStatus
                    hingeAngle:(double)hingeAngle;

@end

NS_ASSUME_NONNULL_END
