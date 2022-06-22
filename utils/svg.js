const rectTransform = info => {
  const {attributes, width, height} = info;
  info['viewBox'] = `0 0 ${width} ${height}`;
  attributes['width'] = width;
  attributes['height'] = height;

  if (attributes['stroke-width']) {
    let strokeWidth = parseInt(attributes['stroke-width']);

    attributes['x'] = `${strokeWidth/2}`;
    attributes['y'] = `${strokeWidth/2}`;
    attributes['width'] = `${Math.abs(width - strokeWidth)}`;
    attributes['height'] = `${Math.abs(height - strokeWidth)}`;

    // if (attributes['rx']) {
    //   let rx = parseInt(attributes['rx']);
    //   attributes['rx'] = `${Math.abs(rx - strokeWidth/2)}`
    // }
  }
};

const ellipseTransform = info => {
  const {attributes, width, height} = info;
  info['viewBox'] = `0 0 ${width} ${height}`;

  attributes['cx'] = `${width/2}`;
  attributes['cy'] = `${height/2}`;

  attributes['rx'] = `${width/2}`;
  attributes['ry'] = `${height/2}`;

  if (attributes['stroke-width']) {
    let strokeWidth = parseInt(attributes['stroke-width']);

    attributes['x'] = `${strokeWidth/4}`;
    attributes['y'] = `${strokeWidth/4}`;
    attributes['rx'] = `${width/2- strokeWidth}`;
    attributes['ry'] = `${height/2 - strokeWidth*2}`;

    // if (attributes['rx']) {
    //   let rx = parseInt(attributes['rx']);
    //   attributes['rx'] = `${Math.abs(rx - strokeWidth/2)}`
    // }
  }
};

const svgTransform = (i) => {
  let info = {...i};
  const {name} = info;
  
  switch (name) {
    case 'rect':
      rectTransform(info);
      break;
    case 'ellipse':
      ellipseTransform(info);
      break;
    default:
      break;
  }

  return info;
};

const getPathBounds = (path) => {
  // ES6 string tpl call
  if (Array.isArray(path) && path.length === 1 && typeof path[0] === 'string') path = path[0]

  // svg path string
  if (typeof path === 'string') {
    if (!isSvgPath(path)) throw Error('String is not an SVG path.')
    path = parse(path)
  }

  if (!Array.isArray(path)) throw Error('Argument should be a string or an array of path segments.')

  path = abs(path)
  path = normalize(path)

  if (!path.length) return [0, 0, 0, 0]

  var bounds = [Infinity, Infinity, -Infinity, -Infinity]

  for (var i = 0, l = path.length; i < l; i++) {
    var points = path[i].slice(1)

    for (var j = 0; j < points.length; j += 2) {
      if (points[j + 0] < bounds[0]) bounds[0] = points[j + 0]
      if (points[j + 1] < bounds[1]) bounds[1] = points[j + 1]
      if (points[j + 0] > bounds[2]) bounds[2] = points[j + 0]
      if (points[j + 1] > bounds[3]) bounds[3] = points[j + 1]
    }
  }

  return bounds
}

export {
  svgTransform,
  getPathBounds
};
