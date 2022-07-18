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
    const {type, font, premium} = action;

    switch (type) {
      case ADD_FONT: {
        let fonts = [...state.fonts];
        fonts.push(font);
        return { ...state, fonts }
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