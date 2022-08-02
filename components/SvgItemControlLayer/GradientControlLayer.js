import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';

import MemorisedPan from './MemorisedPan';

const styles = StyleSheet.create({
  controlPointContainer: {
    position: 'absolute',
    marginLeft: -10,
    marginTop: -10,
  },
  controlPoint: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#19A0FB',
    borderRadius: 20,
  },
  controlPointText: {
    color: '#19A0FB',
    fontWeight: 'bold',
    fontSize: 12
  }
});

const GradientControlLayer = ({ setAttributes, updateAttributes, gradient, scale=1 }) => {
  if (!gradient) return;

  const position1 = { x: gradient.x1, y: gradient.y1 }, position2 = { x: gradient.x2, y: gradient.y2 };

  return (
    <View
      pointerEvents='box-none'
      style={StyleSheet.absoluteFill}>
      
      <View pointerEvents='auto' style={[
        styles.controlPointContainer,
        {
          transform: [
            {translateX: position1.x},
            {translateY: position1.y},
            {scale: 1/scale},
          ]
        }
      ]}>
        <MemorisedPan
          last={position1}
          onPanEnd={() => { setAttributes({ 'devjeff:gradient': {...gradient, x1: position1.x, y1: position1.y} }); }}
          onPan={({ event, last }) => {
            const { translationX, translationY } = event;
            let x1 = last.x + translationX/scale, y1 = last.y + translationY/scale;
            updateAttributes({ 'devjeff:gradient': {x1, y1} })
          }}>
          <View style={styles.controlPoint}><Text style={styles.controlPointText}>1</Text></View>
        </MemorisedPan>
      </View>

      <View pointerEvents='auto' style={[
        styles.controlPointContainer,
        {
          transform: [
            {translateX: position2.x},
            {translateY: position2.y},
            {scale: 1/scale},
          ],
        }
      ]}>
        <MemorisedPan
          last={position2}
          onPanEnd={() => { setAttributes({ 'devjeff:gradient': {...gradient, x2: position2.x, y2: position2.y} }); }}
          onPan={({ event, last }) => {
            const { translationX, translationY } = event;
            let x2 = last.x + translationX/scale, y2 = last.y + translationY/scale;
            updateAttributes({ 'devjeff:gradient': {x2, y2}})
          }}>
          <View style={styles.controlPoint}><Text style={styles.controlPointText}>2</Text></View>
        </MemorisedPan>
      </View>
    </View>
  )
}

export default GradientControlLayer;