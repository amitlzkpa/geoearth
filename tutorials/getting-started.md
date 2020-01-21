# Getting Started

## Include
```
<script src="/three.min.js"></script>
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

