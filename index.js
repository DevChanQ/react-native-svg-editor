import SvgEditor from './components';
import {
  NativeModules,
} from 'react-native';

const SvgEditorNativeModule = NativeModules.SvgEditor;

export default SvgEditor;
export * from './components/SvgItem';

class SvgEditorManagerObject {
  fonts = [];

  constructor() {
    if (!SvgEditorNativeModule) {
      this._nativeModuleNotAvailable = true;
    } else {
      this.textToPath = SvgEditorNativeModule.textToPath;
    }
  }
  
  loadFont(url) {
    if (this._nativeModuleNotAvailable) return;
    
    SvgEditorNativeModule.createFontWithUrl(url).then(fontFamily => {
      
    }).catch(error => {

    });
  }

}

export const SvgEditorManager = new SvgEditorManagerObject();
