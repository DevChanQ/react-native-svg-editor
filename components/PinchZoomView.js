import React, {Component} from 'react';
import {
  Animated,
  StyleSheet,
  PixelRatio
} from 'react-native';
import {
  PanGestureHandler,
  PinchGestureHandler,
  State,
  TapGestureHandler
} from 'react-native-gesture-handler';

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  }
});

export default class PinchZoomView extends Component {
  // Element Refs
  _containerRef = React.createRef();
  _canvasRef = React.createRef();
  _panRef = React.createRef();
  _pinchRef = React.createRef();

  contentSize = { width: 100, height: 100 };

  _lastOffset = {
    translationX: 0,
    translationY: 0,
  };
  _currentScale = 1;

  // Animated Value
  _opacity = new Animated.Value(0);
  _panX = new Animated.Value(0);
  _panY = new Animated.Value(0);
  _translateX = new Animated.Value(0);
  _translateY = new Animated.Value(0);

  _baseScale = new Animated.Value(1);
  _pinchScale = new Animated.Value(1);

  constructor(props) {
    super(props);

    this._scale = Animated.multiply(this._baseScale, this._pinchScale);
    this._scale.addListener(({value}) => {
      if (this.props.onZoom) this.props.onZoom(value);
      this._currentScale = value;
    });

    this._panX.addListener(({value}) => {
      this._translateX.setValue(PixelRatio.roundToNearestPixel(this._lastOffset.translationX + value / this._currentScale));
    });
    this._panY.addListener(({value}) => {
      this._translateY.setValue(PixelRatio.roundToNearestPixel(this._lastOffset.translationY + value / this._currentScale));
    });

  }

  scaleToFit() {
    this._scaleToFit(this.contentSize.width, this.contentSize.height, true);
  }

  _scaleToFit(canvasWidth=1, canvasHeight=1, animated=false) {
    this._containerRef.current.measure((x, y, containerWidth, containerHeight, pageX, pageY) => {

      let scale = 1;
      if (canvasWidth > containerWidth) {
        scale = containerWidth / canvasWidth;
      } else if (canvasHeight > containerHeight) {
        scale = containerHeight / canvasHeight;
      }
      
      if (!scale || scale === Infinity) return;

      this._lastOffset.translationX = 0;
      this._lastOffset.translationY = 0;
      if (animated) {
        const duration = 150;
        Animated.spring(this._baseScale, {
          toValue: scale,
          speed: 18,
          // duration,
          useNativeDriver: true
        }).start();
        Animated.spring(this._panX, {
          toValue: 0,
          speed: 18,
          // duration,
          useNativeDriver: true
        }).start();
        Animated.spring(this._panY, {
          toValue: 0,
          speed: 18,
          // duration,
          useNativeDriver: true
        }).start();
      } else {
        this._baseScale.setValue(scale);
        this._panX.setValue(0);
        this._panY.setValue(0);
      }

      if (this.props.onZoomEnd) {
        this.props.onZoomEnd(scale);
      }

    })
  }

  // Gesture State Changing Events
  _onDoubleTap = ({nativeEvent: {oldState}}) => {
    if (oldState === State.ACTIVE) {
      this.scaleToFit();
    }
  };

  _onPanHandlerStateChange = ({nativeEvent: {oldState, state, translationX, translationY}}) => {
    // console.log("_onPanHandlerStateChange: ", oldState, state)
    if (state === State.BEGAN) {
      if (this.props.onDragBegin) this.props.onDragBegin();
    } else if (oldState === State.ACTIVE) {
      this._lastOffset.translationX += (translationX / this._currentScale);
      this._lastOffset.translationY += (translationY / this._currentScale);

      if (this.props.onDragEnd) this.props.onDragEnd();
    } else if (state === State.FAILED) {
      if (this.props.onDragEnd) this.props.onDragEnd();
    }
  };

  _onPinchHandlerStateChange = ({ nativeEvent }) => {
    const { oldState, state } = nativeEvent;
    if (oldState === State.ACTIVE) {
      // console.log("PinchZoomView._onPinchHandlerStateChange: oldState === State.ACTIVE");
      this._baseScale.setValue(this._currentScale);
      this._pinchScale.setValue(1);

      if (this.props.onZoomEnd) {
        this.props.onZoomEnd(this._currentScale);
      }
    }
  };

  // Gesture Event
  _onPanGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: this._panX, translationY: this._panY, }, }],
    { useNativeDriver: true },
  );

  _onPinchGestureEvent = Animated.event(
    [{ nativeEvent: { scale: this._pinchScale } }],
    { useNativeDriver: true }
  );

  _onContentLayout = ({nativeEvent: {layout}}) => {
    const {width, height} = layout;
    this.contentSize = { width, height };
    this._opacity.setValue(1);
    this._scaleToFit(width, height);
  };

  render() {
    const {style} = this.props;

    return (
      <PanGestureHandler
        ref={this._panRef}
        minPointers={2}
        onGestureEvent={this._onPanGestureEvent}
        onHandlerStateChange={this._onPanHandlerStateChange}
        simultaneousHandlers={this._pinchRef}>
        <Animated.View
          ref={this._containerRef}
          style={style} >
          <PinchGestureHandler
            ref={this._pinchRef}
            minPointers={2}
            onGestureEvent={this._onPinchGestureEvent}
            onHandlerStateChange={this._onPinchHandlerStateChange}
            simultaneousHandlers={this._panRef}>
            <Animated.View style={styles.container}>
              <TapGestureHandler
                onHandlerStateChange={this._onDoubleTap}
                numberOfTaps={2} >
                  <Animated.View style={styles.contentContainer}>
                    <Animated.View
                      ref={this._canvasRef}
                      onLayout={this._onContentLayout}
                      style={{
                        transform: [
                          { scale: this._scale },
                          { translateX: this._translateX },
                          { translateY: this._translateY },
                        ],
                        opacity: this._opacity
                      }}>
                      {this.props.children}
                    </Animated.View>
                  </Animated.View>
              </TapGestureHandler>
            </Animated.View>
          </PinchGestureHandler>
        </Animated.View>
      </PanGestureHandler>
    );
  }
}