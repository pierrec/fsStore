var assert = require("assert"),
    vows = require('vows'),
    fs = require("fs"),
    fsStore = require("../lib/fsStore");

var options = { root: "data" }
  , store = new fsStore(options);

vows.describe("fsStore concurrency").addBatch({
  "The fsStore should": {
    topic: store
  , "on set/set/get": {
      topic: function(store) {
        store.set("csetFile1.json", 1)
             .set("csetFile1.json", 2)
             .get("csetFile1.json", this.callback);
      }
    , "return the data": function(err, data, id) {
        assert.isNull(err);
        assert.equal(data, 2);
      }
    }
  , "on set/set/get different id": {
      topic: function(store) {
        store.set("csetFile1.json", 1)
             .set("csetFile1.1.json", 2)
             .get("csetFile1.json", this.callback);
      }
    , "return the data": function(err, data, id) {
        assert.isNull(err);
        assert.equal(data, 1);
      }
    }
  , "on set/set/has": {
      topic: function(store) {
        store.set("csetFile2.json", 1)
             .set("csetFile2.json", 2)
             .has("csetFile2.json", this.callback);
      }
    , "return true": function(err, flag, id) {
        assert.isNull(err);
        assert.isTrue(flag);
      }
    }
  , "on set/set/has different id": {
      topic: function(store) {
        store.set("csetFile2.json", 1)
             .set("csetFile2.1.json", 2)
             .has("csetFile2.json", this.callback);
      }
    , "return true": function(err, flag, id) {
        assert.isNull(err);
        assert.isTrue(flag);
      }
    }
  , "on set/remove/get": {
      topic: function(store) {
        store.set("csetFile3.json", 1)
             .remove("csetFile3.json")
             .get("csetFile3.json", this.callback);
      }
    , "return no data": function(err, data, id) {
        assert.isNull(err);
        assert.isUndefined(data);
      }
    }
  , "on set/set/remove/get different id": {
      topic: function(store) {
        store.set("csetFile3.json", 1)
             .set("csetFile3.1.json", 2)
             .remove("csetFile3.json")
             .get("csetFile3.1.json", this.callback);
      }
    , "return data": function(err, data, id) {
        assert.isNull(err);
        assert.equal(data, 2);
      }
    }
  , "on set/remove/has": {
      topic: function(store) {
        store.set("csetFile4.json", 1)
             .remove("csetFile4.json")
             .has("csetFile4.json", this.callback);
      }
    , "return false": function(err, flag, id) {
        assert.isNull(err);
        assert.isFalse(flag);
      }
    }
  , "on set/set/remove/has different id": {
      topic: function(store) {
        store.set("csetFile4.json", 1)
             .set("csetFile4.1.json", 2)
             .remove("csetFile4.json")
             .has("csetFile4.1.json", this.callback);
      }
    , "return true": function(err, flag, id) {
        assert.isNull(err);
        assert.isTrue(flag);
      }
    }
  }
}).run();
