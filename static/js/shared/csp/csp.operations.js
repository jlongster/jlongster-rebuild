"use strict";

var Box = require("./impl/channels").Box;

var csp = require("./csp.core"),
    go = csp.go,
    take = csp.take,
    put = csp.put,
    takeAsync = csp.takeAsync,
    putAsync = csp.putAsync,
    alts = csp.alts,
    chan = csp.chan,
    CLOSED = csp.CLOSED;


function noOp(v) {
}

function mapFrom(f, ch) {
  return {
    is_closed: function() {
      return ch.is_closed();
    },
    close: function() {
      ch.close();
    },
    _put: function(value, handler) {
      return ch._put(value, handler);
    },
    _take: function(handler) {
      var result = ch._take({
        is_active: function() {
          return handler.is_active();
        },
        commit: function() {
          var take_cb = handler.commit();
          return function(value) {
            return take_cb(value === CLOSED ? CLOSED : f(value));
          };
        }
      });
      if (result) {
        var value = result.value;
        return new Box(value === CLOSED ? CLOSED : f(value));
      } else {
        return null;
      }
    }
  };
}

function mapInto(f, ch) {
  return {
    is_closed: function() {
      return ch.is_closed();
    },
    close: function() {
      ch.close();
    },
    _put: function(value, handler) {
      return ch._put(f(value), handler);
    },
    _take: function(handler) {
      return ch._take(handler);
    }
  };
}

function filterFrom(p, ch, bufferOrN) {
  var out = chan(bufferOrN);
  go(function*() {
    while (true) {
      var value = yield take(ch);
      if (value === CLOSED) {
        out.close();
        break;
      }
      if (p(value)) {
        yield put(out, value);
      }
    }
  });
  return out;
}

function filterInto(p, ch) {
  return {
    is_closed: function() {
      return ch.is_closed();
    },
    close: function() {
      ch.close();
    },
    _put: function(value, handler) {
      if (p(value)) {
        return ch._put(value, handler);
      } else {
        return new Box(!ch.is_closed());
      }
    },
    _take: function(handler) {
      return ch._take(handler);
    }
  };
}

function removeFrom(p, ch) {
  return filterFrom(function(value) {
    return !p(value);
  }, ch);
}

function removeInto(p, ch) {
  return filterInto(function(value) {
    return !p(value);
  }, ch);
}

function* mapcat(f, src, dst) {
  while (true) {
    var value = yield take(src);
    if (value === CLOSED) {
      dst.close();
      break;
    } else {
      var seq = f(value);
      var length = seq.length;
      for (var i = 0; i < length; i++) {
        yield put(dst, seq[i]);
      }
      if (dst.is_closed()) {
        break;
      }
    }
  }
}

function mapcatFrom(f, ch, bufferOrN) {
  var out = chan(bufferOrN);
  go(mapcat, [f, ch, out]);
  return out;
}

function mapcatInto(f, ch, bufferOrN) {
  var src = chan(bufferOrN);
  go(mapcat, [f, src, ch]);
  return src;
}

function pipe(src, dst, keepOpen) {
  go(function*() {
    while (true) {
      var value = yield take(src);
      if (value === CLOSED) {
        if (!keepOpen) {
          dst.close();
        }
        break;
      }
      if (!(yield put(dst, value))) {
        break;
      }
    }
  });
  return dst;
}

function split(p, ch, trueBufferOrN, falseBufferOrN) {
  var tch = chan(trueBufferOrN);
  var fch = chan(falseBufferOrN);
  go(function*() {
    while (true) {
      var value = yield take(ch);
      if (value === CLOSED) {
        tch.close();
        fch.close();
        break;
      }
      yield put(p(value) ? tch : fch, value);
    }
  });
  return [tch, fch];
}

function reduce(f, init, ch) {
  return go(function*() {
    var result = init;
    while (true) {
      var value = yield take(ch);
      if (value === CLOSED) {
        return result;
      } else {
        result = f(result, value);
      }
    }
  }, [], true);
}

function onto(ch, coll, keepOpen) {
  return go(function*() {
    var length = coll.length;
    // FIX: Should be a generic looping interface (for...in?)
    for (var i = 0; i < length; i++) {
      yield put(ch, coll[i]);
    }
    if (!keepOpen) {
      ch.close();
    }
  });
}

// TODO: Bounded?
function fromColl(coll) {
  var ch = chan(coll.length);
  onto(ch, coll);
  return ch;
}

