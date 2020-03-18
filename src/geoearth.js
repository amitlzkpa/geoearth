/**
 *
 * Constructor used to create an instance of the geoearth.
 * A geoearth instance is a threejs scene which contains the globe and all associated 3D objects.
 *
 * @param {DOMObject} container - The container to hold the scene.
 * @param {Object} opts                     - An object containing configuration parameters for the globe.
 * @param {number} opts.earthRadius         - Radius of the earth's surface in threejs units (default: 200).
 * @param {number} opts.colorFn             - A function for mapping the globe's colors based on HSL values.
 * @param {string} opts.textureImage        - Path to image to be used as texture.
 * @param {boolean} opts.disableAtmosphere  - Disable atmosphere (default: false).
 * @param {boolean} opts.autoStart          - If the geoearth object should auto-start (default: true).
 * @return {GeoEarth} An instance of the geoearth.
 *
 * @example
 *
 * var container = document.getElementById("container");
 * var geoearth = new GeoEarth(container);
 *
 */
class GeoEarth {

  isReady = false;
  sleepTime = 400;
  instance;
  opts;
  autoStart;
  earthRadius;
  disableAtmosphere;

  textureImage;

  Shaders = {
    'earth': {
      uniforms: {
        'texture': {
          type: 't',
          value: null
        }
      },
      vertexShader: [
        'varying vec3 vNormal;',
        'varying vec2 vUv;',
        'void main() {',
        'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
        'vNormal = normalize( normalMatrix * normal );',
        'vUv = uv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D texture;',
        'varying vec3 vNormal;',
        'varying vec2 vUv;',
        'void main() {',
        'vec3 diffuse = texture2D( texture, vUv ).xyz;',
        'float intensity = 1.05 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) );',
        'vec3 atmosphere = vec3( 1.0, 1.0, 1.0 ) * pow( intensity, 3.0 );',
        'gl_FragColor = vec4( diffuse + atmosphere, 1.0 );',
        '}'
      ].join('\n')
    },
    'atmosphere': {
      uniforms: {},
      vertexShader: [
        'varying vec3 vNormal;',
        'void main() {',
        'vNormal = normalize( normalMatrix * normal );',
        'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vNormal;',
        'void main() {',
        'float intensity = pow( 0.8 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );',
        'gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 ) * intensity;',
        '}'
      ].join('\n')
    }
  };

  container;
  camera;
  scene;
  renderer;
  w;
  h;
  earthMesh;
  atmosphereMesh;

  overRenderer;

  curZoomSpeed = 0;

  mouse = {
    x: 0,
    y: 0
  };
  mouseOnDown = {
    x: 0,
    y: 0
  };
  rotation = {
    x: 0,
    y: 0
  };
  target = {
    x: Math.PI * 3 / 2,
    y: Math.PI / 6.0
  };
  targetOnDown = {
    x: 0,
    y: 0
  };

  distance = 100000;
  distanceTarget = 100000;


  frameCount = 0;


  /**
   * An object containing all active objects on given instance with object ids as key and
   * objects themselves as values.
   */
  activeGeoJsons = {};




  constructor(container, opts) {

    this.dependencies = [
      "/js/TessellateModifier.js"
    ];
    

    if (!container) {
      container = document.createElement("div");
      container.style.width = window.innerWidth + "px";
      container.style.height = window.innerHeight + "px";
      document.body.appendChild(container);
    }


    this.instance = this;
    this.container = container;
    this.opts = opts || {};
    this.autoStart = typeof opts.autoStart === "undefined" || opts.autoStart === true;
    this.earthRadius = opts.earthRadius || 200;
    this.disableAtmosphere = opts.disableAtmosphere || false;

    this.textureImage = opts.textureImage || '';



    if (this.autoStart) {
      this.init(this.animate.bind(this));
    }


  }


  async init(next) {

    for(var i=0; i<this.dependencies.length; i++) {
      var resource = await fetch(this.dependencies[i]);
      var resourceText = await resource.text();
      eval.apply(window, [resourceText]);
    }

    var shader, uniforms, material;
    this.w = this.container.offsetWidth;
    this.h = this.container.offsetHeight;

    this.camera = new THREE.PerspectiveCamera(30, this.w / this.h, 1, 10000);
    this.camera.position.z = this.distance;

    this.scene = new THREE.Scene();

    var geometry = new THREE.SphereGeometry(this.earthRadius, 40, 30);

    shader = this.Shaders['earth'];
    uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    uniforms['texture'].value = THREE.ImageUtils.loadTexture(this.textureImage);

    material = new THREE.ShaderMaterial({

      uniforms: uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader

    });

    this.earthMesh = new THREE.Mesh(geometry, material);
    this.earthMesh.rotation.y = Math.PI;
    this.scene.add(this.earthMesh);

    shader = this.Shaders['atmosphere'];
    uniforms = THREE.UniformsUtils.clone(shader.uniforms);

    material = new THREE.ShaderMaterial({

      uniforms: uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true

    });

    if (!this.disableAtmosphere) {
      this.atmosphereMesh = new THREE.Mesh(geometry, material);
      this.atmosphereMesh.scale.set(1.1, 1.1, 1.1);
      this.scene.add(this.atmosphereMesh);
    }

    this.renderer = new THREE.WebGLRenderer({
      antialias: true
    });
    this.renderer.setSize(this.w, this.h);

    this.container.appendChild(this.renderer.domElement);

    this.container.addEventListener('mousedown', this.onMouseDown, false);

    this.container.addEventListener('mousewheel', this.onMouseWheel.bind(this), false);

    document.addEventListener('keydown', this.onDocumentKeyDown.bind(this), false);

    window.addEventListener('resize', this.onWindowResize.bind(this), false);

    this.container.addEventListener('mouseover', function() {
      this.overRenderer = true;
    }.bind(this), false);

    this.container.addEventListener('mouseout', function() {
      this.overRenderer = false;
    }.bind(this), false);

    
    this.isReady = true;
    
    if(next) next();

  }

