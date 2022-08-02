import PropTypes from 'prop-types';
import React from 'react';
import { View, ImageBackground, StyleSheet, PixelRatio, Animated, Platform, Alert } from 'react-native';
import ViewShot, {captureRef} from 'react-native-view-shot';
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { mergeDeep } from 'react-native-svg-editor/utils/immutable';
import { PortalProvider, PortalHost } from '@gorhom/portal';
import { parse as svgsonParse, stringify } from 'svgson';
import Immutable, { fromJS } from 'immutable';

import SvgItem, { 
  SvgRectItem,
  SvgEllipseItem,
  SvgCircleItem,
  SvgEmptyItem,
  SvgPlainItem,
  SvgTextItem,
  SvgImageItem,
} from './SvgItem';
import SvgPathItem from './SvgPathItem';

import PinchZoomView from './PinchZoomView';

import { makeid } from '../utils';
import cssjs from '../utils/css';
import calculateGuidelines from '../utils/guidelines';

const vibrateMethod = Platform.select({
  "ios": 'impactLight',
  "android": 'soft',
})

const vibrateOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false
};

const frameWidth = 2 / PixelRatio.get();
const styles = StyleSheet.create({
  watermarkStyle: {
    position: 'absolute',
    left: 0,
    bottom: 0
  },
  svgs: {
    position: 'absolute',
  },
  frameContainer: {
    position: 'relative',
  },
  frame: {
    position: 'absolute',
    left: -frameWidth,
    right: -frameWidth,
    top: -frameWidth,
    bottom: -frameWidth,
    borderWidth: frameWidth,
    borderColor: '#bababa',
  },
  pinchZoomStyle: {
    flex: 1,
    backgroundColor: '#E7E7E7',
  },
  horizontalGuideline: {
    position: 'absolute',
    left: -frameWidth,
    right: -frameWidth,
    top: -frameWidth,
    height: frameWidth,
    opacity: 0.5,
    backgroundColor: '#fb19a0',
  },
  verticalGuideline: {
    position: 'absolute',
    top: -frameWidth,
    bottom: -frameWidth,
    left: -frameWidth,
    width: frameWidth,
    opacity: 0.5,
    backgroundColor: '#fb19a0',
  },
});

class SvgGroupItem extends SvgItem {
  // getSize() {
  //   const {attributes: {width=100, height=100}} = this.state;
  //   return {width, height};
  // }

  renderContent() {
    let svgson = this.props.info, children = svgson.get('children');

    return children.map((child, index) => {
      let name = child.get('name'), id = `${this.props.id}_${name}_${index}`;
      let info = fromJS({ attributes: svgson.get('attributes') });
      info = info.mergeDeep(child);

      const ItemType = ITEM_MAPPING[name] || SvgEmptyItem;
      return (
        <ItemType
          info={info} 
          id={id}
          disabled={true}
          key={id} />
      );
    })
  }
}

const ITEM_MAPPING = {
  path: SvgPathItem,
  rect: SvgRectItem,
  circle: SvgCircleItem,
  ellipse: SvgEllipseItem,
  svg: SvgGroupItem,
  g: SvgGroupItem,
  text: SvgTextItem,
  image: SvgImageItem,
  img: SvgImageItem,
};


class SvgEditor extends React.PureComponent {
  state = {
    /** Current scale vector of the PinchZoomView */
    scale: 1,
    /** ID of selected element */
    // TODO: Support multiple selected
    selected: null,
    historyPointer: -1,
    canvasSize: {
      width: 0,
      height: 0,
    },

    watermark: null,
  };

  exportSize = {
    width: 0,
    height: 0,
  }

  history = [];
  clipboard = null;

  svgson = null;
  viewShot = React.createRef();
  pinchZoomViewRef = React.createRef();

  parser = new cssjs();

  /** filters definition */
  filters = [];

  /** gradient definition */
  gradients = [];

  // guidelines
  _disableGuideline = false;
  _hGuidelineTranslateY = new Animated.Value(0);
  _vGuidelineTranslateX = new Animated.Value(0);
  _hGuidelineOpacity = new Animated.Value(0);
  _vGuidelineOpacity = new Animated.Value(0);
  _lastGuidelines = fromJS([]);

