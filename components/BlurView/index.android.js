import React from 'react';
import { View } from 'react-native';

export default ({ style, reducedTransparencyFallbackColor="white" }) => {
  return (
    <View
      style={[{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: reducedTransparencyFallbackColor,
        opacity: 0.88,
      }, style]} />
  )
}