function map(f, chs, bufferOrN) {
  var out = chan(bufferOrN);
  var length = chs.length;
  // Array holding 1 round of values
  var values = new Array(length);
  // TODO: Not sure why we need a size-1 buffer here
  var dchan = chan(1);
  // How many more items this round
  var dcount;
  // put callbacks for each channel
  var dcallbacks = new Array(length);
  for (var i = 0; i < length; i ++) {
    dcallbacks[i] = (function(i) {
      return function(value) {
        values[i] = value;
        dcount --;
        if (dcount === 0) {
          putAsync(dchan, values.slice(0), noOp);
        }
      };
    }(i));
  }
  go(function*() {
    while (true) {
      dcount = length;
      // We could just launch n goroutines here, but for effciency we
      // don't
      for (var i = 0; i < length; i ++) {
        try {
          takeAsync(chs[i], dcallbacks[i]);
        } catch (e) {
          // FIX: Hmm why catching here?
          dcount --;
        }
      }
      var values = yield take(dchan);
      for (i = 0; i < length; i ++) {
        if (values[i] === CLOSED) {
          out.close();
          return;
        }
      }
      yield put(out, f.apply(null, values));
    }
  });
  return out;
}

function merge(chs, bufferOrN) {
  var out = chan(bufferOrN);
  var actives = chs.slice(0);
  go(function*() {
    while (true) {
      if (actives.length === 0) {
        break;
      }
      var r = yield alts(actives);
      var value = r.value;
      if (value === CLOSED) {
        // Remove closed channel
        var i = actives.indexOf(r.channel);
        actives.splice(i, 1);
        continue;
      }
      yield put(out, value);
    }
    out.close();
  });
  return out;
}

function into(coll, ch) {
  var result = coll.slice(0);
  return reduce(function(result, item) {
    result.push(item);
    return result;
  }, result, ch);
}

function takeN(n, ch, bufferOrN) {
  var out = chan(bufferOrN);
  go(function*() {
    for (var i = 0; i < n; i ++) {
      var value = yield take(ch);
      if (value === CLOSED) {
        break;
      }
      yield put(out, value);
    }
    out.close();
  });
  return out;
}

var NOTHING = {};

function unique(ch, bufferOrN) {
  var out = chan(bufferOrN);
  var last = NOTHING;
  go(function*() {
    while (true) {
      var value = yield take(ch);
      if (value === CLOSED) {
        break;
      }
      if (value === last) {
        continue;
      }
      last = value;
      yield put(out, value);
    }
    out.close();
  });
  return out;
}

function partitionBy(f, ch, bufferOrN) {
  var out = chan(bufferOrN);
  var part = [];
  var last = NOTHING;
  go(function*() {
    while (true) {
      var value = yield take(ch);
      if (value === CLOSED) {
        if (part.length > 0) {
          yield put(out, part);
        }
        out.close();
        break;
      } else {
        var newItem = f(value);
        if (newItem === last || last === NOTHING) {
          part.push(value);
        } else {
          yield put(out, part);
          part = [value];
        }
        last = newItem;
      }
    }
  });
  return out;
}

function partition(n, ch, bufferOrN) {
  var out = chan(bufferOrN);
  go(function*() {
    while (true) {
      var part = new Array(n);
      for (var i = 0; i < n; i++) {
        var value = yield take(ch);
        if (value === CLOSED) {
          if (i > 0) {
            yield put(out, part.slice(0, i));
          }
          out.close();
          return;
        }
        part[i] = value;
      }
      yield put(out, part);
    }
  });
  return out;
}

// For channel identification
var genId = (function() {
  var i = 0;
  return function() {
    i ++;
    return "" + i;
  };
})();

var ID_ATTR = "__csp_channel_id";

// TODO: Do we need to check with hasOwnProperty?
function len(obj) {
  var count = 0;
  for (var p in obj) {
    count ++;
  }
  return count;
}

function chanId(ch) {
  var id = ch[ID_ATTR];
  if (id === undefined) {
    id = ch[ID_ATTR] = genId();
  }
  return id;
}

var Mult = function(ch) {
  this.taps = {};
  this.ch = ch;
};

var Tap = function(channel, keepOpen) {
  this.channel = channel;
  this.keepOpen = keepOpen;
};

Mult.prototype.muxch = function() {
  return this.ch;
};

Mult.prototype.tap = function(ch, keepOpen) {
  var id = chanId(ch);
  this.taps[id] = new Tap(ch, keepOpen);
};

Mult.prototype.untap = function(ch) {
  delete this.taps[chanId(ch)];
};

