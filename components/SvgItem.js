import PropTypes from 'prop-types';

import React from 'react';
import {
  View,
  Text,
  TextInput,
  PixelRatio,
  Image,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Svg, { SvgXml } from 'react-native-svg';
import { SvgEditorManager } from 'react-native-svg-editor';
import { State, PanGestureHandler, PinchGestureHandler, TapGestureHandler } from 'react-native-gesture-handler';
import RNFS from 'react-native-fs';
import { stringify } from 'svgson';
import toPath from 'element-to-path';
import { Portal } from '@gorhom/portal';
import { fromJS } from 'immutable';

import { styleToAttributes, commaWspRegex } from '../utils/svgParse';
import { mergeDeep, valueOrDefault } from '../utils';
import GradientControlLayer from './SvgItemControlLayer/GradientControlLayer';
import ResizeControlLayer from './SvgItemControlLayer/ResizeControlLayer';

export const ROOT_ELEMENT_ID = 'root';
const EMPTY_OBJECT = {};

const SvgEmptyItem = () => <></>;

class SvgItem extends React.PureComponent {

  state = {
    attributes: EMPTY_OBJECT,
    gradientEditing: false
  };

  // private variables
  _doubleTapRef = React.createRef();
  _lastAttributes = null;
  _initialAttributes = null;
  _cachedXML = null;
  _internalScale = 1;

  _stateRefreshed = false;
  _attrDiff = null;

  _children = fromJS([]);

  controlColor = '#19A0FB';

  constructor(props) {
    super(props);

    console.log('SvgItem.constructor(): ', props.id);

    this._lastAttributes = this._getAttributesFromProps();
    this._initialAttributes = { ...this._lastAttributes };
    this.state = {
      gradientEditing: false,
      attributes: { ...this._lastAttributes },
    };

    this.onInit(this._initialAttributes);
    // this._setupInternalGradient();
  }
  
  componentDidUpdate({info}) {
    const {info: newInfo, id} = this.props;

    console.log(`SvgItem.componentDidUpdate (${id})`)
    // update internal state if new props is provided
    if (!newInfo.equals(info)) {
      console.log(`SvgItem (${id}): props different, proceed to update internal state`);

      const newAttributes = newInfo.get('attributes'), oldAttributes = info.get('attributes');
      this._attrDiff = newAttributes.filter((v, k) => oldAttributes.get(k) !== v).toJS();

      console.log('SvgItem.attrDiff', this._attrDiff);

      this.refreshValues();
    } else if (this._stateRefreshed) {
      console.log(`SvgItem (${id}): state refreshed and updated, call _onRefresh`);

      this._onRefresh(this._attrDiff);
    }
  }

  get id() {
    return this.props.id;
  }

  get type() {
    return this.props.info?.get('name');
  }

  /** Getter of scope level in integer number. Root level == 0 */
  get scopeLevel() {
    if (this.props.scope === null) return 1;

    const splitted = this.props.scope.split(GroupScopeSeparator);
    return splitted.length + 1;
  }

  /** Getter of this element's scope level in integer number. Root level == 0 */
  get elementScopeLevel() {
    if (this.props.id === ROOT_ELEMENT_ID) return 0;

    const splitted = this.props.id.split(GroupScopeSeparator);
    return splitted.length;
  }

  // boolean flag getters
  get translateEnabled() {
    return !this.locked && this.selected && !this.isEditingGradient;
  }

  /** whether to show size box or not */
  get shouldShowSize() {
    return this.props.showSize;
  }

  get isRoot() {
    return this.props.id === ROOT_ELEMENT_ID;
  }
  
  get isFrame() {
    return this.state.attributes.id === 'frame';
  }

  get inScope() {
    return this.elementScopeLevel === this.scopeLevel;
  }

  get isTransparent() {
    return false;
    // return (!this.inScope && this.elementScopeLevel < this.scopeLevel) && this.props.scope !== this.props.id;
  }

  get isGradientFill() {
    // TODO: fill attributes can be a url and not a gradient (background image)
    return !!this.state.attributes.fill?.url;
  }

  get isEditingGradient() {
    return this.state.gradientEditing && this.isGradientFill;
  }

  get locked() {
    return !!this.state.attributes['devjeff:locked'] || this.isFrame;
  }

  get aspectLocked() {
    return !!this.state.attributes['devjeff:aspectLocked'];
  }

  get selected() {
    return this.props.selected == this.id;
  }

  get disabled() {
    return this.props.disabled || !this.inScope;
  }

  get gradientFill() {
    return this.state.attributes['devjeff:gradient'];
  }

  /** Getter for svgson of gradient */
  get gradientSvgson() {
    const gradient = this.gradientFill;
    if (gradient) {
      return [gradient].map(gradient => {
        let { type: name, otherAttrs, stops, x1, y1, x2, y2 } = gradient;
        stops = stops.map(({ color, offset, opacity }) => ({
          type: 'element', name: 'stop',
          attributes: { offset, 'stop-color': color, 'stop-opacity': opacity },
          children: []
        }));
        
        let g = {
          type: 'element', name,
          attributes: { x1, y1, x2, y2, ...otherAttrs, gradientUnits: 'userSpaceOnUse' },
          children: stops
        };
        
        return g;
      });
    }

    return [];
  }

  /** Getter for svgson of gradient, used by internal svg rendering */
  get internalGradientSvgson() {
    const {x, y} = this.getPosition();

    return this.gradientSvgson.map(g => {
      let {attributes} = g;
      attributes['x1'] += x;attributes['x2'] += x;attributes['y1'] += y;attributes['y2'] += y;
      return g;
    });
  }

  get attributes() {
    return this.state.attributes;
  }

  get lastAttributes() {
    return this._lastAttributes;
  }

  get transformAttributes() {
    return {
      'rotate': this.state.attributes['devjeff:rotate'] || 0,
      'scaleX': this.state.attributes['devjeff:scaleX'] || 1,
      'scaleY': this.state.attributes['devjeff:scaleY'] || 1,
      'skewX': this.state.attributes['devjeff:skewX'] || 0,
      'skewY': this.state.attributes['devjeff:skewY'] || 0,
      'matrix': this.state.attributes['devjeff:matrix'] || [],
    }
  }

  get canvasContext() {
    return this.props.canvasContext || {};
  }

  get canvasSize() {
    return this.canvasContext.canvasSize;
  }

  /**
   * Get svgson of the SvgItem. Called when exporting to svg. Cleans attributes (remove internal attributes)
   * @param {Boolean} external Indicate whether the svgson object should be cleaned for external use or not
   * @returns {object,Promise} cleaned svgson object / Promise that resolves to svgson object
   */
  toSvgson(external=true, info) {
    if (!info) {
      info = this.props.info.toJS();
      info.attributes = {...this.state.attributes};
    }

    let {attributes} = info;

    // deserialising attributes for export
    for (let key in attributes) {
      if (attributes[key].url) { attributes[key] = `url(${attributes[key].url})` }
      
      if (typeof attributes[key] === 'object') { delete attributes[key] }
    }

    if (external) {
      let rotate = parseFloat(attributes['devjeff:rotate'] || 0);
      if (rotate) {
        let appX = attributes['appX'] || 0, appY = attributes['appY'] || 0;
        attributes['transform'] = `rotate(${rotate} ${appX} ${appY})`;
      }

      // remove custom attributes
      delete attributes['appX'];
      delete attributes['appY'];
      for (let key in attributes) {
        if (key.includes("devjeff:")) delete attributes[key];
      }
    }

    return info;
  }

  refreshValues() {
    this._stateRefreshed = true;
    this._lastAttributes = this._getAttributesFromProps();
    this.setState({attributes: { ...this._lastAttributes }});
  }

  /**
   * Attribute initialization, used for setting up exisiting attributes,
   * and converting/adding app specific element attributes, for example: `appX` and `appY` 
   * Override to customize
   * @param {object} a 
   * @returns {object} Transformed attribute object
   */
   _initAttributes(a) {
    let attributes = {...a};

    // Inline css style trumps attributes for priority
    // https://stackoverflow.com/questions/24293880/svg-why-does-external-css-override-inline-style-for-text
    if (attributes['style']) {
      const rules = styleToAttributes(attributes['style']);
      for (let rule of rules) {
        attributes[rule.directive] = parseFloat(rule.value);
        if (isNaN(attributes[rule.directive])) {
          attributes[rule.directive] = rule.value;
        }
      }
      delete attributes['style'];
    }

    // default fill color if fill is not defined
    // attributes['fill'] = attributes['fill'] || 'black';
    attributes['fill-opacity'] = valueOrDefault(attributes['fill-opacity'], 1);
    // stroke-width if stroke-width is not defined and stroke is
    attributes['stroke'] = valueOrDefault(attributes['stroke'], '');
    attributes['stroke-width'] = valueOrDefault(attributes['stroke-width'], attributes['stroke'] ? 1 : 0);
    attributes['stroke-opacity'] = valueOrDefault(attributes['stroke-opacity'], 1);

    attributes['devjeff:locked'] = valueOrDefault(attributes['devjeff:locked'], 0);

    // transform attributes init
    if (attributes['transform']) {
      let transforms = attributes['transform'].split(")").filter(transform => !!transform);
      for (let transform of transforms) {
        let [command, values] = transform.split("(");
        command = command.replace(/\s/g, "");
        values = values.replaceAll(commaWspRegex, ",").split(",").filter(v => v).map(v => parseFloat(v));

        if (command === 'rotate') {
          attributes['devjeff:rotate'] = valueOrDefault(values[0], 0);
        } else if (command === 'translate') {
          attributes['devjeff:translateX'] = valueOrDefault(values[0], 0);
          attributes['devjeff:translateY'] = valueOrDefault(values[1], 0);
        } else if (command === 'scale') {
          attributes['devjeff:scaleX'] = valueOrDefault(values[0], 1);
          attributes['devjeff:scaleY'] = valueOrDefault(values[1], attributes['devjeff:scaleX']);
        } else if (command === 'skewX') {
          attributes['devjeff:skewX'] = values[0];
        } else if (command === 'skewY') {
          attributes['devjeff:skewY'] = values[0];
        } else if (command === 'matrix') {
          attributes['devjeff:scaleX'] = valueOrDefault(values[0], 1);
          attributes['devjeff:scaleY'] = valueOrDefault(values[3], 1);
          attributes['devjeff:translateX'] = valueOrDefault(values[4], 0);
          attributes['devjeff:translateY'] = valueOrDefault(values[5], 0);
        }
      }

      delete attributes['transform'];
    }

    return attributes;
  }

  /**
   * Setup Internal Gradient, called in constructor
   */
  _setupInternalGradient() {
    const {attributes} = this.state;
    if (attributes['fill']?.url) {
      const {gradients} = this.props;

      let selector = attributes['fill'].url;
      selector = selector.slice(1);
      const fillGradient = gradients.find(gradient => gradient.attributes.id == selector);
      if (fillGradient) {
        let { name: type, children: stops=[], attributes: gradient } = fillGradient;
        let { x1, y1, x2, y2, ...otherAttrs } = gradient, gradientUnits = otherAttrs['gradientUnits'];

        // Linear Gradient Implementation as per:
        // https://www.w3.org/TR/SVG11/pservers.html#LinearGradientElementX1Attribute
        x1 = parseFloat(x1), y1 = parseFloat(y1), x2 = parseFloat(x2), y2 = parseFloat(y2);

        stops = stops.map(({ attributes: stop }) => {
          let { offset="0" } = stop,
            color = stop['stop-color'] || "black",
            opacity = stop['stop-opacity'] || "1";
          
          if (offset.includes('%')) { // percentage value
            offset = parseFloat(offset) / 100;
          } else {
            offset = parseFloat(offset);
          }
  
          return { offset, color, opacity };
        });

        if (!gradientUnits || gradientUnits === "objectBoundingBox") {
          // objectBoundingBox
          const {width, height} = this.getSize();
          x1 *= width; x2 *= width; y1 *= height; y2 *= height;
        } else {
          // TODO: userSpaceOnUse gradient
        }

        this.state.attributes['devjeff:gradient'] = { type, stops, x1, y1, x2, y2, otherAttrs };
      }
    }
  }

  /**
   * Point object
   * @typedef {Object} Point
   * @property {number} x - coordinate x of rect
   * @property {number} y - coordinate y of rect
   */

  /**
   * Rect object
   * @typedef {Object} Rect
   * @property {number} width - width of rect
   * @property {number} height - height of rect
   * @property {number} x - coordinate x of rect
   * @property {number} y - coordinate y of rect
   */
  
  /**
   * Override to provide custom app rect provider
   * @returns {Rect} rect object
   */
  _initAppRect(attributes) {
    const {width=0, height=0, x=0, y=0} = attributes;
    return {width, height, x, y};
  }

  _calculateInternalScale() {
    // set interal scale
    const window = Dimensions.get("window");

    const MAX_SCALE = Platform.select({ 'android': 5, 'ios': 15 }), MIN_SCALE = 0.2
    const {width, height} = this.getSize();
    const pixels = width * height;
    const pixelLimit = window.width * window.height;

    this._internalScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pixelLimit / pixels));
  }

  /**
   * Get info from props and serializee attributes to js values
   */
  _getAttributesFromProps() {
    let {info} = this.props;
    info = info.toJS();
    let {attributes} = info;

    for (let key in attributes) {
      let attr = attributes[key];

      // skip serialisig if attribute is not a string
      if (typeof attr !== 'string') continue;

      // special case for polygon/polyline points attr
      if (key === 'points') {
        let points = attr.split(" ");
        attributes[key] = points.map((p, index) => {
          if (!p) return null;

          const coor = p.split(",");

          if (!coor[1]) {
            if ((index + 1) % 2 == 0) return null;
            return {x: parseFloat(coor[0]), y: parseFloat(points[index+1])}
          }

          return {x: parseFloat(coor[0]), y: parseFloat(coor[1])}
        }).filter(p => !!p);

        continue;
      }

      if (attr.includes("url(")) {
        // url value
        let url = attr.split('(')[1].slice(0, -1);
        attributes[key] = { url };
      } else if (attr === "true" || attr === "false") {
        // boolean value
        attributes[key] = attr === "true";
      } else {
        // number value
        let num = Number(attr);
        if (!Number.isNaN(num)) {
          attributes[key] = num;
        }
      }
    }

    return this._initAttributes(attributes);
  }

  /**
   * Called Internally after the given attributes is updated/refreshed 
   * Internal state are updated before this function call
   * @param {object} changed Attributes that was updated
   */
  _onRefresh = (changed={}) => {
    // update aspect ratio
    const {width, height} = this.getSize();
    this.aspectRatio = width / height;

    this._children = this.props.info.get("children");

    // call onValueRefreshed callback
    this.onValueRefreshed(changed);

    this._stateRefreshed = false;
  }

  setElement(svgson) {
    const {setElementById, id} = this.props;
    if (setElementById) {
      setElementById(id, svgson);
    } else {
      console.warn('No setElementById in props');
    }
  }

  /**
   * Set attribute globally (in editor)
   * Difference between setAttributes & updateAttributes is that _lastAttrributes is updated and history is pushed
   * @param {object} obj attribute object
   */
  setAttributes = (attributes, history=true) => {
    if (history) {
      this.setElement({attributes});
    } else {
      this.updateAttributes(attributes);
      this._lastAttributes = mergeDeep(this._lastAttributes, attributes);
    }
  }

  setCurrentAttributes = (history=true) => {
    if (history) {
      this.setElement({attributes: this.state.attributes});
    } else {
      this._lastAttributes = mergeDeep(this._lastAttributes, this.state.attributes);
    }
  }

  asPath = () => {
    const svgson = this.toSvgson();
    const path = toPath(svgson);
    console.log('SvgItem.asPath: ', path);

    this.setElement({
      type: 'element',
      name: 'path',
      attributes: {
        d: path,
      }
    });
  };

  /**
   * Update attribute localy
   * @param {object} obj Attribute object
   */
  updateAttributes = (obj) => {
    let attributes = {...this.state.attributes};
    attributes = mergeDeep(attributes, obj);
    this.setState({attributes});
  }

  /**
   * Called after attributes are set/refreshed
   * @param {object} changed Object that contains the updated attributes 
   */
  onValueRefreshed = (changed) => {};

  /**
   * Called in constructor
   * @param {object} attributes Object that contains the initial attributes 
   */
  onInit = (attributes) => {
    console.log('SvgItem.onInit: ', attributes);
  };

  onResize = ({nativeEvent: {translationX, translationY}}) => {
    this.scale({translationX, translationY});
  };

  onResizeStateChanged = ({nativeEvent: {oldState}}) => {
    if (oldState === State.ACTIVE) {
      this.setAttributes(this.state.attributes);
    }
  };

  onPan = ({nativeEvent: {translationX, translationY}}) => {
    if (this.translateEnabled) {
      this.translate({translationX, translationY});
    }
  };

  onPanStateChanged = ({nativeEvent: {oldState, state}}) => {
    console.log(`SvgItem.onPanStateChanged (${this.props.id})`)
    if (state === State.BEGAN) {
      this._onSingleTap();

      if (this.props.onPanBegan) {
        this.props.onPanBegan(this.props.id);
      }
    } else if (oldState === State.ACTIVE) {
      if (this.translateEnabled) {
        this.setAttributes(this.state.attributes);
        
        if (this.props.onPanEnded) {
          this.props.onPanEnded(this.props.id);
        }
      }
    }
  };

  _onSingleTap = () => {
    if (this.props.onTap) {
      this.props.onTap({
        id: this.props.id,
        svgson: this.props.info,
      });
    }
  };

  _onDoubleTap = ({nativeEvent: {oldState}}) => {
    if (oldState === State.ACTIVE) {
      this.onDoubleTap();
    }
  };

  onDoubleTap() {
    // this.asPath();
  }

  /**
   * Translate(Move) function, override to customize
   * @param {number} obj.translationX Number to translate by in the x axis
   * @param {number} obj.translationY Number to translate by in the y axis
   */
  translate({translationX, translationY}) {
    let {appX, appY} = this._lastAttributes, {width, height} = this.getSize();

    appX += translationX / this.getScale();
    appY += translationY / this.getScale();

    // calculate guidelines
    if (this.props.offsetPositionToGuideline) {
      let {x, y} = this.props.offsetPositionToGuideline({x: appX, y: appY, width, height}, this.props.id);
      appX = x, appY = y;
    }

    this.setPosition({x: appX, y: appY, update: true});
  }

  /**
   * Scale function, override to customize
   */
  scale({ translationX, translationY, scale }) {
    let {width, height, appX, appY} = this._lastAttributes;

    if (scale) {
      let updatedAttributes = { width, height, appX, appY };

      updatedAttributes['width'] *= scale;
      updatedAttributes['height'] *= scale;
      updatedAttributes['appX'] -= (updatedAttributes['width'] - width)/2;
      updatedAttributes['appY'] -= (updatedAttributes['height'] - height)/2;

      this.updateAttributes(updatedAttributes)
    } else {
      width += translationX / this.getScale();
      height += translationY / this.getScale();

      if (this.aspectLocked) {
        if (this.aspectRatio > 1) height = width / this.aspectRatio;
        else width = height * this.aspectRatio;
      }

      this.setSize({width, height, update: true});

      // calculate guidelines
      // if (this.props.offsetPositionToGuideline) {
      //   let { width, height, appX, appY } = updatedAttributes;
      //   let { x, y } = this.props.offsetPositionToGuideline({x: appX, y: appY, width, height}, this.props.id);
      //   updatedAttributes['width'] += x - appX;
      //   updatedAttributes['height'] += y - appY;
      // }
    }
  }

  /**
   * Transform attributes for displaying/rendering, override to customize. Called by `_generateXml` \
   * Some attributes of elements such as `<rect>` needs to be transformed under certain situations,
   * for example `<rect>` with `stroke-width`
   * @param {object} attributes
   * @returns {object} transformed attributes
   */
  transform(a) {
    let attributes = { ...a };
    if (attributes['fill']?.url) {
      attributes['fill'] = `url(${attributes['fill'].url})`;
    }
    
    return attributes;
  }

  getScale() {
    return this.props.scale;
  }

  /**
   * Returns size of element (from internal state), not offset by strokeWidth \
   * Override this method in subclass to implement custom size provider
   * @returns {object} Size object containing width and height
   */
  _getSize() {
    const {attributes: {width=0, height=0}} = this.state;
    return {width, height};
  }

  /**
   * Returns position of element (from internal state), not offset by strokeWidth \
   * Override this method in subclass to implement custom size provider
   * @returns {Point} Point object
   */
   _getPosition() {
    const {attributes: {x=0, y=0}} = this.state;
    return {x, y};
  }

  /**
   * Returns size of element including stroke width
   * @returns {object} Size object containing width and height
   */
  getSize() {
    const {width, height} = this._getSize();
    const stroke = this.state.attributes['stroke'], strokeWidth = stroke ? this.state.attributes['stroke-width'] : 0;
    return {width: width+strokeWidth, height: height+strokeWidth};
  }

  /**
   * Returns internal position used for viewbox
   * @returns {Point} Internal position Point object
   */
  getPosition() {
    const {x, y} = this._getPosition();
    const stroke = this.state.attributes['stroke'], strokeWidth = stroke ? this.state.attributes['stroke-width'] : 0;
    return {x: x-strokeWidth/2, y: y-strokeWidth/2};
  }

  getParentViewBox() {
    const {width, height} = this.getSize(), {x, y} = this.getPosition();
    return `${x} ${y} ${width} ${height}`;
  }

  /**
   * Returns app position, not offseted
   * @returns {Point} App position Point object
   */
  getAppPosition() {
    const {attributes: {appX=0, appY=0}} = this.state;
    const stroke = this.state.attributes['stroke'], strokeWidth = stroke ? this.state.attributes['stroke-width'] : 0;
    const translateX = this.state.attributes['devjeff:translateX'] || 0, translateY = this.state.attributes['devjeff:translateY'] || 0;
    return {x: appX+translateX-strokeWidth/2, y: appY+translateY-strokeWidth/2};
  }

  /**
   * Returns relative app position used for rendering (position relative to parent)
   * @returns {Point} App position Point object
   */
  getRelativeAppPosition() {
    const {x, y} = this.getAppPosition(), {relativeOffset} = this.props;
    return {x: x-relativeOffset.x, y: y-relativeOffset.y};
  }

  getAbsoluteAppPosition() {
    const {x, y} = this.getAppPosition(), {absoluteOffset} = this.props;
    return {x: x-absoluteOffset.x, y: y-absoluteOffset.y};
  }

  /**
   * Set Width & Height of element
   * @param {number} size.width new width
   * @param {number} size.height new height
   */
  setSize({ width=-1, height=-1, update=false, offsetStrokeWidth=true }) {
    width = Math.abs(width);
    height = Math.abs(height);

    const strokeWidth = offsetStrokeWidth ? this.state.attributes['stroke-width'] : 0;
    width = parseFloat(width) - strokeWidth, height = parseFloat(height) - strokeWidth;
    if (update) {
      this.updateAttributes({ width, height });
    } else {
      this.setAttributes({ width, height });
    }
  }

  setPosition({ x, y, update=false }) {
    const stroke = this.state.attributes['stroke'], strokeWidth = stroke ? this.state.attributes['stroke-width'] : 0;
    const translateX = this.state.attributes['devjeff:translateX'] || 0, translateY = this.state.attributes['devjeff:translateY'] || 0;
    x += (translateX+strokeWidth/2);
    y += (translateY+strokeWidth/2);
    if (update) {
      this.updateAttributes({ appX: x, appY: y });
    } else {
      this.setAttributes({ appX: x, appY: y });
    }
  }

  _generateXML() {
    let {attributes} = this.state;
    let {attributes: propsAttributes} = this.props.info.toObject();

    if (!this._cachedXML || !propsAttributes.equals(attributes)) {
      const { defs=[] } = this.canvasContext;

      this._cachedXML =  stringify({
        name: 'svg',
        type: 'element',
        value: '',
        attributes: {
          viewBox: this.getParentViewBox(),
          preserveAspectRatio: "none"
        },
        children: [
          {
            name: 'defs',
            type: 'element',
            value: '',
            children: defs,
          },
          {
            ...this.props.info.toJS(),
            attributes: this.transform(attributes),
          }
        ]
      });
    }

    return this._cachedXML;
  }

  setGradientEditing(flag) {
    this.setState({ gradientEditing: !!flag });
  }

  renderContent() {
    let {width, height} = this.getSize(), ogWidth = width, ogHeight = height;

    width *= this._internalScale;
    height *= this._internalScale;

    let svgScale = 1/this._internalScale, translateX = -((width - ogWidth)/2), translateY = -((height - ogHeight)/2);
    const xml = this._generateXML();

    return (
      <View style={{width, height, transform: [{translateX}, {translateY}, {scale: svgScale}]}}>
        <SvgXml width="100%" height="100%" xml={xml} />
      </View>
    );
  }

  renderControlLayer() {
    if (this.isEditingGradient) {
      const scale = this.getScale();

      return (
        <GradientControlLayer
          scale={scale}
          gradient={this.gradientFill}
          updateAttributes={this.updateAttributes}
          setAttributes={this.setAttributes} />
      )
    }

    return (
      <ResizeControlLayer elementRef={this} />
    );
  }

  render() {
    if (this.state.attributes == EMPTY_OBJECT) {
      return <View />
    }

    let {width, height} = this.getSize();
    let {x: relativeX, y: relativeY} = this.getRelativeAppPosition(), {x: resizeBoxX, y: resizeBoxY} = this.getAbsoluteAppPosition();
    let {rotate, scaleX, scaleY, skewX, skewY} = this.transformAttributes;
    let left = relativeX, top = relativeY;

    if (!(typeof width === 'number' && typeof height === 'number')) {
      console.warn("getSize returned size object that contains non-number values, setting width and height to 0 to avoid react native error");
      console.warn(`Please investigate problem`, `id - ${this.props.id}`, this.getSize());
      width = 0; height = 0;
    }

    if (Number.isNaN(left) || Number.isNaN(top)) {
      console.warn("getRelativeAppPosition returned size object with NaN, setting x and y to 0 to avoid react native error");
      console.warn(`Please investigate problem`, `id - ${this.props.id}`, this.getRelativeAppPosition());
      left = 0; top = 0;
    }

    if (Number.isNaN(resizeBoxX) || Number.isNaN(resizeBoxY)) {
      console.warn("getAbsoluteAppPosition returned size object with NaN, setting x and y to 0 to avoid react native error");
      console.warn(`Please investigate problem`, `id - ${this.props.id}`, this.getAbsoluteAppPosition());
      resizeBoxX = 0; resizeBoxY = 0;
    }

    width = PixelRatio.roundToNearestPixel(width), height = PixelRatio.roundToNearestPixel(height);
    left = PixelRatio.roundToNearestPixel(left), top = PixelRatio.roundToNearestPixel(top);

    this._calculateInternalScale();

    return (
      <View style={{
        position: 'absolute',
        width, height, left, top,
        opacity: this.isTransparent ? 0.5 : 1,
        transform: [
          {skewX: `${skewX}deg`},
          {skewY: `${skewY}deg`},

          {translateX: -width/2},
          {translateY: -height/2},
          {rotate: `${rotate}deg`},
          {translateX: width/2},
          {translateY: height/2},
        ]
      }}>
        <TapGestureHandler
          ref={this._doubleTapRef}
          enabled={!this.locked && !this.disabled}
          onHandlerStateChange={this._onDoubleTap}
          numberOfTaps={2}>
          <PanGestureHandler
            enabled={!this.disabled}
            minPointers={1}
            maxPointers={1}
            onGestureEvent={this.onPan}
            onHandlerStateChange={this.onPanStateChanged}>
            <View style={{
              width: '100%', height: '100%',
              transform: [{scaleX}, {scaleY},],
            }}>

              {this.renderContent()}

            </View>
          </PanGestureHandler>
        </TapGestureHandler>

        <Portal hostName="controlLayerPortal">

          <View pointerEvents='box-none' style={{
            position: 'absolute',
            width, height, left: resizeBoxX, top: resizeBoxY,
          }}>
            { this.selected ? this.renderControlLayer() : null }
          </View>
          
        </Portal>
      </View>
    );
  }
}

