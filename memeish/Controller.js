import React, { useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { TouchableOpacity, PanGestureHandler, State } from 'react-native-gesture-handler';
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate } from 'react-native-reanimated';

import BlurView from '../components/BlurView';
import { showColorPicker } from '../components/ColorPicker';

const styles = StyleSheet.create({
  control: {
    position: 'relative',
    width: 50,
    height: 50,
    borderRadius: 50,
    overflow: 'hidden',
    
    alignItems: "center",
    justifyContent: 'center',
  },
})

const Controller = ({ control, setSelected, updateSelected, iconComponent : IconComponent=(<></>) }) => {
  const controlView = (
    <View style={styles.control}>
      <BlurView
        blurType="materialDark"
        blurAmount={8}
        reducedTransparencyFallbackColor={"#333"} />
      
      <IconComponent control={control} />
    </View>
  );

  const animation = useSharedValue(0);

  const delta = useRef(0);
  const value = useRef(16);

  const onPan = useCallback(({ nativeEvent: { translationY } }) => {
    let diff = translationY/1.3;
    delta.current = diff;
    updateSelected({[control.prop]: value.current - diff});
  }, [control]);

  const onPanStateChanged = useCallback(({ nativeEvent: { oldState, state } }) => {
    const vibrateMethod = Platform.select({
      "ios": 'impactLight',
      "android": 'soft',
    })
    
    const vibrateOptions = {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false
    };

    if (state === State.BEGAN) {
      console.log('Pan Began');
      ReactNativeHapticFeedback.trigger(vibrateMethod, vibrateOptions);
    } else if (state === State.FAILED) {
      console.log('Pan Failed');
      animation.value = 0;
      animation.value = withTiming(1);
      ReactNativeHapticFeedback.trigger("notificationError", vibrateOptions);
    } else if (oldState === State.ACTIVE) {
      console.log('Pan End');
      setSelected({[control.prop]: value.current - delta.current});
      ReactNativeHapticFeedback.trigger("notificationSuccess", vibrateOptions);
    }
  }, [control]);

  const sliderStyle = useAnimatedStyle(() => {
    return {
      transform: [{
        translateX: interpolate(animation.value, [0, 0.3, 0.6, 1], [0, -3, 3, 0])
      }]
    }
  }, [])

  if (control.type === 'color') {
    const onPress = () => {
      showColorPicker(color => {
        setSelected({[control.prop]: color});
      }, "#FFFFFF");
    };

    return (
      <TouchableOpacity onPress={onPress}>
        { controlView }
      </TouchableOpacity>
    );
  } else if (control.type === 'slider') {
    return (
      <PanGestureHandler
        onGestureEvent={onPan}
        onHandlerStateChange={onPanStateChanged}>
        <Animated.View style={sliderStyle}>
          { controlView }
        </Animated.View>
      </PanGestureHandler>
    )
  }

  return controlView;
};

export default Controller;