  onMouseDown = function(event) {
    event.preventDefault();

    this.container.addEventListener('mousemove', this.onMouseMove, false);
    this.container.addEventListener('mouseup', this.onMouseUp, false);
    this.container.addEventListener('mouseout', this.onMouseOut, false);

    this.mouseOnDown.x = -event.clientX;
    this.mouseOnDown.y = event.clientY;

    this.targetOnDown.x = this.target.x;
    this.targetOnDown.y = this.target.y;

    this.container.style.cursor = 'move';
  }.bind(this)

  onMouseMove = function(event) {
    this.mouse.x = -event.clientX;
    this.mouse.y = event.clientY;

    var zoomDamp = this.distance / 1000;

    this.target.x = this.targetOnDown.x + (this.mouse.x - this.mouseOnDown.x) * 0.005 * zoomDamp;
    this.target.y = this.targetOnDown.y + (this.mouse.y - this.mouseOnDown.y) * 0.005 * zoomDamp;

    this.target.y = this.target.y > (Math.PI / 2) ? (Math.PI / 2) : this.target.y;
    this.target.y = this.target.y < -(Math.PI / 2) ? -(Math.PI / 2) : this.target.y;
  }.bind(this)

  onMouseUp = function(event) {
    this.container.removeEventListener('mousemove', this.onMouseMove, false);
    this.container.removeEventListener('mouseup', this.onMouseUp, false);
    this.container.removeEventListener('mouseout', this.onMouseOut, false);
    this.container.style.cursor = 'auto';
  }.bind(this)

  onMouseOut = function(event) {
    this.container.removeEventListener('mousemove', this.onMouseMove, false);
    this.container.removeEventListener('mouseup', this.onMouseUp, false);
    this.container.removeEventListener('mouseout', this.onMouseOut, false);
  }.bind(this)

  onMouseWheel = function(event) {
    event.preventDefault();
    if (this.overRenderer) {
      this.zoom(event.wheelDeltaY * 0.3);
    }
    return false;
  }.bind(this)

  onDocumentKeyDown(event) {
    switch (event.keyCode) {
      case 38:
        this.zoom(100);
        event.preventDefault();
        break;
      case 40:
        this.zoom(-100);
        event.preventDefault();
        break;
    }
  }

  onWindowResize(event) {
    this.camera.aspect = this.container.offsetWidth / this.container.offsetHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
  }

  zoom(delta) {
    this.distanceTarget -= delta;
    this.distanceTarget = this.distanceTarget > 1000 ? 1000 : this.distanceTarget;
    this.distanceTarget = this.distanceTarget < 210 ? 210 : this.distanceTarget;
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.render();
  }

  render() {
    this.zoom(this.curZoomSpeed);

    this.rotation.x += (this.target.x - this.rotation.x) * 0.1;
    this.rotation.y += (this.target.y - this.rotation.y) * 0.1;
    this.distance += (this.distanceTarget - this.distance) * 0.3;

    this.camera.position.x = this.distance * Math.sin(this.rotation.x) * Math.cos(this.rotation.y);
    this.camera.position.y = this.distance * Math.sin(this.rotation.y);
    this.camera.position.z = this.distance * Math.cos(this.rotation.x) * Math.cos(this.rotation.y);

    this.camera.lookAt(this.earthMesh.position);

    this.renderer.render(this.scene, this.camera);

    this.frameCount++;
  }


  async wait(ms) {
    return new Promise((resolve, reject) => setTimeout(() => resolve(), ms));
  }



  // ----------------------------------------------------------------------------
  /*
                _     _ _                            
    _ __  _   _| |__ | (_) ___  __   ____ _ _ __ ___ 
  | '_ \| | | | '_ \| | |/ __| \ \ / / _` | '__/ __|
  | |_) | |_| | |_) | | | (__   \ V / (_| | |  \__ \
  | .__/ \__,_|_.__/|_|_|\___|   \_/ \__,_|_|  |___/
  |_|                                               

  */