class SvgAsyncItem extends SvgItem {

  renderContent() {
    const {loading} = this.state;
    if (loading) {
      let {width, height} = this.getSize();

      return (
        <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      )
    }

    return this.asyncRenderContent();
  }

  asyncRenderContent() {
    return super.renderContent();
  }

  loadAsyncContent() {
    console.log('SvgAsyncItem.loadAsyncContent()');
    
    this.setState({ loading: true });
    this.load().then((state={}) => {
      this.setState({ ...state, loading: false });
    }).catch(() => {
      this.setState({ loading: false });
    })
  }

  /**
   * Load content implementation
   * @return {Promise} Promise that resolves when the content is loaded
   */
  async load() {
    return '';
  }

}

class SvgPlainItem extends SvgItem {
  onSvgLayout = ({nativeEvent}) => {
    // console.log(nativeEvent.layout);
  }
}

class SvgLineItem extends SvgItem {
  _initAttributes(a) {
    let attributes = super._initAttributes(a);

    attributes['x1'] = valueOrDefault(attributes['x1'], 0);
    attributes['y1'] = valueOrDefault(attributes['y1'], 0);
    attributes['x2'] = valueOrDefault(attributes['x2'], 0);
    attributes['y2'] = valueOrDefault(attributes['y2'], 0);

    let {x1, y1, x2, y2} = attributes;
    let minX = Math.min(x1, x2), minY = Math.min(y1, y2), width = Math.abs(x2 - x1), height = Math.abs(y2 - y1);

    attributes['appX'] = valueOrDefault(attributes['appX'], minX);
    attributes['appY'] = valueOrDefault(attributes['appY'], minY);
    attributes['width'] = valueOrDefault(attributes['width'], width);
    attributes['height'] = valueOrDefault(attributes['height'], height);

    return attributes;
  }

