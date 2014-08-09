var { go, chan, take, put, operations: ops } = require('./shared/csp');
var _ = require('lodash');
var { contains, merge, isArray } = _;
var { promise } = require('./shared/chan-util');
var invariant = require('react/lib/invariant');

function Dispatcher() {
  this.chans = {};
  this._isPending = [];
  this._isHandled = [];
}

var _id = 1;

Dispatcher.prototype = merge(Dispatcher.prototype, {
  register: function(name, gen) {
    var ch = chan();
    this.chans[name] = ch;

    go(function*() {
      var payload;
      while((payload = yield take(ch))) {
        yield* gen(payload);
        yield put(ch, true);
      }
    });

    return ch;
  },

  unregister: function(ch) {
    this.chans = _.zipObject(
      _.pairs(this.chans).filter(x => x[1] !== ch)
    );
  },

  waitFor: function*(chans) {
    chans = isArray(chans) ? chans : [chans];

    for(var i=0; i<chans.length; i++) {
      var chan = chans[i];

      // TODO: think through error handling better
      invariant(
        _.findKey(this.chans, chan),
        "Dispatcher.waitFor: unknown channel"
      );

      if(contains(this._isPending, chan)) {
        invariant(
          contains(this._isHandled, chan),
          "Dispatcher.waitFor: circular dependency detected on " +
            _.findKey(this.chans, chan)
        );
        continue;
      }

      yield* this._invoke(chan);
    }
  },

  dispatch: function(payload) {
    var chans = this.chans;
    go(function*() {
      this._startDispatching(payload);
      for(var k in chans) {
        if(contains(this._isPending, chans[k])) {
          continue;
        }
        yield* this._invoke(chans[k]);
      }
      this._stopDispatching();
    }.bind(this));
  },

  _invoke: function*(ch) {
    invariant(!ch.closed,
              'Dispatcher._invoke: cannot put on a closed channel');
    this._isPending.push(ch);

    // Start the handler
    yield put(ch, this._pendingPayload);
    // Wait for it to finish
    yield take(ch);

    this._isHandled.push(ch);
  },

  _startDispatching: function(payload) {
    this._isPending = [];
    this._isHandled = [];
    this._pendingPayload = payload;
    this._isDispatching = true;
  },

  _stopDispatching: function(payload) {
    this._pendingPayload = null;
    this._isDispatching = false;
  }
});

module.exports = Dispatcher;
