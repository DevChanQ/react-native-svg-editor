# React Native Svg Editor

*A react native component that lets you display & edit svg files graphically.*

<img src="/screenshots/1.png" alt="screenshot" style="max-width: 200px;display: block;margin-bottom: 30px;" />

> :warning: This library was built for personal use initially. The documentation is minimal so contributions are welcomed.

## Installation
```
npm i react-native-svg-editor --save
```

```
yarn add react-native-svg-editor
```
  
## Usage

~~~ javascript
import SvgEditor from 'react-native-svg-editor';

const EditorView = () => {
  const canvasRef = useRef(null);
  const svg = `<svg width="400" height="180" xmlns="http://www.w3.org/2000/svg"><rect x="50" y="20" rx="20" ry="20" width="150" height="150" style="fill:red;stroke:black;stroke-width:5;opacity:0.5" /></svg>`

  return (
    <View>
      <SvgEditor
        ref={canvasRef}
        svg={svg} />
    </View>
  );
}
~~~

## Contribute

This library was originally built for in-house use. The documentation is minimal so contributions are welcomed. Please support the project by making Issues and PRs.