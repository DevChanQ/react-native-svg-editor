import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  PixelRatio,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SvgXml } from "react-native-svg";
import { PanGestureHandler, State, TapGestureHandler } from 'react-native-gesture-handler';
import RNFS from 'react-native-fs';
import { stringify } from "svgson";

import { mergeDeep, valueOrDefault } from '../utils';

const styles = StyleSheet.create({
  absolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  resizeBox: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderWidth: 2 / PixelRatio.get(),
    right: -12,
    bottom: -12,
    backgroundColor: 'white',
  },
  boundingBox: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    top: 0,
    borderWidth: 2 / PixelRatio.get(),
  },
  sizeBox: {
    position: 'absolute',
    padding: 6,
    borderRadius: 8,
    minWidth: 82,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeText: {
    color: 'white',
    fontSize: 10
  }
});

const SvgEmptyItem = () => <></>;

class SvgItem extends React.PureComponent {
  // private variables
  _doubleTapRef = React.createRef();
  _lastAttributes = null;
  _initialAttributes = null;
  _cachedXML = null;
  _internalScale = 1;

  controlColor = '#19A0FB';

  constructor(props) {
    super(props);

    this._lastAttributes = this._getAttributesFromProps();
    this._initialAttributes = { ...this._lastAttributes };
    this.state = {
      attributes: { ...this._lastAttributes }
    };
  }

  componentDidMount() {
    this._onRefresh(this.props.info.get('attributes').toJS());
  }

  componentDidUpdate({info}) {
    const {info: newInfo, id} = this.props;
    console.log('SvgItem.conponentDidUpdate(): ' + id);

    // update internal state if new props is provided
    if (!newInfo.equals(info)) {
      console.log(`SvgItem: (${id}) props different, should update internal state...`)

      // compare new and old attributes
      const newAttributes = newInfo.get('attributes'), oldAttributes = info.get('attributes');
      const diff = newAttributes.filter((v, k) => oldAttributes.get(k) !== v);

      this.refreshValues();
      this._onRefresh(diff);
    }
  }

  get type() {
    return this.props.info?.get('name');
  }

  get translateEnabled() {
    return !this.locked && this.selected;
  }
  
  get isFrame() {
    return this.state.attributes.id === 'frame';
  }

  get attributes() {
    return this.state.attributes;
  }

  get locked() {
    return !!this.state.attributes['devjeff:locked'] || this.isFrame;
  }

  get aspectLocked() {
    return !!this.state.attributes['devjeff:aspectLocked'];
  }

  get selected() {
    return this.props.selected;
  }

  /**
   * Called when exporting to svg. Cleans attributes (remove internal attributes)
   * @param {Boolean} external Indicate whether the svgson object should be cleaned for external use or not
   * @returns {object} cleaned svgson object
   */
  toSvgson(external=true) {
    let info = this.props.info.toJS();
    let attributes = {...this.state.attributes};

    if (external) {
      let rotate = parseFloat(attributes['rotate'] || 0);
      if (rotate) {
        let appX = attributes['appX'] || 0, appY = attributes['appY'] || 0;
        attributes['transform'] = `rotate(${rotate} ${appX} ${appY})`;
      }

      attributes['x'] = attributes['appX'] || 0;
      attributes['y'] = attributes['appY'] || 0;

      delete attributes['rotate'];
      // delete attributes['appX'];
      // delete attributes['appY'];
    }

    info.attributes = attributes;

    return info;
  }

  refreshValues() {
    console.log('SvgItem.refreshValues(): ', this.props.id);

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

    attributes['devjeff:locked'] = valueOrDefault(attributes['devjeff:locked'], 0);
    if (attributes['transform']) {
      let transforms = attributes['transform'].split(")").filter(transform => !!transform);
      
      for (let transform of transforms) {
        let [command, values] = transform.split("(");
        values = values.split(" ");
        if (command === 'rotate') {
          attributes['rotate'] = attributes['rotate'] >= 0 ? attributes['rotate'] : parseFloat(values[0]);
        }
      }
    }

    // default fill color if fill is not defined
    // attributes['fill'] = attributes['fill'] || 'black';
    // stroke-width if stroke-width is not defined and stroke is
    attributes['stroke-width'] = parseFloat(attributes['stroke-width'] || (attributes['stroke'] ? 1 : 0));
    attributes['stroke'] = valueOrDefault(attributes['stroke'], attributes['stroke-width'] ? 'black' : '');

    delete attributes['transform'];

    return attributes;
  }