  _getPosition() {
    const {x1, y1, x2, y2} = this.state.attributes;
    return {x: Math.min(x1, x2), y: Math.min(y1, y2)};
  }
}

class SvgRectItem extends SvgItem {
  _initAttributes(a) {
    let attributes = super._initAttributes(a);

    attributes['x'] = valueOrDefault(attributes['x'], 0);
    attributes['y'] = valueOrDefault(attributes['y'], 0);
    attributes['appX'] = valueOrDefault(attributes['appX'], attributes['x']);
    attributes['appY'] = valueOrDefault(attributes['appY'], attributes['y']);

    return attributes;
  }

  toSvgson(external=true) {
    let info = this.props.info.toJS(), attributes = {...this.state.attributes};
    info.attributes = attributes;
    attributes['x'] = attributes['appX'];
    attributes['y'] = attributes['appY'];
    
    return super.toSvgson(external, info);
  }
}

class SvgPolygonItem extends SvgItem {
  _initAttributes(a) {
    let attributes = super._initAttributes(a);

    // set initial app coordinate from points
    let points = attributes['points'], xCoor = points.map(p => p.x), yCoor = points.map(p => p.y);
    let minX = Math.min(...xCoor), maxX = Math.max(...xCoor), minY = Math.min(...yCoor), maxY = Math.max(...yCoor);

    attributes['appX'] = valueOrDefault(attributes['appX'], minX);
    attributes['appY'] = valueOrDefault(attributes['appY'], minY);
    attributes['width'] = valueOrDefault(attributes['width'], maxX - minX);
    attributes['height'] = valueOrDefault(attributes['height'], maxY - minY);

    return attributes;
  }

