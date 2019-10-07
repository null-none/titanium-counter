//
//  Appcelerator Titanium Mobile
//  WARNING: this is a generated file and should not be modified
//

#import <TitaniumKit/TiApp.h>
#import <TitaniumKit/TiLogServer.h>
#import <TitaniumKit/TiSharedConfig.h>
#define _QUOTEME(x) #x
#define STRING(x) _QUOTEME(x)

#ifndef TI_LOG_SERVER_PORT
#define TI_LOG_SERVER_PORT 10571
#endif

NSString *const TI_APPLICATION_DEPLOYTYPE = @"development";
NSString *const TI_APPLICATION_ID = @"com.ccounter.app";
NSString *const TI_APPLICATION_PUBLISHER = @"not specified";
NSString *const TI_APPLICATION_URL = @"unspecified";
NSString *const TI_APPLICATION_NAME = @"counter";
NSString *const TI_APPLICATION_VERSION = @"1.0";
NSString *const TI_APPLICATION_DESCRIPTION = @"not specified";
NSString *const TI_APPLICATION_COPYRIGHT = @"not specified";
NSString *const TI_APPLICATION_GUID = @"dd905496-08ca-4253-9000-e2727e5c0e9f";
BOOL const TI_APPLICATION_ANALYTICS = true;
BOOL const TI_APPLICATION_SHOW_ERROR_CONTROLLER = true;
NSString *const TI_APPLICATION_BUILD_TYPE = @"";

#ifdef TARGET_IPHONE_SIMULATOR
NSString *const TI_APPLICATION_RESOURCE_DIR = @"";
#endif

int main(int argc, char *argv[])
{
  [[TiSharedConfig defaultConfig] setApplicationDeployType:TI_APPLICATION_DEPLOYTYPE];
  [[TiSharedConfig defaultConfig] setApplicationID:TI_APPLICATION_ID];
  [[TiSharedConfig defaultConfig] setApplicationPublisher:TI_APPLICATION_PUBLISHER];
  [[TiSharedConfig defaultConfig] setApplicationURL:[NSURL URLWithString:TI_APPLICATION_URL]];
  [[TiSharedConfig defaultConfig] setApplicationName:TI_APPLICATION_NAME];
  [[TiSharedConfig defaultConfig] setApplicationVersion:TI_APPLICATION_VERSION];
  [[TiSharedConfig defaultConfig] setApplicationDescription:TI_APPLICATION_DESCRIPTION];
  [[TiSharedConfig defaultConfig] setApplicationCopyright:TI_APPLICATION_COPYRIGHT];
  [[TiSharedConfig defaultConfig] setApplicationGUID:TI_APPLICATION_GUID];
  [[TiSharedConfig defaultConfig] setAnalyticsEnabled:TI_APPLICATION_ANALYTICS];
  [[TiSharedConfig defaultConfig] setShowErrorController:TI_APPLICATION_SHOW_ERROR_CONTROLLER];
  [[TiSharedConfig defaultConfig] setApplicationBuildType:TI_APPLICATION_BUILD_TYPE];
  [[TiSharedConfig defaultConfig] setApplicationResourcesDirectory:TI_APPLICATION_RESOURCE_DIR];
#ifdef DISABLE_TI_LOG_SERVER
  [[TiSharedConfig defaultConfig] setLogServerEnabled:NO];
#else
  [[TiSharedConfig defaultConfig] setLogServerEnabled:YES];
  [[TiLogServer defaultLogServer] setPort:TI_LOG_SERVER_PORT];
#endif

  UIColor *defaultBgColor = UIColor.blackColor;
#if defined(DEFAULT_BGCOLOR_RED) && defined(DEFAULT_BGCOLOR_GREEN) && defined(DEFAULT_BGCOLOR_BLUE)
  defaultBgColor = [UIColor colorWithRed:DEFAULT_BGCOLOR_RED
                                green:DEFAULT_BGCOLOR_GREEN
                                 blue:DEFAULT_BGCOLOR_BLUE
                                alpha:1.0f];
#endif
  [[TiSharedConfig defaultConfig] setDefaultBackgroundColor:defaultBgColor];
  
#if defined(DEBUG) || defined(DEVELOPER)
  [[TiSharedConfig defaultConfig] setDebugEnabled:YES];
#endif
  
  NSAutoreleasePool * pool = [[NSAutoreleasePool alloc] init];
  int retVal = UIApplicationMain(argc, argv, @"TiUIApplication", @"TiApp");
  [pool release];
  return retVal;
}
