# Getting Started

## Include
```
<script src="/globe/third-party/three.min.js"></script>
<script src="/globe/globe.js"></script>
```

## Initialize
**Full Screen**:
Javascript:
```
var globe = new DAT.Globe(null, opts);
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
var globe = new DAT.Globe(container, opts);
```

## Load Data
```
var sampleData = await fetch('/data/sample.geojson');
var geojson = await sampleData.json();
globe.addFeatureCollection(geojson);
```

