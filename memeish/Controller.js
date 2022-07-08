import React, { useRef, useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { TouchableOpacity, TouchableWithoutFeedback, PanGestureHandler, State } from 'react-native-gesture-handler';
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate, interpolateColor } from 'react-native-reanimated';

import BlurView from '../components/BlurView';
import { showColorPicker } from '../components/ColorPicker';
import { valueOrDefault } from '../utils';

const styles = StyleSheet.create({
  control: {
    position: 'relative',
    width: 48,
    height: 48,
    borderRadius: 48,
    borderWidth: 2,
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

const activateVibrateMethod = Platform.select({
  "ios": 'impactLight',
  "android": 'soft',
});

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

const blurType = "thinMaterialDark";

const Controller = ({
  control,
  canvasRef={},
  activated=false,
  setActivated=() => {},
  setSelected,
  updateSelected,
  iconComponent : IconComponent=(<></>) 
}) => {
  const defaultValue = control['default'];
  const elementRef = canvasRef.current?.getSelectedElementRef();

  const value = valueOrDefault(elementRef?.current?.lastAttributes[control.prop], defaultValue);
  let lastValueX = null, lastValueY = null;
  if (control.type === 'slider') {
    lastValueX = valueOrDefault(elementRef?.current?.lastAttributes[control.prop[0]], defaultValue[0]);
    lastValueY = valueOrDefault(elementRef?.current?.lastAttributes[control.prop[1]], defaultValue[1]);
  }

  const initialValue = control.type === 'slider' ? `${lastValueX || ''} ${lastValueY}` : value;

  // reanimated shared value
  const animation = useSharedValue(0);

  // state variables
  const [displayValue, setDisplayValue] = useState(initialValue);

  useEffect(() => {
    if (activated) {
      ReactNativeHapticFeedback.trigger(activateVibrateMethod, vibrateOptions);
    }
    animation.value = withTiming(activated ? 1 : 0, { duration: 200 });
  }, [activated]);

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
    if (oldState === State.ACTIVE) {
      console.log('Pan End');
      ReactNativeHapticFeedback.trigger(successVibrateMethod, vibrateOptions);

      let updatedAttributes = {};
      if (control.prop[0]) {
        updatedAttributes[control.prop[0]] = lastValueX - translationX;
      }
      if (control.prop[1]) {
        updatedAttributes[control.prop[1]] = lastValueY - translationY;
      }

      setSelected(updatedAttributes);
    }
  }, [control, lastValueX, lastValueY]);

  const sliderStyle = useAnimatedStyle(() => {
    return {
      transform: [{
        translateY: interpolate(animation.value, [0, 1], [0, -29])
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
            blurType={blurType}
            blurAmount={8}
            reducedTransparencyFallbackColor={"#333"} />
          
          <IconComponent control={control} />
        </View>
      </TouchableOpacity>
    );
  } else if (control.type === 'slider') {
    const onPress = () => {
      setActivated(activated ? null : control.prop);
    };

    return (
      <PanGestureHandler
        enabled={activated}
        onGestureEvent={onPan}
        onHandlerStateChange={onPanStateChanged}>
        <Animated.View style={sliderStyle}>
      
          <TouchableOpacity onPress={onPress}>
            <View style={styles.control}>
              {/* <Animated.View style={[styles.sliderBackground, sliderBackgroundStyle]} /> */}
              <BlurView
                blurType={blurType}
                blurAmount={8}
                reducedTransparencyFallbackColor={"#333"} />
              
              { activated ? 
                <Text style={styles.displayText}>{ displayValue }</Text> :
                <IconComponent control={control} />
              }
            </View>
          </TouchableOpacity>

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
            blurType={blurType}
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
        blurType={blurType}
        blurAmount={8}
        reducedTransparencyFallbackColor={"#333"} />
      
      <IconComponent control={control} />
    </View>
  );
};

export default Controller;