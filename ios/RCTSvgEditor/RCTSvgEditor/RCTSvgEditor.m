//
//  RCTSvgEditor.m
//  RCTSvgEditor
//
//  Created by DevJeff on 4/7/2022.
//

#import <React/RCTLog.h>
#import <CoreText/CTFontManager.h>
#import "RCTSvgEditor.h"

@implementation RCTSvgEditor

// To export a module named RCTSvgEditor
RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(createFontWithUrl:(NSString *) url
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    NSURLSessionConfiguration *config = [NSURLSessionConfiguration defaultSessionConfiguration];
    NSURLSession *session = [NSURLSession sessionWithConfiguration:config];
    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:[NSURL URLWithString:url]];
    
    RCTLogInfo(@"Start Loading Font");
    NSURLSessionDataTask *task = [session dataTaskWithRequest:request completionHandler:^(NSData * _Nullable data, NSURLResponse * _Nullable response, NSError * _Nullable error) {
        if (error == nil) {
            RCTLogInfo(@"GET Font Success");
            CGDataProviderRef dataProvider = CGDataProviderCreateWithCFData((CFDataRef) data);
            CGFontRef cgFont = CGFontCreateWithDataProvider(dataProvider);
            
            CFErrorRef fontError;
            if (!CTFontManagerRegisterGraphicsFont(cgFont, &fontError)) {
                RCTLogInfo(@"CTFontManager Error: %@", fontError);
                reject(@"load_font_error", @"Core Text register font error", nil);
            } else {
                NSString *fontName = (__bridge NSString *)CGFontCopyPostScriptName(cgFont);
                resolve(fontName);
            }
        }
    }];
    
    [task resume];
}

@end
