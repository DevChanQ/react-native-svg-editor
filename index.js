import SvgEditor from './components';
import {
  NativeModules,
} from 'react-native';

const SvgEditorNativeModule = NativeModules.SvgEditor;

export default SvgEditor;
export * from './components/SvgItem';

class SvgEditorManagerObject {
  remoteFonts = null;

  constructor() {
    if (!SvgEditorNativeModule) {
      this._nativeModuleNotAvailable = true;
    } else {
      this.textToPath = SvgEditorNativeModule.textToPath;
    }
  }

  async listRemoteFonts() {
    const url = "https://google-webfonts-helper.herokuapp.com/api/fonts";

    if (!this.remoteFonts) {
      const fonts = await fetch(url)
        .then((response) => response.json());
      
      this.remoteFonts = fonts;
    } 
    
    return this.remoteFonts;
  }
  
  loadFont(url) {
    if (this._nativeModuleNotAvailable) return;
    
    SvgEditorNativeModule.createFontWithUrl(url).then(fontFamily => {
      
    }).catch(error => {

    });
  }

}

export const SvgEditorManager = new SvgEditorManagerObject();
