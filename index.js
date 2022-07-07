import SvgEditor from './components';
import {
  NativeModules,
} from 'react-native';

const SvgEditorNativeModule = NativeModules.SvgEditor;

export default SvgEditor;
export * from './components/SvgItem';

class SvgEditorManagerObject {
  fonts = [];
  
  textToPath = SvgEditorNativeModule.textToPath;
  
  loadFont(url) {
    SvgEditorNativeModule.createFontWithUrl(url).then(fontFamily => {
      
    }).catch(error => {

    });
  }

}

export const SvgEditorManager = new SvgEditorManagerObject();
