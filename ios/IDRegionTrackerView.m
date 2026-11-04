#import "IDRegionTrackerView.h"

#import "IDDuoReader.h"

@implementation IDRegionTrackerView

+ (BOOL)requiresConstraintBasedLayout
{
  return YES;
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    self.translatesAutoresizingMaskIntoConstraints = NO;
    self.userInteractionEnabled = NO;
    self.backgroundColor = UIColor.clearColor;
    self.isAccessibilityElement = NO;
    self.accessibilityElementsHidden = YES;
  }
  return self;
}

- (void)attachTo:(UIView *)view
{
  [view addSubview:self];
  [NSLayoutConstraint activateConstraints:@[
    [self.topAnchor constraintEqualToAnchor:view.topAnchor],
    [self.bottomAnchor constraintEqualToAnchor:view.bottomAnchor],
    [self.leadingAnchor constraintEqualToAnchor:view.leadingAnchor],
    [self.trailingAnchor constraintEqualToAnchor:view.trailingAnchor],
  ]];
}

- (void)updateConstraints
{
#if ID_HAS_DUO_SDK
  if (@available(iOS 27.1, *)) {
    // The reads are the point: UIKit tracks them and re-runs this method on change.
    (void)[self reservedRegionsOfKind:[UIViewReservedRegionKind occlusionRegionKind]
                              options:UIViewReservedRegionQueryOptionsIncludeInactive];
    (void)[self reservedRegionsOfKind:[UIViewReservedRegionKind divisionRegionKind]
                              options:UIViewReservedRegionQueryOptionsIncludeInactive];
  }
#endif
  [super updateConstraints];

  dispatch_block_t callback = self.onRegionsChanged;
  if (callback != nil) {
    // The region state read by the module is only settled after this pass.
    dispatch_async(dispatch_get_main_queue(), callback);
  }
}

@end
