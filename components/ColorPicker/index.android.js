import { Navigation } from "react-native-navigation";
import ColorPicker from './ColorPicker';

export default ColorPicker;
export const showColorPicker = (onColorChange=() => {}, initialColor="#000") => {
  Navigation.showOverlay({
    component: {
      name: 'COLOR_PICKER',
      passProps: {
        onConfirm: onColorChange,
        initialColor,
      }
    }
  });
}