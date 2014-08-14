var csp = require('./shared/csp');
var { go, chan, take, put, operations: ops } = csp;
var db = require('./db');
var { takeAll } = require('./shared/chan-util');

var methods = {
  posts: (opts) => {
    var ch = db.getPosts();
    if(opts.limit) {
      ch = ops.take(opts.limit, ch);
    }

    return ch;
  },

  tags: () => {
    return db.getAllTags();
  }
}

function serve(res, ch) {
  go(function*() {
    res.send(JSON.stringify(yield takeAll(ch)));
  });
}

module.exports = {
  methods: methods,
  serve: serve
};
