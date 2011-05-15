var assert = require("assert"),
    vows = require('vows'),
    fs = require("fs"),
    path = require("path"),
    fsStore = require("../lib/fsStore");

function assertMethod(method) {
  return function(store) {
    assert.isFunction( store[method] );
  };
}

function initBadOptions(options) {
  return function() {
    assert.throws( function() { arguments.length==0? new fsStore(): new fsStore(options) } );
  };
}

function mkFile(store, file, data) {
  var ext = file.substr( file.lastIndexOf('.') + 1 )
    , format = fsStore.formats[ext];
  fs.writeFileSync(
    store.root + "/" + file
  , typeof(data)=='string'? data: format? format.encode({"abc":123}): ''
  );
}
function rmFile(store, file) {
  var f = store.root + "/" + file;
  path.existsSync(f) && fs.unlinkSync(f);
}
function mkDir(store, dir) {
  var dir = store.root + "/" + dir;
  !path.existsSync(dir) && fs.mkdirSync(dir, store.options.dirmod);
}
function rmDir(store, dir) {
  var dir = store.root + "/" + dir;
  path.existsSync(dir) && fs.rmdirSync(dir);
}

var options = { root: "data", format: "msgpack" }
  , optionsBackupOff = { root: "data", format: "msgpack", backup: false }
  , store = new fsStore(options)
  , storeGET = new fsStore(options)
  , storeSET = new fsStore(options)
  , storeSETbackup = new fsStore(optionsBackupOff)
  , storeREMOVE = new fsStore(options)
  , storeREMOVEbackup = new fsStore(options);

