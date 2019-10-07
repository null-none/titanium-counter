/**
 * Appcelerator Titanium Mobile
 * Copyright (c) 2009-2019 by Appcelerator, Inc. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 * 
 * WARNING: This is generated code. Modify at your own risk and without support.
 */
#import "TiButtonUtil.h"
#import <TitaniumKit/TiBase.h>

@implementation TiButtonUtil

+ (UIView *)systemButtonWithType:(int)type
{
  switch (type) {
  case UIcounterNativeItemInfoLight: {
    return [UIButton buttonWithType:UIButtonTypeInfoLight];
  }
  case UIcounterNativeItemInfoDark: {
    return [UIButton buttonWithType:UIButtonTypeInfoDark];
  }
  case UIcounterNativeItemDisclosure: {
    return [UIButton buttonWithType:UIButtonTypeDetailDisclosure];
  }
  case UIcounterNativeItemContactAdd: {
    return [UIButton buttonWithType:UIButtonTypeContactAdd];
  }
  case UIcounterNativeItemSpinner: {
    UIActivityIndicatorView *button = [[[UIActivityIndicatorView alloc] initWithActivityIndicatorStyle:UIActivityIndicatorViewStyleWhite] autorelease];
    [button startAnimating];
    return button;
  }
  }
  return nil;
}

+ (UIView *)buttonWithType:(int)type
{
  UIView *button = [TiButtonUtil systemButtonWithType:type];
  if (button == nil) {
    button = [UIButton buttonWithType:type];
  }
  return button;
}

@end
