import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  interpolate,
  useSharedValue,
  Extrapolate,
  useAnimatedStyle
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BlurView from '../BlurView';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flex: 1,
  }
});

const SafeAreaScrollView = ({
  ScrollViewComponent,
  ...props
}) => {
  const AnimatedScrollView = useMemo(() => {
    return Animated.createAnimatedComponent(ScrollViewComponent)
  }, [ScrollViewComponent]);

  const insets = useSafeAreaInsets();

  const blurViewOpacity = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    blurViewOpacity.value = interpolate(
      event.contentOffset.y,
      [-insets.top, 0],
      [0, 1],
      Extrapolate.CLAMP
    );
  }, [insets]);
  const blurViewStyle = useAnimatedStyle(() => {
    return { opacity: blurViewOpacity.value }
  }, []);

  return (
    <View style={styles.container}>

      <AnimatedScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        {...props} />

      <Animated.View style={[{ 
        position: 'absolute',
        height: insets.top,
        left: 0,
        top: 0,
        right: 0
      }, blurViewStyle]}>
        <BlurView
          blurType="chromeMaterialLight"
          blurAmount={8}
          reducedTransparencyFallbackColor="white"/>
      </Animated.View>

    </View>
  )
};

export default SafeAreaScrollView;