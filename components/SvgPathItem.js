import React, { useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';

import getBBox from 'svg-path-bbox';

import { valueOrDefault } from '../utils';
import { Svg, CurveTo, SvgItem as PathItem } from './svg';
import SvgItem from './SvgItem';
import PathEditLayer from './SvgItemControlLayer/PathEditLayer';

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

  constructor(props) {
    super(props);

    this.parsedPath = new Svg(this._lastAttributes['d']);
    this._startPoint = null;
  }

  onValueRefreshed = (changed) => {
    this.parsedPath = new Svg(this._lastAttributes['d']);
    this._startPoint = null;
    this._lastKX = 1;
    this._lastKY = 1;
  }

  _initAttributes(a) {
    let attributes = super._initAttributes(a), {d} = attributes;
    const rect = this.getBoundingBox(d);

    attributes['fill'] = valueOrDefault(attributes['fill'], '#000000');
    attributes['appX'] = valueOrDefault(attributes['appX'], rect.left);
    attributes['appY'] = valueOrDefault(attributes['appY'], rect.top);

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

  updateTargetPoint = (point, {x, y}) => {
    this.parsedPath.setLocation(point, {x, y});
    this.updatePath(true);
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

  updatePath(updateLocation=false) {
    const newPath = this.parsedPath.asString();
    const rect = this.getBoundingBox(newPath);

    let { left, top } = rect;
    let { left: oldLeft, top: oldTop, appX, appY } = this._lastAttributes;

    if (updateLocation) {
      appX += left - oldLeft;
      appY += top - oldTop;
    }

    this.updateAttributes({
      d: newPath,
      ...rect,
      appX, appY,
    });
  }

  setPath(updateLocation=false) {
    const newPath = this.parsedPath.asString();
    const rect = this.getBoundingBox(newPath);

    let { left, top } = rect;
    let { left: oldLeft, top: oldTop, appX, appY } = this._lastAttributes;

    if (updateLocation) {
      appX += left - oldLeft;
      appY += top - oldTop;
    }

    this.setAttributes({
      d: newPath,
      ...rect,
      appX, appY,
    });
  }

  /**
   * Get the bounding box of the path
   * @param {string} path d attribute of path
   * @returns {object} rect object
   */
  getBoundingBox(path) {
    let [x0, y0, x1, y1] = getBBox(path);

    let width = x1-x0, height = y1-y0;

    const rect = {
      width, height,
      left: x0, top: y0, right: x1, bottom: y1,
    };

    for (let key in rect) {
      rect[key] = parseFloat(rect[key].toFixed(2));
    }

    return rect;
  }

  _getPosition() {
    const {attributes: {left, top}} = this.state;
    return {x: left, y: top};
  }

  getControlLineViewBox() {
    const {attributes} = this.state;
    let viewBox = `${attributes.left * 2} ${attributes.top * 2} ${attributes.width * 2} ${attributes.height * 2}`;
    
    return viewBox;
  }

  setSize({ width: newWidth, height: newHeight, update=false, offsetStrokeWidth=true }) {
    const strokeWidth = offsetStrokeWidth ? this.state.attributes['stroke-width'] : 0;
    let {width, height} = this._lastAttributes;
    
    let kx  = (newWidth-strokeWidth) / width, ky = (newHeight-strokeWidth) / height;
    
    this.parsedPath.scale(kx/this._lastKX, ky/this._lastKY);
    this._lastKX = kx, this._lastKY = ky;

    if (update) {
      this.updatePath();
    } else {
      this.setPath();
    }
  }

  scale({ translationX, translationY }) {
    let {width, height} = this._lastAttributes;
    let newWidth = width + translationX / this.getScale(), newHeight = height + translationY / this.getScale();

    if (this.aspectLocked) {
      if (this.aspectRatio > 1) newHeight = newWidth / this.aspectRatio;
      else newWidth = newHeight * this.aspectRatio;
    }

    this.setSize({ width: newWidth, height: newHeight, update: true, offsetStrokeWidth: false });
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
      <PathEditLayer
        scale={Math.max(scale, 0.1)}
        viewBox={this.getParentViewBox()}
        updateTargetPoint={this.updateTargetPoint}
        onTap={this.onTap}
        onPanEnd={this.onEditEnd}
        lineStyle={{width, height, left: translateX, top: translateY, transform: [{scale: svgScale}]}}
        startPoint={this.startPoint}
        parsedPath={this.parsedPath} />
    )
  }

}

export default SvgPathItem;