  toSvgson(external=true) {
    let info = this.props.info.toJS(), attributes = {...this.state.attributes};
    info.attributes = attributes;
    attributes['points'] = attributes['points'].map(p => `${p.x},${p.y}`).join(" ");
    
    return super.toSvgson(external, info);
  }
  
  transform(a) {
    let attributes = super.transform(a);

    attributes['points'] = attributes['points'].map(p => `${p.x},${p.y}`).join(" ");

    return attributes;
  }

  _getPosition() {
    const {points} = this.state.attributes;
    const x = Math.min(...points.map(p => p.x)), y = Math.min(...points.map(p => p.y));
    return {x, y};
  }
}

class SvgEllipseItem extends SvgItem {
  _initAttributes(a) {
    let attributes = super._initAttributes(a);

    let rx = valueOrDefault(attributes['rx'], 0), ry = valueOrDefault(attributes['ry'], 0);
    let cx = valueOrDefault(attributes['cx'], 0), cy = valueOrDefault(attributes['cy'], 0);

    attributes['appX'] = valueOrDefault(attributes['appX'], cx - rx);
    attributes['appY'] = valueOrDefault(attributes['appY'], cy - ry);

    return attributes;
  }

  toSvgson(external=true) {
    let info = this.props.info.toJS(), attributes = {...this.state.attributes};
    const {x, y} = this.getAppPosition(), {width, height} = this.getSize();
    info.attributes = attributes;
    attributes['cx'] = x + (width / 2);
    attributes['cy'] = y + (height / 2);
    
    return super.toSvgson(external, info);
  }
  
