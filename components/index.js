import React from 'react';
import {
  View
} from 'react-native';

import BaseSvgEditor from './BaseSvgEditor';

const SvgEditor = React.forwardRef(({ style, ...props }, ref) => (
  <View style={[{ flex: 1, backgroundColor: "#E7E7E7" }, style]}>
    <BaseSvgEditor {...props} ref={ref} />
  </View>
));

export default SvgEditor;