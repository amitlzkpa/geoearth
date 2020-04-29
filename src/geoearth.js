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

  dependencies = [
    "/js/three.min.js",
    "/js/TessellateModifier.js"
  ];

  isReady = false;
  sleepTime = 400;
  instance;
  opts;
  autoStart;
  earthRadius;
  srfOffset = 1.001;
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
  intersectionItems = [];




  constructor(container, opts) {


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

    var geometry = new THREE.SphereGeometry(this.earthRadius, 128, 128);

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

    var mousePosition = new THREE.Vector3(0, 0, 0.5);
    mousePosition.x = 2 * (event.clientX / this.w) - 1;
    mousePosition.y = 1 - 2 * (event.clientY / this.h);
    mousePosition.unproject(this.camera);

    var raycaster = new THREE.Raycaster(this.camera.position, mousePosition.sub(this.camera.position).normalize());
    var intersects = raycaster.intersectObjects(this.intersectionItems);
    for ( var i = 0; i < intersects.length; i++ ) {
      var o = intersects[i].object;
      console.log(o);
    }

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

   _       _                        _ 
  (_)     | |                      | |
   _ _ __ | |_ ___ _ __ _ __   __ _| |
  | | '_ \| __/ _ \ '__| '_ \ / _` | |
  | | | | | ||  __/ |  | | | | (_| | |
  |_|_| |_|\__\___|_|  |_| |_|\__,_|_|

  */
  
  // ref: https://bocoup.com/blog/learning-three-js-with-real-world-challenges-that-have-already-been-solved
  makeTextSprite(message, opts) {
    let parameters = opts || {};
    let fontface = parameters.fontface || 'Helvetica';
    let fontsize = parameters.fontsize || 40;
    let canvas = document.createElement('canvas');
    let context = canvas.getContext('2d');
    context.font = fontsize + "px " + fontface;

    // get size data (height depends only on font size)
    let metrics = context.measureText(message);
    let textWidth = metrics.width;

    // text color
    context.fillStyle = parameters.color || '#FFFFFF';
    context.fillText(message, 0, fontsize);

    // canvas contents will be used for a texture
    let texture = new THREE.Texture(canvas)
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    let spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        useScreenCoordinates: false
    });
    let sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(100, 50, 1.0);
    return sprite;
  }


  make3DShape(type, options) {
    let opts = options || {};
    let ret;
    switch(type) {
      case "cylinder": {
        let col = opts.color || 0xffffff;
        let rad = opts.size || 1;
        let dep = opts.depth || 1;
        let geometry = new THREE.CylinderGeometry(rad, rad, dep, 16);
        geometry.applyMatrix(new THREE.Matrix4().makeRotationX(THREE.Math.degToRad(90)));
        let material = new THREE.MeshBasicMaterial( {color: col} );
        let cylinderMesh = new THREE.Mesh(geometry, material);
        ret = cylinderMesh;
        break;
      }
      case "arrow-head": {
        let col = opts.color || 0xffffff;
        let size = opts.size || 1;
        let dep = opts.depth || 1;
        let arrowShape = new THREE.Shape();
        arrowShape.moveTo(-size, -size);
        arrowShape.lineTo(0, size * 2);
        arrowShape.lineTo(size, -size);
        arrowShape.lineTo(-size, -size);
        let extrudeSettings = {amount: dep, bevelEnabled: false};
        let geometry = new THREE.ExtrudeBufferGeometry(arrowShape, extrudeSettings);
        let material = new THREE.MeshBasicMaterial( {color: col} );
        let arrowHeadMesh = new THREE.Mesh( geometry, material );
        ret = arrowHeadMesh;
        break;
      }
      case "rectangle": {
        let col = opts.color || 0xffffff;
        let size = opts.size || 1;
        let dep = opts.depth || 1;
        let rectShape = new THREE.Shape();
        rectShape.moveTo(-size, -size);
        rectShape.lineTo(-size, size);
        rectShape.lineTo(size, size);
        rectShape.lineTo(size, -size);
        rectShape.lineTo(-size, -size);
        let extrudeSettings = {amount: dep, bevelEnabled: false};
        let geometry = new THREE.ExtrudeBufferGeometry(rectShape, extrudeSettings);
        let material = new THREE.MeshBasicMaterial( {color: col} );
        let rectMesh = new THREE.Mesh( geometry, material );
        ret = rectMesh;
        break;
      }
      default: {
        ret = null;
      }
    }
    return ret;
  }


  parseInputs(input, opts) {

    var opts = opts || input.properties || {};

    var color = 0xffffff;
    var size = 1;

    if (input.constructor === Array) {
      opts.geometry = input;
      opts.label = opts.label;
      opts.color = opts.color || color;
      opts.size = opts.size || size;
      opts.surfaceOffset = opts.surfaceOffset || 0;
      opts.note = opts.note || null;
    } else {
      opts.geometry = input.geometry.coordinates;
      opts.label = opts.label;
      opts.color = opts.color || color;
      opts.size = opts.size || size;
      opts.surfaceOffset = opts.surfaceOffset || 0;
      opts.note = opts.note || null;
    }

    return opts;

  }


  getSpacedPoints(inPts) {
    // var corr = 0;
    // var mul = 1;
    // var isCrossingDL = false;
    // // check if both points are on same east-west hemisphere
    // // if not check if they are crossing over from the dateline side
    // // TODO: right now only works for lines with 2 points
    // if (Math.sign(inPts[0][0]) !== Math.sign(inPts[1][0]) &&
    //   Math.abs(inPts[0][0]) > 90 && Math.abs(inPts[1][0]) > 90) {
    //   isCrossingDL = true;
    //   if (inPts[1][0] > inPts[0][0]) {
    //     var q = inPts[0];
    //     inPts[0] = inPts[1];
    //     inPts[1] = q;
    //   }
    // }
    // if (isCrossingDL) {
    //   corr = Math.abs(180 - inPts[0][0]) + 180;
    //   mul = -1;
    //   inPts[0][0] = 0;
    //   inPts[1][0] += corr;
    // }

    var pts = [];
    var idx = 1;
    while (idx < inPts.length) {
      var secondPt = inPts[idx];
      var firstPt = inPts[idx - 1];

      // TODO: use haversine distance for the length
      var d = Math.sqrt(Math.pow(secondPt[0] - firstPt[0], 2)
                      + Math.pow(secondPt[1] - firstPt[1], 2));
      var divs = Math.ceil(d * 8);

      var pt1, pt2, q1, q2, v, t, s;

      pt1 = GeoEarth.get3DPoint(firstPt[0], firstPt[1], 1);
      pt2 = GeoEarth.get3DPoint(secondPt[0], secondPt[1], 1);

      var refVec = pt1.clone();

      q1 = new THREE.Quaternion().setFromUnitVectors(refVec, pt1);
      q2 = new THREE.Quaternion().setFromUnitVectors(refVec, pt2);

      var tgtQt = new THREE.Quaternion();

      for (var j = 0; j < divs; j++) {
        t = j/divs;

        THREE.Quaternion.slerp(q1, q2, tgtQt, t);

        v = refVec.clone();
        v.applyQuaternion(tgtQt);

        s = new THREE.Spherical().setFromVector3(v);

        var lng = GeoEarth.xCoordToLng(s.theta);
        var lat = GeoEarth.yCoordToLat(s.phi);
        pts.push([lng, lat])

      }

      idx++;
    }

    return pts;
  }


  makeLineGeometry(pts, input, parsedData) {

    var ret = new THREE.Object3D();

    var linetype = (input.properties) ? input.properties.linetype : "line";

    switch(linetype) {
      case ("forward-arrows"): {
        let sz = parsedData.size || 1;
        let gap = sz * 10;
        let p1, pt1;
        let p2, pt2;
        let dir, nor, pl, coplPt2;
        let fwd = new THREE.Vector3();
        let qt = new THREE.Quaternion();
        let g;
        for(let i=0; i<pts.length-gap; i+=gap) {
          // read first point
          p1 = pts[i];
          pt1 = GeoEarth.get3DPoint(p1[0], p1[1], this.earthRadius * this.srfOffset);
          
          // read next point on curve
          p2 = pts[i + gap];
          pt2 = GeoEarth.get3DPoint(p2[0], p2[1], this.earthRadius * this.srfOffset);

          // normal at first point
          nor = pt1.clone();
          nor.normalize();

          // build a plane at first point and get the seocnd point on this plane
          pl = new THREE.Plane().setFromNormalAndCoplanarPoint(nor, pt1);
          coplPt2 = new THREE.Vector3();
          pl.projectPoint(pt2, coplPt2);
          
          // build vector between the 2; this will be the vector to orient in
          dir = new THREE.Vector3().subVectors(pt1, coplPt2);
          dir.normalize();

          // build the gemetry and make it face tangential to the earth's sphere
          g = this.make3DShape("arrow-head", parsedData);
          g.position.set(pt1.x, pt1.y, pt1.z);
          g.lookAt(new THREE.Vector3().addVectors(pt1, nor));
          
          // extract forward vector from the geometry
          g.getWorldQuaternion(qt);
          fwd.copy(g.up.clone().negate()).applyQuaternion(qt);
          fwd.normalize();

          // reoirent the shape to face the vector between the first second pts
          qt.setFromUnitVectors(fwd, dir);
          g.applyQuaternion(qt);

          ret.add(g);
        }
        break;
      }
      case ("dashed"): {
        let sz = parsedData.size || 1;
        let gap = sz * 10;
        let p1, pt1;
        let p2, pt2;
        let dir, nor, pl, coplPt2;
        let fwd = new THREE.Vector3();
        let qt = new THREE.Quaternion();
        let g;
        for(let i=0; i<pts.length-gap; i+=gap) {
          // read first point
          p1 = pts[i];
          pt1 = GeoEarth.get3DPoint(p1[0], p1[1], this.earthRadius * this.srfOffset);
          
          // read next point on curve
          p2 = pts[i + gap];
          pt2 = GeoEarth.get3DPoint(p2[0], p2[1], this.earthRadius * this.srfOffset);

          // normal at first point
          nor = pt1.clone();
          nor.normalize();

          // build a plane at first point and get the seocnd point on this plane
          pl = new THREE.Plane().setFromNormalAndCoplanarPoint(nor, pt1);
          coplPt2 = new THREE.Vector3();
          pl.projectPoint(pt2, coplPt2);
          
          // build vector between the 2; this will be the vector to orient in
          dir = new THREE.Vector3().subVectors(pt1, coplPt2);
          dir.normalize();

          // build the gemetry and make it face tangential to the earth's sphere
          g = this.make3DShape("rectangle", parsedData);
          g.position.set(pt1.x, pt1.y, pt1.z);
          g.lookAt(new THREE.Vector3().addVectors(pt1, nor));
          
          // extract forward vector from the geometry
          g.getWorldQuaternion(qt);
          fwd.copy(g.up.clone().negate()).applyQuaternion(qt);
          fwd.normalize();

          // reoirent the shape to face the vector between the first second pts
          qt.setFromUnitVectors(fwd, dir);
          g.applyQuaternion(qt);

          ret.add(g);
        }
        break;
      }
      case ("dotted"): {
        let sz = parsedData.size || 1;
        let gap = sz * 10;
        let p, pt;
        let g;
        for(let i=0; i<pts.length-gap; i+=gap) {
          p = pts[i];
          pt = GeoEarth.get3DPoint(p[0], p[1], this.earthRadius * this.srfOffset);
          g = this.make3DShape("cylinder", parsedData);
          g.position.set(pt.x, pt.y, pt.z);
          g.up = new THREE.Vector3(1,0,0);
          g.lookAt(new THREE.Vector3());
          ret.add(g);
        }
        break;
      }
      default: {
    
        var material = new THREE.LineBasicMaterial({
          color: parsedData.color
        });
        var c = 0;
        var geometry = new THREE.Geometry();
        var pt;
        do {
          pt = GeoEarth.get3DPoint(pts[c][0], pts[c][1], this.earthRadius * this.srfOffset);
          geometry.vertices.push(pt);
          c++;
        } while (c < pts.length)
    
        var line = new THREE.Line(geometry, material);
        
        ret.add(line);

        break;
      }
    }

    return ret;

  }



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
    return ((90 - lat) / 180) * Math.PI;
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
    return ((180 - lng) / 180) * Math.PI;
  }


  /**
   * Method to convert spherical X coordinate on the globe's surface to longitude.
   *
   * @param {float} val - X coordinate in radians on the globe's surface.
   * @return {float} Longitude in decimal geographic coordinates.
   *
   * @example
   *
   *     xCoordToLng(0.2809);
   *
   */
  static xCoordToLng(val) {
    return ((val / Math.PI) * 180) - 90;
  }

  /**
   * Method to convert Y spherical coordinate on the globe's surface to latitude.
   *
   * @param {float} val - Y coordinate in radians on the globe's surface.
   * @return {float} Latitude in decimal geographic coordinates.
   *
   * @example
   *
   *     yCoordToLat(0.6552);
   *
   */
  static yCoordToLat(val) {
    return ((val / Math.PI) * 180) + 90;
  }


  /**
   * Method to convert longitude, latitude to 3D coordinates for given radius.
   *
   * @param {float} lng - Longitude in decimal coordinates.
   * @param {float} lat - Latitude in decimal coordinates.
   * @param {float} radius - Radius to use for conversion (default=6371).
   *
   * @example
   *
   *     get3DPoint(20, 30);
   *
   */
  static get3DPoint(lng, lat, radius = 6371) {
    let phi = GeoEarth.latToSphericalCoords(lat);
    let theta = GeoEarth.lngToSphericalCoords(lng);
    let pt = new THREE.Vector3();
    pt.x = radius * Math.sin(phi) * Math.cos(theta);
    pt.y = radius * Math.cos(phi);
    pt.z = radius * Math.sin(phi) * Math.sin(theta);
    return pt;
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
  static getHaversineDistance(p1, p2, radius = 6371) {

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


  static parseDown(threejsObj, collected) {
    
    if (threejsObj.type === "Mesh") {
      collected.push(threejsObj);
      return
    }
    if (!threejsObj || threejsObj.children.length < 1) {
      return
    }
    for(var i=0; i<threejsObj.children.length; i++) {
      GeoEarth.parseDown(threejsObj.children[i], collected);
    }
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
     Adds an array or geojson object representing a single point to a threejs 3D object.
     Awaits till the instance is ready to be worked with.
    
     @param {geojson} input - An array or geojson object representing a point on the map.
     @param {Object} opts - An object containing configuration parameters.
                            'color': Color for the mesh (default: 0xffff00).
                            'size': Size for the mesh (default: 2).
     @return {THREE.Mesh} A threejs 3D object (as a sphere).
    
     @example
          
        // Add point as array
        var ptA = [-50.00, 40.00];
        var pointA = await geoearth.addPoint(ptA, {label: 'abc'});
    
        // Add point as geojson
        var ptB =  {
                      "type": "Feature",
                      "geometry": {
                        "type": "Point",
                        "coordinates": [-40.00, 40.00]
                      },
                      "properties": {
                        "label": "def",
                        "color": "#FF0000",
                        "size": 1,
                        "surfaceOffset": 1
                      }
                    };
        var pointB = await geoearth.addPoint(ptB);
    
   */
  async addPoint(input, opts) {

    while (!this.isReady) {
      await this.wait(this.sleepTime);
      if(!this.isReady) return;
    }

    var parsedData = this.parseInputs(input, opts);

    var coords = JSON.parse(JSON.stringify(parsedData.geometry));

    var geometry = new THREE.SphereGeometry(parsedData.size, 8, 8);
    var material = new THREE.MeshBasicMaterial({
      color: parsedData.color
    });
    var geomContainer = new THREE.Object3D();

    var lng = coords[0];
    var lat = coords[1];

    var point = new THREE.Mesh(geometry, material);
    var pt = GeoEarth.get3DPoint(lng, lat, (this.earthRadius * this.srfOffset) + parsedData.surfaceOffset);
    point.position.x = pt.x;
    point.position.y = pt.y;
    point.position.z = pt.z;
    geomContainer.add(point);

    geomContainer.userData = parsedData;

    var center = point.position.clone();

    if (parsedData.label) {
      var labelGeom = this.makeTextSprite(parsedData.label);
      labelGeom.position.set(center.x, center.y, center.z);
      geomContainer.add(labelGeom);
    }
    
    var addedObj = this.registerAndAddToScene(geomContainer);

    return addedObj;
  }

  /**
     Adds an array or geojson object representing a multiple points to a threejs 3D object.
     Awaits till the instance is ready to be worked with.
    
     @param {geojson} input - An array or geojson object representing multiple points on the map.
     @param {Object} opts - An object containing configuration parameters.
                            'color': Color for the mesh (default: 0xffff00).
                            'size': Size for the mesh (default: 2).
     @return {THREE.Object3D} A threejs 3D object (as a collection of spheres inside an THREE.Object3D).
    
     @example
          
        // Add multipoint as array
        var mptA = [ [-60.00, 30.00], [-50.00, 30.00], [-40.00, 30.00], [-30.00, 30.00] ];
        var mpointA = await geoearth.addMultiPoint(mptA, {label: "ghi"});
        
        // Add multipoint as geojson
        var mptB =  {
                      "type": "Feature",
                      "geometry": {
                        "type": "MultiPoint",
                        "coordinates": [
                          [-70.00, 20.00],
                          [-60.00, 20.00],
                          [-50.00, 20.00],
                          [-40.00, 20.00],
                          [-30.00, 20.00],
                          [-20.00, 20.00]
                        ]
                      },
                      "properties": {
                        "label": "jkl",
                        "color": "#FF0000",
                        "size": 1,
                        "surfaceOffset": 1
                      }
                    };
        var mpointB = await geoearth.addMultiPoint(mptB);
    
   */
  async addMultiPoint(input, opts) {

    while (!this.isReady) {
      await this.wait(this.sleepTime);
      if(!this.isReady) return;
    }

    var parsedData = this.parseInputs(input, opts);

    var coords = JSON.parse(JSON.stringify(parsedData.geometry));

    var points = new THREE.Object3D();
    var totLng = 0;
    var totLat = 0;
    var lng, lat;

    for (var ptIdx = 0; ptIdx < coords.length; ptIdx++) {
      lng = coords[ptIdx][0];
      lat = coords[ptIdx][1];
      // compute total to get average for the center later
      totLng += lng;
      totLat += lat;

      var geometry = new THREE.SphereGeometry(parsedData.size, 8, 8);
      var material = new THREE.MeshBasicMaterial({
        color: parsedData.color
      });
      var point = new THREE.Mesh(geometry, material);

      var pt = GeoEarth.get3DPoint(lng, lat, (this.earthRadius * this.srfOffset) + parsedData.surfaceOffset);
      point.position.x = pt.x;
      point.position.y = pt.y;
      point.position.z = pt.z;

      points.add(point);
    }
    var geomContainer = new THREE.Object3D();
    geomContainer.add(points);

    geomContainer.userData = parsedData;

    var cntLng = totLng / coords.length;
    var cntLat = totLat / coords.length;
    var phi = GeoEarth.latToSphericalCoords(cntLat);
    var theta = GeoEarth.lngToSphericalCoords(cntLng);

    var center = new THREE.Vector3();
    center.x = this.earthRadius * Math.sin(phi) * Math.cos(theta);
    center.y = this.earthRadius * Math.cos(phi);
    center.z = this.earthRadius * Math.sin(phi) * Math.sin(theta);
    
    if (parsedData.label) {
      var labelGeom = this.makeTextSprite(parsedData.label);
      labelGeom.position.set(center.x, center.y, center.z);
      geomContainer.add(labelGeom);
    }

    var addedObj = this.registerAndAddToScene(geomContainer);

    return addedObj;
  }

  /**
     Adds an array or geojson object representing a single line to a threejs 3D line.
     Awaits till the instance is ready to be worked with.
    
     @param {geojson} input - An array or geojson object representing a line on the map.
     @param {Object} opts - An object containing configuration parameters.
                            'color': Color for the line (default: 0xffffff).
     @return {THREE.Line} A threejs 3D line.
    
     @example
     
        // Add line as array
        var lnA = [ [-60.00, 0.00], [-20.00, 0.00] ];
        var lineA = await geoearth.addLineString(lnA);
    
        // Add line as geojson
        // Add styles by specifying linetype property (dotted/dashed/forward-arrows)
        var lnB = {
                    "type": "Feature",
                    "properties": {
                      "linetype": "forward-arrows",
                      "color": "#FF0000",
                      "size": 3,
                      "depth": 0.3,
                      "surfaceOffset": 1
                    },
                    "geometry": {
                      "type": "LineString",
                      "coordinates": [ [-40.00, 20.00], [-40.00, -20.00] ]
                    }
                  };
        var lineB = await geoearth.addLineString(lnB);
    
   */
  async addLineString(input, opts) {

    while (!this.isReady) {
      await this.wait(this.sleepTime);
      if(!this.isReady) return;
    }

    var parsedData = this.parseInputs(input, opts);
    
    var inPts = JSON.parse(JSON.stringify(parsedData.geometry));

    if (inPts.length < 2) throw ('Need at least 2 points for a line');

    var pts = this.getSpacedPoints(inPts);

    var line = this.makeLineGeometry(pts, input, parsedData);

    var geomContainer = new THREE.Object3D();
    geomContainer.add(line);
    
    geomContainer.userData = parsedData;

    var addedObj = this.registerAndAddToScene(geomContainer);

    return addedObj;
  }

  /**
     Adds an array or geojson object representing multiple lines to threejs 3D lines.
     Awaits till the instance is ready to be worked with.
    
     @param {geojson} input - An array or geojson object representing multiple lines on the map.
     @param {Object} opts - An object containing configuration parameters.
                            'color': Color for the line (default: 0xffffff).
     @return {THREE.Object3D} A threejs 3D object (as a collection of lines inside an THREE.Object3D).
    
     @example
          
        // Add multiline as array
        var lnsA = [ [ [10.00, 30.00], [30.00, 10.00] ], [ [30.00, 10.00], [10.00, -10.00], [30.00, -30.00] ] ];
        var linesA = await geoearth.addMultiLineString(lnsA);
        
        // Add multiline as geojson
        // Add styles by specifying linetype property (dotted/dashed/forward-arrows)
        var lnsB = {
                    "type": "Feature",
                    "properties": {
                      "linetype": "forward-arrows",
                      "color": "#FF0000",
                      "size": 3,
                      "depth": 0.3,
                      "surfaceOffset": 1
                    },
                    "geometry": {
                      "type": "MultiLineString",
                      "coordinates": [ [ [60.00, 30.00], [40.00, 10.00] ], [ [40.00, 10.00], [60.00, -10.00], [40.00, -30.00] ] ]
                    }
                  };
        var linesB = await geoearth.addMultiLineString(lnsB);
    
   */
  async addMultiLineString(input, opts) {

    while (!this.isReady) {
      await this.wait(this.sleepTime);
      if(!this.isReady) return;
    }

    var parsedData = this.parseInputs(input, opts);

    var inLns = JSON.parse(JSON.stringify(parsedData.geometry));

    var lines = new THREE.Object3D();

    for (let inLnsIdx = 0; inLnsIdx < inLns.length; inLnsIdx++) {

      var inPts = inLns[inLnsIdx];
      if (inPts.length < 2) throw ('Need at least 2 points for a line');
      var divs = 100;
      // var d = Math.sqrt(Math.pow(inPts[1][0] - inPts[0][0], 2) + Math.pow(inPts[1][0] - inPts[0][0], 2));
      // console.log(d);

      var pts = this.getSpacedPoints(inPts);

      var line = this.makeLineGeometry(pts, input, parsedData);
      lines.add(line);
    }

    var geomContainer = new THREE.Object3D();
    geomContainer.add(lines);
    
    geomContainer.userData = parsedData;
    
    var addedObj = this.registerAndAddToScene(geomContainer);

    return addedObj;
  }

  /**
     Adds an array or geojson object representing a single polygon to a threejs 3D object.
     Awaits till the instance is ready to be worked with.
    
     @param {geojson} input - An array or geojson object representing a polygon on the map.
     @param {Object} opts - An object containing configuration parameters.
                            'color': Color for the line (default: 0xffffff).
     @return {THREE.Object3D} A threejs 3D object.
    
     @example
        
        // Add polygon as array
        var plA = [[[0.00,-20.00],[10.00,-20.00],[10.00,20.00],[0.00,20.00]]];
        var polyA = await geoearth.addPolygon(plA, {label: "pqr"});
    
        // Add polygon as geojson
        var plB = {
                    "type": "Feature",
                    "geometry": {
                      "type": "Polygon", 
                      "coordinates": [[[20.00,-10.00],[40.00,-10.00],[40.00,10.00],[20.00,10.00]]]
                    },
                    "properties": {
                      "label": "jkl",
                      "color": "#FF0000",
                      "surfaceOffset": 1
                    }
                  };
        var polyB = await geoearth.addPolygon(plB);
    
   */
  async addPolygon(input, opts) {

    while (!this.isReady) {
      await this.wait(this.sleepTime);
      if(!this.isReady) return;
    }

    var parsedData = this.parseInputs(input, opts);

    var inLns = JSON.parse(JSON.stringify(parsedData.geometry));

    var polygon = new THREE.Object3D();
    var shape = new THREE.Shape();
    var material = new THREE.MeshBasicMaterial({
      color: parsedData.color,
      side: THREE.DoubleSide,
      // wireframe: true
    });

    var totLng = 0;
    var totLat = 0;
    var totPts = 0;

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
        // we flip lng, lat here to match with X, Y
        shape.moveTo(lat, lng);

        // connect with lines to all successive pts
        var c = 1;
        do {
          var lng = pts[c][0];
          var lat = pts[c][1];
          // we flip lng, lat here to match with X, Y
          shape.lineTo(lat, lng);
          // compute total to get average for the center later
          totLng += lng;
          totLat += lat;
          totPts++;
          c++;
        } while (c < pts.length)

      }
      // if not first ring add it as a hole
      else {

        var path = new THREE.Path();
        // move shape cursor to first point
        var lng = pts[0][0];
        var lat = pts[0][1];
        // we flip lng, lat here to match with X, Y
        path.moveTo(lat, lng);

        // connect with lines to all successive pts
        var c = 1;
        do {
          var lng = pts[c][0];
          var lat = pts[c][1];
          // we flip lng, lat here to match with X, Y
          path.lineTo(lat, lng);
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

    var pt;
    var lng, lat;
    for (var i = 0; i < fineGeometry.attributes.position.array.length; i += 3) {
      lng = fineGeometry.attributes.position.array[i + 1];
      lat = fineGeometry.attributes.position.array[i];
      pt = GeoEarth.get3DPoint(lng, lat, (this.earthRadius * this.srfOffset) + parsedData.surfaceOffset);
      fineGeometry.attributes.position.array[i] = pt.x;
      fineGeometry.attributes.position.array[i + 1] = pt.y;
      fineGeometry.attributes.position.array[i + 2] = pt.z;
    }
    fineGeometry.computeVertexNormals();
    fineGeometry.attributes.position.needsUpdate = true;
    var mesh = new THREE.Mesh(fineGeometry, material);

    polygon.add(mesh);

    var geomContainer = new THREE.Object3D();
    geomContainer.add(polygon);

    geomContainer.userData = parsedData;

    var cntLng = totLng / totPts;
    var cntLat = totLat / totPts;

    var center = GeoEarth.get3DPoint(cntLng, cntLat, (this.earthRadius * this.srfOffset) + parsedData.surfaceOffset);
    
    if (parsedData.label) {
      var labelGeom = this.makeTextSprite(parsedData.label);
      labelGeom.position.set(center.x, center.y, center.z);
      geomContainer.add(labelGeom);
    }
    var addedObj = this.registerAndAddToScene(geomContainer);    

    return addedObj;
  }

  /**
     Adds an array or geojson object representing multiple polygons to threejs 3D multiple polygons.
     Awaits till the instance is ready to be worked with.
    
     @param {geojson} input - An array or geojson object representing multiple polygons on the map.
     @param {Object} opts - An object containing configuration parameters.
                            'color': Color for the polygon (default: 0xffffff).
     @return {THREE.Object3D} A threejs 3D object (as a collection of polygons inside an THREE.Object3D).
    
     @example
          
        // Add multipolygon as array
        var mpolyA =  [
                        [
                          [ [50.00,-30.00],[80.00,-30.00],[80.00,30.00],[50.00,30.00] ],
                          [ [55.00,25.00],[75.00,25.00],[75.00,-25.00],[55.00,-25.00] ]
                        ],
                        [
                          [ [90.00,-20.00],[120.00,-20.00],[120.00,20.00],[90.00,20.00] ]
                        ]
                      ];
        var mpolygonA = await geoearth.addMultiPolygon(mpolyA, {label: "uvq"});

        // Add multipolygon as geojson
        var mpolyB = {
                        "type": "Feature",
                        "geometry": {
                          "type": "MultiPolygon", 
                          "coordinates":  [
                                            [
                                              [ [130.00,20.00],[160.00,20.00],[160.00,-10.00] ],
                                              [ [155.00,1.00],[155.00,16.00],[140.00,16.00] ]
                                            ],
                                            [
                                              [ [130.00,10.00],[130.00,-20.00],[160.00,-20.00] ]
                                            ]
                                          ]
                        },
                        "properties": {
                          "label": "xyz",
                          "color": "#FF0000",
                          "surfaceOffset": 1
                        }
                      };
        var mpolygonB = await geoearth.addMultiPolygon(mpolyB);
    
   */
  async addMultiPolygon(input, opts) {

    while (!this.isReady) {
      await this.wait(this.sleepTime);
      if(!this.isReady) return;
    }

    var parsedData = this.parseInputs(input, opts);

    var inLns = JSON.parse(JSON.stringify(parsedData.geometry));

    var polygons = new THREE.Object3D();

    var totLng = 0;
    var totLat = 0;
    var totPts = 0;

    for (let inPolyIdx = 0; inPolyIdx < inLns.length; inPolyIdx++) {

      var polygon = new THREE.Object3D();
      var shape = new THREE.Shape();
      var material = new THREE.MeshBasicMaterial({
        color: parsedData.color,
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
          // we flip lng, lat here to match with X, Y
          shape.moveTo(lat, lng);

          // connect with lines to all successive pts
          var c = 1;
          do {
            var lng = pts[c][0];
            var lat = pts[c][1];
            // we flip lng, lat here to match with X, Y
            shape.lineTo(lat, lng);
            // compute total to get average for the center later
            totLng += lng;
            totLat += lat;
            totPts++;
            c++;
          } while (c < pts.length)

        }
        // if not first ring add it as a hole
        else {

          var path = new THREE.Path();
          // move shape cursor to first point
          var lng = pts[0][0];
          var lat = pts[0][1];
          // we flip lng, lat here to match with X, Y
          path.moveTo(lat, lng);

          // connect with lines to all successive pts
          var c = 1;
          do {
            var lng = pts[c][0];
            var lat = pts[c][1];
            // we flip lng, lat here to match with X, Y
            path.lineTo(lat, lng);
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

      var lng, lat, pt;
      for (var i = 0; i < fineGeometry.attributes.position.array.length; i += 3) {
        lng = fineGeometry.attributes.position.array[i + 1];
        lat = fineGeometry.attributes.position.array[i];
        pt = GeoEarth.get3DPoint(lng, lat, (this.earthRadius * this.srfOffset) + parsedData.surfaceOffset);
        fineGeometry.attributes.position.array[i] = pt.x;
        fineGeometry.attributes.position.array[i + 1] = pt.y;
        fineGeometry.attributes.position.array[i + 2] = pt.z;
      }
      fineGeometry.computeVertexNormals();
      fineGeometry.attributes.position.needsUpdate = true;
      var mesh = new THREE.Mesh(fineGeometry, material);

      polygon.add(mesh);

      polygons.add(polygon)

    }

    var geomContainer = new THREE.Object3D();
    geomContainer.add(polygons);

    geomContainer.userData = parsedData;

    var cntLng = totLng / totPts;
    var cntLat = totLat / totPts;
    var center = GeoEarth.get3DPoint(cntLng, cntLat, (this.earthRadius * this.srfOffset) + parsedData.surfaceOffset);

    if (parsedData.label) {
      var labelGeom = this.makeTextSprite(parsedData.label);
      labelGeom.position.set(center.x, center.y, center.z);
      geomContainer.add(labelGeom);
    }

    var addedObj = this.registerAndAddToScene(geomContainer);

    return addedObj;
  }




  /**
     Add the given geojson object to the map.
     Currently supports only a single feature json containing Point, MultiPoint, Line or MultiLine.
     Awaits till the instance is ready to be worked with.
    
     @param {Geojson} geoJson - Geojson object to be added.
    
     @example
    
        var gj =    {
                        "type": "FeatureCollection",
                        "features": [
                            { 
                                "type": "Feature",
                                "geometry": {
                                    "type": "Point",
                                    "coordinates": [0.00, 90.00]
                                }
                            },
                            { 
                                "type": "Feature",
                                "geometry": {
                                    "type": "Point",
                                    "coordinates": [0.00, -90.00]
                                }
                            },
                        ]
                    };
        var geoJson = await geoearth.addGeoJson(gj);
    
   */
  async addGeoJson(geoJson, options) {

    while (!this.isReady) {
      await this.wait(this.sleepTime);
      if(!this.isReady) return;
    }

    var ret;
    
    switch (geoJson.type) {
      case "Feature": {
        ret = await this.addFeature(geoJson, options);
        break;
      }
      case "FeatureCollection": {
        ret = await this.addFeatureCollection(geoJson, options);
        break;
      }
      default: {
        throw (`Unknown geojson type: ${geoJson}`)
        break;
      }
    }

    return ret;
  }

  /**
     Adds a given node in a geojson object and returns corresponding threejs object.
     Awaits till the instance is ready to be worked with.
    
     @param {Geojson} geoJsonNode - Geojson node to be parsed.
    
     @example
    
        var ft = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [180.00, 0.00]
                    },
                    "properties": {
                        "name": "Dinagat Islands"
                    }
                 };
        var feature = await geoearth.addFeature(ft);
    
   */
  async addFeature(node, options) {

    while (!this.isReady) {
      await this.wait(this.sleepTime);
      if(!this.isReady) return;
    }

    var ftType = node.geometry.type;
    var ret = null;
    switch (ftType) {
      case 'Point': {
        ret = await this.addPoint(node, options);
        break;
      }
      case 'MultiPoint': {
        ret = await this.addMultiPoint(node, options);
        break;
      }
      case 'LineString': {
        ret = await this.addLineString(node, options);
        break;
      }
      case 'MultiLineString': {
        ret = await this.addMultiLineString(node, options);
        break;
      }
      case 'Polygon': {
        ret = await this.addPolygon(node, options);
        break;
      }
      case 'MultiPolygon': {
        ret = await this.addMultiPolygon(node, options);
        break;
      }
      default: {
        console.log(`${ftType} type can not be parsed.`);
        ret = null;
        break;
      }
    }

    return ret;
  }

  /**
     Adds a given node in a geojson object and returns a list of corresponding threejs object.
     Awaits till the instance is ready to be worked with.
    
     @param {Geojson} geoJsonNode - Geojson node to be added.
    
     @example
    
        var ftColl =    {
                            "type": "FeatureCollection",
                            "features": [
                                { 
                                    "type": "Feature",
                                    "geometry": {
                                        "type": "Point",
                                        "coordinates": [0.00, 0.00]
                                    },
                                    "properties": {
                                        "prop0": "value0"
                                    }
                                },
                                { 
                                    "type": "Feature",
                                    "geometry": {
                                        "type": "LineString",
                                        "coordinates": [
                                            [-20.00, 20.00], [-20.00, -20.00]
                                        ]
                                    },
                                    "properties": {
                                        "prop0": "value0",
                                        "prop1": 0.0
                                    }
                                },
                                { 
                                    "type": "Feature",
                                    "geometry": {
                                        "type": "Polygon",
                                        "coordinates": [
                                            [
                                                [20.00, -10.00], [40.00, -10.00], [40.00, 10.00], [20.00, 10.00]
                                            ]
                                        ]
                                    },
                                    "properties": {
                                        "prop0": "value0",
                                        "prop1": { "this": "that" }
                                    }
                                }
                            ]
                        };
    
   */
  async addFeatureCollection(node, options) {

    while (!this.isReady) {
      await this.wait(this.sleepTime);
      if(!this.isReady) return;
    }

    var ftType = node.type;
    if (ftType !== "FeatureCollection") {
      throw (`Unexpected typ: '${ftType}'. Expected FeatureCollection`)
    }
    var ret = [];
    var feats = node.features;
    for (var i = 0; i < feats.length; i++) {
      var f = await this.addFeature(feats[i], options);
      if (f) ret.push(f);
    }

    return ret;
  }



  
  registerAndAddToScene(threejsObj) {
    var id = (threejsObj && threejsObj.uuid) ? threejsObj.uuid : null;
    if (!id) {
      throw `Invalid object UUID: ${id}`
    }

    var meshes = [];
    GeoEarth.parseDown(threejsObj, meshes);
    this.intersectionItems = this.intersectionItems.concat(...meshes);

    this.activeGeoJsons[id] = threejsObj;
    this.scene.add(threejsObj);

    return threejsObj;
  }


}