  scale({translationX, translationY}) {
    let {rx, ry} = this._lastAttributes;
    rx += (translationX / this.getScale()) / 2;
    ry += (translationY / this.getScale()) / 2;

    if (this.aspectLocked) {
      if (this.aspectRatio > 1) ry = rx / this.aspectRatio;
      else rx = ry * this.aspectRatio;
    }

    this.updateAttributes({ rx, ry });
  }
  
  setSize({ width, height, update=false, offsetStrokeWidth=true }) {
    width = Math.abs(width);
    height = Math.abs(height);

    const strokeWidth = offsetStrokeWidth ? this.state.attributes['stroke-width'] : 0;
    width = parseFloat(width) - strokeWidth, height = parseFloat(height) - strokeWidth;
    let rx = width / 2, ry = height / 2;

    if (update) {
      this.updateAttributes({rx, ry});
    } else {
      this.setAttributes({rx, ry});
    }
  }

  _getSize() {
    const {rx, ry} = this.state.attributes;
    return {width: rx*2, height: ry*2};
  }

  _getPosition() {
    const {attributes: {cx, cy, rx, ry}} = this.state;
    return {x: cx - rx, y: cy - ry};
  }
}

class SvgCircleItem extends SvgItem {
  _initAttributes(a) {
    let attributes = super._initAttributes(a);

    let r = valueOrDefault(attributes['r'], 0);
    let cx = valueOrDefault(attributes['cx'], 0), cy = valueOrDefault(attributes['cy'], 0);

    attributes['appX'] = valueOrDefault(attributes['appX'], cx - r);
    attributes['appY'] = valueOrDefault(attributes['appY'], cy - r);

    return attributes;
  }