  baseChildren = fromJS([]);
  itemRefs = {};

  constructor(props) {
    super(props);

    const { customMapping={} } = props;

    this.elementMapping = {
      ...ITEM_MAPPING,
      ...customMapping,
    };
  }

  get hasChanges() {
    return this.history.length > 0;
  }

  get canvasSize() {
    return this.state.canvasSize;
  }

  get options() {
    return this.props.options;
  }

  /**
   * Parse Svg string to svgson and clean unwanted data
   * @returns 
   */
  async _parseSvg(svg) {
    // TODO: clean svgson
    let svgson = await svgsonParse(svg);

    let exclude = ['defs', 'style', 'filter'];

    // prepare def elements and style elements
    this.filters = svgson.children.filter(child => child.name === 'filter');
    let styleElements = svgson.children.filter(child => child.name === 'style');
    const defElements = svgson.children.filter(child => child.name === 'defs');
    for (let defEle of defElements) {
      let childElements = defEle.children;
      styleElements = styleElements.concat(childElements.filter(child => child.name === 'style'));

      // set svg gradient definitions
      this.gradients = this.gradients.concat(childElements.filter(child => child.name === 'linearGradient'));

      // set svg global filter
      this.filters = this.filters.concat(childElements.filter(child => child.name === 'filter'));
    }

    // Parse embedded stylesheet
    let styles = [];
    for (let style of styleElements) {
      let content = style.children[0].value;
      styles = styles.concat(this.parser.parseCSS(content));
    }

    if (styles.length > 0) {
      styles = styles.reduce((p, {selector, rules}) => {
        p[selector] = rules;
        return p
      }, {});

      let checkAndSetChildren = ele => {
        let children = ele.children;
        if (children.length > 0) {
          for (let child of children) checkAndSetChildren(child);
        } else {
          let attributes = ele.attributes, cls = attributes.class, eleStyles = cls && styles[`.${cls}`];
          if  (eleStyles) {
            for (let {directive, value} of eleStyles) {
              attributes[directive] = value;
            }
          }
        }
      };
      checkAndSetChildren(svgson)
    }

    // filter out excluded elements
    svgson.children = svgson.children.filter(child => !exclude.includes(child.name));

    return svgson;
  }

  _onEditorLayout = ({nativeEvent: { layout: {width, height} }}) => {
    // set export local(display) size 
    this.exportSize = { width, height };
  };

  _createElement(ele) {
    return {...ele, id: ele.attributes.id || makeid(5)};
  }

  _init() {
    const {svg} = this.props;
    if (svg) {
      this._parseSvg(svg).then(svgson => {
        this.svgson = svgson;

        let {children, attributes: {viewBox="0 0 0 0", width, height}} = svgson;
        const [x, y, viewBoxWidth, viewBoxHeight] = viewBox.split(" ");
        width = parseFloat(viewBoxWidth) || parseFloat(width);
        height = parseFloat(viewBoxHeight) || parseFloat(height);
        let canvasSize = { width, height };
        
        this.baseChildren = fromJS(children.map(child => this._createElement(child)));
        if (this.baseChildren.find(ele => ele.get('name') === 'g')) {
          Alert.alert(
            'Editor may not function correctly',
            'Due to the svg file containing unsupported/partially supported element, SVG Editor may not function correctly. Please update the application once an update is available.'
          )
        }

        // reset history pointer
        this.setState({
          historyPointer: 0,
          canvasSize,
        });
      });
    }
  }

  _getFilters = selector => {
    let isId = selector[0] === '#', name = selector.substring(1);
    if (isId) {
      let filters = this.filters.filter(filter => filter.attributes['id'] == name);
      console.log('SvgEditor._getFilters: ', filters, this.filters);
      return filters
    }

    return [];
  }

