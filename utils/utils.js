import { Platform } from "react-native";

export const makeid = length => {
  let result = '';
  let characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return `_${result}`;
};

export const getiOSVersion = () => parseInt(Platform.Version, 10);

export const isObject = (item) => (item && typeof item === 'object' && !Array.isArray(item));

export const mergeDeep = (target, ...sources) => {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
};

export const valueOrDefault = (prop, def) => prop === undefined || Number.isNaN(prop) ? def : prop;

export const isColorHex = hex => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);