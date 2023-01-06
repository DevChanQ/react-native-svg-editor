import cssParser from './css';

const parseSvg = () => {
  
}

export const styleToAttributes = (style) => {
  const parsedCss = cssParser.parseCSS(`#temp { ${style} }`), rules = parsedCss[0]?.rules || [];
  return rules;
}