  transform(a) {
    let attributes = super.transform(a);

    // if (attributes['stroke-width']) {
    //   let strokeWidth = attributes['stroke-width'];

    //   attributes['r'] -= strokeWidth/2;
    // }

    return attributes;
  }

  _getSize() {
    const {r} = this.state.attributes;
    return {width: r*2, height: r*2};
  }

  _getPosition() {
    const {attributes: {cx, cy, r}} = this.state;
    return {x: cx - r, y: cy - r};
  }
}

class SvgTextItem extends SvgItem {
  // TODO: Implement <tspan>

  _baselineOffset = 0;
  valueRefreshed = true;
  manuallyEdited = false;

  constructor(props) {
    super(props);

    this.onInit(this._initialAttributes);
  }

  get text() {
    let children = this.props.info.toJS()['children'];
    return children?.filter(child => child.type === "text")[0]?.value || "";
  }

  get fontSize() {
    return this.state.attributes['font-size'] || 16;
  }

  get fontWeight() {
    return this.state.attributes['font-weight'] || '400';
  }

  get fontFamily() {
    return this.state.attributes['font-family'];
  }

  _initAttributes(a) {
    let attributes = super._initAttributes(a);

    attributes['appX'] = valueOrDefault(attributes['appX'], attributes['x'] || 0);
    attributes['appY'] = valueOrDefault(attributes['appY'], attributes['y'] || 0);
    attributes['font-size'] = valueOrDefault(parseFloat(attributes['font-size']), 16);

    attributes['text-shadow'] = valueOrDefault(attributes['text-shadow'], false);

    return attributes;
  }

