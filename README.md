# fsStore

This is a simple file system based storage system for Node.js.
Typically used for configurations or data logging.
File data can be encoded into JSON (default) or MSGPACK formats by default.
Decoders and encoders can be added at will.

## Features

  * Lazy-loading asynchronous store
  * Store actions are atomic (at the id level)
  * Various data formats supported (json, msgpack by default)

## Options

The default options are:
    {
      backup: true
    , backupSuffix: '_'
    , dirmod: 16877
    }

  backup - files are renamed with the backupSuffix when a set() or remove() are performed
  dirmod - mode to be used when creating a directory (defaults to the store root dir mode)

The root option must be set at the store initialization, typically:
    {
      root: 'mydata'
    }

## Formats

A format is defined by the file extension: <file>.<extension>.

The default supported formats are:

  * json
  * msgpack

If a format is not found, the data is passed as a string.
To add a new one, create a CommonJS module as follow:

  * in formats/wrapper_<name of the format>.js
  * encode method - called by fsStore.set()
  * decode method - called by fsStore.get()

## Methods

### fsStore#has(id, callback)

Check that an item exists in the store (memory and file system)
Directories end with /, files do not

### fsStore#length(callback)

Get the number of items in the store

### fsStore#clear(callback)

Clear the store (does not remove files, memory only!)

### fsStore#get(id, callback)

Fetch an item from the memory or file system.

### fsStore#set(id, data, callback)

Store an item (memory and file system)

### fsStore#remove(id, callback)

Remove an item from the store (memory and file system)

### fsStore#forEach(id, iterator, callback)

Iterate over item ids.

## Usage

  * Example 1
  
Assuming the store loads data from ./test, which has the following structure:
    
    test
    test/obj1.json
    test/dir1/obj2.json
    test/dir1/nodata
  
The following code would load the obj1 and obj2 objects with ids /test/obj1 
and /test/dir1/obj2, provided that they are valid json objects:
    
    var fsStore = require('../lib/fsStore');
      , store = new fsStore('./test');
    
    store.get('/', function(err) {
      if(err) { return console.log(err.toString()); }
      console.log(store.data);
    });
    
Output:
    
    { '/': [ '/test/dir1/', '/test/obj1' ] }
   
  * Example 2
   
From the previous data sample, add an object:

    var fsStore = require('../lib/fsStore');
      , store = new fsStore('./test');
   
    store.set('/dir1/new', { flag: false, value: 'xxx' }, function(err) {
      if(err) { return console.log(err.toString()); }
      console.log(store.data);
    });
    
Output:

    { '/dir1/new': { flag: false, value: 'xxx' } }

  * Example 3
    
From the first data sample, remove an object:
    
    var fsStore = require('../lib/fsStore');
      , store = new fsStore('/tmp/test');
    
    store.remove('/dir1/new', function(err) {
      if(err) { return console.log(err.toString()); }
      console.log(store.data);
    });
    
Output:
    
    {}

## License 

(The MIT License)

Copyright (c) 2011 Pierre Curto

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
