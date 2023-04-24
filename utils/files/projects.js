import RNFS from 'react-native-fs';

import { makeid } from '../utils';

import { checkFolderExists, documentDirectoryPath } from './utils';

export const templatesFolderRelativePath = `templates`;
export const templatesFolderAbsolutePath = `${documentDirectoryPath}/${templatesFolderRelativePath}`;
export const saveFolderRelativePath = `saves`;
export const saveFolderAbsolutePath = `${documentDirectoryPath}/${saveFolderRelativePath}`;
export const componentFolderRelativePath = `components`;
export const componentFolderAbsolutePath = `${documentDirectoryPath}/${componentFolderRelativePath}`;
export const previewFolderRelativePath = `previews`;
export const previewFolderAbsolutePath = `${documentDirectoryPath}/${previewFolderRelativePath}`;

export const loadProject = projectId => {
  const svgFileAbsolutePath = `${saveFolderAbsolutePath}/${projectId}.svg`;
  return RNFS.readFile(svgFileAbsolutePath);
};

export const createProject = (payload={}) => {
  const projectId = makeid(10);
  const project = {
    ...payload,
    id: projectId,
  };
  return project;
};

export const createProjectFromSvg = async (svg, payload={}) => {
  const projectId = makeid(10);

  const svgFileRelativePath = `${saveFolderRelativePath}/${projectId}.svg`;
  const svgFileAbsolutePath = `${documentDirectoryPath}/${svgFileRelativePath}`;

  await checkFolderExists(saveFolderAbsolutePath);
  await saveSvg(svg, svgFileAbsolutePath);

  return createProject({
    ...payload,
    id: projectId,
    preview: null,
    file: svgFileRelativePath,
  })
}

export const createProjectWithBaseImage = async ({ path, width, height }, payload={}) => {
  const svg = `
    <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <image devjeff:locked="1" xlink:href="file://${path}" width="${width}" height="${height}" />
    </svg>
  `;
  
  const project = await createProjectFromSvg(svg, payload);
  return project;
}

export const saveProject = async ({projectId, svg, previewUri, payload={}}) => {
  const previewRelativePath = `${saveFolderRelativePath}/${projectId}_preview_${Date.now()}.jpg`
  const previewAbsolutePath = `${documentDirectoryPath}/${previewRelativePath}`;
  const svgFileRelativePath = `${saveFolderRelativePath}/${projectId}.svg`;
  const svgFileAbsolutePath = `${documentDirectoryPath}/${svgFileRelativePath}`;

  await checkFolderExists(saveFolderAbsolutePath);
  
  await saveSvg(svg, svgFileAbsolutePath);
  await RNFS.moveFile(previewUri, previewAbsolutePath);
  
  return {
    ...payload,
    preview: previewRelativePath,
    file: svgFileRelativePath,
  };
}

/**
 * Overwrite and Save SVG
 * @param {string} svg SVG Xml string
 * @param {string} path Path to dest file
 */
const saveSvg = async (svg, path) => {
  try {
    // try to delete file first before saving
    await RNFS.unlink(path)
  } catch (e) {

  }

  await RNFS.writeFile(path, svg);
}

// export const useCreateProject = () => {
//   const dispatch = useDispatch();
//   return useCallback(payload => createProject({
//     ...payload,
//     id: makeid(10),
//   }, dispatch), []);
// };

// export const useCreateProjectFromSvg = () => {
//   const dispatch = useDispatch();
//   return useCallback((svg, payload) => createProjectFromSvg(svg, payload, dispatch), []);
// };

