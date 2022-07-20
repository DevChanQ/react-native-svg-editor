import { Navigation } from "react-native-navigation";
import ColorPickerIOS from 'react-native-color-picker-ios';

import { getiOSVersion } from "@/utils";
import ColorPicker, { COMPONENT_NAME } from './ColorPicker';

export default ColorPicker;
export const showColorPicker = (onColorChange=color => {}, initialColor) => {
  // check if initialColor is color
  initialColor = String(initialColor);
  if (initialColor[0] !== '#') initialColor = '#000' 

  if (getiOSVersion() < 14) {
    Navigation.showOverlay({
      component: {
        name: COMPONENT_NAME,
        passProps: {
          onConfirm: onColorChange,
          initialColor,
        }
      }
    });
  } else {
    ColorPickerIOS.showColorPicker(
      {
        supportsAlpha: false,
        initialColor: initialColor
      },
      color => onColorChange(color.slice(0, 7))
    );
  }
}