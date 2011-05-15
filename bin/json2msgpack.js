var path = require('path')
  , fs = require('fs')
  , msgpack = require('../lib/msgpack').msgpack
  , argv = require('optimist')
             .usage('Usage: $0 -o [output file] -i [file.json]')
             .demand([ 'o', 'i' ])
             .argv;

// Load the data
var data = fs.readFileSync(argv.i)
  , json = JSON.parse(data);

fs.writeFileSync(argv.o, msgpack.pack(json));
