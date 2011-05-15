var wrapper = {};

(function() {
  eval( require('fs').readFileSync(__dirname + '/msgpack.codec.js').toString() );
}).call(wrapper);

module.exports = { decode: wrapper.msgpack.unpack, encode: wrapper.msgpack.pack };
