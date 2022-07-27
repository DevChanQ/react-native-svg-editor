import { NativeModules } from 'react-native';
import RNFS from 'react-native-fs';
import SvgEditor from './components';

const SvgEditorNativeModule = NativeModules.SvgEditor;

export default SvgEditor;
export * from './components/SvgItem';

const folderSafeCheck = async path => {
  let folderExists = await RNFS.exists(path);
  if (!folderExists) {
    console.log('Folder doesn\'t exist. Creating now...')
    await RNFS.mkdir(path);
  }
}

const documentDirectoryPath = `file://${RNFS.DocumentDirectoryPath}`;
export const fontsFolderRelativePath = `fonts`;
export const fontsFolderAbsolutePath = `${documentDirectoryPath}/${fontsFolderRelativePath}`;

class SvgEditorManagerObject {

  remoteFonts = null;

  /**
   * @typedef LoadedFontFamily
   * @type {Object.<string, string>} An object with the font weight as key and path to local font file as value
   */

  /**
   * @type {Object.<string, LoadedFontFamily>} An object with the font id as key and LoadedFontFamily as value
  */
  loadedFonts = {};

  constructor() {
    console.log("SvgEditorNativeModule: ", SvgEditorNativeModule.createFontWithUrl);
    
    if (!SvgEditorNativeModule) {
      this._nativeModuleNotAvailable = true;
    } else {
      this.textToPath = SvgEditorNativeModule.textToPath;
    }
  }

  async listRemoteFontsFromGoogle() {
    const url = "https://google-webfonts-helper.herokuapp.com/api/fonts";

    if (!this.remoteFonts) {
      const fonts = await fetch(url)
        .then((response) => response.json());
      
      this.remoteFonts = fonts;
    } 
    
    return this.remoteFonts;
  }

  /**
   * @typedef DownloadGoogleRemoteFontResult
   * @property {string} fontFamily The Registered Font Family Name
   * @property {Array} fontFile Array of local font files of different weights
   */

  /**
   * Download Font from google fonts. Throws Error if failed
   * @param {string} fontId Font Id of google-webfonts-helper
   * @returns {Promise<Object.<string, DownloadGoogleRemoteFontResult>} Promise that resolves to 
   * an object with the font weight as key and DownloadGoogleRemoteFontResult as value
   */
  async downloadRemoteFontFromGoogle(fontId) {
    if (this.loadedFonts[fontId]) {
      return this.loadedFonts[fontId];
    }

    const url = `https://google-webfonts-helper.herokuapp.com/api/fonts/${fontId}?subsets=latin,latin-ext`;

    const { variants=[] } = await fetch(url).then((response) => response.json());

    const font = {};
    const fonts = variants.filter(variant => 
      variant.fontStyle == 'normal' && (variant.fontWeight == 400 || variant.fontWeight == 100 || variant.fontWeight == 700));

    for (let fontVariant of fonts) {
      const { ttf, woff, fontWeight } = fontVariant, file = ttf || woff;
      if (!file) continue;

      const fileExtension = file.split('.').pop();
      const fontFamily = await this.loadFont(file, fontId, fontWeight);

      // save font file locally
      const fontFileRelativePath = `${fontsFolderRelativePath}/${fontFamily}.${fileExtension}`;
      const fontFileAbsolutePath = `${documentDirectoryPath}/${fontFileRelativePath}`;
      await folderSafeCheck(fontsFolderAbsolutePath);
      await RNFS.downloadFile({
        fromUrl: file,
        toFile: fontFileAbsolutePath
      });

      font[fontWeight] = {fontFamily, fontFile: fontFileRelativePath};
    }

    return font;
  }
  
  /**
   * Load Font from remote url and save font file locally
   * @param {string} url Url to remote font
   * @param {string} key Custom key used to map to font family
   * @param {string} weight Font weight of the remote font
   * @returns {Promise} Promise that resolves to font family of installed font
   */
  async loadFont(url, key, weight="default") {
    if (this._nativeModuleNotAvailable) return;

    key = key || url;
    if (this.loadedFonts[key]?.[weight]) {
      return this.loadedFonts[key][weight];
    }
    
    const fontFamily = await SvgEditorNativeModule.createFontWithUrl(url).catch(e => null);

    if (!this.loadedFonts[key]) this.loadedFonts[key] = {};
    this.loadedFonts[key][weight] = fontFamily;

    return fontFamily;
  }

  /**
   * Load Font stored locally
   * @param {string} file Relative Url to font file
   */
  async loadLocalFont(file, key, weight) {
    if (this._nativeModuleNotAvailable) return;

    if (!file) return;

    key = key || file;

    console.log('loadLocalFont: ', file, key, weight)

    if (this.loadedFonts[key]?.[weight]) {
      return this.loadedFonts[key][weight];
    }
    
    const fontFamily = await SvgEditorNativeModule.createFontWithLocalFile(file);

    if (!this.loadedFonts[key]) this.loadedFonts[key] = {};
    this.loadedFonts[key][weight] = fontFamily;

    return fontFamily;
  }

}

export const SvgEditorManager = new SvgEditorManagerObject();