import React, { useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';

import ReactSvg, { Line } from 'react-native-svg';
import getBBox from 'svg-path-bbox';
import { PanGestureHandler, State, TapGestureHandler } from 'react-native-gesture-handler';

import { Svg, CurveTo, SvgItem as PathItem } from './svg';
import SvgItem from './SvgItem';

const PathState = {
  START: 'S',
  IN_PROGRESS: 'I',
  CLOSED: 'C', 
}

const styles = StyleSheet.create({
  absolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  targetPoint: {
    width: 16,
    height: 16,
    position: 'absolute',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#19A0FB',
    borderRadius: 12,
    marginLeft: -8,
    marginTop: -8,
  },
  controlPoint: {
    width: 12,
    height: 12,
    position: 'absolute',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#19A0FB',
    marginLeft: -6,
    marginTop: -6,
  },
  controlPointLine: {

  }
})

const MemorizedPoint = ({scale, point, onPan: givenOnPan, onPanEnd, children}) => {
  const _lastPoint = useRef(point);

  

  let onPanStateChanged = useCallback(({nativeEvent: {oldState}}) => {
    if (oldState === State.ACTIVE) {
      _lastPoint.current = point;

      if (onPanEnd) onPanEnd();
    }
  }, [point])

  let onPan = useCallback(({nativeEvent: {translationX, translationY}}) => {
    let point = {x: _lastPoint.current.x + translationX/scale, y: _lastPoint.current.y + translationY/scale}
    givenOnPan(point)
  }, [givenOnPan])

  return (
    <PanGestureHandler onGestureEvent={onPan} onHandlerStateChange={onPanStateChanged}>
      { children }
    </PanGestureHandler>
  )
}

const TargetPoint = ({scale, point, onPan, onPanEnd, onPointTap}) => {
  return (
    <MemorizedPoint scale={scale} point={point} onPan={onPan} onPanEnd={onPanEnd}>
      <TapGestureHandler onHandlerStateChange={e => onPointTap(e, point)}>
        <View style={[styles.targetPoint, {top: point.y, left: point.x, transform: [{scale: 1/scale}]}]} />
      </TapGestureHandler>
    </MemorizedPoint>
  );
}

const ControlPoint = ({scale, point, onPan, onPanEnd, onPointTap, debug}) => {
  if (debug) {
    console.log('ControlPoint.point: ', point);
  }

  return (
    <MemorizedPoint scale={scale} point={point} onPan={onPan} onPanEnd={onPanEnd}>
      <TapGestureHandler onHandlerStateChange={e => onPointTap(e, point)}>
        <View style={[styles.controlPoint, debug ? {borderColor: 'red'} : {}, {top: point.y, left: point.x, transform: [{scale: 1/scale}]}]} />
      </TapGestureHandler>
    </MemorizedPoint>
  );
}

class EditLayer extends React.PureComponent {

  componentDidUpdate() {
    this._controlPoints = null;
    this._targetPoints = null;
  }

  get controlPoints() {
    if (!this._controlPoints) {
      this._controlPoints = this.props.parsedPath.controlLocations().filter(point => point.movable);
    }
    return this._controlPoints;
  }

  get targetPoints() {
    if (!this._targetPoints) {
      this._targetPoints = this.props.parsedPath.targetLocations().filter(point => point.movable);
    }
    return this._targetPoints;
  }

  get lineStyle() {
    return this.props.lineStyle || {};
  }

  render() {
    console.log('EditLayer.render')

    let { 
      lineStyle,
      viewBox,
      targetPointUpdated,
      parsedPath,

      ...pointProps
    } = this.props;

    let controlPointLines = this.controlPoints.map(point => {
      return point.relations ? point.relations.map(rel => {
        return (
          <Line x1={point.x} y1={point.y} x2={rel.x} y2={rel.y} stroke="#ababab" strokeWidth="1" />
        )
      }) : [];
    }).flat();

    targetPoints = this.targetPoints.map((point) => {
      const onPan = event => {
        if (targetPointUpdated) targetPointUpdated(point, event)
      }
  
      return (
        <TargetPoint
          {...pointProps}
          point={point}
          onPan={onPan} />
          // key={`target_${point.x},${point.y}`} 
      )
    });

    controlPoints = this.controlPoints.map((point, index) => {
      const onPan = event => {
        if (targetPointUpdated) targetPointUpdated(point, event)
      }

      return (
        <ControlPoint
          {...pointProps}
          point={{x: point.x, y: point.y}}
          onPan={onPan} />
          // key={`control_${point.x},${point.y}`}
      )
    });

    const {startPoint={x: 0, y: 0}} = pointProps;

    return (
      <View style={styles.absolute}>
        <ReactSvg style={[{position: 'absolute'}, this.lineStyle]} viewBox={viewBox}>
          { controlPointLines }
        </ReactSvg>
        <View style={{transform: [{translateX: -startPoint.x}, {translateY: -startPoint.y}]}}>
          { targetPoints }
          { controlPoints }
        </View>
      </View>
    );
  }

}

class SvgPathItem extends SvgItem {
  MODE = PathState.START;
  
  _lastKX = 1;
  _lastKY = 1;

  get translateEnabled() {
    return !this.state.editMode && super.translateEnabled;
  }

  get startPoint() {
    const { left, top } = this.state.attributes;
    if (!this._startPoint) {
      this._startPoint = {x: left, y: top};
    }
    return {x: left, y: top};
  }

  get strokeWidth() {
    return parseFloat(this.state.attributes['stroke-width'] || (this.state.attributes['stroke'] ? 1 : 0));
  }

  onValueRefreshed = (changed) => {
    this.parsedPath = new Svg(this._lastAttributes['d']);
    this._startPoint = null;
  }

  refreshValues() {
    super.refreshValues();

    this._lastKX = 1;
    this._lastKY = 1;
  }

  _initAttributes(a) {
    let attributes = super._initAttributes(a), {d} = attributes, strokeWidth = attributes['stroke-width'];
    const rect = this.getBoundingBox(d, strokeWidth);

    attributes['appX'] = attributes['appX'] === undefined ? rect.left : attributes['appX'];
    attributes['appY'] = attributes['appY'] === undefined ? rect.top : attributes['appY'];

    return { ...rect, ...attributes };
  }

  toSvgson(external=true) {
    let info = super.toSvgson(), {attributes} = info;
    let {appX, appY, d} = this.attributes, path = new Svg(d);

    path.translate(appX - this._initialAttributes['appX'], appY - this._initialAttributes['appY']);
    attributes['d'] = path.asString();

    delete attributes['x'];
    delete attributes['y'];
    delete attributes['left'];
    delete attributes['right'];
    delete attributes['top'];
    delete attributes['bottom'];
    delete attributes['width'];
    delete attributes['height'];

    return info;
  }

  targetPointUpdated = (point, {x, y}) => {
    this.parsedPath.setLocation(point, {x, y});
    this.updatePath();
  };

  onTap = ({nativeEvent: {oldState, x, y}}, point) => {
    // if (oldState === State.ACTIVE) {
    //   console.log(point);
    //   if (this.MODE === PathState.START) {
    //     this.parsedPath.current.insert(PathItem.Make(['M', x.toString(), y.toString()]))
    //     this.updatePathPermanent();
    //   } else if (this.MODE === PathState.IN_PROGRESS) {
    //     if (!point) {
    //       this.parsedPath.insert(PathItem.Make(['L', x.toString(), y.toString()]))
    //       this.updatePathPermanent();
    //     } else if (point.itemReference === this.parsedPath.current.path[0]) {
    //       this.parsedPath.insert(PathItem.Make(['Z']))
    //       this.updatePathPermanent();
    //     }
    //   } else if (this.MODE === PathState.CLOSED) {
    //     if (point) {
    //       this.parsedPath.changeType(point.itemReference, CurveTo.key);
    //       this.updatePathPermanent();
    //     }
    //   }
    // }
  };

  onEditEnd = () => {
    this.setAttributes(this.state.attributes);
  };

  onDoubleTap() {
    this.setState({ editMode: !this.state.editMode });
  }

  updatePath() {
    const newPath = this.parsedPath.asString();
    const rect = this.getBoundingBox(newPath, this.strokeWidth);

    let { left, top } = rect;
    let { left: oldLeft, top: oldTop, appX, appY } = this._lastAttributes;

    appX += left - oldLeft;
    appY += top - oldTop;

    this.updateAttributes({
      d: newPath,
      ...rect,
      appX, appY,
    });
  }

  updatePathPermanent() {
    this.updatePath();

    // next tick
    setTimeout(() => {
      const {updateAttributesPermanent} = this.props;
      if (updateAttributesPermanent) {
        let attributes = {...this.state.attributes};
        console.log('updatePathPermanent: ', attributes)
        updateAttributesPermanent(attributes);
      }
    }, 0);
  }

  /**
   * Get the bounding box of the path
   * @param {string} path d attribute of path
   * @param {number} strokeWidth stroke width of the element
   * @returns {object} rect object
   */
  getBoundingBox(path, strokeWidth=0) {
    let [x0, y0, x1, y1] = getBBox(path);
    x0 -= strokeWidth;
    y0 -= strokeWidth;
    x1 += strokeWidth;
    y1 += strokeWidth;

    let width = x1-x0, height = y1-y0;

    const rect = {
      width, height,
      left: x0, top: y0, right: x1, bottom: y1,
    };

    for (let key in rect) {
      rect[key] = parseFloat(rect[key].toFixed(2));
    }

    console.log(rect);

    return rect;
  }

  scale({ translationX, translationY }) {
    let {width, height} = this._lastAttributes;
    let newWidth = width + translationX / this.getScale(), newHeight = height + translationY / this.getScale();

    if (this.aspectLocked) {
      if (this.aspectRatio > 1) newHeight = newWidth / this.aspectRatio;
      else newWidth = newHeight * this.aspectRatio;
    }

    let kx  = newWidth / width, ky = newHeight / height;
    
    this.parsedPath.scale(kx/this._lastKX, ky/this._lastKY);
    this._lastKX = kx, this._lastKY = ky;

    this.updatePath();
  }

  getParentViewBox() {
    const {attributes} = this.state;
    let viewBox = `${attributes.left} ${attributes.top} ${attributes.width} ${attributes.height}`;
    
    return viewBox;
  }

  renderControlLayer() {
    const {scale = 1} = this.props;
    const {editMode, attributes} = this.state;

    if (!editMode) {
      return super.renderControlLayer();
    }

    let {
      width = 0,
      height = 0,
    } = attributes;
    let ogWidth = width,
        ogHeight = height;
  
    width *= this._internalScale;
    height *= this._internalScale;
  
    let svgScale = 1/this._internalScale, translateX = -((width - ogWidth)/2), translateY = -((height - ogHeight)/2);

    return (
      <EditLayer
        scale={Math.max(scale, 0.1)}
        onPointTap={this.onTap}
        onPanEnd={this.onEditEnd}
        viewBox={this.getParentViewBox()}
        targetPointUpdated={this.targetPointUpdated}
        lineStyle={{width, height, left: translateX, top: translateY, transform: [{scale: svgScale}]}}
        startPoint={this.startPoint}
        parsedPath={this.parsedPath} />
    )
  }

}

export default SvgPathItem;