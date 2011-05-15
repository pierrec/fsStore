var path = require('path')
  , fs = require('fs')
  , msgpack = require('../lib/msgpack').msgpack
  , argv = require('optimist')
             .usage('Usage: $0 -o [output file] -i [file.msgpack]')
             .demand([ 'o', 'i' ])
             .argv;

// Load the data
var content = fs.readFileSync(argv.i)
  , data = msgpack.unpack(content);

fs.writeFileSync(argv.o, JSON.stringify(data));