  // ----------------------------------------------------------------------------
  /*

        _   _ _ _ _         
  _   _| |_(_) (_) |_ _   _ 
 | | | | __| | | | __| | | |
 | |_| | |_| | | | |_| |_| |
  \__,_|\__|_|_|_|\__|\__, |
                      |___/ 

  */


  /**
   * Method to convert latitude to X coordinate on the globe's surface.
   *
   * @param {float} lat - Latitude in decimal coordinates.
   * @return {float} X coordinate on the globe's surface.
   *
   * @example
   *
   *     latToSphericalCoords(19.076090);
   *
   */
  static latToSphericalCoords(lat) {
    return (90 - lat) * Math.PI / 180;
  }

  /**
   * Method to convert longitude to Y coordinate on the globe's surface.
   *
   * @param {float} lng - Longitude in decimal coordinates.
   * @return {float} Y coordinate on the globe's surface.
   *
   * @example
   *
   *     lngToSphericalCoords(72.877426);
   *
   */
  static lngToSphericalCoords(lng) {
    return (180 - lng) * Math.PI / 180;
  }

  /**
   * Method to calculate haversine distance with the given radius.
   *
   * @param {Array} p1 - Array representing first point in decimal coordinates.
   * @param {Array} p2 - Array representing second point in decimal coordinates.
   * @param {float} radius - Radius to use for distance calculation (default is Earth's radius in m).
   * @return {float} haversine distance with the given radius.
   *
   * @example
   *
   *     getHaversineDistance([-122.4194183, 37.774929], [144.9633179, -37.8139992], 200);
   *
   */
  static getHaversineDistance(p1, p2, radius = 6371e3) {

    // ref: https://www.movable-type.co.uk/scripts/latlong.html
    // WIP
    // needs verification; especially coordinate conversions
    var φ1 = GeoEarth.latToSphericalCoords(p1[1]);
    var φ2 = GeoEarth.latToSphericalCoords(p2[1]);
    var Δφ = GeoEarth.latToSphericalCoords(p2[1] - p1[1]);
    var Δλ = GeoEarth.lngToSphericalCoords(p2[0] - p1[0]);

    var a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    var d = radius * c;

    return d;
  }




  // ----------------------------------------------------------------------------
  /*
                   _                 
   __ _  ___  ___ (_)___  ___  _ __  
  / _` |/ _ \/ _ \| / __|/ _ \| '_ \ 
 | (_| |  __/ (_) | \__ \ (_) | | | |
  \__, |\___|\___// |___/\___/|_| |_|
  |___/         |__/                 

  */




  /**
   * Adds an array or geojson object representing a single point to a threejs 3D object.
   * Awaits till the instance is ready to be worked with.
   *
   * @param {geojson} input - An array or geojson object representing a point on the map.
   * @param {Object} opts - An object containing configuration parameters.
   *                        'color': Color for the mesh (default: 0xffff00).
   *                        'size': Size for the mesh (default: 2).
   * @return {THREE.Mesh} A threejs 3D object (as a sphere).
   *
   * @example
   *      
   *    // As array
   *    var posA = [28.644800, 77.216721];
   *    var meshA = eeoearth.addPoint(posA);
   *
   *    // As geojson
   *    var posB =  {
   *                  "type": "Feature",
   *                  "geometry": {
   *                    "type": "Point",
   *                    "coordinates": [125.6, 10.1]
   *                  },
   *                  "properties": {
   *                    "name": "Dinagat Islands"
   *                  }
   *                };
   *    var meshB = geoearth.addPoint(posB);
   *
   */
  async addPoint(input, opts) {

    while (!this.isReady) {
      await this.wait(this.sleepTime);
      if(!this.isReady) return;
    }

    var coords = null;
    opts = opts || {};

    if (input.constructor === Array) {
      coords = input;
    } else {
      coords = input.geometry.coordinates;
    }

    coords = JSON.parse(JSON.stringify(coords));

    var lng = coords[0];
    var lat = coords[1];

    var phi = GeoEarth.latToSphericalCoords(lat);
    var theta = GeoEarth.lngToSphericalCoords(lng);

    var sz = opts.size || 2;
    var color = opts.color || 0xffff00;
    var geometry = new THREE.SphereGeometry(sz, 8, 8);
    var material = new THREE.MeshBasicMaterial({
      color: color
    });
    var point = new THREE.Mesh(geometry, material);

    point.position.x = this.earthRadius * Math.sin(phi) * Math.cos(theta);
    point.position.y = this.earthRadius * Math.cos(phi);
    point.position.z = this.earthRadius * Math.sin(phi) * Math.sin(theta);

    var addedObj = this.addToActiveGeoJsons(point);

    return addedObj;
  }

