/**
 * fsStore - Simple file system based storage system.
 * Typically used for configurations or data logging.
 *
 * Copyright (c) 2010 Pierre Curto
 * MIT Licensed
 */

/**
 * Module dependencies
 */
var fs = require('fs')
  , path = require('path')
  , async = require('async');

/**
 * Load file formats
 */
var formatsPrefix = 'wrapper_'
  , formatsDir = __dirname + '/formats'
  , formats = {};

fs.readdirSync(formatsDir)
  .filter(function(file) {
     return new RegExp('^'+formatsPrefix+'.*\.js$').test(file);
   })
  .forEach(function(file) {
     var format = file.substr(formatsPrefix.length, file.lastIndexOf('.') - formatsPrefix.length);
     
     formats[format] = require(formatsDir + '/' + file);
   });

exports = module.exports = fsStore;
exports.version = '0.2.0';
exports.formats = formats;

/**
 * fsStore module definition
 *
 * @param {Object} options { dirmod: {Integer}, root: {String} }
 * @api public
 */
function fsStore(options) {
  if(!options) {
    throw new Error('fsStore: No options set');
  }
  if(!options.root) {
    throw new Error('fsStore: Root directory not set');
  }
  
  // Check the root directory
  var root = path.normalize(options.root);
  if(!path.existsSync(root)) {
    // Create the directory
    fs.mkdirSync(root, options.dirmod || 16877);
  }
  var rootStats = fs.statSync(root);
  if(!rootStats || !rootStats.isDirectory()) {
    throw new Error('fsStore: ' + root + ' unreadable or not a directory');
  }
  // Strip trailing /
  this.root = root.substr(-1) == '/'
                ? chop(root)
                : root;
  
  // Set the options
  var defaultOptions = {
    backup: true
  , backupSuffix: '_'
  , dirmod: rootStats.mode
  };
  this.defaultOptions = defaultOptions;
  this.options = options;
  Object.keys(this.defaultOptions).forEach(function(key) {
    if(!options.hasOwnProperty(key)) {
      options[key] = defaultOptions[key];
    }
  });
  // Lock by id {Array} [ {Array} [ {Function} method callback, {Function} callback ] ]
  this.lock = {};
  // Initialize
  this.clear();
};
/**
 * Remove last character of a string
 *
 * @param {String} string
 * @return {String} chopped string
 * @api private
 */
function chop(s) {
  return s.substr(0, s.length-1);
}
/**
 * Normalize an id
 *
 * @param {String} id
 * @return {String} normalized path (deals with //, .. etc)
 * @api private
 */
function normalize(id) {
  return path.normalize('/'+id);
}
/**
 * Check if the id is the root dir
 *
 * @param {String} id
 * @return {Boolean} true if id is /
 * @api private
 */
function isRoot(id) {
  return (id.length == 1);
}
/**
 * Get the id extension
 *
 * @param {String} id
 * @return {String} extension
 * @api private
 */
function getExtension(id) {
  var i = id.lastIndexOf('.');
  return i < 0? '': id.substr(i+1);
}
/**
 * Get the parent id
 *
 * @param {String} id
 * @return {String} parent id
 * @api private
 */
function parentId(id) {
  return id.substr(-1) == '/'
           ? id.substr(0, chop(id).lastIndexOf('/') + 1)
           : id.substr(0, id.lastIndexOf('/') + 1);
}
/**
 * Get the directory depth
 *
 * @param {String} id
 * @return {Integer} directory level
 * @api private
 */
function getDepth(id) {
  var n = 0, i = 0, iNum = id.length-1;
  while(i < iNum) { if(id.charAt(i++) == '/') { n++; } }
  return n;
}
/**
 * Add an item to memory
 *
 * @param {String} id
 * @param {Object} data
 * @api private
 */
function addItem(id, obj) {
  var parent = parentId(id);
  
  if(!this.data.hasOwnProperty(id)) { this._length++; }
  this.data[id] = obj;
  // Add to parent if already loaded
  if(this.data.hasOwnProperty(parent)) {
    if(this.data[parent].indexOf(id) < 0) { this.data[parent].push(id); }
  }
}
/**
 * Remove an item from memory
 *
 * @param {String} id
 * @api private
 */
