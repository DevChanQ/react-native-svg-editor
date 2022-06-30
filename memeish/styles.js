import {
  PixelRatio,
  StyleSheet,
  Platform
} from 'react-native';

export const darkColor = "#1c1c1e";
export const lightColor = "#f2f2f7";
export const secondaryColor = "#8C2F35";
export const secondaryDarkColor = "#6D2328";
export const blueColor = "#0A84FF";

const titleText = {
  fontSize: 34,
  lineHeight: 41,
  fontWeight: "bold",
}, title2Text = {
  fontSize: 22,
  lineHeight: 28,
  fontWeight: "bold",
}, bodyText = {
  fontSize: 17,
  lineHeight: 22,
}, subheadlineText = {
  fontSize: 15,
  lineHeight: 20,
}, captionText = {
  fontSize: 12,
  lineHeight: 16,
}

export const oneRealPixel = Platform.select({
  'android': PixelRatio.roundToNearestPixel(1),
  'ios': 1 / PixelRatio.get(),
});

export const defaultBorderColor = Platform.select({
  'android': '#636366',
  'ios': '#636366',
});

export const createStyleSheet = (theme={}) => {
  const primaryColor = theme['primaryColor'] || "#1c1c1e";
  const primaryLightColor = theme['primaryLightColor'] || "#3a3a3c";
  const contrastColor = theme['contrastColor'] || "#f2f2f7";
  const secondaryColor = theme['secondaryColor'] || "#8C2F35";
  const secondaryDarkColor = theme['secondaryDarkColor'] || "#6D2328";
  const highlightColor = theme['highlightColor'] || "#0A84FF";
  const borderColor = theme['borderColor'] || "#636366";

  const colors = { primaryColor, primaryLightColor, contrastColor, secondaryColor, secondaryDarkColor, highlightColor, borderColor };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      position: 'relative',
      // backgroundColor: darkColor,
    },
    shadow: {
      shadowOffset: {
        width: 0,
        height: 3
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      // elevation: 4,
    },
    border: {
      borderWidth: oneRealPixel,
      borderColor,
    },
    
    text: {
      ...bodyText,
      color: contrastColor,
    },
    titleText: {
      ...titleText,
      color: contrastColor,
    },
    title2Text: {
      ...title2Text,
      color: contrastColor,
    },
    subtitle: {
      ...captionText,
      color: contrastColor,
    },
    subheadline: {
      ...subheadlineText,
      color: contrastColor,
    },
  
    titleContainer: {
      padding: 16,
      flexDirection: 'row',
    },
    titleTextContainer: {
      marginRight: 12,
      flex: 1,
    },
    title: {
      ...titleText,
      flex: 1,
    },
    titleButton: {
      ...subheadlineText,
      color: highlightColor,
      marginTop: 10
    },
  
    tableContentContainer: {
      padding: 16
    },
    tableCell: {
      backgroundColor: primaryLightColor,
      padding: 16,
    },
    tableCellFirst: {
      borderTopLeftRadius: 14,
      borderTopRightRadius: 14,
    },
    tableCellLast: {
      borderBottomLeftRadius: 14,
      borderBottomRightRadius: 14,
    },
    tableCellSeparator: {
      width: '100%',
      height: oneRealPixel,
      backgroundColor: borderColor,
    },
    tableCellTitle: {
      ...bodyText,
      color: contrastColor,
    },
  
    premiumIcon: {
      left: 0,
      top: 2
    },
    blurView: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      top: 0,
    },
  
    backButton: {
      position: 'relative',
      borderRadius: 12,
      overflow: 'hidden',
      
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
  
    button: {
      position: 'relative',
      borderRadius: 12,
      overflow: 'hidden',
      padding: 9,
      paddingHorizontal: 16,
    }
  });

  return {
    styles,
    colors
  };
}

const { styles: defaultStyles , colors } = createStyleSheet();

export default defaultStyles;
export {
  colors
};