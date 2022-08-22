import React from 'react';

import SvgItem, { SvgEmptyItem, GroupScopeSeparator } from './SvgItem';
import { valueOrDefault } from '../utils';

const excludeAttributes = ["devjeff:width", "devjeff:height", "devjeff:x", "devjeff:y", "appX", "appY"];

class SvgGroupItem extends SvgItem {

  itemRefs = {};

  _coors = {minX: 0, maxX: 0, minY: 0, maxY: 0};
  _shouldRefreshRect = false;
  _relativeOffset = {x: 0, y: 0};
  _absoluteOffset = {x: 0, y: 0};
  _initialPosition = null;

  constructor(props) {
    super(props);

    let {itemMapping} = props;
    if (!itemMapping) {
      console.warn('itemMapping not provided to SvgGroupItem at construct');
      itemMapping = {};
    }

    this.ITEM_MAPPING = itemMapping;
  }

  componentDidMount() {
    console.log('SvgGroupItem.conponentDidMount(): ', this.props.id);
    setTimeout(this._refreshRect, 0);
    // this.refreshValues();
  }

  _initAttributes(a) {
    let attributes = super._initAttributes(a);

    // initialize app position if undefined
    if (attributes['appX'] === undefined || attributes['appY'] === undefined || this._shouldRefreshRect) {
      let coors = this.getChildrenCoors();
      if (coors) {
        // refresh rect attributes
        console.log(`SvgGroupItem (${this.props.id}): refreshing rect attributes`, coors);

        const { minX, minY } = coors;

        this._coors = coors;
        attributes['appX'] = valueOrDefault(attributes['appX'], minX);
        attributes['appY'] = valueOrDefault(attributes['appY'], minY);

        this._relativeOffset = { x: minX, y: minY };
        this._initialPosition = { x: minX, y: minY };
      }

      this._shouldRefreshRect = false;
    }

    if (this._initialPosition && !this.isRoot) {
      this._absoluteOffset = {
        x: this._initialPosition.x - valueOrDefault(attributes['appX'], 0),
        y: this._initialPosition.y - valueOrDefault(attributes['appY'], 0)
      };
    }

    console.log(`SvgGroupItem._initAttributes (${this.props.id}):`, attributes);

    return attributes;
  }

  _refreshRect = () => {
    this._shouldRefreshRect = true;
    this.refreshValues();
  }

  onDoubleTap() {
    this.props.setScope(this.props.id);
  }

  getChildrenCoors() {
    if (!(this.itemRefs && Object.keys(this.itemRefs).length > 0)) return null;

    let childPos = Object.keys(this.itemRefs).map(id => {
      const child = this.itemRefs[id];
      if (!child) return null;
      let {x, y} = child.getAbsoluteAppPosition(), {width, height} = child.getSize();
      if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' || typeof height !== 'number') return null;
      // x1, y1  x2, y2
      return [{x, y}, {x: x+width, y: y+height}]
    }).flat().filter(coor => coor);

    let xCoor = childPos.map(coor => coor.x), yCoor = childPos.map(coor => coor.y);
    let minX = Math.min(...xCoor), maxX = Math.max(...xCoor), minY = Math.min(...yCoor), maxY = Math.max(...yCoor);

    return { minX, maxX, minY, maxY };
  }

  _getSize() {
    const { minX, maxX, minY, maxY } = this._coors;
    return {width: maxX-minX, height: maxY-minY};
  }

  _getPosition() {
    const { minX, minY } = this._coors;
    return {x: minX, y: minY};
  }

  getRelativeAppPosition() {
    if (this.isRoot) {
      return this._getPosition();
    } else {
      return super.getRelativeAppPosition();
    }
  }

  renderContent() {
    let {info: svgson, setCanvasItemRef} = this.props, children = svgson.get('children');
    let mergeAttributes = svgson.get("attributes");
    mergeAttributes = mergeAttributes.filter((attr, key) => !excludeAttributes.includes(key))

    // console.log(`SvgGroupItem.renderContent: (${this.props.id})`, this._absoluteOffset);
    
    children = children.map(child => {
      let name = child.get('name'), id = child.get('id');
      // console.log('SvgGroupItem.renderContent: ', id);
      // let info = fromJS({ attributes: mergeAttributes });
      // info = info.mergeDeep(child);

      const ItemType = this.ITEM_MAPPING[name] || SvgEmptyItem;
      return (
        <ItemType
          {...this.props}
          relativeOffset={this._relativeOffset}
          absoluteOffset={this._absoluteOffset}
          info={child}
          id={id}
          key={id}
          ref={el => {
            this.itemRefs[id] = el;
            setCanvasItemRef(el, id);
          }} />
      );
    })

    return children;
  }
}

export default SvgGroupItem;