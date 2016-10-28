# Geojson-Canvas

Example app leveraging two libraries, a [modified version](https://github.com/TheGartrellGroup/leaflet-canvas-geojson) of [leaflet-canvas-geojson](https://github.com/ucd-cws/leaflet-canvas-geojson) and a [modified version](https://github.com/TheGartrellGroup/Leaflet-Fullcanvas) of [Leaflet-Fullcanvas](https://github.com/cyrilcherian/Leaflet-Fullcanvas) to render geojson featureCollections as HTML5 canvas elements.

##### Install:

* `npm install -g bower`
* `bower install`
* Add sample data to the root and reference it in `map.js` --> `layer_config` object
* Run a local sever to make ajax request for geojson and point localhost to the index.html file

##### Notes:

###### Canvas Style:  
* `createNonPointLayers` uses [leaflet-canvas-geojson's ](https://github.com/TheGartrellGroup/leaflet-canvas-geojson) `.renderer = function()`. If no customized rendering takes place, it'll use the libraries default styles.
  * Custom functions exists for both polygons and line strings/polylines
* `createPointLayers` uses the `drawSource: function()` method for style customizations in [Leaflet-Fullcanvas](https://github.com/cyrilcherian/Leaflet-Fullcanvas)

###### Click Events: 
Like the style customizations, click events can be customized to show the feature attributes.

*  `createNonPointLayers` uses the `onClick: function()` method
*  `createPointLayers` uses the `clickedPoints: function()` method 

###### Filtering: 
* Both point and non-point layers can be extended with a filter method `filter: function(features) {`
* Example includes a basic filter function (one should probably create their own)

###### CSS:
* A z-index higher than 5 for the point canvas layer is needed
  ```
  .leaflet-tile-pane.points {
      z-index: 6;
  }
  ```


