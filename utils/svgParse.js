import cssParser from './css';

export const styleToAttributes = (style) => {
  const parsedCss = cssParser.parseCSS(`#temp { ${style} }`), rules = parsedCss[0]?.rules || [];
  return rules;
}

export const commaWspRegex = /(\s+,?\s*)|,\s*/g;