  _getSize() {
    const {attributes: {width=100, height=100}} = this.state;
    return {width, height};
  }

  onInit = (attributes) => {
    if (attributes['width'] && attributes['height']) {
      this.manuallyEdited = true;
    }
  };

  scale(translation) {
    if (!this.manuallyEdited) this.manuallyEdited = true;
    super.scale(translation);
  }

  toSvgson(external=true) {
    let info = this.props.info.toJS(), attributes = {...this.state.attributes}, {children} = info;
    info.attributes = attributes;

    info.children = [{...children[0], type: 'text'}];

    if (external) {
      // TODO: external export should transform text to path element
      const {x, y} = this.getAppPosition();
      attributes['x'] = x;
      attributes['y'] = y + this._baselineOffset;

      delete attributes['width'];
      delete attributes['height'];
    }
    
    return super.toSvgson(external, info);
  }

  asPath = () => {
    let fontFamily = this.fontFamily || "OpenSans-Regular"
    let fontWeight = this.fontWeight;
    if (fontWeight == 100) fontFamily = fontFamily.replace('Regular', 'Light');
    else if (fontWeight == 700) fontFamily = fontFamily.replace('Regular', 'Bold');

    const path = SvgEditorManager.textToPath(this.text, fontFamily, this.fontSize);
    // console.log('Text to Path: ', path)
    this.setElement({
      type: 'element',
      name: 'path',
      attributes: {
        d: path,
        x: 0, y: 0,
      }
    });
  }

  onDoubleTap() {
    this.setState({ editMode: !this.state.editMode });
  }