  /**
   * Get list of Children after applying action history
   * @returns {Array<Immutable.Map>} Array of svgson object as ImmutableJs Maps
   */
  _getChildrenAndApplyHistory() {
    const {historyPointer} = this.state;
    const histories = this.history.slice(0, historyPointer);

    let children = this.baseChildren.toArray();

    // TODO: implement history type with more than one action
    for (let history of histories) {
      let {type, target=null, payload} = history;
      let targetIndex = children.findIndex(child => child.get('id') === target);
      if (target && targetIndex < 0) continue// throw new Error('Target not found');

      const performAction = (t) => {
        switch (t) {
          case 'set':
            children[targetIndex] = mergeDeep(children[targetIndex], payload);
            break;
          case 'add':
            children.push(fromJS(payload));
            break;
          case 'remove':
            children.splice(targetIndex, 1);
            delete this.itemRefs[target];
            break;
          case 'moveFront':
            if (targetIndex < children.length-1) {
              let moveFrontEle = children.splice(targetIndex, 1)[0];
              children.splice(targetIndex+1, 0, moveFrontEle);
            }
            break;
          case 'moveBack':
            if (targetIndex > 0) {
              let moveBackEle = children.splice(targetIndex, 1)[0];
              children.splice(targetIndex-1, 0, moveBackEle);
            }
            break;
          default:
            break;
        }
      }

      if (type === 'group') {
        // let {actions} = history;
        // for (let action of actions) {
        //   performAction(action[])
        // }
      } else {
        performAction(type);
      }
    }

    for (let child of children) {
      let id = child.get('id');
      if (id && !this.itemRefs[id]) {
        this.itemRefs[id] = React.createRef(null);
      }
    }

    return children;
  }

  _generateSVGComponents() {
    const {selected, scale} = this.state;
    const {options={}} = this.props;
    const {showSize=true} = options;

    let children = this._getChildrenAndApplyHistory();

    return children.map(child => {
      let name = child.get('name'), id = child.get('id');

      const ItemType = this.elementMapping[name] || SvgPlainItem;
      return (
        <ItemType
          ref={this.itemRefs[id]}
          onTap={this._onTap}
          onPanEnded={this._removeGuidelines}
          offsetPositionToGuideline={this._offsetPositionToGuideline}
          getFilters={this._getFilters}
          gradients={this.gradients}
          setElementById={this.setElementById}

          // locked
          info={child}
          selected={selected === id}
          scale={scale}
          showSize={showSize}

          id={id}
          key={id}
        />
      );
    });
  }

  _offsetPositionToGuideline = (rect, id) => {
    let {x, y} = rect;
    if (this._disableGuideline) {
      return {x, y};
    }

    let nodes = Object.keys(this.itemRefs).filter(key => !(key == 'frame' || key == id))
      .map(key => {
        if (this.itemRefs[key].current) {
          const attributes = this.itemRefs[key].current.attributes;
          const { width, height } = this.itemRefs[key].current.getSize();
          return {
            x: attributes.appX, y: attributes.appY, width, height,
          };
        } 

        return null;
      }).filter(node => !!node);

    const threshold = Math.max(3 / this.state.scale, 1);

    let {position, guides} = calculateGuidelines(rect, nodes, this.state.canvasSize, threshold);
    this._setGuidelines(guides);

    return {
      x: typeof position.x === 'number' ? position.x : x, 
      y: typeof position.y === 'number' ? position.y : y, 
    };
  }

  _setGuidelines = guidelines => {
    this._hGuidelineOpacity.setValue(0);
    this._vGuidelineOpacity.setValue(0);

    // compare guidelines and vibrate if neccessary
    let newGuidelines = fromJS(guidelines);
    if (!newGuidelines.equals(this._lastGuidelines)) {
      if (guidelines.length > 0) {
        ReactNativeHapticFeedback.trigger(vibrateMethod, vibrateOptions);
      }
      this._lastGuidelines = newGuidelines;
    }

    guidelines.forEach(guideline => {
      if (guideline.orientation === 'V') {
        this._vGuidelineTranslateX.setValue(guideline.lineGuide + guideline.parentOffset);
        this._vGuidelineOpacity.setValue(1);
      } else if (guideline.orientation === 'H') {
        this._hGuidelineTranslateY.setValue(guideline.lineGuide + guideline.parentOffset);
        this._hGuidelineOpacity.setValue(1);
      }
    });
  };

  _removeGuidelines = () => {
    this._setGuidelines([]);
  };

