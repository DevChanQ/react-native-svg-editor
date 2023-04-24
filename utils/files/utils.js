import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

export const filePrefix = Platform.select({
  ios: 'file://',
  android: 'file://',
});

export const documentDirectoryPath = `${filePrefix}${RNFS.DocumentDirectoryPath}`;

export const getAbsolutePath = path => `${documentDirectoryPath}/${path}`

export const loadRelativePath = path => {
  return RNFS.readFile(getAbsolutePath(path));
}

export const checkFolderExists = async (path, create=true) => {
  const folderExists = await RNFS.exists(path);
  if (!folderExists && create) await RNFS.mkdir(path);
  return folderExists;
}