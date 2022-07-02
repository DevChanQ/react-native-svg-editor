import React from 'react';
import { View, Text } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

import defaultStyles from './styles'

export const SettingsItem = ({ item: { title }, onPress=() => {}, first, last, style, labelStyle }) => {
  const CELL = (
    <View style={[
      defaultStyles.tableCell,
      first ? defaultStyles.tableCellFirst : {},
      last ? defaultStyles.tableCellLast : {},
      style
    ]}>
      <Text
        style={[defaultStyles.tableCellTitle, labelStyle]}
        numberOfLines={1}>{title}</Text>
    </View>
  );

  return (
    <TouchableOpacity onPress={onPress}>{ CELL }</TouchableOpacity>
  );
}

export const ItemSeparator = ({ style }) => {
  return (
    <View style={[defaultStyles.tableCellSeparator, style]} />
  )
}