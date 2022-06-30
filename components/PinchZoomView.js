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

export default class PinchZoomView extends Component {
  _containerRef = React.createRef();
  _canvasRef = React.createRef();

  _panRef = React.createRef();
  _pinchRef = React.createRef();

  contentSize = { width: 100, height: 100 };

  constructor(props) {
    super(props);

    const {onZoom} = props;

    this._lastOffset = {
      translationX: 0,
      translationY: 0,
    };

    this._opacity = new Animated.Value(0);

    this._panX = new Animated.Value(0);
    this._panY = new Animated.Value(0);
    this._translateX = new Animated.Value(0);
    this._translateY = new Animated.Value(0);

    this._panX.addListener(({value}) => {
      this._translateX.setValue(PixelRatio.roundToNearestPixel(this._lastOffset.translationX + value / this._currentScale));
    });
    this._panY.addListener(({value}) => {
      this._translateY.setValue(PixelRatio.roundToNearestPixel(this._lastOffset.translationY + value / this._currentScale));
    });

    this._baseScale = new Animated.Value(1);
    this._pinchScale = new Animated.Value(1);
    this._scale = Animated.multiply(this._baseScale, this._pinchScale);
    this._currentScale = 1;

    this._scale.addListener(({value}) => {
      this._currentScale = value;
    });

    this._onPanGestureEvent = Animated.event(
      [{ nativeEvent: { translationX: this._panX, translationY: this._panY, }, }],
      { useNativeDriver: true },
    );

    this.customZoom = !!onZoom;
    if (!this.customZoom) {
      this._onPinchGestureEvent = Animated.event(
        [{ nativeEvent: { scale: this._pinchScale } }],
        { useNativeDriver: true }
      );
    }
  }

  scaleToFit() {
    this._scaleToFit(this.contentSize.width, this.contentSize.height, true);
  }

  _onDoubleTap = ({nativeEvent: {oldState}}) => {
    if (oldState === State.ACTIVE) {
      this.scaleToFit();
    }
  };

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

  _onPinchGestureEvent = () => {
    this.props.onZoom(this._currentScale);
  }

  _onPanHandlerStateChange = event => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      this._lastOffset.translationX += event.nativeEvent.translationX / this._currentScale;
      this._lastOffset.translationY += event.nativeEvent.translationY / this._currentScale;
    }
  }

  _onPinchHandlerStateChange = ({ nativeEvent: { oldState, scale } }) => {
    if (oldState === State.ACTIVE) {
      if (!this.customZoom) {
        this._baseScale.setValue(this._currentScale);
        this._pinchScale.setValue(1);
      }

      if (this.props.onZoomEnd) {
        this.props.onZoomEnd(this._currentScale);
      }
    }
  };

  _onContentLayout = ({nativeEvent: {layout}}) => {
    if (this.customZoom) return;
    
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
        maxPointers={2}
        onGestureEvent={this._onPanGestureEvent}
        onHandlerStateChange={this._onPanHandlerStateChange}
        simultaneousHandlers={this._pinchRef}>
        <Animated.View
          ref={this._containerRef}
          style={style} >
          <PinchGestureHandler
            ref={this._pinchRef}
            minPointers={2}
            maxPointers={2}
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