const GUIDELINE_THRESHOLD = 3;

const getLineGuideStops = (nodes, containerSize) => {
  let {width: containerWidth, height: containerHeight} = containerSize
  let vertical = [0, containerWidth / 2, containerWidth];
  let horizontal = [0, containerHeight / 2, containerHeight];

  // and we snap over edges and center of each object on the canvas
  nodes.forEach(box => {
    // and we can snap to all edges of shapes
    vertical.push([box.x, box.x + box.width, box.x + box.width / 2]);
    horizontal.push([box.y, box.y + box.height, box.y + box.height / 2]);
  });
  return {
    vertical: vertical.flat(),
    horizontal: horizontal.flat(),
  };
};

const getObjectSnappingEdges = ({
  clientX,
  clientY,
  clientWidth,
  clientHeight,
}) => {
  let box = {x: clientX, y: clientY, width: clientWidth, height: clientHeight};
  let absPos = {x: clientX, y: clientY};

  return {
    vertical: [
      {
        guide: box.x,
        offset: absPos.x - box.x,
        snap: 'start',
      },
      {
        guide: box.x + box.width / 2,
        offset: absPos.x - box.x - box.width / 2,
        snap: 'center',
      },
      {
        guide: box.x + box.width,
        offset: absPos.x - box.x - box.width,
        snap: 'end',
      },
    ],
    horizontal: [
      {
        guide: box.y,
        offset: absPos.y - box.y,
        snap: 'start',
      },
      {
        guide: box.y + box.height / 2,
        offset: absPos.y - box.y - box.height / 2,
        snap: 'center',
      },
      {
        guide: box.y + box.height,
        offset: absPos.y - box.y - box.height,
        snap: 'end',
      },
    ],
  };
};

const getGuides = (lineGuideStops, itemBounds, parentOffset={}, threshold=GUIDELINE_THRESHOLD) => {
  let resultV = [];
  let resultH = [];

  lineGuideStops.vertical.forEach(lineGuide => {
    itemBounds.vertical.forEach(itemBound => {
      let diff = Math.abs(lineGuide - itemBound.guide);
      // if the distance between guild line and object snap point is close we can consider this for snapping
      if (diff < threshold) {
        resultV.push({
          lineGuide: lineGuide,
          diff: diff,
          snap: itemBound.snap,
          offset: itemBound.offset,
        });
      }
    });
  });

  lineGuideStops.horizontal.forEach(lineGuide => {
    itemBounds.horizontal.forEach(itemBound => {
      let diff = Math.abs(lineGuide - itemBound.guide);
      if (diff < threshold) {
        resultH.push({
          lineGuide: lineGuide,
          diff: diff,
          snap: itemBound.snap,
          offset: itemBound.offset,
        });
      }
    });
  });

  let guides = [];

  // find closest snap
  let minV = resultV.sort((a, b) => a.diff - b.diff)[0];
  let minH = resultH.sort((a, b) => a.diff - b.diff)[0];
  if (minV) {
    guides.push({
      lineGuide: minV.lineGuide,
      offset: minV.offset,
      orientation: 'V',
      snap: minV.snap,
      parentOffset: parentOffset.x || 0,
    });
  }
  if (minH) {
    guides.push({
      lineGuide: minH.lineGuide,
      offset: minH.offset,
      orientation: 'H',
      snap: minH.snap,
      parentOffset: parentOffset.y || 0,
    });
  }
  return guides;
};

const calculateGuidelines = (selfRect, nodes, containerSize, threshold=GUIDELINE_THRESHOLD) => {
  let { x: clientX, y:clientY, width:clientWidth, height:clientHeight } = selfRect;

  let lineGuideStops = getLineGuideStops(nodes, containerSize);
  // find snapping points of current object
  let itemBounds = getObjectSnappingEdges({ clientX, clientY, clientWidth, clientHeight });
  let guides = getGuides(lineGuideStops, itemBounds, {}, threshold);

  let absPos = {};

  guides.forEach(lg => {
    switch (lg.snap) {
      case 'start': {
        switch (lg.orientation) {
          case 'V': {
            absPos.x = lg.lineGuide + lg.offset;
            break;
          }
          case 'H': {
            absPos.y = lg.lineGuide + lg.offset;
            break;
          }
        }
        break;
      }
      case 'center': {
        switch (lg.orientation) {
          case 'V': {
            absPos.x = lg.lineGuide + lg.offset;
            break;
          }
          case 'H': {
            absPos.y = lg.lineGuide + lg.offset;
            break;
          }
        }
        break;
      }
      case 'end': {
        switch (lg.orientation) {
          case 'V': {
            absPos.x = lg.lineGuide + lg.offset;
            break;
          }
          case 'H': {
            absPos.y = lg.lineGuide + lg.offset;
            break;
          }
        }
        break;
      }
    }
  });

  return {
    position: absPos,
    guides,
  }
}

export default calculateGuidelines;