import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, Button, SafeAreaView, TextInput, TouchableOpacity, Text } from 'react-native';
import ColorPickerComponent from 'react-native-wheel-color-picker';
import { Navigation } from 'react-native-navigation';

import { isColorHex } from '../../utils';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000AB',
  },
  container: {
    margin: 30,
    padding: 24,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    flex: 1,
  },
  buttonContainer: {
    paddingTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    padding: 12,
    paddingVertical: 6,
  },
  buttonText: {
    fontSize: 15,
  },
  hexInput: {
    flex: 1,
    fontSize: 22,
    padding: 6,
    textAlign: 'center',
  }
});

export const COMPONENT_NAME = 'memeish.ColorPicker';

class ColorPickerHexInput extends React.PureComponent {
  state = {
    hex: "#ffffff",
  };

  _onChangeText = hex => {
    if (isColorHex(hex)) {
      this.props.setCurrentColor(hex);
    }
  }

  updateHex(hex) {
    this.setState({ hex });
  }

  render() {
    const {hex} = this.state;
    return (
      <TextInput
        style={styles.hexInput}
        defaultValue={hex}
        onChangeText={this._onChangeText} />
    );
  }
}

const ColorPicker = ({ componentId, initialColor="#ffffff", onConfirm=() => {} }) => {
  const hexInput = useRef(null);
  const [currentColor, setCurrentColor] = useState(initialColor);
  const onColorChange = useCallback(c => {
    hexInput.current.updateHex(c);
  }, []);
  const onConfirmButtonTapped = useCallback(() => {
    if (isColorHex(currentColor)) {
      onConfirm(currentColor);
      Navigation.dismissOverlay(componentId);
    }
  }, [onConfirm, currentColor]);
  const onCancelButtonTapped = useCallback(() => {
    Navigation.dismissOverlay(componentId);
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.container}>
        <ColorPickerComponent
          style={styles.colorPicker}
          color={currentColor}
          thumbSize={40}
          swatches={false}
          onColorChange={onColorChange} />
        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={onCancelButtonTapped}>
            <View style={styles.button}><Text style={[styles.buttonText, {color: '#bababa'}]}>Cancel</Text></View>
          </TouchableOpacity>
          
          <ColorPickerHexInput
            ref={hexInput}
            setCurrentColor={setCurrentColor} />
            
          <TouchableOpacity onPress={onConfirmButtonTapped}>
            <View style={styles.button}><Text style={[styles.buttonText, {color: '#1f93ff'}]}>Confirm</Text></View>
          </TouchableOpacity>
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