import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, Button, SafeAreaView, TextInput } from 'react-native';
import ColorPickerComponent from 'react-native-wheel-color-picker';
import { Navigation } from 'react-native-navigation';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000AB',
  },
  container: {
    margin: 24,
    padding: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  button: {
    flex: 1,
  },
  colorPicker: {
    marginBottom: 32,
  },
  hexInput: {
    fontSize: 16,
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    textAlign: 'center',
  }
});

export const COMPONENT_NAME = 'memeish.ColorPicker';

const ColorPicker = ({ componentId, initialColor="#ffffff", onConfirm=() => {} }) => {
  const [currentColor, setCurrentColor] = useState(initialColor);
  const color = useRef(null);
  const onColorChange = useCallback(c => {
    setCurrentColor(c);
  }, []);
  const onColorChangeComplete = useCallback(c => {
    color.current = c;
  }, []);
  const onConfirmButtonTapped = useCallback(() => {
    onConfirm(color.current);
    Navigation.dismissOverlay(componentId);
  }, [onConfirm]);
  const onCancelButtonTapped = useCallback(() => {
    Navigation.dismissOverlay(componentId);
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.container}>
        <ColorPickerComponent
          style={styles.colorPicker}
          color={initialColor}
          thumbSize={40}
          swatches={false}
          onColorChange={onColorChange}
          onColorChangeComplete={onColorChangeComplete} />
        <View style={{ paddingBottom: 24 }}>
          <TextInput style={styles.hexInput} value={currentColor} />
        </View>
        <View style={styles.buttonContainer}>
          <View style={[styles.button, {marginRight: 12,}]}>
            <Button
              onPress={onCancelButtonTapped}
              title='Cancel' />
          </View>
          <View style={styles.button}>
            <Button
              onPress={onConfirmButtonTapped}
              title='Confirm' />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

ColorPicker.options = {
  layout: {
    componentBackgroundColor: 'transparent',
  },
  overlay: {
    interceptTouchOutside: true,
  },
}

Navigation.registerComponent(COMPONENT_NAME, () => ColorPicker);

export default ColorPicker;