  /**
   * Adds an array or geojson object representing a multiple points to a threejs 3D object.
   *
   * @param {geojson} input - An array or geojson object representing multiple points on the map.
   * @param {Object} opts - An object containing configuration parameters.
   *                        'color': Color for the mesh (default: 0xffff00).
   *                        'size': Size for the mesh (default: 2).
   * @return {THREE.Object3D} A threejs 3D object (as a collection of spheres inside an THREE.Object3D).
   *
   * @example
   *      
   *    // As array
   *    var posA = [ [55.751244, 37.618423], [30.266666, -97.733330] ];
   *    var objA = geoearth.addMultiPoint(posA);
   *
   *    // As geojson
   *    var posB =  {
   *                  "type": "Feature",
   *                  "geometry": {
   *                    "type": "MultiPoint",
   *                    "coordinates": [
   *                      [-73.935242, 40.730610],
   *                      [-0.12574, 51.5085297],
   *                      [139.6917114, 35.6894989],
   *                      [2.3487999, 48.8534088]
   *                    ]
   *                  },
   *                  "properties": {
   *                    "name": "Fallen Cities"
   *                  }
   *                }
   *    var objB = geoearth.addMultiPoint(posB);
   *
   */
  addMultiPoint(input, opts) {

    var coords = null;
    opts = opts || {};

    if (input.constructor === Array) {
      coords = input;
    } else {
      coords = input.geometry.coordinates;
    }

    coords = JSON.parse(JSON.stringify(coords));

    var points = new THREE.Object3D();

    for (var ptIdx = 0; ptIdx < coords.length; ptIdx++) {
      var lng = coords[ptIdx][0];
      var lat = coords[ptIdx][1];

      var phi = GeoEarth.latToSphericalCoords(lat);
      var theta = GeoEarth.lngToSphericalCoords(lng);

      var sz = opts.size || 2;
      var color = opts.color || 0xffff00;
      var geometry = new THREE.SphereGeometry(sz, 8, 8);
      var material = new THREE.MeshBasicMaterial({
        color: color
      });
      var point = new THREE.Mesh(geometry, material);

      point.position.x = 203 * Math.sin(phi) * Math.cos(theta);
      point.position.y = 203 * Math.cos(phi);
      point.position.z = 203 * Math.sin(phi) * Math.sin(theta);

      points.add(point);
    }

    var mesh = this.addToActiveGeoJsons(points);

    return mesh;
  }

  /**
   * Adds an array or geojson object representing a single line to a threejs 3D line.
   *
   * @param {geojson} input - An array or geojson object representing a line on the map.
   * @param {Object} opts - An object containing configuration parameters.
   *                        'color': Color for the line (default: 0xffffff).
   * @return {THREE.Line} A threejs 3D line.
   *
   * @example
   *      
   *    // As array
   *    var lnA = [ [14.6042004, 120.9822006], [22.3964272, 114.1094971] ];
   *    var lineA = geoearth.addLineString(lnA);
   *
   *    // As geojson
   *    var lnB = {
   *                "type": "Feature",
   *                "geometry": {
   *                  "type": "LineString",
   *                  "coordinates": [
   *                    [
   *                      29.301449060440063,
   *                      -31.952162238024957
   *                    ],
   *                    [
   *                      69.24430757761002,
   *                      34.63320791137959
   *                    ]
   *                  ]
   *                },
   *                "properties": {
   *                  "name": "Magellan Line"
   *                }
   *              }
   *    var lineB = geoearth.addLineString(lnB);
   *
   */
  addLineString(input, opts) {

    var inPts = null;
    opts = opts || {};

    if (input.constructor === Array) {
      inPts = input;
    } else {
      inPts = input.geometry.coordinates;
    }

    if (inPts.length < 2) throw ('Need at least 2 points for a line');

    inPts = JSON.parse(JSON.stringify(inPts));

    // var d = GeoEarth.getHaversineDistance(inPts[0], inPts[1]);
    // console.log(d);

    var divs = 100;
    var corr = 0;
    var mul = 1;
    var isCrossingDL = false;
    if (Math.sign(inPts[0][0]) !== Math.sign(inPts[1][0]) &&
      Math.abs(inPts[0][0]) > 90 && Math.abs(inPts[1][0]) > 90) {
      isCrossingDL = true;
      if (inPts[1][0] > inPts[0][0]) {
        var q = inPts[0];
        inPts[0] = inPts[1];
        inPts[1] = q;
      }
    }
    if (isCrossingDL) {
      corr = Math.abs(180 - inPts[0][0]) + 180;
      mul = -1;
      inPts[0][0] = 0;
      inPts[1][0] += corr;
    }

    var pts = [];

    var idx = 1;
    while (idx < inPts.length) {
      var secondPt = inPts[idx];
      var firstPt = inPts[idx - 1];

      var deltaLng = (secondPt[0] - firstPt[0]) / divs;
      var deltaLat = (secondPt[1] - firstPt[1]) / divs;

      for (var j = 0; j < divs; j++) {
        pts.push([firstPt[0] + (j * deltaLng) + (corr * mul), firstPt[1] + (j * deltaLat)]);
      }
      idx++;
    }

    var col = opts.color || 0xffffff
    var material = new THREE.LineBasicMaterial({
      color: col
    });
    var c = 0;
    var geometry = new THREE.Geometry();
    do {
      var lng = pts[c][0];
      var lat = pts[c][1];
      var phi = GeoEarth.latToSphericalCoords(lat);
      var theta = GeoEarth.lngToSphericalCoords(lng);
      var vt = new THREE.Vector3();
      vt.x = this.earthRadius * Math.sin(phi) * Math.cos(theta);
      vt.y = this.earthRadius * Math.cos(phi);
      vt.z = this.earthRadius * Math.sin(phi) * Math.sin(theta);
      geometry.vertices.push(vt);
      c++;
    } while (c < pts.length)

    var line = new THREE.Line(geometry, material);

    var addedObj = this.addToActiveGeoJsons(line);

    return addedObj;
  }