  _onTap = selected => {
    if (selected) {
      this.setState({selected: selected.id});

      if (this.props.onElementSelect) {
        this.props.onElementSelect(selected.svgson);
      }
    } else {
      this.setState({selected: null});
    }
  };

  componentDidMount() {
    this._init();
  }

  componentDidUpdate({svg: prevSvg}) {
    const {svg} = this.props;

    console.log('SvgEditor.componentDidUpdate');

    // if prop svg changed, reinit
    if (svg !== prevSvg) {
      console.log('SvgEditor.componentDidUpdate: SVG Changed');
      this._init();
    }

    if (this.props.onRender) {
      this.props.onRender();
    }
  }

  getSelectedElementRef() {
    const {selected} = this.state;
    if (!selected) return null;

    return this.itemRefs[selected];
  }

  /**
   * Capture svg editor and export as an image file
   * @param {object} options view shot options
   * @param {boolean} options.preview Whether the image should be a preview or not
   * @param {ImageRequireSource} options.watermark Watermark inserted to exported image
   * @returns {Promise} Promise that resolves to the uri of the exported image
   */
  export(options = {}) {
    const {preview, watermark, ...config} = options;

    this.setState({
      selected: null,
      scale: preview ? 1 : 3,
      watermark,
    });

    // capture canvas next tick (after 'deselect' action)
    return new Promise(resolve => {
      setTimeout(() => {
        let {width, height} = this.exportSize;
        if (preview) {
          width /= 2;
          height /= 2;
        }

        captureRef(this.viewShot.current, {
          format: 'png',
          width: width / PixelRatio.get(),
          height: height / PixelRatio.get(),
          ...config,
        }).then(uri => {
          this.setState({
            watermark: null,
          });
          resolve(uri);
        });
      }, 300);
    });
  }

  /**
   * Export current svg to xml string with edit histories applied
   * @param {boolean} external determine whether exported svg should be prepared for external use
   * @returns {Promise} Promise that resolves to the xml string of the exported svg
   */
  async exportSvg(external=false) {
    let children = this._getChildrenAndApplyHistory();

    // TODO: Find a better way to determine viewBox of the svg
    let {width=0, height=0} = this.state.canvasSize;
    let viewBox = `0 0 ${width} ${height}`;

    // get children svgson
    const EXCLUDE_ELEMENTS = ['title', 'defs', 'style', 'metadata', 'desc']
    let svgsons = [];
    for (let child of children) {
      let childId = child.get('id'), childName = child.get('name');
      if (this.itemRefs[childId]?.current && !EXCLUDE_ELEMENTS.includes(childName)) {
        try {
          let svgson = await Promise.resolve(this.itemRefs[childId].current.toSvgson(external));
          svgsons.push(svgson);
        } catch (e) {
          console.error(e);
        }
      }
    }

    let svg = stringify({
      name: 'svg',
      type: 'element',
      value: '',
      attributes: {viewBox},
      children: svgsons,
    });
    console.log('SvgEditor.exportSvg(): ' + svg);
    return svg;
  }

  scaleToFit() {
    this.pinchZoomViewRef.current.scaleToFit();
  }

  undo() {
    let {historyPointer} = this.state;
    if (historyPointer <= 0) return;

    historyPointer -= 1;
    this.setState({historyPointer});
  }

  redo() {
    let {historyPointer} = this.state;
    if (historyPointer >= this.history.length) return;

    historyPointer += 1;
    this.setState({historyPointer});
  }

  deselect = () => {
    this.setState({selected: null});
  };

  /**
   * Push action(s) to history and set new history pointer state
   * @param {object,Array} actions An action object or an array of action objects
   */
  push(actions) {
    let {historyPointer} = this.state;
    this.history = this.history.slice(0, historyPointer).concat(actions);

    this.setState({ historyPointer: this.history.length });
  }

  /**
   * Copy element with given id
   * @param {string} id Element ID
   * @returns {Promise} Promise that resolves once element is copied
   */
  copy(id) {
    return Promise.resolve(this.itemRefs[id]?.current?.toSvgson(false)).then(obj => {
      this.clipboard = obj;
    });
  }

  copySelectedElement() {
    return this.copy(this.state.selected);
  }