  onSubmitEditing = ({ nativeEvent: { text }}) => {
    this.setElement({
      children: [{ "value": text, "type": "text" }]
    });
  }

  onTextLayout = ({ nativeEvent }) => {
    const {lines} = nativeEvent;
    if (this.valueRefreshed && !this.manuallyEdited) {
      let heights = lines.map(({height}) => height), widths = lines.map(({width}) => width);
      let height = heights.reduce((p, v) => ( p > v ? p : v ), 0), width = widths.reduce((p, v) => p + v, 0);
      let size = {width: width || 100, height: height || 100};

      this._baselineOffset = lines[0]?.ascender || 0;
      this.valueRefreshed = false;

      this.setAttributes({
        width: Math.round(size.width+2),
        height: Math.round(size.height)
      }, false);
    }
  }

  onBlur = () => {
    this.setState({ editMode: false });
  }

  renderContent() {
    const {attributes, editMode} = this.state;

    const style = {
      position: 'absolute',
      fontSize: attributes['font-size'] || 16,
      color: attributes['fill'] || 'black',
    };

    if (attributes['font-weight']) {
      style['fontWeight'] = attributes['font-weight'];
    }

    if (attributes['font-family']) {
      style['fontFamily'] = attributes['font-family'];
    }

    if (attributes['text-shadow']) {
      style['textShadowOffset'] = { height: 3 };
      style['textShadowRadius'] = 3;
      style['textShadowColor'] = '#00000078';
    }

    if (editMode && this.selected) {
      return (
        <TextInput
          style={style}
          defaultValue={this.text}
          onBlur={this.onBlur}
          onSubmitEditing={this.onSubmitEditing}
          autoFocus
          blurOnSubmit />
      )
    }

    return (
      <Text
        style={style}
        onTextLayout={this.onTextLayout}
        allowFontScaling={false}>{this.text}</Text>
    );
  }
}

class SvgImageItem extends SvgItem {
  sizeNotProvided = false;
  initialRendered = false;
  aspectRatio = 1;

  _initAttributes(a) {
    let attributes = super._initAttributes(a);

    if (!attributes['width'] || !attributes['height']) {
      this.sizeNotProvided = true;
      attributes['width'] = 100;
      attributes['height'] = 100;
    }
    
    attributes['appX'] = valueOrDefault(attributes['appX'], attributes['x'] || 0);
    attributes['appY'] = valueOrDefault(attributes['appY'], attributes['y'] || 0);

    return attributes;
  }

  _onImageLoad = ({nativeEvent: {source}}) => {
    if (!this.initialRendered && this.sizeNotProvided) {
      const pixelRatio = PixelRatio.get();
      let width = source.width / pixelRatio, height  = source.height / pixelRatio;
  
      this.setAttributes({width, height});
      this.initialRendered = true;
      this.aspectRatio = width / height;
    }
  };

  _onImageLoadError = () => this.setState({imageError: true});

  _onPinchGestureEvent = ({ nativeEvent: { scale } }) => {
    this.scale({ scale });
  }

  _onPinchHandlerStateChange = ({ nativeEvent: { oldState } }) => {
    if (oldState === State.ACTIVE) {
      this.setAttributes(this.state.attributes);
    }
  }

  toSvgson(external=true) {
    let info = this.props.info.toJS(), attributes = {...this.state.attributes};
    info.attributes = attributes;
    if (external) {
      // return a Promise if needs to be converted to base64
      const href = attributes['xlink:href'];
      if (href && href.includes('file:/')) {
        return RNFS.readFile(href, 'base64').then(base64String => {
          attributes['xlink:href'] = 'data:image/png;base64,' + base64String;
          return info;
        })
      }
    }

    return super.toSvgson(external, info);
  }

  onValueRefreshed = () => {
    if (this.state.imageError) this.setState({imageError: false});
  };

  renderContent() {
    const {attributes, imageError=false} = this.state;
    const uri = attributes['xlink:href'];
    const imageSource = {uri};

    if (imageError) {
      return (
        <View style={{
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Image
            style={{ width: '50%', maxWidth: 30, }}
            resizeMode="contain"
            source={require("../assets/no_image/no_image.png")} />
        </View>
      )
    }

    return (
      <Image
        onLoad={this._onImageLoad}
        onError={this._onImageLoadError}
        style={{
          width: '100%',
          height: '100%',
        }}
        resizeMode="contain"
        source={imageSource} />
    );
  }
}

class SvgUseItem extends SvgItem {

}

SvgItem.propTypes = {
  info: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,

  scale: PropTypes.number,
  disabled: PropTypes.bool,
  selected: PropTypes.string,
  scope: PropTypes.string,

  setScope: PropTypes.func,
  onPanBegan: PropTypes.func,
  onPanEnded: PropTypes.func,
  onTap: PropTypes.func,
  offsetPositionToGuideline: PropTypes.func,
};
SvgItem.defaultProps = {
  info: fromJS({}),
  scope: null,
  disabled: false,
  selected: false,
  scale: 1,
  /** Gradients elements svgson */
  canvasContext: {},
  relativeOffset: { x: 0, y: 0 },
  absoluteOffset: { x: 0, y: 0 },
};

export const GroupScopeSeparator = "@";
export default SvgItem;
export {
  SvgItem,
  SvgEmptyItem,
  SvgLineItem,
  SvgRectItem,
  SvgPolygonItem,
  SvgEllipseItem,
  SvgCircleItem,
  SvgPlainItem,
  SvgTextItem,
  SvgImageItem,
  SvgUseItem,

  SvgAsyncItem,
};