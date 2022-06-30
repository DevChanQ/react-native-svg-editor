import { Navigation } from "react-native-navigation";
import ColorPickerIOS from 'react-native-color-picker-ios';

import { getiOSVersion } from "@/utils";
import ColorPicker, { COMPONENT_NAME } from './ColorPicker';

export default ColorPicker;
export const showColorPicker = (onColorChange=color => {}, initialColor) => {
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
        initialColor: initialColor || "#000"
      },
      color => onColorChange(color.slice(0, 7))
    );
  }
}