  /**
   * Adds an array or geojson object representing multiple lines to threejs 3D lines.
   *
   * @param {geojson} input - An array or geojson object representing multiple lines on the map.
   * @param {Object} opts - An object containing configuration parameters.
   *                        'color': Color for the line (default: 0xffffff).
   * @return {THREE.Object3D} A threejs 3D object (as a collection of lines inside an THREE.Object3D).
   *
   * @example
   *      
   *    // As array
   *    var lnA = [ [ [14.6042004, 120.9822006], [22.3964272, 114.1094971] ], [ [11.5624504, 104.916008], [10.82302, 106.6296463] ] ];
   *    var lineA = geoearth.addMultiLineString(lnA);
   *
   *    // As geojson
   *    var lnB = {
   *                "type": "Feature",
   *                "geometry": {
   *                  "type": "MultiLineString",
   *                  "coordinates": [
   *                    [ 
   *                      [
   *                        32.506026327610016,
   *                        15.580710739162123
   *                      ],
   *                      [
   *                        77.44035622384729,
   *                        12.983147716796577
   *                      ]
   *                    ],
   *                    [ 
   *                      [
   *                        88.29484841134729,
   *                        22.553147478403194
   *                      ],
   *                      [
   *                        74.4233498564023,
   *                        42.924251753870685
   *                      ],
   *                      [
   *                        94.4233498564023,
   *                        49.924251753870685
   *                      ]
   *                    ]
   *                  ]
   *                },
   *                "properties": {
   *                  "name": "Incense License"
   *                }
   *              }
   *    var lineB = geoearth.addMultiLineString(lnB);
   *
   */
  addMultiLineString(input, opts) {

    var inLns = null;
    opts = opts || {};

    if (input.constructor === Array) {
      inLns = input;
    } else {
      inLns = input.geometry.coordinates;
    }

    inLns = JSON.parse(JSON.stringify(inLns));

    var lines = new THREE.Object3D();

    for (let inLnsIdx = 0; inLnsIdx < inLns.length; inLnsIdx++) {

      var inPts = inLns[inLnsIdx];
      if (inPts.length < 2) throw ('Need at least 2 points for a line');
      var divs = 100;
      // var d = Math.sqrt(Math.pow(inPts[1][0] - inPts[0][0], 2) + Math.pow(inPts[1][0] - inPts[0][0], 2));
      // console.log(d);

      var pts = [];

      var idx = 1;
      while (idx < inPts.length) {
        var secondPt = inPts[idx];
        var firstPt = inPts[idx - 1];

        var deltaLng = (secondPt[0] - firstPt[0]) / divs;
        var deltaLat = (secondPt[1] - firstPt[1]) / divs;

        for (var j = 0; j < divs; j++) {
          pts.push([firstPt[0] + (j * deltaLng), firstPt[1] + (j * deltaLat)]);
        }
        idx++;
      }

      var col = opts.color || 0xffffff
      var material = new THREE.LineBasicMaterial({
        color: col
      });
      var c = 0;
      var geometry = new THREE.Geometry();
      do {
        var lng = pts[c][0];
        var lat = pts[c][1];
        var phi = GeoEarth.latToSphericalCoords(lat);
        var theta = GeoEarth.lngToSphericalCoords(lng);
        var vt = new THREE.Vector3();
        vt.x = this.earthRadius * Math.sin(phi) * Math.cos(theta);
        vt.y = this.earthRadius * Math.cos(phi);
        vt.z = this.earthRadius * Math.sin(phi) * Math.sin(theta);
        geometry.vertices.push(vt);
        c++;
      } while (c < pts.length)

      var line = new THREE.Line(geometry, material);
      lines.add(line);
    }

    var addedObj = this.addToActiveGeoJsons(lines);

    return addedObj;
  }

