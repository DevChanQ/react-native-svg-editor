import React from 'react';
import {View} from 'react-native';
import { fromJS } from 'immutable';

import SvgItem, { SvgEmptyItem, GroupScopeSeparator } from './SvgItem';
import { valueOrDefault } from '../utils';

const excludeAttributes = ["devjeff:width", "devjeff:height", "devjeff:x", "devjeff:y", "appX", "appY"];

class SvgGroupItem extends SvgItem {

  itemRefs = {};
  // isRoot = false;

  _shouldUpdateSize = true;
  _positionOffset = {x: 0, y: 0};

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
    this._canSetCoordinates = true;
    setTimeout(() => { this.refreshValues(); }, 0);
  }

  _initAttributes(a) {
    let attributes = super._initAttributes(a);

    if (this._canSetCoordinates) {
      let coors = this.getChildrenCoors();
      if (coors) {
        // refresh rect attributes
        console.log(`SvgGroupItem (${this.props.id}): refreshing rect attributes`, coors);

        const { minX, maxX, minY, maxY } = coors;

        attributes['devjeff:width'] = valueOrDefault(attributes['devjeff:width'], maxX-minX);
        attributes['devjeff:height'] = valueOrDefault(attributes['devjeff:height'], maxY-minY);
        
        attributes['devjeff:x'] = valueOrDefault(attributes['devjeff:x'], minX);
        attributes['devjeff:y'] = valueOrDefault(attributes['devjeff:y'], minY);
        attributes['appX'] = valueOrDefault(attributes['appX'], attributes['devjeff:x']);
        attributes['appY'] = valueOrDefault(attributes['appY'], attributes['devjeff:y']);

        // let positionOffsetX = attributes['devjeff:x'] + (attributes['appX'] - attributes['devjeff:x']);
        // let positionOffsetY = attributes['devjeff:y'] + (attributes['appY'] - attributes['devjeff:y']);
        let positionOffsetX = attributes['devjeff:x'];
        let positionOffsetY = attributes['devjeff:y'];

        this._positionOffset = { x: positionOffsetX, y: positionOffsetY };
        // this._positionOffset.x = attributes['devjeff:x'];
        // this._positionOffset.y = attributes['devjeff:y'];
      }
    }

    console.log("SvgGroupItem._initAttributes: ", attributes);

    return attributes;
  }

  onDoubleTap() {
    this.props.setScope(this.props.id);
  }

  getChildrenCoors() {
    if (!(this.itemRefs && Object.keys(this.itemRefs).length > 0)) return null;

    let childPos = Object.keys(this.itemRefs).map(id => {
      const child = this.itemRefs[id];
      let {x, y} = child.getAppPosition(), {width, height} = child.getSize();
      // x1, y1  x2, y2
      return [{x, y}, {x: x+width, y: y+height}]
    }).flat();

    let xCoor = childPos.map(coor => coor.x), yCoor = childPos.map(coor => coor.y);
    let minX = Math.min(...xCoor), maxX = Math.max(...xCoor), minY = Math.min(...yCoor), maxY = Math.max(...yCoor);

    return { minX, maxX, minY, maxY };
  }

  _getSize() {
    const width = this.state.attributes['devjeff:width'] || 0;
    const height = this.state.attributes['devjeff:height'] || 0;
    return {width, height};
  }

  _getPosition() {
    const x = this.state.attributes['devjeff:x'] || 0;
    const y = this.state.attributes['devjeff:y'] || 0;
    return {x, y};
  }

  renderContent() {
    let svgson = this.props.info, children = svgson.get('children');
    let mergeAttributes = svgson.get("attributes");
    mergeAttributes = mergeAttributes.filter((attr, key) => !excludeAttributes.includes(key))
    
    return children.map((child, index) => {
      let name = child.get('name'), id = `${this.props.id}${GroupScopeSeparator}${name}_${index}`;
      // let info = fromJS({ attributes: mergeAttributes });
      // info = info.mergeDeep(child);

      const ItemType = this.ITEM_MAPPING[name] || SvgEmptyItem;
      return (
        <ItemType
          {...this.props}
          positionOffset={this._positionOffset}
          info={child}
          id={id}
          ref={el => this.itemRefs[id] = el}
          key={id} />
      );
    })
  }
}

export default SvgGroupItem;