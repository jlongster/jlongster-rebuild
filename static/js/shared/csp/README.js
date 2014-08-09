// This file is doc of "protocols" used

var ReadPort = {
  _take: function(handler) {}
};

var WritePort = {
  _put: function(value, handler) {}
};

var Channel = {
  close: function() {}
};

var Handler = {
  is_active: function() {},
  commit: function() {}
};

var Buffer = {
  is_full: function() {},
  remove: function() {},
  add: function(item) {}
};

var Mux = {
  muxch: function() {}
};

var Mult = {
  tap: function(ch, propagateClose) {},
  untap: function(ch) {},
  untapAll: function() {}
};

var Mix = {
  admix: function(ch) {},
  unmix: function(ch) {},
  unmixAll: function() {},
  toggle: function(stateMap) {},
  soloMode: function(mode) {}
};

var Pub = {
  sub: function(v, ch, propagateClose) {},
  unsub: function(v, ch) {},
  unsubAll: function(v) {}
};
