#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

// A transparent, non-interactive view pinned over the root view. It reads the
// reserved regions inside updateConstraints, which makes UIKit run that method
// again whenever a region changes or flips active (fold, inner camera, Dynamic
// Island growing for a Live Activity). That is the change signal Apple documents
// for UIKit; there is no region-changed notification.
@interface IDRegionTrackerView : UIView

@property (nonatomic, copy, nullable) dispatch_block_t onRegionsChanged;

// Adds the tracker to `view`, pinned to its edges.
- (void)attachTo:(UIView *)view;

@end

NS_ASSUME_NONNULL_END
