import React from 'react';
import { BlurView } from "@react-native-community/blur";
import { StyleSheet } from "react-native";

import { getiOSVersion } from '../../utils'

export default ({ style, blurType, ...props }) => {
  if (getiOSVersion() < 13) {
    if (blurType.toLowerCase().search("dark") >= 0) {
      blurType = "extraDark";
    } else {
      blurType = "xlight";
    }
  }

  return (
    <BlurView
      style={[StyleSheet.absoluteFill, style]}
      blurType={blurType}
      {...props} />
  )
}