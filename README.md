# React Native Svg Editor

*A react native component that lets you display & edit svg files graphically.*

<img src="/screenshots/1.png" alt="screenshot" style="width: 200px;" />

> :warning: This library was originally built for personal use. The documentation is minimal so be prepared to do a lot of code digging!

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

  const changeSelectedElementOpacity = (opacity) => {
    // set the selected elements opacity
    /*
      setting the element's attributes causes state change and thus re-renders the whole svg tree.
      use the function `updateSelectedElementAttributes(attributes)` to update the element's internal attributes
    */
    canvasRef.current.setSelectedElementAttributes({ opacity });
  };

  const undo = () => {
    canvasRef.current.undo();
  };

  const redo = () => {
    canvasRef.current.redo();
  };

  return (
    <View>
      <SvgEditor
        ref={canvasRef}
        svg={svg} />
    </View>
  );
}
~~~

## Live Demo

You can try out the SVG Editor app on [Google Play](https://play.google.com/store/apps/details?id=com.thumbnaillab) and [Apple App Store](https://apps.apple.com/us/app/svg-editor-graphic-ui-design/id1624759841). React Native SVG Editor is the core that powers everything related to svg editing.

## Contribute

This project was originally created for my personal applications. It was getting harder as harder to maintain as the size of the library grew, so I figured it's best to make the library open sourced so anyone interested can take part in the project. Documentation is minimal so contributions are welcomed. Please support the project by making Issues and PRs.