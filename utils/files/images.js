import RNFS from 'react-native-fs';
import { launchImageLibrary } from 'react-native-image-picker';

import { checkFolderExists } from './utils';

const imageFolderName = "imageCache"

const cacheImage = async (path, filename) => {
  if (!filename) filename = path.split(/(\\|\/)/g).pop();

  const imageFolderPath = RNFS.DocumentDirectoryPath + `/${imageFolderName}`;
  const imagePath = `${imageFolderPath}/${filename}`;
  await checkFolderExists(imageFolderPath);

  await RNFS.copyFile(path, imagePath);

  return imagePath;
};

export const pickImage = async (cache=true) => {
  const options = {
    mediaType: 'photo',
  };
  const { assets={} } = await launchImageLibrary(options);
  const file = assets[0];

  if (!file) {
    throw new Error();
  }

  if (file.type.includes("image/svg")) {
    throw new Error('File type is not supported');
  }

  // cache image to document image folder
  let imagePath = file.uri;
  if (cache) imagePath = await cacheImage(imagePath, file.fileName);

  return {
    name: file.fileName,
    ...file,
    uri: imagePath,
  };  
};