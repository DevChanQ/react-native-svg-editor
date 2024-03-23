import React, { useCallback } from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';
import { State, PanGestureHandler, TouchableOpacity } from 'react-native-gesture-handler';

const sizeBoxRect = { width: 98, height: 26 };
const resizeBoxHitboxSize = 26;
const resizeBoxHitboxDisplaySize = 12;
const resizeBoxCenterOffset = (resizeBoxHitboxSize / 2 + ((resizeBoxHitboxSize - resizeBoxHitboxDisplaySize) / 2)) - resizeBoxHitboxDisplaySize/2;

const sideButtonSize = 28;

const styles = StyleSheet.create({
  boundingBox: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    top: 0,
    borderWidth: 1,
  },
  resizeBox: {
    width: resizeBoxHitboxDisplaySize,
    height: resizeBoxHitboxDisplaySize,
    borderWidth: 1,
    backgroundColor: 'white',
  },
  resizeBoxHitbox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: resizeBoxHitboxSize,
    height: resizeBoxHitboxSize,
  },
  sizeBox: {
    position: 'absolute',
    ...sizeBoxRect,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeText: {
    color: 'white',
    fontSize: 10
  },

  sideButtonContainer: {
    position: 'absolute',
    right: -(sideButtonSize + 9), 
    top: 3,
  },
  sideButton: {
    marginBottom: 8,

    width: sideButtonSize,
    height: sideButtonSize,
    borderRadius: 5,

    alignItems: 'center',
    justifyContent: 'center',
  }
});

const ResizeControlLayer = ({ elementRef }) => {

  if (!elementRef) return;

  const {width, height} = elementRef.getSize();

  const onResize = useCallback(({nativeEvent: {translationX, translationY}}) => {
    elementRef.scale({translationX, translationY});
  }, [elementRef]);

  const onResizeStateChanged = useCallback(({nativeEvent: {oldState}}) => {
    if (oldState === State.ACTIVE) {
      elementRef.setCurrentAttributes();
    }
  }, [elementRef]);

  const onLock = useCallback(() => {
    elementRef.setAttributes({ "devjeff:locked": !elementRef.locked});
  }, [elementRef]);

  const onToPath = useCallback(() => {
    elementRef.asPath();
  }, [elementRef]);

  return (
    <View
      pointerEvents='box-none'
      style={[
        styles.boundingBox,
        { borderColor: elementRef.locked ? '#B7B7B7' : elementRef.controlColor }
      ]}>
      {
        !elementRef.locked ? (
          <PanGestureHandler
            onGestureEvent={onResize}
            onHandlerStateChange={onResizeStateChanged}>
            <View pointerEvents='auto' style={[styles.resizeBoxHitbox, {right: -resizeBoxCenterOffset,bottom: -resizeBoxCenterOffset}]}>
              <View style={[styles.resizeBox, { borderColor: elementRef.locked ? '#B7B7B7' : elementRef.controlColor }]} />
            </View>
          </PanGestureHandler>
        ) : null
      }

      <View style={styles.sideButtonContainer}>
        <TouchableOpacity onPress={onLock}>
          <View pointerEvents='auto' style={[styles.sideButton, { backgroundColor: elementRef.locked ? '#B7B7B7' : elementRef.controlColor }]}>
            <Image
              source={!elementRef.locked ? require("../../assets/icons/lock/lock.png") : require("../../assets/icons/lock-open/lock-open.png")}
              style={{ width: 20, height: 20, resizeMode: "contain" }}  />
          </View>
        </TouchableOpacity>
      </View>

      { 
        !elementRef.shouldShowSize ? null :
        <View pointerEvents='none' style={[
          styles.sizeBox,
          {
            backgroundColor: elementRef.locked ? '#B7B7B7' : elementRef.controlColor,
            left: (width - sizeBoxRect.width) / 2,
            bottom: -sizeBoxRect.height - 12,
          }
        ]}>
          <Text numberOfLines={1} style={styles.sizeText}>{`${width.toFixed(1)} x ${height.toFixed(1)}`}</Text>
        </View>
      }
    </View>
  );

}

export default ResizeControlLayer;