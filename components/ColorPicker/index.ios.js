import { Navigation } from "react-native-navigation";
import ColorPickerIOS from 'react-native-color-picker-ios';

import { getiOSVersion } from "@/utils";
import ColorPicker from './ColorPicker';

export default ColorPicker;
export const showColorPicker = (onColorChange=color => {}, initialColor) => {
  if (getiOSVersion() < 14) {
    Navigation.showOverlay({
      component: {
        name: 'COLOR_PICKER',
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