  /**
   * Adds an array or geojson object representing a single polygon to a threejs 3D object.
   *
   * @param {geojson} input - An array or geojson object representing a polygon on the map.
   * @param {Object} opts - An object containing configuration parameters.
   *                        'color': Color for the line (default: 0xffffff).
   * @return {THREE.Object3D} A threejs 3D object.
   *
   * @example
   *      
   *    // As array
   *    var plA = [ [[35, 10], [45, 45], [15, 40], [10, 20], [35, 10]], [[20, 30], [35, 35], [30, 20], [20, 30]] ];
   *    var polyA = geoearth.addPolygon(plA);
   *
   *    // As geojson
   *    var plB = {
   *                "type": "Feature",
   *                "geometry": {
   *                  "type": "Polygon", 
   *                  "coordinates": [
   *                    [[35, 10], [45, 45], [15, 40], [10, 20], [35, 10]], 
   *                    [[20, 30], [35, 35], [30, 20], [20, 30]]
   *                  ]
   *                }
   *              }
   *    var polyB = geoearth.addPolygon(plB);
   *
   */
  addPolygon(input, opts) {

    var inLns = null;
    opts = opts || {};

    if (input.constructor === Array) {
      inLns = input;
    } else {
      inLns = input.geometry.coordinates;
    }

    inLns = JSON.parse(JSON.stringify(inLns));

    var polygon = new THREE.Object3D();
    var shape = new THREE.Shape();
    var col = opts.color || 0xffffff
    var material = new THREE.MeshBasicMaterial({
      color: col,
      side: THREE.DoubleSide,
      // wireframe: true
    });

    for (let inLnsIdx = 0; inLnsIdx < inLns.length; inLnsIdx++) {

      var inPts = inLns[inLnsIdx];
      if (inPts.length < 3) throw ('Need at least 3 points for a ring in a polyline');
      var divs = 100;
      // var d = Math.sqrt(Math.pow(inPts[1][0] - inPts[0][0], 2) + Math.pow(inPts[1][0] - inPts[0][0], 2));
      // console.log(d);

      var pts = [];

      var idx = 1;
      while (idx < inPts.length) {
        var secondPt = inPts[idx];
        var firstPt = inPts[idx - 1];

        var deltaLng = (secondPt[0] - firstPt[0]) / divs;
        var deltaLat = (secondPt[1] - firstPt[1]) / divs;

        for (var j = 0; j < divs; j++) {
          pts.push([firstPt[0] + (j * deltaLng), firstPt[1] + (j * deltaLat)]);
        }
        idx++;
      }

      // if its the first ring make the shape
      if (inLnsIdx === 0) {

        // move shape cursor to first point
        var lng = pts[0][0];
        var lat = pts[0][1];
        shape.moveTo(lng, lat);

        // connect with lines to all successive pts
        var c = 1;
        do {
          var lng = pts[c][0];
          var lat = pts[c][1];
          shape.lineTo(lng, lat);
          c++;
        } while (c < pts.length)

      }
      // if not first ring add it as a hole
      else {

        var path = new THREE.Path();
        // move shape cursor to first point
        var lng = pts[0][0];
        var lat = pts[0][1];
        path.moveTo(lng, lat);

        // connect with lines to all successive pts
        var c = 1;
        do {
          var lng = pts[c][0];
          var lat = pts[c][1];
          path.lineTo(lng, lat);
          c++;
        } while (c < pts.length)

        shape.holes.push(path);

      }

    }

    // convert flat shape to polygon surface mapped to sphere
    var modifier = new THREE.TessellateModifier(4);
    var roughGeometry = new THREE.Geometry().fromBufferGeometry(new THREE.ShapeBufferGeometry(shape));
    for(var i=0; i<8; i++) {
      modifier.modify(roughGeometry);
    }
    var fineGeometry = new THREE.BufferGeometry().fromGeometry(roughGeometry);

    for (var i = 0; i < fineGeometry.attributes.position.array.length; i += 3) {
      var phi = GeoEarth.latToSphericalCoords(fineGeometry.attributes.position.array[i]);
      var theta = GeoEarth.lngToSphericalCoords(fineGeometry.attributes.position.array[i + 1]);
      fineGeometry.attributes.position.array[i] = (this.earthRadius * 1.01) * Math.sin(phi) * Math.cos(theta);
      fineGeometry.attributes.position.array[i + 1] = (this.earthRadius * 1.01) * Math.cos(phi);
      fineGeometry.attributes.position.array[i + 2] = (this.earthRadius * 1.01) * Math.sin(phi) * Math.sin(theta);
    }
    fineGeometry.computeVertexNormals();
    fineGeometry.attributes.position.needsUpdate = true;
    var mesh = new THREE.Mesh(fineGeometry, material);

    polygon.add(mesh);

    var addedObj = this.addToActiveGeoJsons(polygon);

    return addedObj;
  }