function delItem(id) {
  if(this.data.hasOwnProperty(id)) {
    this._length--;
    delete this.data[id];
    // Remove reference in parent, if any
    var parent = parentId(id);
    if(this.data.hasOwnProperty(parent)) {
      var i = this.data[parent].indexOf(id);
      if(i >= 0) { this.data[parent].splice(i, 1); }
    }
  }
}
/**
 * Add a directory to memory
 *
 * @param {String} id
 * @param {Array} content
 * @api private
 */
function addDir(id, content) {
  this.data[id] = content;
  if(isRoot(id)) { return; }
  // Add to parent if already loaded
  var parent = parentId(id);
  
  if(this.data.hasOwnProperty(parent)) {
    if(this.data[parent].indexOf(id) < 0) { this.data[parent].push(id); }
  }
}
/**
 * Remove a directory from memory
 *
 * @param {String} id
 * @api private
 */
function delDir(id) {
  if(this.data.hasOwnProperty(id)) {
    delete this.data[id];
    if(isRoot(id)) { return; }
    // Remove reference in parent, if any
    var parent = parentId(id);
    if(this.data.hasOwnProperty(parent)) {
      var i = this.data[parent].indexOf(id);
      if(i >= 0) { this.data[parent].splice(i, 1); }
    }
  }
}
/**
 * Initialize a read method, locking the processed id or adding it to the queue or last method callback list
 *
 * @param {String} id
 * @param {Function} method callback
 * @param {Function} callback to be run
 * @api private
 */
function initMethod(id, callback, mcallback) {
  var item = callback? [ mcallback, callback ]: [ mcallback ];
  
//console.log('<<< ->', id, '=>', this.lock)
  // Add the method to the queue or create the queue and execute the method
  this.lock.hasOwnProperty(id)
    ? this.lock[id].push(item)
    : (this.lock[id] = [item], mcallback());
//console.log('<<< <-', id, '=>', this.lock)
}
/**
 * Run all callbacks for a lock. Last argument is the id to be processed
 *
 * @api private
 */
function methodCallback() {
  var args = arguments
    , id = args[ args.length-1 ]
    , lock = this.lock[id];
  
//console.log('>>> ->', id, '=>', lock)
  // Run the callback
  lock.shift().slice(1).forEach(function(cb) {
    cb.apply(this, args);
  }, this);

  // Run the next method or remove the lock reference
  lock.length > 0
    ? lock[0][0].call(this)
    : delete this.lock[id];
//console.log('>>> <-', id, '=>', this.lock)
}
/**
 * Get a file name from its id. If it ends with /, it assumes it is a directory
 * else, it will check for its type (file or directory) and extension
 *
 * @param {String} normalized id
 * @param {Function} callback ({Error}, {Boolean} file exists, {String} file name, {Boolean} directory, {String} id)
 * @api private
 */
function getFilenameById(id, callback) {
  var isDirectory = (id.substr(-1) == '/')
    , filename = this.root + id;
  
  if(this.data.hasOwnProperty(id)) {
    callback(null, true, filename, isDirectory, id);
  } else {
    // Check the file type
    path.exists(filename, function(result) {
      !result
        ? callback(null, false, filename, isDirectory, id)
        : fs.stat(filename, function(err, stat) {
            err
              ? callback(err, false, filename, isDirectory, id)
              : stat.isFile()
                  ? callback(null, true, filename, false, id)
                  : stat.isDirectory()
                      ? callback(null, true, isDirectory? filename: filename + '/', true, isDirectory? id: id + '/')
                      : callback(new Error('fsStore: ' + id + ': Not a file or directory'), false, filename, isDirectory, id)
          });
    });
  }
}
/**
 * Get the list of normalized ids in a directory
 *
 * @param {String} directory name
 * @param {Boolean} filter out backup files (default=true)
 * @param {Function} callback ({Error}, {Array} full path file names)
 * @api private
 */
function getDirFiles(dirname, flag, callback) {
  var suffixRex = new RegExp(this.options.backupSuffix + '$');
  
  fs.readdir(dirname, function(err, files) {
    if(err) {
      return callback(err);
    }
    // Extract valid files
    var result = [];
    async.filter(
      flag == false
        ? files
        : files.filter(function(file) { return !suffixRex.test(file); })
    , function(file, cb) {
        var fullpathFile = dirname + file;
        // Check file
        fs.stat(fullpathFile, function(err, stat) {
          err
            ? cb(false)
            : stat.isDirectory()
                ? ( result.push( '/' + fullpathFile + '/' ), cb(true) ) // Directory
                : stat.isFile()
                    ? ( result.push('/' + fullpathFile), cb(true) ) // File
                    : cb(false);
        });
      }
    , function() {
        callback(null, result);
      }
    );
  });
}
/**
 * Encode data for a given format
 *
 * @param {String} format
 * @param {Object} data
 * @return {String} encoded data
 * @api private
 */
