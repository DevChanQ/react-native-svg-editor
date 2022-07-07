//
//  RCTSvgEditor.m
//  RCTSvgEditor
//
//  Created by DevJeff on 4/7/2022.
//

#import <React/RCTLog.h>
#import <CoreText/CTFontManager.h>
#import <CoreText/CTFont.h>
#import <CoreText/CTStringAttributes.h>
#import <CoreText/CTLine.h>
#import <CoreText/CTRun.h>

#import "RCTSvgEditor.h"

typedef void (^pathVisitor_t)(const CGPathElement * element);

void CGPathApplyCallbackFunction(void* aVisitor, const CGPathElement *element)
{
    pathVisitor_t   visitor = (__bridge pathVisitor_t)aVisitor;
    visitor(element);
}

@implementation RCTSvgEditor

+(NSString*) svgPathFromCGPath:(CGPathRef)aPath
{
    __block NSMutableString* mutableResult = [[NSMutableString alloc] initWithCapacity:512];
    
    __block  CGPoint currentPoint = CGPointZero;
    __block CGPathElementType lastOperation = kCGPathElementCloseSubpath;
    __block pathVisitor_t   callback =  ^(const CGPathElement* aPathElement)
    {
        switch (aPathElement->type)
        {
            case kCGPathElementMoveToPoint:
            {
                CGPoint newPoint = aPathElement->points[0];
                currentPoint = newPoint;
                [mutableResult appendFormat:@"M%.1lf %.1lf", currentPoint.x, currentPoint.y];
            }
            break;
            case kCGPathElementAddLineToPoint:
            {
                CGPoint newPoint = aPathElement->points[0];
                if(newPoint.x == currentPoint.x)
                {
                    [mutableResult appendFormat:@"V%.1lf", newPoint.y];
                }
                else if(newPoint.y == currentPoint.y)
                {
                    
                    [mutableResult appendFormat:@"H%.1lf", newPoint.x];
                }
                else
                {
                    [mutableResult appendFormat:@"L%.1lf %.1lf", newPoint.x, newPoint.y];
                }
                currentPoint = newPoint;
            }
            break;
            case kCGPathElementAddQuadCurveToPoint:
            {
                CGPoint controlPoint = aPathElement->points[0];
                CGPoint newPoint = aPathElement->points[1];
                
                [mutableResult appendFormat:@"Q%.1lf %.1lf %.1lf %.1lf", controlPoint.x, controlPoint.y, newPoint.x, newPoint.y];
                
                currentPoint = newPoint;
            }
            break;
            case kCGPathElementAddCurveToPoint:
            {
                CGPoint controlPoint1 = aPathElement->points[0];
                CGPoint controlPoint2 = aPathElement->points[1];
                CGPoint newPoint = aPathElement->points[2];
                
                
                [mutableResult appendFormat:@"C%.1lf %.1lf %.1lf %.1lf %.1lf %.1lf", controlPoint1.x, controlPoint1.y, controlPoint2.x, controlPoint2.y, newPoint.x, newPoint.y];
                
                currentPoint = newPoint;
            }
            break;
            case kCGPathElementCloseSubpath:
            {
                [mutableResult appendString:@"Z"];
            }
            break;
            default:
            {
            }
            break;
        }
        lastOperation = aPathElement->type;
    };
    
    CGPathApply(aPath, (__bridge void *)callback, CGPathApplyCallbackFunction);
    return [mutableResult copy];
}

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

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(textToPath:(NSString *) text
                  withFont:(NSString *) font
                  size:(nonnull NSNumber *) size)
{
    CGMutablePathRef letters = CGPathCreateMutable();
    
    CFStringRef fontName = (__bridge CFStringRef) font;
    CTFontRef fontRef = CTFontCreateWithName(fontName, [size floatValue], NULL);
    
    NSDictionary *attrs = [NSDictionary dictionaryWithObjectsAndKeys:
                           (__bridge id)fontRef, kCTFontAttributeName,
                               nil];
    
    NSAttributedString *attrString = [[NSAttributedString alloc] initWithString:text attributes:attrs];

    CTLineRef line = CTLineCreateWithAttributedString((CFAttributedStringRef)attrString);
    CFArrayRef runArray = CTLineGetGlyphRuns(line);
    // for each RUN
    for (CFIndex runIndex = 0; runIndex < CFArrayGetCount(runArray); runIndex++)
    {
        // Get FONT for this run
        CTRunRef run = (CTRunRef)CFArrayGetValueAtIndex(runArray, runIndex);
        CTFontRef runFont = CFDictionaryGetValue(CTRunGetAttributes(run), kCTFontAttributeName);
        
        // for each GLYPH in run
        for (CFIndex runGlyphIndex = 0; runGlyphIndex < CTRunGetGlyphCount(run); runGlyphIndex++)
        {
            // get Glyph & Glyph-data
            CFRange thisGlyphRange = CFRangeMake(runGlyphIndex, 1);
            CGGlyph glyph;
            CGPoint position;
            CTRunGetGlyphs(run, thisGlyphRange, &glyph);
            CTRunGetPositions(run, thisGlyphRange, &position);
            
            // Get PATH of outline
            {
                CGAffineTransform flipVertically = CGAffineTransformMakeScale(1, -1);
                CGPathRef letter = CTFontCreatePathForGlyph(runFont, glyph, &flipVertically);
                CGAffineTransform t = CGAffineTransformMakeTranslation(position.x, position.y);
                CGPathAddPath(letters, &t, letter);
                CGPathRelease(letter);
            }
        }
    }
    CFRelease(line);
    
    NSString *path = [RCTSvgEditor svgPathFromCGPath: letters];
    
    CGPathRelease(letters);
    
    return path;
}

@end
