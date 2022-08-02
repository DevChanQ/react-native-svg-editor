import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

const defaultOnPanEnd = () => {};

const MemorisedPan = ({ last, children, onPanEnd=defaultOnPanEnd, onPan }) => {
  const lastAttributes = useRef(last), panning = useRef(false);
  useEffect(() => { if (!panning.current) lastAttributes.current = last }, [last]);
  
  let onPanStateChanged = useCallback(({nativeEvent: {oldState, translationX, translationY}}) => {
    console.log("MemorisedPan.onPanStateChanged")
    if (oldState === State.ACTIVE) {
      lastAttributes.current = last;
      panning.current = false;
      onPanEnd({ translationX, translationY });
    }
  }, [last, onPanEnd])

  return (
    <PanGestureHandler
      onHandlerStateChange={onPanStateChanged}
      onGestureEvent={({ nativeEvent: event }) => {
        panning.current = true;
        onPan({ event, last: lastAttributes.current });
      }}>
      { children }
    </PanGestureHandler>
  )
}

export default MemorisedPan;