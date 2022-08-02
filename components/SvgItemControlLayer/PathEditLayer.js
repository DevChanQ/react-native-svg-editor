import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import ReactSvg, { Line } from 'react-native-svg';

import MemorisedPan from './MemorisedPan';

const styles = StyleSheet.create({
  targetPointContainer: {
    position: 'absolute',
    width: 16,
    height: 16,
    marginLeft: -8,
    marginTop: -8,
  },
  controlPointContainer: {
    position: 'absolute',
    width: 12,
    height: 12,
    marginLeft: -6,
    marginTop: -6,
  },
  targetPoint: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderColor: '#19A0FB',
    borderRadius: 12,
    backgroundColor: 'white',
  },
  controlPoint: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderColor: '#19A0FB',
    backgroundColor: 'white',
  },
});

const ControlPoint = ({ target=false, scale=1, point, updateTargetPoint, onPanEnd }) => {
  const onPan = useCallback(({ event: {translationX, translationY}, last }) => {
    let newPosition = {x: last.x + translationX / scale, y: last.y + translationY / scale};
    if (updateTargetPoint) updateTargetPoint(point, newPosition);
  }, [updateTargetPoint, point, scale]);

  let position = {x: point.x, y: point.y};

  return (
    <View pointerEvents='auto' style={[
      target ? styles.targetPointContainer : styles.controlPointContainer,
      {
        transform: [
          {translateX: point.x},
          {translateY: point.y},
          {scale: 1/scale},
        ]
      }
    ]}>
      <MemorisedPan
        last={position}
        onPan={onPan}
        onPanEnd={onPanEnd}>
        <View style={target ? styles.targetPoint : styles.controlPoint}></View>
      </MemorisedPan>
    </View>
  );
}

class PathEditLayer extends React.PureComponent {

  static defaultProps = {
    // Functions
    /** Function provided by parent for updating target point */
    updateTargetPoint: () => {},
    /** Callback executed when control point panning finished */
    onPanEnd: () => {},
    /** Callback executed when edit layer is tapped */
    onTap: () => {},

    // Props
    /** Viewbox attribute for control lines */
    viewBox: '0 0 100 100',
  };

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
    console.log('PathEditLayer.render');
    
    let { 
      lineStyle,
      viewBox,
      updateTargetPoint,
      parsedPath,

      ...pointProps
    } = this.props;

    let controlPointLines = this.controlPoints.map(point => {
      const offset = 0;//(16 * (1/this.props.scale)) / 2;
      return point.relations ? point.relations.map(rel => {
        return (
          <Line
            x1={point.x + offset}
            y1={point.y + offset}
            x2={rel.x + offset}
            y2={rel.y + offset}
            stroke="#7c7c80"
            strokeWidth={1/this.props.scale} />
        )
      }) : [];
    }).flat();

    targetPoints = this.targetPoints.map((point, index) => {
      return (
        <ControlPoint
          {...pointProps}
          target
          point={point}
          updateTargetPoint={updateTargetPoint}
          key={`target_${index}`} />
      )
    });

    controlPoints = this.controlPoints.map((point, index) => {
      return (
        <ControlPoint
          {...pointProps}
          point={point}
          updateTargetPoint={updateTargetPoint}
          key={`control_${index}`} />
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

export default PathEditLayer;