function encode(format, data) {
  var p = formats[format];
  
  return !p? undefined: p.encode? p.encode(data): undefined;
}
/**
 * Decode data for a given format
 *
 * @param {String} format
 * @param {Object} data
 * @return {String} deencoded data
 * @api private
 */
function decode(format, data) {
  var p = formats[format];
  
  return !p? undefined: p.decode? p.decode(data): undefined;
}
/**
 * Clear the store (does not remove files, memory only!)
 *
 * @param {String} (optional) id. Do not set if not required
 * @param {Function} callback
 * @return {Object} store instance
 * @api public
 */
fsStore.prototype.clear = function(id, callback) {
  if(arguments.length == 1 || !id) {
    callback = id;
    this.data = {}; // Files or directories (array of ids)
    this._length = 0;
  } else {
    var _id = normalize(id);
    
    if(this.data.hasOwnProperty(_id)) {
      delete this.data[_id];
      this._length--;
    }
  }
  callback && callback.call(this, null);
  return this;
};
/**
 * Check that an item exists in the store (memory and file system)
 * Directories end with /, files do not
 *
 * @param {String} id
 * @param {Function} callback ({Error}, {Boolean} item existence, {String} normalized id)
 * @return {Object} store instance
 * @api public
 */
fsStore.prototype.has = function(id, callback) {
  var self = this
    , _id = normalize(id);
  
  initMethod.call(this, _id, callback, hasCallback);
  
  function hasCallback() {
    getFilenameById.call(self, _id, function(err, exists, filename, isDirectory) {
      methodCallback.call(self, err, exists, _id);
    });
  }
  return this;
};
/**
 * Get the number of items in the store
 *
 * @param {Function} callback
 * @return {Object} store instance
 * @api public
 */
fsStore.prototype.length = function(callback) {
  callback && callback.call(this, null, this._length);
  return this;
};
/**
 * Fetch an item from the memory or file system.
 * Queue any incoming requests.
 *
 * @param {String} id
 * @param {Function} callback ({Error}, {Object|Array} data, {String} normalized id)
 * @return {Object} store instance
 * @api public
 */
fsStore.prototype.get = function(id, callback) {
  var self = this
    , _id = normalize(id);
  initMethod.call(this, _id, callback, getCallback);
  
  function getCallback() {
    getFilenameById.call(self, _id, function(err, exists, filename, isDirectory, __id) {
      if(err || !exists) {
        return methodCallback.call(self, err, self.data[_id], _id);
      }
      // Item to be loaded
      if(isDirectory) {
        getDirFiles.call(self, filename, true, function(err, ids) {
          err
            ?  methodCallback.call(self, err, _id)
            : ( addDir.call(self, __id, ids), methodCallback.call(self, null, ids, _id) );
        });
      } else {
        fs.readFile(filename, function(err, buf) {
          if(err) {
            return methodCallback.call(self, err, _id);
          }
          try {
            var data = buf.length > 0
                        ? decode(filename.substr( filename.lastIndexOf('.') + 1 ), buf)
                        : '';
            
            addItem.call(self, __id, data);
          } catch(e) {
            return methodCallback.call(self, new Error('fsStore: ' + id + ': ' + e.toString()), _id);
          }
          methodCallback.call(self, null, data, _id);
        });
      }
    });
  }
  return this;
};
/**
 * Store an item (memory and file system)
 * Queue any incoming requests.
 *
 * @param {String} id
 * @param {Object} value to be set
 * @param {Function} callback ({Error}, {String} normalized id)
 * @return {Object} store instance
 * @api public
 */