Mult.prototype.untapAll = function() {
  this.taps = {};
};

function mult(ch) {
  var m = new Mult(ch);
  var dchan = chan(1);
  var dcount;
  function makeDoneCallback(tap) {
    return function(stillOpen) {
      dcount --;
      if (dcount === 0) {
        putAsync(dchan, true, noOp);
      }
      if (!stillOpen) {
        m.untap(tap.channel);
      }
    };
  }
  go(function*() {
    while (true) {
      var value = yield take(ch);
      var id, t;
      var taps = m.taps;
      if (value === CLOSED) {
        for (id in taps) {
          t = taps[id];
          if (!t.keepOpen) {
            t.channel.close();
          }
        }
        // TODO: Is this necessary?
        m.untapAll();
        break;
      }
      dcount = len(taps);
      // XXX: This is because putAsync can actually call back
      // immediately. Fix that
      var initDcount = dcount;
      // Put value on tapping channels...
      for (id in taps) {
        t = taps[id];
        putAsync(t.channel, value, makeDoneCallback(t));
      }
      // ... waiting for all puts to complete
      if (initDcount > 0) {
        yield take(dchan);
      }
    }
  });
  return m;
}

mult.tap = function tap(m, ch, keepOpen) {
  m.tap(ch, keepOpen);
  return ch;
};

mult.untap = function untap(m, ch) {
  m.untap(ch);
};

mult.untapAll = function untapAll(m) {
  m.untapAll();
};

function constantlyNull() {
  return null;
}

var Pub = function(ch, topicFn, bufferFn) {
  this.ch = ch;
  this.topicFn = topicFn;
  this.bufferFn = bufferFn;
  this.mults = {};
};

Pub.prototype._ensureMult = function(topic) {
  var m = this.mults[topic];
  var bufferFn = this.bufferFn;
  if (!m) {
    m = this.mults[topic] = mult(chan(bufferFn(topic)));
  }
  return m;
};

Pub.prototype.sub = function(topic, ch, keepOpen) {
  var m = this._ensureMult(topic);
  return mult.tap(m, ch, keepOpen);
};

Pub.prototype.unsub = function(topic, ch) {
  var m = this.mults[topic];
  if (m) {
    mult.untap(m, ch);
  }
};

Pub.prototype.unsubAll = function(topic) {
  if (topic === undefined) {
    this.mults = {};
  } else {
    delete this.mults[topic];
  }
};

function pub(ch, topicFn, bufferFn) {
  bufferFn = bufferFn || constantlyNull;
  var p = new Pub(ch, topicFn, bufferFn);
  go(function*() {
    while (true) {
      var value = yield take(ch);
      var mults = p.mults;
      var topic;
      if (value === CLOSED) {
        for (topic in mults) {
          mults[topic].muxch().close();
        }
        break;
      }
      // TODO: Somehow ensure/document that this must return a string
      // (otherwise use proper (hash)maps)
      topic = topicFn(value);
      var m = mults[topic];
      if (m) {
        var stillOpen = yield put(m.muxch(), value);
        if (!stillOpen) {
          delete mults[topic];
        }
      }
    }
  });
  return p;
}

pub.sub = function sub(p, topic, ch, keepOpen) {
  return p.sub(topic, ch, keepOpen);
};

pub.unsub = function unsub(p, topic, ch) {
  p.unsub(topic, ch);
};

pub.unsubAll = function unsubAll(p, topic) {
  p.unsubAll(topic);
};

module.exports = {
  mapFrom: mapFrom,
  mapInto: mapInto,
  filterFrom: filterFrom,
  filterInto: filterInto,
  removeFrom: removeFrom,
  removeInto: removeInto,
  mapcatFrom: mapcatFrom,
  mapcatInto: mapcatInto,

  pipe: pipe,
  split: split,
  reduce: reduce,
  onto: onto,
  fromColl: fromColl,

  map: map,
  merge: merge,
  into: into,
  take: takeN,
  unique: unique,
  partition: partition,
  partitionBy: partitionBy
};


// Possible "fluid" interfaces:

// thread(
//   [fromColl, [1, 2, 3, 4]],
//   [mapFrom, inc],
//   [into, []]
// )

// thread(
//   [fromColl, [1, 2, 3, 4]],
//   [mapFrom, inc, _],
//   [into, [], _]
// )

// wrap()
//   .fromColl([1, 2, 3, 4])
//   .mapFrom(inc)
//   .into([])
//   .unwrap();