vows.describe("fsStore basic").addBatch({
  "At init an fsStore should fail with": {
    "no options": initBadOptions()
  , "unset root": initBadOptions({})
  , "invalid root to create": initBadOptions({root: "data"})
  , "non directory root": (function(){
      fs.writeFileSync("isafile", "");
      return initBadOptions({root: "isafile"});
    })()
  , "invalid format": initBadOptions({root: "data", format: "unknown"})
  }
}).addBatch({
  "The fsStore should have the method": {
    topic: new fsStore(options)
  , "length": assertMethod("length")
  , "has": assertMethod("has")
  , "get": assertMethod("get")
  , "set": assertMethod("set")
  , "remove": assertMethod("remove")
  , "clear": assertMethod("clear")
  , "forEach": assertMethod("forEach")
  }
}).addBatch({
  "The fsStore should": {
    topic: ""
  , "create root directory": {
      topic: function(o) {
        var dir = "newRootDir";
        path.existsSync(dir) && fs.rmdirSync(dir);
        return new fsStore({ root: dir });
      }
    , "if not present": function(store) {
        assert.isTrue( path.existsSync(store.options.root) );
      }
    }
  }
}).addBatch({
  "The fsStore has method should": {
    topic: store
  , "on file exists": {
      topic: function(store) {
        mkFile(store, "hasFile.msgpack");
        store.has("hasFile.msgpack", this.callback);
      }
    , "return true": function(err, flag, id) {
        assert.isNull(err);
        assert.isTrue(flag);
        assert.equal(id.charAt(0), "/");
        assert.equal(id, "/hasFile.msgpack");
        assert.equal(this, store);
      }
    }
  , "on file missing": {
      topic: function(store) {
        rmFile(store, "hasFileMissing");
        store.has("hasFileMissing", this.callback);
      }
    , "return false": function(err, flag, id) {
        assert.isNull(err);
        assert.isFalse(flag);
        assert.equal(id.charAt(0), "/");
        assert.equal(id, "/hasFileMissing");
        assert.equal(this, store);
      }
    }
  , "on directory exists": {
      topic: function(store) {
        mkDir(store, "hasDir");
        store.has("hasDir/", this.callback);
      }
    , "return true": function(err, flag, id) {
        assert.isNull(err);
        assert.isTrue(flag);
        assert.equal(id.charAt(0), "/");
        assert.equal(id, "/hasDir/");
        assert.equal(this, store);
      }
    }
  , "on directory missing": {
      topic: function(store) {
        rmDir(store, "hasDirMissing");
        store.has("hasDirMissing/", this.callback);
      }
    , "return false": function(err, flag, id) {
        assert.isNull(err);
        assert.isFalse(flag);
        assert.equal(id.charAt(0), "/");
        assert.equal(id, "/hasDirMissing/");
        assert.equal(this, store);
      }
    }
  }
}).addBatch({
  "The fsStore get method should": {
    topic: storeGET
  , "on file exists": {
      topic: function(store) {
        mkFile(store, "getFile.msgpack");
        store.get("getFile.msgpack", this.callback);
      }
    , "load the file data": function(err, data, id) {
        assert.isNull(err);
        assert.equal(id.charAt(0), "/");
        assert.equal(id, "/getFile.msgpack");
        assert.equal(this, storeGET);
        assert.isObject(data);
      }
    }
  , "on file missing": {
      topic: function(store, files) {
        rmFile(store, "getFileMissing");
        store.get("getFileMissing", this.callback);
      }
    , "return undefined": function(err, data, id) {
        assert.isNull(err);
        assert.equal(id.charAt(0), "/");
        assert.equal(id, "/getFileMissing");
        assert.equal(this, storeGET);
        assert.isUndefined(data);
      }
    }
  , "load": {
      topic: function(store) {
        mkFile(store, "getFileEmpty.msgpack", "");
        store.get("getFileEmpty.msgpack", this.callback);
      }
    , "an empty file": function(err, data, id) {
        assert.isNull(err);
        assert.equal(id.charAt(0), "/");
        assert.equal(id, "/getFileEmpty.msgpack");
        assert.equal(this, storeGET);
        assert.isEmpty(data);
      }
    }
  , "load dir": {
      topic: function(store) {
        mkDir(store, "getDirFile");
        store.get("getDirFile", this.callback);
      }
    , "if trailing / not set": function(err, data, id) {
        assert.isNull(err);
        assert.equal(id.charAt(0), "/");
        assert.equal(this, storeGET);
        assert.isArray(data);
      }
    }
  , "on directory exists": {
      topic: function(store) {
        mkDir(store, "getDir");
        store.get("getDir/", this.callback);
      }
    , "load the list of files": function(err, data, id) {
        assert.isNull(err);
        assert.equal(id.charAt(0), "/");
        assert.equal(id, "/getDir/");
        assert.equal(this, storeGET);
        assert.isArray(data);
      }
    }
  , "on directory missing": {
      topic: function(store) {
        rmDir(store, "getDirMissing");
        store.get("getDirMissing/", this.callback);
      }
    , "return undefined": function(err, data, id) {
        assert.isNull(err);
        assert.equal(id.charAt(0), "/");
        assert.equal(id, "/getDirMissing/");
        assert.equal(this, storeGET);
        assert.isUndefined(data);
      }
    }
  }
}).addBatch({
  "The fsStore set method should": {
    topic: storeSET
  , "": {
      topic: function(store) {
        store.set("setFileData", {test: "somedata", test2: 123}, this.callback);
      }
    , "save the data": function(err, id) {
        assert.isNull(err);
        assert.equal(id.charAt(0), "/");
        assert.equal(id, "/setFileData");
        assert.equal(this, storeSET);
        var file = storeSET.root + id;
        assert.isTrue( path.existsSync(file) );
      }
    }
  , "on file exists": {
      topic: function(store) {
        mkFile(store, "setFile.msgpack");
        store.set("setFile.msgpack", {}, this.callback);
      }
    , "make a backup": function(err, id) {
        var file = storeSET.root + id + storeSET.options.backupSuffix;
        assert.isTrue( path.existsSync(file) );
      }
    , "not make a backup": {
        topic: function(id) {
          var file = storeSET.root + id + storeSET.options.backupSuffix;
          path.existsSync(file) && fs.unlinkSync(file);
          storeSETbackup.set(id, {}, this.callback);
        }
      , "when backup off": function(err, id) {
          var file = storeSET.root + id + storeSET.options.backupSuffix;
          assert.isFalse( path.existsSync(file) );
        }
      }
    }
  , "create a directory": {
      topic: function(store) {
        rmDir(store, "setDir");
        store.set("setDir/", null, this.callback);
      }
    , "if new": function(err, id) {
        assert.isNull(err);
        assert.equal(id.charAt(0), "/");
        assert.equal(id, "/setDir/");
        assert.equal(this, storeSET);
        var dir = this.root + id;
        assert.isTrue( path.existsSync(dir) );
      }
    }
  , "ignore if dir": {
      topic: function(store) {
        mkDir(store, "setDirExisting");
        store.set("setDirExisting/", null, this.callback);
      }
    , "exists": function(err, id) {
        assert.isNull(err);
        assert.equal(id.charAt(0), "/");
        assert.equal(id, "/setDirExisting/");
        assert.equal(this, storeSET);
      }
    }
  , "ignore if dir and its backup": {
      topic: function(store) {
        mkDir(store, "setDirExistingWithBackup");
        mkFile(store, "setDirExistingWithBackup/setFile.msgpack");
        mkDir(store, "setDirExistingWithBackup" + store.options.backupSuffix);
        mkFile(store, "setDirExistingWithBackup"+ store.options.backupSuffix + "/setFileBak.msgpack");
        store.set("setDirExistingWithBackup/", null, this.callback);
      }
    , "exist": function(err, id) {
        assert.isNull(err);
        assert.equal(id.charAt(0), "/");
        assert.equal(id, "/setDirExistingWithBackup/");
        assert.equal(this, storeSET);
      }
    }
  , "create a directory structure": {
      topic: function(store) {
        rmDir(store, "setDir1/setDir2");
        rmDir(store, "setDir1");
        store.set("setDir1/setDir2/", null, this.callback);
      }
    , "if new": function(err, id) {
        assert.isNull(err);
        assert.equal(id.charAt(0), "/");
        assert.equal(id, "/setDir1/setDir2/");
        assert.equal(this, storeSET);
        var dir = this.root + id;
        assert.isTrue( path.existsSync(dir) );
      }
    }
  }
}).addBatch({
  "The fsStore remove method should": {
    topic: storeREMOVE
  , "": {
      topic: function(store) {
        mkFile(store, "removeFile.msgpack");
        store.remove("removeFile.msgpack", this.callback);
      }
    , "remove the file": function(err, id) {
        assert.isNull(err);
        assert.equal(id.charAt(0), "/");
        assert.equal(id, "/removeFile.msgpack");
        assert.equal(this, storeREMOVE);
        var file = storeREMOVE.root + id;
        assert.isFalse( path.existsSync(file) );
      }
    }
  , "not remove": {
      topic: function(store) {
        store.remove("/", this.callback);
      }
    , "root directory": function(err, id) {
        assert.isNull(err);
        assert.equal(id, "/");
        assert.equal(this, storeREMOVE);
        assert.isTrue( path.existsSync(storeREMOVE.root) );
      }
    }
  , "on file exists": {
      topic: function(store) {
        mkFile(store, "removeFileWithBackup.msgpack");
        store.remove("removeFileWithBackup.msgpack", this.callback);
      }
    , "make a backup": function(err, id) {
        var file = storeREMOVE.root + id + storeREMOVE.options.backupSuffix;
        assert.isTrue( path.existsSync(file) );
      }
    , "not make a backup": {
        topic: function(id) {
          var file = storeREMOVE.root + id + storeREMOVE.options.backupSuffix;
          path.existsSync(file) && fs.unlinkSync(file);
          storeREMOVEbackup.remove(id, this.callback);
        }
      , "when backup off": function(err, id) {
          var file = storeREMOVE.root + id + storeREMOVE.options.backupSuffix;
          assert.isFalse( path.existsSync(file) );
        }
      }
    }
  , "remove a new directory": {
      topic: function(store) {
        mkDir(store, "removeDir");
        store.remove("removeDir/", this.callback);
      }
    , "": function(err, id) {
        assert.isNull(err);
        assert.equal(id.charAt(0), "/");
        assert.equal(id, "/removeDir/");
        assert.equal(this, storeREMOVE);
        var dir = this.root + id;
        assert.isFalse( path.existsSync(dir) );
      }
    }
  , "remove a non empty directory": {
      topic: function() {
        mkDir(storeREMOVE, "removeDirNonEmpty");
        mkFile(storeREMOVE, "removeDirNonEmpty/somedata.msgpack");
        storeREMOVE.remove("removeDirNonEmpty/", this.callback);
      }
    , "": function(err, id) {
        assert.isNull(err);
        assert.equal(id.charAt(0), "/");
        assert.equal(id, "/removeDirNonEmpty/");
        assert.equal(this, storeREMOVE);
        var dir = this.root + id;
        assert.isFalse( path.existsSync(dir) );
      }
    }
  , "remove a directory with backup": {
      topic: function() {
        mkDir(storeREMOVE, "removeDirWithBackup");
        mkDir(storeREMOVE, "removeDirWithBackup" + storeREMOVE.options.backupSuffix);
        mkFile(storeREMOVE, "removeDirWithBackup/somedata.msgpack");
        storeREMOVE.remove("removeDirWithBackup/", this.callback);
      }
    , "": function(err, id) {
        assert.isNull(err);
        assert.equal(id.charAt(0), "/");
        assert.equal(id, "/removeDirWithBackup/");
        assert.equal(this, storeREMOVE);
        var dir = this.root + id.substr(0, id.length-1);
        assert.isFalse( path.existsSync(dir) );
        assert.isFalse( path.existsSync(dir + storeREMOVE.options.backupSuffix + storeREMOVE.options.backupSuffix) );
      }
    }
  , "ignore": {
      topic: function(store) {
        rmDir(store, "removeDirMissig");
        store.remove("removeDirMissig/", this.callback);
      }
    , "if not existing": function(err, id) {
        assert.isNull(err);
        assert.equal(id.charAt(0), "/");
        assert.equal(id, "/removeDirMissig/");
        assert.equal(this, storeREMOVE);
      }
    }
  , "remove a directory structure": {
      topic: function(store) {
        mkDir(store, "removeDir1");
        mkDir(store, "removeDir1/removeDir2");
        store.remove("removeDir1/removeDir2/", this.callback);
      }
    , "": function(err, id) {
        assert.isNull(err);
        assert.equal(id.charAt(0), "/");
        assert.equal(id, "/removeDir1/removeDir2/");
        assert.equal(this, storeREMOVE);
        var dir = this.root + id;
        assert.isFalse( path.existsSync(dir) );
      }
    }
  }
}).addBatch({
  "The fsStore clear method should": {
    topic: store
  , "clear the store": {
      topic: function(store) {
        store.clear(this.callback);
      }
    , "completely": function(err, n) {
        assert.isNull(err);
        assert.isEmpty(this.data);
        assert.equal(this._length, 0);
      }
    , "by id": {
        topic: function() {
          var cb = this.callback;
          store.set('/clearFile', 1, function(err, id) {
            store.clear(id, cb);
          });
        }
      , "completely": function(err, n) {
          assert.isNull(err);
          assert.isUndefined(this.data['/clearFile']);
          assert.equal(this._length, 0);
        }
      }
    }
  }
}).addBatch({
  "The fsStore length method should": {
    topic: store
  , "return": {
      topic: function(store) {
        store.clear();
        store.length(this.callback);
      }
    , "0": function(err, n) {
        assert.isNull(err);
        assert.equal(n, 0);
      }
    , "1": {
        topic: function() {
          var cb = this.callback;
          store.set("lengthFile", {}, function() { store.length(cb) });
        }
      , "when loading a file": function(err, n) {
          assert.isNull(err);
          assert.equal(n, 1);
        }
      , "2": {
          topic: function() {
            var cb = this.callback;
            store.set("lengthFile2", {}, function() { store.length(cb) });
        }
        , "when loading 2 files": function(err, n) {
            assert.isNull(err);
            assert.equal(n, 2);
          }
        , "1": {
            topic: function() {
              var cb = this.callback;
              store.remove("lengthFile2", function() { store.length(cb) });
            }
          , "when removing a file": function(err, n) {
              assert.isNull(err);
              assert.equal(n, 1);
            }
          }
        }
      }
    }
  }
}).addBatch({
  "The fsStore forEach method should loop": {
    topic: store
  , "over a string": {
      topic: function(store) {
        store.set("eachFile.msgpack", 1)
             .forEach("eachFile.msgpack"
                     , function(item, cb) {
                         store.get(item, function(err, data) {
                           err? cb(err): cb(null, ++data);
                         });
                       }
                     , this.callback);
      }
    , "": function(err, data) {
        assert.isNull(err);
        assert.equal(data, 2);
      }
    }
  , "over an array": {
      topic: function(store) {
        store.set("eachFile.msgpack", 1)
             .forEach(["eachFile.msgpack"]
                     , function(item, cb) {
                         store.get(item, function(err, data) {
                           err? cb(err): cb(null, ++data);
                         });
                       }
                     , this.callback);
      }
    , "": function(err, data) {
        assert.isNull(err);
        assert.equal(data, 2);
      }
    }
  }
}).addBatch({
  "The fsStore method": {
    topic: store
  , "length": {
      topic: function(store) {
        return store.length();
      }
    , "should return the store reference": function(ref) {
        assert.equal(ref, store);
      }
    }
  , "has": {
      topic: function(store) {
        return store.has('/');
      }
    , "should return the store reference": function(ref) {
        assert.equal(ref, store);
      }
    }
  , "get": {
      topic: function(store) {
        return store.get('/');
      }
    , "should return the store reference": function(ref) {
        assert.equal(ref, store);
      }
    }
  , "set /": {
      topic: function(store) {
        return store.set('/');
      }
    , "should return the store reference": function(ref) {
        assert.equal(ref, store);
      }
    }
  , "set": {
      topic: function(store) {
        return store.set('/setFileReference', 1);
      }
    , "should return the store reference": function(ref) {
        assert.equal(ref, store);
      }
    }
  , "remove /": {
      topic: function(store) {
        return store.remove('/');
      }
    , "should return the store reference": function(ref) {
        assert.equal(ref, store);
      }
    }
  , "remove": {
      topic: function(store) {
        return store.remove('/removeFileReference');
      }
    , "should return the store reference": function(ref) {
        assert.equal(ref, store);
      }
    }
  , "clear": {
      topic: function(store) {
        return store.clear();
      }
    , "should return the store reference": function(ref) {
        assert.equal(ref, store);
      }
    }
  , "forEach": {
      topic: function(store) {
        return store.forEach();
      }
    , "should return the store reference": function(ref) {
        assert.equal(ref, store);
      }
    }
  }
}).run();
