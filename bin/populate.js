var fs = require('fs');
var _ = require('lodash');
var moment = require('moment');
var util = require('../build/util');
var db = require('../build/db');
var { go, chan, take, put, operations: ops } = require('../build/csp');
var { invokeCallbackM, takeArray } = require('../build/chan-util');
var ipsum = fs.readFileSync(__dirname + '/ipsum.txt', 'utf8');
var len = ipsum.length;

var posts = _.range(50).map(function(x) {
  var idx = Math.random() * (len - 500) | 0;
  var title = ipsum.slice(idx, idx + 30 + (Math.random() * 40 | 0));

  return {
    shorturl: util.slugify(title),
    content: ipsum.slice(idx),
    'abstract': ipsum.slice(idx + 20, idx + 300),
    title: title,
    published: 'y',
    tags: ['foo'],
    date: moment()
  };
});

go(function*() {
  var client = db.client;
  var curPosts = yield take(invokeCallbackM(client,
                                            client.zrange,
                                            db.dbkey('posts'),
                                            0, -1));

  yield takeArray(curPosts.map(post => {
    return invokeCallbackM(client,
                           client.del,
                           db.dbkey('post', post));
  }));
  yield take(invokeCallbackM(client, client.del, db.dbkey('posts')))
  yield takeArray(posts.map(db.savePost));
  console.log('done!');
  db.quit();
});
