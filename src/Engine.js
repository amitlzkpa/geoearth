/**
  Construct a new Engine

  @class Engine
  @classdesc A generic Engine

  @param {Object} options - Options to initialize the Engine with.
  @param {String} options.name - This Engine's name, sets.
  @param {Boolean} options.visible - Whether this Engine is vislble.
*/
function Engine(options) {


  /**
    Whether this Engine is visible or not

    @type Boolean
    @default false
  */
  this.visible = options.visible;


  /**
    This Engine's name

    @type String
    @default "Engine"
    @readonly
  */
  Object.defineProperty(this, 'name', {
    value: options.name || 'Engine',
    writable: false
  });


  /**
   * Module to be loaded.
   *
   * @method
   * @name Engine#loadModule
   * @param {Object} module - Instance of module to be loaded.
   *
   */
  loadModule = function(module) {

  }


}