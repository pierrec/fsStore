var fsStore = require('../lib/fsStore')
  , store = new fsStore({ root: 'test' });

store.get('/', function(err) {
  if(err) { return console.log(err.toString()); }
  console.log(store.data);
});
