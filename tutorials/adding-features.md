# Adding Features

GeoEarth is a Javascript library to visualize an interactive 3D globe in the browser.  
You can add GeoJson based features and it is rendered on a 3D globe usin [threejs](https://threejs.org).  

## Add a point  

Adds an array or geojson object representing a single point to a threejs 3D object.  
```

// As array
var posA = [28.644800, 77.216721];
var meshA = eeoearth.addPoint(posA);

// As geojson
var posB =  {
              "type": "Feature",
              "geometry": {
                "type": "Point",
                "coordinates": [125.6, 10.1]
              },
              "properties": {
                "name": "Dinagat Islands"
              }
            };
var meshB = geoearth.addPoint(posB);
```

## Add multiple points  

Adds an array or geojson object representing a multiple points to a threejs 3D object.  
```

// As array
var posA = [ [55.751244, 37.618423], [30.266666, -97.733330] ];
var objA = geoearth.addMultiPoint(posA);

// As geojson
var posB =  {
              "type": "Feature",
              "geometry": {
                "type": "MultiPoint",
                "coordinates": [
                  [-73.935242, 40.730610],
                  [-0.12574, 51.5085297],
                  [139.6917114, 35.6894989],
                  [2.3487999, 48.8534088]
                ]
              },
              "properties": {
                "name": "Fallen Cities"
              }
            }
var objB = geoearth.addMultiPoint(posB);
```

## Add a line  
Adds an array or geojson object representing a single line to a threejs 3D line.  
```

// As array
var lnA = [ [14.6042004, 120.9822006], [22.3964272, 114.1094971] ];
var lineA = geoearth.addLineString(lnA);

// As geojson
var lnB = {
            "type": "Feature",
            "geometry": {
              "type": "LineString",
              "coordinates": [
                [
                  29.301449060440063,
                  -31.952162238024957
                ],
                [
                  69.24430757761002,
                  34.63320791137959
                ]
              ]
            },
            "properties": {
              "name": "Magellan Line"
            }
          }
var lineB = geoearth.addLineString(lnB);
```

## Add multiple lines  
Adds an array or geojson object representing multiple lines to threejs 3D lines.  
```
// As array
var lnA = [ [ [14.6042004, 120.9822006], [22.3964272, 114.1094971] ], [ [11.5624504, 104.916008], [10.82302, 106.6296463] ] ];
var lineA = geoearth.addMultiLineString(lnA);

// As geojson
var lnB = {
            "type": "Feature",
            "geometry": {
              "type": "MultiLineString",
              "coordinates": [
                [ 
                  [
                    32.506026327610016,
                    15.580710739162123
                  ],
                  [
                    77.44035622384729,
                    12.983147716796577
                  ]
                ],
                [ 
                  [
                    88.29484841134729,
                    22.553147478403194
                  ],
                  [
                    74.4233498564023,
                    42.924251753870685
                  ],
                  [
                    94.4233498564023,
                    49.924251753870685
                  ]
                ]
              ]
            },
            "properties": {
              "name": "Incense License"
            }
          }
var lineB = geoearth.addMultiLineString(lnB);
```

## Add a polygon (filled region)  
Adds an array or geojson object representing a single polygon to a threejs 3D object.  
```
// As array
var plA = [ [[35, 10], [45, 45], [15, 40], [10, 20], [35, 10]], [[20, 30], [35, 35], [30, 20], [20, 30]] ];
var polyA = geoearth.addPolygon(plA);

// As geojson
var plB = {
            "type": "Feature",
            "geometry": {
              "type": "Polygon", 
              "coordinates": [
                [[35, 10], [45, 45], [15, 40], [10, 20], [35, 10]], 
                [[20, 30], [35, 35], [30, 20], [20, 30]]
              ]
            }
          }
var polyB = geoearth.addPolygon(plB);
```

## Add multiple polygons
Adds an array or geojson object representing multiple polygons to threejs 3D multiple polygons.  
```
// As array
var mpolyA =  [
                [[[102.0, 2.0], [103.0, 2.0], [103.0, 3.0], [102.0, 3.0], [102.0, 2.0]]],
                [[[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]],
                 [[100.2, 0.2], [100.8, 0.2], [100.8, 0.8], [100.2, 0.8], [100.2, 0.2]]]
              ];
var mpolygonA = geoearth.addMultiPolygon(mpolyA);

// As geojson
var mpolyB = {
                "type": "FeatureCollection",
                "features": [
                  { 
                    "type": "MultiPolygon",
                    "coordinates": [
                      [[[102.0, 2.0], [103.0, 2.0], [103.0, 3.0], [102.0, 3.0], [102.0, 2.0]]],
                      [[[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]],
                       [[100.2, 0.2], [100.8, 0.2], [100.8, 0.8], [100.2, 0.8], [100.2, 0.2]]]
                    ]
                  }
                ]
              }
var mpolygonB = geoearth.addMultiPolygon(mpolyB);
```

## Add GeoJson  
Add the given geojson object to the map.  
```
var geoJson = {
               "type": "Feature",
               "geometry": {
                 "type": "Point",
                 "coordinates": [125.6, 10.1]
               },
               "properties": {
                 "name": "Dinagat Islands"
               }
             };
geoearth.addGeoJson(geoJson);
```