import React, { useRef, useCallback, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { TouchableOpacity, PanGestureHandler, State } from 'react-native-gesture-handler';
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate, interpolateColor } from 'react-native-reanimated';

import BlurView from '../components/BlurView';
import { showColorPicker } from '../components/ColorPicker';
import { valueOrDefault } from '../utils';

const styles = StyleSheet.create({
  control: {
    position: 'relative',
    width: 45,
    height: 45,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    overflow: 'hidden',
    
    alignItems: "center",
    justifyContent: 'center',
  },
  sliderBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'white',
  },
  displayText: {
    color: "#f2f2f7",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: 'bold',
  }
})

const Controller = ({ control, canvasRef={}, setSelected, updateSelected, iconComponent : IconComponent=(<></>) }) => {
  const defaultValue = control['default'];
  const elementRef = canvasRef.current?.getSelectedElementRef();

  // reanimated shared value
  const animation = useSharedValue(0);

  // state variables
  const [displayValue, setDisplayValue] = useState(null);

  const value = valueOrDefault(elementRef?.current?.lastAttributes[control.prop], defaultValue);

  let lastValueX = null, lastValueY = null;
  if (control.type === 'slider') {
    lastValueX = valueOrDefault(elementRef?.current?.lastAttributes[control.prop[0]], defaultValue[0]);
    lastValueY = valueOrDefault(elementRef?.current?.lastAttributes[control.prop[1]], defaultValue[1]);
  }

  const onPan = useCallback(({ nativeEvent: { translationX, translationY } }) => {
    let updatedAttributes = {};
    let values = [];
    if (control.prop[0]) {
      let diff = translationX;
      let setValue = Math.floor(lastValueX - diff);
      updatedAttributes[control.prop[0]] = setValue;

      values.push(setValue);
    } 

    if (control.prop[1]) {
      let diff = translationY;
      let setValue = Math.floor(lastValueY - diff);
      updatedAttributes[control.prop[1]] = setValue;

      values.push(setValue);
    }

    setDisplayValue(`${values.join(',')}`);
    updateSelected(updatedAttributes);
  }, [control, lastValueX, lastValueY]);

  const onPanStateChanged = useCallback(({ nativeEvent: { oldState, state, translationX, translationY } }) => {
    const beginVibrateMethod = Platform.select({
      "ios": 'impactLight',
      "android": 'soft',
    })

    const failedVibrateMethod = Platform.select({
      "ios": 'notificationError',
      "android": 'notificationError',
    });

    const successVibrateMethod = Platform.select({
      "ios": "notificationSuccess",
      "android": 'soft',
    });
    
    const vibrateOptions = {
      enableVibrateFallback: true,
    };

    if (state === State.BEGAN) {
      console.log('Pan Began');
      animation.value = 0;
      animation.value = withTiming(1, { duration: 200 });
    } else if (state === State.ACTIVE) {
      ReactNativeHapticFeedback.trigger(beginVibrateMethod, vibrateOptions);
    } else if (state === State.FAILED) {
      console.log('Pan Failed');
      animation.value = withTiming(0);
      ReactNativeHapticFeedback.trigger(failedVibrateMethod, vibrateOptions);
    } else if (oldState === State.ACTIVE) {
      console.log('Pan End');
      animation.value = withTiming(0);
      ReactNativeHapticFeedback.trigger(successVibrateMethod, vibrateOptions);

      let updatedAttributes = {};
      if (control.prop[0]) {
        updatedAttributes[control.prop[0]] = lastValueX - translationX;
      }
      if (control.prop[1]) {
        updatedAttributes[control.prop[1]] = lastValueY - translationY;
      }

      setDisplayValue(null);
      setSelected(updatedAttributes);
    }
  }, [control, lastValueX, lastValueY]);

  const sliderStyle = useAnimatedStyle(() => {
    return {
      transform: [{
        translateY: interpolate(animation.value, [0, 1], [0, -8])
      }]
    }
  }, [])

  const sliderBackgroundStyle = useAnimatedStyle(() => {
    return {
      opacity: animation.value,
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
        <View style={styles.control}>
          <BlurView
            blurType="materialDark"
            blurAmount={8}
            reducedTransparencyFallbackColor={"#333"} />
          
          <IconComponent control={control} />
        </View>
      </TouchableOpacity>
    );
  } else if (control.type === 'slider') {
    return (
      <PanGestureHandler
        onGestureEvent={onPan}
        onHandlerStateChange={onPanStateChanged}>
        <Animated.View style={sliderStyle}>
          <View style={styles.control}>
            <Animated.View style={[styles.sliderBackground, sliderBackgroundStyle]} />
            <BlurView
              blurType="materialDark"
              blurAmount={8}
              reducedTransparencyFallbackColor={"#333"} />
            
            { displayValue ? 
              <Text style={styles.displayText}>{ displayValue }</Text> :
              <IconComponent control={control} />
            }
          </View>
        </Animated.View>
      </PanGestureHandler>
    )
  } else if (control.type === 'switch') {
    const onPress = () => {
      setSelected({[
        control.prop]: value == control.trueValue ? control.falseValue : control.trueValue
      });
    };

    return (
      <TouchableOpacity onPress={onPress}>
        <View style={styles.control}>
          <BlurView
            blurType="materialDark"
            blurAmount={8}
            reducedTransparencyFallbackColor={"#333"} />
          
          <IconComponent control={control} value={value} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.control}>
      <BlurView
        blurType="materialDark"
        blurAmount={8}
        reducedTransparencyFallbackColor={"#333"} />
      
      <IconComponent control={control} />
    </View>
  );
};

export default Controller;