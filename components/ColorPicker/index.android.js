import { Navigation } from "react-native-navigation";
import ColorPicker, { COMPONENT_NAME } from './ColorPicker';

export default ColorPicker;
export const showColorPicker = (onColorChange=() => {}, initialColor="#000") => {
  Navigation.showOverlay({
    component: {
      name: COMPONENT_NAME,
      passProps: {
        onConfirm: onColorChange,
        initialColor,
      }
    }
  });
}