  _calculateInternalScale() {
    // set interal scale
    const MAX_SCALE = Platform.select({ 'android': 5, 'ios': 20 }), MIN_SCALE = 0.2
    const {width, height} = this.getSize();
    const pixels = width * height * PixelRatio.get();
    const pixelLimit = 512 * 512

    this._internalScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pixelLimit / pixels));
  }

  /**
   * Get info from props and parse number strings to numbers
   */
  _getAttributesFromProps() {
    let {info} = this.props;
    info = info.toJS();
    let {attributes} = info;

    for (let key in attributes) {
      let num = parseFloat(attributes[key]);
      if (!isNaN(num)) {
        attributes[key] = num;
      }
    }

    return this._initAttributes(attributes);
  }

  _onRefresh = (changed={}) => {
    // update aspect ratio
    const {width, height} = this.getSize();
    this.aspectRatio = width / height;

    // call onValueRefreshed callback
    this.onValueRefreshed(changed);
  }

  setElement(ele) {
    const {setElementById, id} = this.props;
    if (setElementById) {
      setElementById(id, ele);
    } else {
      console.warn('No setElementById in props');
    }
  }

  /**
   * Set attribute globally (in editor)
   * Difference between setAttributes & updateAttributes is that _lastAttrributes is updated
   * @param {object} obj attribute object
   */
  setAttributes(attributes, history=true) {
    if (history) {
      this.setElement({attributes});
    } else {
      this.updateAttributes(attributes);
      this._lastAttributes = mergeDeep(this._lastAttributes, attributes);
    }
  }

  /**
   * Update attribute localy
   * @param {object} obj Attribute object
   */
  updateAttributes(obj) {
    let attributes = {...this.state.attributes};
    attributes = mergeDeep(attributes, obj);
    this.setState({attributes});
  }

  /**
   * Called after attributes are set/refreshed
   * @param {object} changed Object that contains the updated attributes 
   */
  onValueRefreshed = (changed) => {};

  onResize = ({nativeEvent: {translationX, translationY}}) => {
    this.scale({translationX, translationY});
  };

  onResizeStateChanged = ({nativeEvent: {oldState}}) => {
    if (oldState === State.ACTIVE) {
      this.setAttributes(this.state.attributes);
    }
  };

  onPan = ({nativeEvent: {translationX, translationY}}) => {
    this.translate({translationX, translationY});
  };

  onPanStateChanged = ({nativeEvent: {oldState, state}}) => {
    if (state === State.BEGAN) {
      if (this.props.onPanBegan) {
        this.props.onPanBegan(this.props.id);
      }
    } else if (oldState === State.ACTIVE) {
      this.setAttributes(this.state.attributes);
      if (this.props.onPanEnded) {
        this.props.onPanEnded(this.props.id);
      }
    }
  };

  _onSingleTap = ({nativeEvent: {oldState}}) => {
    if (oldState === State.ACTIVE) {
      // check if point overlaps
      if (this.props.onTap) {
        this.props.onTap({
          id: this.props.id,
          svgson: this.props.info,
        });
      }
    }
  };

  _onDoubleTap = ({nativeEvent: {oldState}}) => {
    if (oldState === State.ACTIVE) {
      this.onDoubleTap();
    }
  };

  onDoubleTap() {
    // const svgson = this.toSvgson();
    // const path = toPath(svgson);
    // console.log(path);

    // this.setElement({
    //   type: 'element',
    //   name: 'path',
    //   attributes: {
    //     d: path,
    //   }
    // });
  }

  /**
   * Translate(Move) function, override to customize
   * @param {number} obj.translationX Number to translate by in the x axis
   * @param {number} obj.translationY Number to translate by in the y axis
   */
  translate({translationX, translationY}) {
    let {appX, appY} = this._lastAttributes;
    let {width, height} = this.getSize();

    appX += translationX / this.getScale();
    appY += translationY / this.getScale();

    // calculate guidelines
    if (this.props.offsetPositionToGuideline) {
      let {x, y} = this.props.offsetPositionToGuideline({x: appX, y: appY, width, height}, this.props.id);
      appX = x, appY = y;
    }

    this.updateAttributes({ appX, appY });
  }

  /**
   * Scale function, override to customize
   */
  scale({translationX, translationY}) {
    let {width, height} = this._lastAttributes;
    width += translationX / this.getScale();
    height += translationY / this.getScale();

    if (this.aspectLocked) {
      if (this.aspectRatio > 1) height = width / this.aspectRatio;
      else width = height * this.aspectRatio;
    }

    this.updateAttributes({ width, height })
  }

  /**
   * Function for transforming attributes, override to customize
   * Some attrbiutes of elements such as `<rect>` needs to be transformed under certain situations,
   * for example `<rect>` with `stroke-width`
   * @param {obj} attributes
   */
  transform(attributes) {
    return attributes;
  }

  getScale() {
    return this.props.scale || 1;
  }

  /**
   * Returns size of element
   * @returns {object} Size object containing width and height
   */
  getSize() {
    const {attributes: {width=0, height=0}} = this.state;
    return {width, height};
  }

  getParentViewBox() {
    const {width, height} = this.getSize();
    return `0 0 ${width} ${height}`;
  }

  _generateXML() {
    let {attributes: propsAttributes} = this.props.info.toObject();
    let {attributes} = this.state;

    if (!this._cachedXML || !propsAttributes.equals(attributes)) {
      this._cachedXML = stringify({
        name: 'svg',
        type: 'element',
        value: '',
        attributes: {viewBox: this.getParentViewBox()},
        children: [{
          ...this.props.info.toJS(),
          attributes: this.transform(attributes),
        }]
      })
    }

    return this._cachedXML;
  }

  renderContent() {
    let {width, height} = this.getSize(), ogWidth = width, ogHeight = height;

    width *= this._internalScale;
    height *= this._internalScale;

    let svgScale = 1/this._internalScale, translateX = -((width - ogWidth)/2), translateY = -((height - ogHeight)/2);

    const xml = this._generateXML();

    return (
      <View style={{width, height, transform: [{translateX}, {translateY}, {scale: svgScale}]}}>
        <SvgXml width='100%' height='100%' xml={xml} />
      </View>
    );
  }

  renderControlLayer() {
    const {width, height} = this.getSize();
    const {showSize} = this.props;

    return (
      <View style={[
        styles.boundingBox,
        { borderColor: this.locked ? '#B7B7B7' : this.controlColor }
      ]}>
        {
          !this.locked ? (
            <PanGestureHandler onGestureEvent={this.onResize} onHandlerStateChange={this.onResizeStateChanged}>
              <View style={[
                styles.resizeBox,
                { borderColor: this.locked ? '#B7B7B7' : this.controlColor }
              ]} />
            </PanGestureHandler>
          ) : null
        }
        { 
          showSize ? <View style={[
            styles.sizeBox,
            {
              backgroundColor: this.locked ? '#B7B7B7' : this.controlColor,
              top: height+16
            }
          ]}>
            <Text numberOfLines={1} style={styles.sizeText}>{`${width.toFixed(1)} x ${height.toFixed(1)}`}</Text>
          </View> : null
        }
      </View>
    );
  }

  render() {
    let {appX=0, appY=0, rotate=0} = this.state.attributes;
    let {width, height} = this.getSize();
    let left = appX, top = appY;

    width = PixelRatio.roundToNearestPixel(width), height = PixelRatio.roundToNearestPixel(height);
    left = PixelRatio.roundToNearestPixel(appX), top = PixelRatio.roundToNearestPixel(appY);

    this._calculateInternalScale();

    return (
      <View style={{
        position: 'absolute',
        width, height, left, top,
        transform: [{translateX: -width/2}, {translateY: -height/2}, {rotate: `${rotate}deg`}, {translateX: width/2}, {translateY: height/2},]
      }}>
        {this.renderContent()}
        <TapGestureHandler
          onHandlerStateChange={this._onSingleTap}
          waitFor={this._doubleTapRef}>
          <TapGestureHandler
            ref={this._doubleTapRef}
            enabled={!this.locked}
            onHandlerStateChange={this._onDoubleTap}
            numberOfTaps={2}>
              <PanGestureHandler
                enabled={this.translateEnabled}
                minPointers={1}
                maxPointers={1}
                onGestureEvent={this.onPan}
                onHandlerStateChange={this.onPanStateChanged}>
                <View style={{position: 'absolute', width, height}}>
                  { this.selected ? this.renderControlLayer() : null }
                </View>
              </PanGestureHandler>
          </TapGestureHandler>
        </TapGestureHandler>
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

class SvgRectItem extends SvgItem {
  _initAttributes(a) {
    let attributes = super._initAttributes(a);

    attributes['appX'] = valueOrDefault(attributes['appX'], attributes['x'] || 0);
    attributes['appY'] = valueOrDefault(attributes['appY'], attributes['y'] || 0);

    return attributes;
  }
  
  transform(a) {
    let attributes = {...a};

    if (attributes['stroke-width']) {
      let strokeWidth = attributes['stroke-width'];

      attributes['x'] += strokeWidth/2;
      attributes['y'] += strokeWidth/2;
      attributes['width'] -= strokeWidth;
      attributes['height'] -= strokeWidth;
    }

    return attributes;
  }

  getParentViewBox() {
    let {x=0, y=0} = this.state.attributes;
    let {width, height} = this.getSize();

    return `${x} ${y} ${width} ${height}`;
  }

  renderContent() {
    let {rx} = this.state.attributes;
    if (!rx) {
      let {fill: backgroundColor, opacity=1} = this.state.attributes;
      let borderColor = this.state.attributes['stroke'] || '#000000';
      let borderWidth = this.state.attributes['stroke-width'] || 0;

      return (
        <View style={{
          width: '100%',
          height: '100%',
          backgroundColor,
          borderWidth,
          borderColor,
          opacity
        }} />
      )
    } 

    return super.renderContent();
  }
}

class SvgEllipseItem extends SvgItem {
  _initAttributes(a) {
    let attributes = super._initAttributes(a);

    if (attributes['appX'] === undefined) {
      let rx = attributes['rx'] || 0, cx = attributes['cx'] || 0;
      attributes['appX'] = cx - rx;
    }

    if (attributes['appY'] === undefined) {
      let ry = attributes['ry'] || 0, cy = attributes['cy'] || 0;
      attributes['appY'] = cy - ry;
    }

    return attributes;
  }

  toSvgson(external=true) {
    let info = super.toSvgson(external), {attributes} = info;
    attributes['cx'] = this.state.attributes['appX'] + attributes['rx'];
    attributes['cy'] = this.state.attributes['appY'] + attributes['ry'];

    delete attributes['appX'];
    delete attributes['appY'];
    delete attributes['x'];
    delete attributes['y'];
    
    return info;
  }

  transform(a) {
    let attributes = {...a};

    if (attributes['stroke-width']) {
      let strokeWidth = attributes['stroke-width'];

      attributes['rx'] -= strokeWidth/2;
      attributes['ry'] -= strokeWidth/2;
    }

    return attributes;
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

  getSize() {
    const {rx, ry} = this.state.attributes;
    return {width: rx*2, height: ry*2};
  }

  getParentViewBox() {
    const {cx, cy, rx, ry} = this.state.attributes;
    const {width, height} = this.getSize();

    return `${cx - rx} ${cy - ry} ${width} ${height}`
  }
}

class SvgCircleItem extends SvgItem {
  _initAttributes(a) {
    let attributes = {...a};

    attributes['r'] = valueOrDefault(attributes['r'], 0);
    attributes['cx'] = valueOrDefault(attributes['cx'], 0);
    attributes['cy'] = valueOrDefault(attributes['cy'], 0);
    attributes['appX'] = valueOrDefault(attributes['appX'], attributes['cx'] - attributes['r']);
    attributes['appY'] = valueOrDefault(attributes['appY'], attributes['cy'] - attributes['r']);
    
    return attributes;
  }

  getSize() {
    const {r} = this.state.attributes;
    return {width: r*2, height: r*2};
  }

  getParentViewBox() {
    const {cx, cy, r} = this.state.attributes;
    const {width, height} = this.getSize();

    return `${cx - r} ${cy - r} ${width} ${height}`
  }
}

class SvgPlainItem extends SvgItem {
  onSvgLayout = ({nativeEvent}) => {
    console.log(nativeEvent.layout);
  }
}

class SvgTextItem extends SvgItem {
  baselineOffset = 0;
  valueRefreshed = true;
  manuallyEdited = false;

  _initAttributes(a) {
    let attributes = super._initAttributes(a);

    attributes['appX'] = valueOrDefault(attributes['appX'], attributes['x'] || 0);
    attributes['appY'] = valueOrDefault(attributes['appY'], attributes['y'] || 0);
    attributes['font-size'] = valueOrDefault(attributes['font-size'], 16);
    attributes['width'] = valueOrDefault(attributes['width'], 400);
    attributes['height'] = valueOrDefault(attributes['height'], 80);

    return attributes;
  }

  onValueRefreshed = (changed) => {
    this.valueRefreshed = true;
  }

  scale(translation) {
    if (!this.manuallyEdited) this.manuallyEdited = true;
    super.scale(translation);
  }

  toSvgson(external) {
    let info = super.toSvgson(external), {attributes, children} = info;

    info.children = [{...children[0], type: 'text'}]

    if (external) {
      attributes['x'] = attributes['appX'];
      attributes['y'] = attributes['appY'] + this.baselineOffset;

      // delete attributes['appX'];
      // delete attributes['appY'];
    }

    delete attributes['width'];
    delete attributes['height'];
    
    return info;
  }

  onDoubleTap() {
    this.setState({ editMode: !this.state.editMode });
  }

  onSubmitEditing = ({ nativeEvent: { text }}) => {
    this.setElement({
      children: {
        0: {
          "value": text,
        }
      }
    });
  }

  onTextLayout = ({ nativeEvent }) => {
    const {lines} = nativeEvent;
    if (this.valueRefreshed && !this.manuallyEdited) {
      let heights = lines.map(({height}) => height), widths = lines.map(({width}) => width);
      let height = heights.reduce((p, v) => ( p > v ? p : v ), 0), width = widths.reduce((p, v) => p + v, 0);
      let size = {width: width || 100, height: height || 100};

      this.setAttributes({width: Math.round(size.width), height: Math.round(size.height)}, false);

      this.baselineOffset = lines[0]?.ascender || 0;
      this.valueRefreshed = false;
    }
  }

  onBlur = () => {
    this.setState({ editMode: false });
  }

  renderContent() {
    const {children} = this.props.info.toJS(), {attributes, editMode} = this.state;
    const style = {
      fontSize: attributes['font-size'] || 16,
      fontWeight: `${attributes['font-weight'] || 'normal'}`,
      color: attributes['fill'] || 'black',
    };

    if (editMode) {
      return (
        <TextInput style={style} defaultValue={children[0]?.value} onBlur={this.onBlur} onSubmitEditing={this.onSubmitEditing} autoFocus blurOnSubmit />
      )
    }

    return (
      <Text style={style} onTextLayout={this.onTextLayout} allowFontScaling={false}>{children[0]?.value}</Text>
    );
  }
}

class SvgImageItem extends SvgItem {
  sizeNotProvided = false;
  initialRendered = false;
  aspectRatio = 1;

  get aspectLocked() {
    return true;
  }

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

  _onImageLoadError = () => this.setState({imageError: true})

  toSvgson(external=true) {
    let info = super.toSvgson(external), {attributes} = info;
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

    return info;
  }

  onValueRefreshed = () => {
    this.setState({imageError: false});
  };

  renderContent() {
    const {attributes, imageError=false} = this.state;
    const {opacity=1} = attributes, uri = attributes['xlink:href'];
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
          opacity
        }}
        resizeMode="contain"
        source={imageSource} />
    );
  }
}

export default SvgItem;
export {
  SvgItem,
  SvgEmptyItem,
  SvgRectItem,
  SvgEllipseItem,
  SvgCircleItem,
  SvgPlainItem,
  SvgTextItem,
  SvgImageItem,

  SvgAsyncItem,
};