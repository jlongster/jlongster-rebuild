var { go, chan, take, put, operations: ops } = require('./shared/csp');
var { merge } = require('lodash');
var Dispatcher = require('./dispatcher');

var dispatcher = new Dispatcher();

var Store1 = {
  name: "james",
  chan: dispatcher.register("Store1", function*(payload) {
    yield* dispatcher.waitFor(Store2.chan);
    console.log("james", payload.actionType);
  })
};

var Store2 = {
  name: "evelina",
  chan: dispatcher.register("Store2", function*(payload) {
    console.log("evelina", payload.actionType);
  })
};

dispatcher.dispatch({
  actionType: 'foo'
});
