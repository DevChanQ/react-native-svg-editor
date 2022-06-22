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
    width: 10,
    height: 10,
    position: 'absolute',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#19A0FB',
    borderRadius: 12,
    marginLeft: -5,
    marginTop: -5,
  },
  controlPoint: {
    width: 6,
    height: 6,
    position: 'absolute',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#19A0FB',
    marginLeft: -3,
    marginTop: -3,
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

const ControlPoint = ({scale, point, onPan, onPanEnd, onPointTap}) => {
  return (
    <MemorizedPoint scale={scale} point={point} onPan={onPan} onPanEnd={onPanEnd}>
      <TapGestureHandler onHandlerStateChange={e => onPointTap(e, point)}>
        <View style={[styles.controlPoint, {top: point.y, left: point.x, transform: [{scale: 1/scale}]}]} />
      </TapGestureHandler>
    </MemorizedPoint>
  );
}

const EditLayer = ({lineStyle, viewBox, targetPoints, controlPoints, targetPointUpdated, ...pointProps}) => {
  let controlPointLines = controlPoints.map(point => {
    return point.relations ? point.relations.map(rel => {
      return (
        <Line x1={point.x} y1={point.y} x2={rel.x} y2={rel.y} stroke="#ababab" strokeWidth="0.3" />
      )
    }) : [];
  }).flat();

  targetPoints = targetPoints.map((point) => {
    const onPan = event => {
      if (targetPointUpdated) targetPointUpdated(point, event)
    }

    return (
      <TargetPoint {...pointProps} point={point} onPan={onPan} />
    )
  })

  controlPoints = controlPoints.map((point) => {
    const onPan = event => {
      if (targetPointUpdated) targetPointUpdated(point, event)
    }
    
    return (
      <ControlPoint {...pointProps} point={point} onPan={onPan} />
    )
  })

  const {startPoint} = pointProps;
  

  return (
    <View style={styles.absolute}>
      <ReactSvg style={[{position: 'absolute'}, lineStyle]} viewBox={viewBox}>
        { controlPointLines }
      </ReactSvg>
      <View style={{transform: [{translateX: -startPoint.x}, {translateY: -startPoint.y}]}}>
        {targetPoints}
        {controlPoints}
      </View>
    </View>
  )
}

class SvgPathItem extends SvgItem {
  MODE = PathState.START;
  
  _lastKX = 1;
  _lastKY = 1;

  onValueRefreshed = (changed) => {
    this.parsedPath = new Svg(this.state.attributes['d']);
  }

  get startPoint() {
    let {left=0, top=0} = this.state.attributes;
    return {x: left, y: top}
  }

  get strokeWidth() {
    return parseFloat(this.state.attributes['stroke-width'] || (this.state.attributes['stroke'] ? 1 : 0));
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
    if (oldState === State.ACTIVE) {
      console.log(point);
      if (this.MODE === PathState.START) {
        parsedPath.current.insert(PathItem.Make(['M', x.toString(), y.toString()]))
        this.updatePathPermanent();
      } else if (this.MODE === PathState.IN_PROGRESS) {
        if (!point) {
          this.parsedPath.insert(PathItem.Make(['L', x.toString(), y.toString()]))
          this.updatePathPermanent();
        } else if (point.itemReference === parsedPath.current.path[0]) {
          this.parsedPath.insert(PathItem.Make(['Z']))
          this.updatePathPermanent();
        }
      } else if (this.MODE === PathState.CLOSED) {
        if (point) {
          this.parsedPath.changeType(point.itemReference, CurveTo.key);
          this.updatePathPermanent();
        }
      }
    }
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

    return rect;
  }

  scale({translationX, translationY}) {
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
    const {attributes, editMode} = this.state;

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
        scale={scale}
        onPointTap={this.onTap}
        onPanEnd={this.onEditEnd}
        startPoint={this.startPoint}
        viewBox={this.getParentViewBox()}
        lineStyle={{width, height, left: translateX, top: translateY, transform: [{scale: svgScale}]}}
        targetPointUpdated={this.targetPointUpdated}
        controlPoints={this.parsedPath.controlLocations().filter(point => point.movable)}
        targetPoints={this.parsedPath.targetLocations().filter(point => point.movable)}
      />
    )
  }

}

export default SvgPathItem;