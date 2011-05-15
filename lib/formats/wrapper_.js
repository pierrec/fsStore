function toString(s) {
  return typeof(s.toString) == 'function'? s.toString(): ''+s;
}
module.exports = { decode: toString, encode: toString };