fsStore.prototype.set = function(id, data, callback) {
  var self = this
    , _id = normalize(id);
  
  if(isRoot(_id)) {
    callback && callback.call(this, null, _id);
    return this;
  }
  initMethod.call(this, _id, callback, setCallback);
  
  function setCallback() {
    // Save the data
    getFilenameById.call(self, _id, function(err, exists, filename, isDirectory, __id) {
      if(err) {
        return methodCallback.call(self, err, _id);
      }
      isDirectory
        ? exists // Do not backup if directory exists
            ? methodCallback.call(self, null, _id)
            : set()
        : exists && self.options.backup // Backup if file exists and backup is on
            ? fs.rename(filename, filename + self.options.backupSuffix, set)
            : set()
      
      function set(err) {
        if(err) {
          return methodCallback.call(self, err, _id);
        }
        // Build subdirectories
        var list = [ self.root ]
          , subdirList = __id.substr(1, _id.length-2).split('/');
        
        for(var i = 0, n = subdirList.length - (isDirectory? 0: 1); i < n; i++) {
          list.push( list[i] + '/' + subdirList[i] );
        }
        list.shift();
        async.forEachSeries(
          list
        , function(dir, callback) {
            path.exists(dir, function(flag) {
              flag
                ? callback()
                : fs.mkdir(dir, self.options.dirmod, callback);
            });
          }
        , function(err) {
            if(isDirectory) {
              methodCallback.call(self, err, _id);
            } else {
              // Serialize the data
              try {
                var encoded = encode(getExtension(_id), data);
              } catch(err) {
                return methodCallback.call(self, new Error('fsStore: '+_id+': '+err.toString()), _id);
              }
              fs.writeFile(filename, encoded, function(err) {
                if(!err) {
                  addItem.call(self, __id, data);
                }
                methodCallback.call(self, err, _id);
              });
            }
          }
        );
      }
    });
  }
  return this;
};
/**
 * Remove an item from the store (memory and file system)
 * Queue any incoming requests.
 *
 * @param {String} id
 * @param {Function} callback ({Error}, {String} normalized id)
 * @return {Object} store instance
 * @api public
 */
fsStore.prototype.remove = function(id, callback) {
  return removeMethod.call(this, id, this.options.backup, callback);
};
/**
 * Remove an item from the store (memory and file system)
 * Queue any incoming requests.
 *
 * @param {String} id
 * @param {Boolean} enable/disable data backup
 * @param {Function} callback ({Error}, {String} normalized id)
 * @return {Object} store instance
 * @api public
 */
function removeMethod(id, backup, callback) {
  var self = this
    , _id = normalize(id);
  
  if(isRoot(_id)) {
    callback && callback.call(this, null, _id);
    return this;
  }
  initMethod.call(this, _id, callback, removeCallback);
  
  function removeCallback() {
    getFilenameById.call(self, _id, function(err, exists, filename, isDirectory, __id) {
      if(err || !exists) { // Error or nothing to do
        return methodCallback.call(self, err, _id);
      }
      !backup
        ? remove() // Backup is off
        : isDirectory
           ? removeMethod.call( // Remove the backup directory
               self
             , chop(__id) + self.options.backupSuffix + '/'
             , false
             , function(err) {
                 err
                   ? methodCallback.call(self, err, _id)
                   : fs.rename(filename, chop(filename) + self.options.backupSuffix, removedDir)
               }
             )
           : fs.rename(filename, filename + self.options.backupSuffix, removedFile);
    
      function removedFile(err) {
        if(!err) {
          delItem.call(self, _id);
        }
        methodCallback.call(self, err, _id);
      }
      function removedDir(err) {
        if(!err) {
          delDir.call(self, __id);
        }
        methodCallback.call(self, err, _id);
      }
      function remove() {
        isDirectory
          ? getDirFiles.call(self, filename, false, function(err, list) {
              if(err) {
                return methodCallback.call(self, err, _id);
              }
              var n = self.root.length + 1;
              
              async.forEach(
                list
              , function(file, callback) {
                  removeMethod.call(self, file.substr(n), false, callback);
                }
              , function(err) {
                  err
                    ? methodCallback.call(self, err, _id)
                    : fs.rmdir(filename, removedDir);
                }
              );
            })
          : fs.unlink(filename, removedFile);
      }
    });
  }
  return this;
};
/**
 * Apply an iterator to all ids. First error triggers the callback.
 *
 * @param {Array|String} list of ids or an id
 * @param {Function} iterator (id, callback). Callback must be triggered in the iterator ({Error}, value).
 * @param {Function} callback ({Error}, {Array} results)
 * @return {Object} store instance
 * @api public
 */
fsStore.prototype.forEach = function(id, iterator, callback) {
  if(arguments.length == 3) {
    async.map(
      (Array.isArray(id)? id: id? [id]: []).map(normalize)
    , iterator
    , callback
    );
  }
  return this;
};
