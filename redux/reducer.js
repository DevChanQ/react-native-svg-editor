import { ADD_FONT, SET_PREMIUM } from "./actions";

const DEFAULT_INITIAL_STATE = {
  fonts: [],

  premium: false,
}

const extendSVGEditorReducer = (initialState={}, reducer) => {
  if (!reducer) throw new Error('Reducer has to be given');

  const DEFAULT_STATE = {
    ...initialState,
    ...DEFAULT_INITIAL_STATE
  };

  return (state = DEFAULT_STATE, action = {}) => {
    const {type, fonts, premium} = action;

    switch (type) {
      case ADD_FONT: {
        let oldFonts = [...state.fonts], newFonts = [].concat(fonts);

        for (let font of newFonts) {
          if (font.file && font.id) oldFonts.push(font)
        }
        
        return { ...state, fonts: oldFonts }
      }
      case SET_PREMIUM: {
        return {
          ...state,
          premium: !!premium,
        }
      }
      default:
        break;
    }

    return reducer(state, action);
  }
}

export default extendSVGEditorReducer;