  paste() {
    if (this.clipboard) {
      this.addElement(this.clipboard);
    }
  }

  /**
   * Duplicate Selected Element
   * @returns {Promise} Promise that resolves once duplicated
   */
  duplicateSelectedElement() {
    return this.copy(this.state.selected).then(() => {
      this.paste();
    })
  }
  
  addElement(ele) {
    this.push({
      type: 'add',
      payload: this._createElement(ele),
    })
  }

  /**
   * 
   * @param {string} svg svg string
   * @returns {Promise} Promise that resolves once svg is parsed and added
   */
  addSvg(svg) {
    return this._parseSvg(svg).then(svgson => {
      console.log('SvgEditor.addSvg(): ' + svgson);
      this.push({
        type: 'add',
        payload: this._createElement(svgson),
      })
    })
  }

  removeElement(ele) {
    this.push({
      type: 'remove',
      target: ele,
    });
  }

  removeSelectedElement() {
    const {selected} = this.state;
    if (selected) {
      this.removeElement(selected);
      this.deselect();
    }
  }

  setElementById = (target, payload) => {
    this.push({ type: 'set', target, payload });
  };

  /**
   * Set Canvas (ViewBox) Size
   * @param {number} canvasSize.width Width of Canvas 
   * @param {number} canvasSize.height Height of Canvas 
   */
  setCanvasSize(canvasSize) {
    this.setState({ canvasSize });
  }

  // set element attributes by pushing a 'set' action to the history
  setSelectedElementAttributes = payload => {
    const {selected} = this.state;
    if (selected) {
      this.setElementById(selected, {attributes: payload});
    }
  };

  // update element attributes without altering the history
  updateSelectedElementAttributes = payload => {
    const {selected} = this.state;
    if (selected) {
      this.itemRefs[selected]?.current.updateAttributes(payload);
    }
  };

  toggleGuideline() {
    this._disableGuideline = !this._disableGuideline;
  }

  onZoomEnd = scale => {
    this.setState({scale});
  };

  renderGuidelines() {
    return (
      <>
        <Animated.View
          key="horizontalGuideline"
          style={[
            styles.horizontalGuideline,
            {
              opacity: this._hGuidelineOpacity,
              transform: [{translateY: this._hGuidelineTranslateY}],
            },
          ]}
        />
        <Animated.View
          key="verticalGuideline"
          style={[
            styles.verticalGuideline,
            {
              opacity: this._vGuidelineOpacity,
              transform: [{translateX: this._vGuidelineTranslateX}],
            },
          ]}
        />
      </>
    );
  }

  render() {
    const svgs = this._generateSVGComponents();
    const {containerStyle={}, watermarkStyle={}, pinchZoomViewProps={}} = this.props;
    const {canvasSize, watermark} = this.state;

    const {width, height} = canvasSize;
    const watermarkWidth = PixelRatio.roundToNearestPixel(width/6);

    return (
      <PortalProvider>
        
        <PinchZoomView
          ref={this.pinchZoomViewRef}
          maxScale="4"
          style={[styles.pinchZoomStyle, containerStyle]}
          onZoomEnd={this.onZoomEnd}
          {...pinchZoomViewProps}>
          <View style={styles.frameContainer}>
            <View pointerEvents='none' style={styles.frame} />
            <ViewShot ref={this.viewShot} options={{format: 'jpg'}}>
              <View style={{width, height}}></View>
              <View onLayout={this._onEditorLayout} style={styles.svgs}>
                {svgs}
                <PortalHost name="controlLayerPortal" />
              </View>
              {
                watermark ?
                <ImageBackground
                  style={[styles.watermarkStyle, { width: watermarkWidth }, watermarkStyle]}
                  source={watermark} /> : null
              }
              { this.renderGuidelines() }
            </ViewShot>
          </View>
        </PinchZoomView>

      </PortalProvider>
    )
  }
}

SvgEditor.propTypes = {
  /** Custom SVG Element JSX Component Mapping */
  customMapping: PropTypes.object,
  /**
   * @property {boolean} showSize show size box of not
   */
  options: PropTypes.object,
  watermarkStyle: PropTypes.object,
}

export default SvgEditor;
