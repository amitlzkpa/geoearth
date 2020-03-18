# Getting Started

GeoEarth is a Javascript library to visualize an interactive 3D globe in the browser.  
You can add GeoJson based features and it is rendered on a 3D globe usin [threejs](https://threejs.org).  

## Include  
```
<script src="/geoearth.js"></script>
```

## Initialize  
**Full Screen**:  
Javascript:
```
var geoearth = new GeoEarth(null, opts);
```

**Windowed**:  
HTML:  
```
...
<div id="container"></div>
...
```
Javascript:  
```
var container = document.getElementById("container");
var geoearth = new GeoEarth(container, opts);
```

## Load Data  
```
var sampleData = await fetch('/data/sample.geojson');
var geojson = await sampleData.json();
geoearth.addFeatureCollection(geojson);
```

To learn more about adding individual features check out the [adding features](./tutorial-adding-features.html) guide.  