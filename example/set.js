var fsStore = require('../lib/fsStore')
  , store = new fsStore({ root: 'test' });

store.set('/dir1/new', { flag: false, value: 'xxx' }, function(err) {
  if(err) { return console.log(err.toString()); }
  console.log(store.data);
});