  /**
   * Adds an array or geojson object representing multiple polygons to threejs 3D multiple polygons.
   *
   * @param {geojson} input - An array or geojson object representing multiple polygons on the map.
   * @param {Object} opts - An object containing configuration parameters.
   *                        'color': Color for the polygon (default: 0xffffff).
   * @return {THREE.Object3D} A threejs 3D object (as a collection of polygons inside an THREE.Object3D).
   *
   * @example
   *      
   *    // As array
   *    var mpolyA =  [
   *                    [[[102.0, 2.0], [103.0, 2.0], [103.0, 3.0], [102.0, 3.0], [102.0, 2.0]]],
   *                    [[[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]],
   *                     [[100.2, 0.2], [100.8, 0.2], [100.8, 0.8], [100.2, 0.8], [100.2, 0.2]]]
   *                  ];
   *    var mpolygonA = geoearth.addMultiPolygon(mpolyA);
   *
   *    // As geojson
   *    var mpolyB = {
   *                    "type": "FeatureCollection",
   *                    "features": [
   *                      { 
   *                        "type": "MultiPolygon",
   *                        "coordinates": [
   *                          [[[102.0, 2.0], [103.0, 2.0], [103.0, 3.0], [102.0, 3.0], [102.0, 2.0]]],
   *                          [[[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]],
   *                           [[100.2, 0.2], [100.8, 0.2], [100.8, 0.8], [100.2, 0.8], [100.2, 0.2]]]
   *                        ]
   *                      }
   *                    ]
   *                  }
   *    var mpolygonB = geoearth.addMultiPolygon(mpolyB);
   *
   */
  addMultiPolygon(input, opts) {

    var inLns = null;
    opts = opts || {};

    if (input.constructor === Array) {
      inLns = input;
    } else {
      inLns = input.geometry.coordinates;
    }

    inLns = JSON.parse(JSON.stringify(inLns));

    var polygons = new THREE.Object3D();

    for (let inPolyIdx = 0; inPolyIdx < inLns.length; inPolyIdx++) {

      var polygon = new THREE.Object3D();
      var shape = new THREE.Shape();
      var col = opts.color || 0xffffff
      var material = new THREE.MeshBasicMaterial({
        color: col,
        side: THREE.DoubleSide
      });

      for (let inLnsIdx = 0; inLnsIdx < inLns[inPolyIdx].length; inLnsIdx++) {

        var inPts = inLns[inPolyIdx][inLnsIdx];
        if (inPts.length < 3) throw ('Need at least 3 points for a ring in a polyline');
        var divs = 100;
        // var d = Math.sqrt(Math.pow(inPts[1][0] - inPts[0][0], 2) + Math.pow(inPts[1][0] - inPts[0][0], 2));
        // console.log(d);

        var pts = [];

        var idx = 1;
        while (idx < inPts.length) {
          var secondPt = inPts[idx];
          var firstPt = inPts[idx - 1];

          var deltaLng = (secondPt[0] - firstPt[0]) / divs;
          var deltaLat = (secondPt[1] - firstPt[1]) / divs;

          for (var j = 0; j < divs; j++) {
            pts.push([firstPt[0] + (j * deltaLng), firstPt[1] + (j * deltaLat)]);
          }
          idx++;
        }

        // if its the first ring make the shape
        if (inLnsIdx === 0) {

          // move shape cursor to first point
          var lng = pts[0][0];
          var lat = pts[0][1];
          shape.moveTo(lng, lat);

          // connect with lines to all successive pts
          var c = 1;
          do {
            var lng = pts[c][0];
            var lat = pts[c][1];
            shape.lineTo(lng, lat);
            c++;
          } while (c < pts.length)

        }
        // if not first ring add it as a hole
        else {

          var path = new THREE.Path();
          // move shape cursor to first point
          var lng = pts[0][0];
          var lat = pts[0][1];
          path.moveTo(lng, lat);

          // connect with lines to all successive pts
          var c = 1;
          do {
            var lng = pts[c][0];
            var lat = pts[c][1];
            path.lineTo(lng, lat);
            c++;
          } while (c < pts.length)

          shape.holes.push(path);

        }

      }

      // convert flat shape to polygon surface mapped to sphere
      var geometry = new THREE.ShapeBufferGeometry(shape);
      for (var i = 0; i < geometry.attributes.position.array.length; i += 3) {
        var phi = GeoEarth.latToSphericalCoords(geometry.attributes.position.array[i]);
        var theta = GeoEarth.lngToSphericalCoords(geometry.attributes.position.array[i + 1]);
        geometry.attributes.position.array[i] = this.earthRadius * Math.sin(phi) * Math.cos(theta);
        geometry.attributes.position.array[i + 1] = this.earthRadius * Math.cos(phi);
        geometry.attributes.position.array[i + 2] = this.earthRadius * Math.sin(phi) * Math.sin(theta);
      }
      geometry.computeVertexNormals();
      geometry.attributes.position.needsUpdate = true;
      var mesh = new THREE.Mesh(geometry, material);

      polygon.add(mesh);

      polygons.add(polygon)

    }

    var addedObj = this.addToActiveGeoJsons(polygons);

    return addedObj;
  }

