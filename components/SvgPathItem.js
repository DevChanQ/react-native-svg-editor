import React from 'react';

import getBBox from 'svg-path-bbox/dist';

import { valueOrDefault } from '../utils';
import { Svg, CurveTo, SvgItem as PathItem } from './svg';
import SvgItem from './SvgItem';
import PathEditLayer from './SvgItemControlLayer/PathEditLayer';

const PathState = {
  START: 'S',
  IN_PROGRESS: 'I',
  CLOSED: 'C', 
}

class SvgPathItem extends SvgItem {
  MODE = PathState.START;
  
  _lastKX = 1;
  _lastKY = 1;
  _malformedPath = false;

  customControlLayer = true;

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

    this._refreshParsedPath();
  }

  onValueRefreshed = (changed) => {
    if (changed['d']) {
      this._refreshParsedPath();
      this._lastKX = 1;
      this._lastKY = 1;
    }
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
    let info = this.props.info.toJS(), attributes = {...this.state.attributes};
    info.attributes = attributes;

    if (external) {
      const {d, appX, appY} = attributes, {left: x, top: y} = this.getBoundingBox(d);
      let translateX = appX - x, translateY = appY - y;

      if (translateX != 0 || translateY != 0) {
        let path = new Svg(d);
        path.translate(translateX, translateY);
        attributes['d'] = path.asString(2, true);
      }

      delete attributes['x'];
      delete attributes['y'];
      delete attributes['left'];
      delete attributes['right'];
      delete attributes['top'];
      delete attributes['bottom'];
      delete attributes['width'];
      delete attributes['height'];
    }

    return super.toSvgson(external, info);
  }

  _refreshParsedPath() {
    try {
      this.parsedPath = new Svg(this._lastAttributes['d']);
    } catch (e) {
      this._malformedPath = true;
    }
    this._startPoint = null;
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
    // this.setState({ editMode: !this.state.editMode });
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
    let rect = {
      width: 0, height: 0,
      left: 0, top: 0, right: 0, bottom: 0
    };

    try {
      let [x0, y0, x1, y1] = getBBox(path);

      let width = x1-x0, height = y1-y0;

      rect = {
        width, height,
        left: x0, top: y0, right: x1, bottom: y1,
      };

      for (let key in rect) {
        rect[key] = parseFloat(rect[key].toFixed(2));
      }
    } catch (e) {

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
    newWidth = Math.abs(newWidth);
    newHeight = Math.abs(newHeight);

    const strokeWidth = offsetStrokeWidth ? this.state.attributes['stroke-width'] : 0;
    let {width, height} = this._lastAttributes;
    
    let kx = (newWidth-strokeWidth) / width, ky = (newHeight-strokeWidth) / height;
    
    this.parsedPath.scale(kx/this._lastKX, ky/this._lastKY);
    this._lastKX = kx, this._lastKY = ky;
    
    if (update) {
      this.updatePath();
    } else {
      this.setPath();
    }
  }

  scale({ translationX, translationY, update=true }) {
    let {width, height} = this._lastAttributes;
    let newWidth = width + translationX / this.getScale(), newHeight = height + translationY / this.getScale();

    if (this.aspectLocked) {
      if (this.aspectRatio > 1) newHeight = newWidth / this.aspectRatio;
      else newWidth = newHeight * this.aspectRatio;
    }

    this.setSize({ width: newWidth, height: newHeight, update, offsetStrokeWidth: false });
  }

  renderControlLayer() {
    const {scale = 1} = this.props;
    const {editMode, attributes} = this.state;

    if (!editMode) {
      return super.renderControlLayer();
    }

    return (
      <PathEditLayer
        scale={Math.max(scale, 0.1)}
        viewBox={this.getParentViewBox()}
        updateTargetPoint={this.updateTargetPoint}
        onTap={this.onTap}
        onPanEnd={this.onEditEnd}
        startPoint={this.startPoint}
        parsedPath={this.parsedPath} />
    )
  }

  render() {
    if (this._malformedPath) return null;
    
    return super.render();
  }
}

export default SvgPathItem;