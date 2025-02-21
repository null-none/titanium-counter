/**
 * Appcelerator Titanium Mobile
 * Copyright (c) 2009-2019 by Appcelerator, Inc. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 * 
 * WARNING: This is generated code. Modify at your own risk and without support.
 */
#ifdef USE_TI_UITAB

#import <TitaniumKit/TiUIView.h>

//To handle the more tab, we're a delegate of it.
@class TiUITabProxy;
@interface TiUITabGroup : TiUIView <UITabBarControllerDelegate, UINavigationControllerDelegate> {
  @private
  UITabBarController *controller;
  TiUITabProxy *focusedTabProxy;
  BOOL allowConfiguration;
  NSString *editTitle;

  TiColor *barColor;
  TiColor *navTintColor;
  NSMutableDictionary *theAttributes;
}

- (UITabBarController *)tabController;

- (void)open:(id)args;
- (void)close:(id)args;

- (UITabBar *)tabbar;

- (void)viewWillTransitionToSize:(CGSize)size withTransitionCoordinator:(id<UIViewControllerTransitionCoordinator>)coordinator;
- (void)systemLayoutFittingSizeDidChangeForChildContentContainer:(id<UIContentContainer>)container;
- (void)willTransitionToTraitCollection:(UITraitCollection *)newCollection withTransitionCoordinator:(id<UIViewControllerTransitionCoordinator>)coordinator;
- (void)preferredContentSizeDidChangeForChildContentContainer:(id<UIContentContainer>)container;

@end

#endif