  /**
   * Add the given geojson object to the map.
   * Currently supports only a single feature json containing Point, MultiPoint, Line or MultiLine.
   *
   * @param {Geojson} geoJson - Geojson object to be added.
   *
   * @example
   *
   *    var geoJson = {
   *                   "type": "Feature",
   *                   "geometry": {
   *                     "type": "Point",
   *                     "coordinates": [125.6, 10.1]
   *                   },
   *                   "properties": {
   *                     "name": "Dinagat Islands"
   *                   }
   *                 };
   *    geoearth.addGeoJson(geoJson);
   *
   */
  addGeoJson(geoJson) {

    switch (geoJson.type) {
      case "Feature": {
        var feat = this.addFeature(geoJson);
        this.scene.add(feat);
        break;
      }
      case "FeatureCollection": {
        var feat = this.addFeatureCollection(geoJson);
        this.scene.add(feat);
        break;
      }
      default: {
        throw (`Unknown geojson type: ${geoJson}`)
        break;
      }
    }
  }

  /**
   * Adds a given node in a geojson object and returns corresponding threejs object.
   * Currently supports only a single feature json containing Point, MultiPoint, Line or MultiLine.
   *
   * @param {Geojson} geoJsonNode - Geojson node to be parsed.
   *
   * @example
   *
   *    var node =   {
   *                   "type": "Feature",
   *                   "geometry": {
   *                     "type": "Point",
   *                     "coordinates": [125.6, 10.1]
   *                   },
   *                   "properties": {
   *                     "name": "Dinagat Islands"
   *                   }
   *                 };
   *    var threeJsObj = geoearth.addFeature(node);
   *
   */
  addFeature(node) {
    var ftType = node.geometry.type;
    var ret = null;
    switch (ftType) {
      case 'Point': {
        ret = this.addPoint(node, {
          color: 0xff0000
        });
        break;
      }
      case 'MultiPoint': {
        ret = this.addMultiPoint(node, {
          color: 0xababab
        });
        break;
      }
      case 'LineString': {
        ret = this.addLineString(node, {
          color: 0xff00f0
        });
        break;
      }
      case 'MultiLineString': {
        ret = this.addMultiLineString(node, {
          color: 0x0000ff
        });
        break;
      }
      case 'Polygon': {
        ret = this.addPolygon(node, {
          color: 0x0f0ff0
        });
        break;
      }
      case 'MultiPolygon': {
        ret = this.addMultiPolygon(node, {
          color: 0x000fff
        });
        break;
      }
      default: {
        console.log(`${ftType} type can not be parsed.`);
        ret = null;
        break;
      }
    }

    var addedObj = this.addToActiveGeoJsons(ret);

    return addedObj;
  }

  /**
   * Adds a given node in a geojson object and returns corresponding threejs object.
   *
   * @param {Geojson} geoJsonNode - Geojson node to be added.
   *
   * @example
   *
   *    var node =    {
   *                    "type": "FeatureCollection",
   *                    "features": [
   *                      { "type": "Feature",
   *                        "geometry": {"type": "Point", "coordinates": [102.0, 0.5]},
   *                        "properties": {"prop0": "value0"}
   *                        },
   *                      { "type": "Feature",
   *                        "geometry": {
   *                          "type": "LineString",
   *                          "coordinates": [
   *                            [102.0, 0.0], [103.0, 1.0], [104.0, 0.0], [105.0, 1.0]
   *                            ]
   *                          },
   *                        "properties": {
   *                          "prop0": "value0",
   *                          "prop1": 0.0
   *                          }
   *                        },
   *                      { "type": "Feature",
   *                         "geometry": {
   *                           "type": "Polygon",
   *                           "coordinates": [
   *                             [ [100.0, 0.0], [101.0, 0.0], [101.0, 1.0],
   *                               [100.0, 1.0], [100.0, 0.0] ]
   *                             ]
   *                  
   *                         },
   *                         "properties": {
   *                           "prop0": "value0",
   *                           "prop1": {"this": "that"}
   *                           }
   *                         }
   *                      ]
   *                    };
   *    var threeJsObj = geoearth.addFeatureCollection(node);
   *
   */
  addFeatureCollection(node) {
    var ftType = node.type;
    if (ftType !== "FeatureCollection") {
      throw (`Unexpected typ: '${ftType}'. Expected FeatureCollection`)
    }
    var ret = new THREE.Object3D();
    var feats = node.features;
    for (var i = 0; i < feats.length; i++) {
      var f = this.addFeature(feats[i]);
      if (f) ret.add(f);
    }

    var addedObj = this.addToActiveGeoJsons(ret);

    return addedObj;
  }


  addToActiveGeoJsons(threejsObj) {

    var id = (threejsObj && threejsObj.uuid) ? threejsObj.uuid : null;
    if (!id) return null;

    this.activeGeoJsons[id] = threejsObj;
    this.scene.add(threejsObj);
    return threejsObj;
  }




}