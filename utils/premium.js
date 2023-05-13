import React, { useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';

import { useSelector } from "react-redux";

import PreventDoubleClick from '../components/withPreventDoubleClick';
import { selectPremium } from "../redux/selectors";
import { showModal, VIEW_IDS } from '@/views'

const TouchableOpacityPreventDoubleClick = PreventDoubleClick(TouchableOpacity);

const styles = StyleSheet.create({
  empty: {},
  childStyle: {},
  icon: {
    right: 6,
    bottom: -6,
  }
})

export const premiumFunction = (func, premium=false) => {
  return () => {
    if (premium) return func();
    else {
      console.log("should show premium purchase modal")
      showModal(VIEW_IDS.PREMIUM_PURCHASE);
    }
  }; 
}

export const PremiumIcon = ({ style, size=28 }) => {
  return (
    <ImageBackground
      resizeMode='contain'
      style={[style, { width: size, aspectRatio: 101/76 }]}
      source={require('../assets/icons/pro/pro.png')} />
  )
}

export const PremiumTouchableOpacity = ({onPress, childStyle=styles.empty, iconStyle=null, size=25, ...props}) => {
  const premium = useSelector(selectPremium);

  const onPremiumPress = () => premiumFunction(onPress, premium)();

  return (
    <TouchableOpacityPreventDoubleClick onPress={onPremiumPress} {...props}>
      <View style={{position: 'relative'}}>
        <View style={premium ? {} : childStyle}>{props.children}</View>
        {
          !premium ?
          <PremiumIcon size={size} style={{ position: 'absolute', ...(iconStyle || styles.icon) }} /> : null
        }
      </View>
    </TouchableOpacityPreventDoubleClick>
  )
};
