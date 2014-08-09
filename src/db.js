var redis = require('redis');
var nconf = require('nconf');
var _ = require('lodash');
var { clone, merge } = _;
var { go, chan, take, put, operations: ops } = require('./shared/csp');
var { invokeCallback, invokeCallbackM, takeArray,
      pipeChans, promise } = require('./shared/chan-util');
var { dateToInt } = require('./util');

var client = redis.createClient(nconf.get('redis:port'),
                                nconf.get('redis:host'));
client.on('error', function(err) {
    console.log('error: ' + err);
});

function quit() {
  client.quit();
}

function db(method /*, args... */) {
  var args = Array.prototype.slice.call(arguments, 1);
  args.unshift(client[method]);
  args.unshift(client);
  return invokeCallbackM.apply(null, args);
}

function dbkey() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('jlongster2');
    return args.join('::');
}

function dbSplitKey(key) {
    return key.split('::');
}

function getPost(key) {
  return promise(function*() {
    var post = yield take(db('hgetall', key));
    if(post) {
      post.tags = (post.tags && post.tags.split(',')) || [];
    }
    return post;
  });
}

function _getPosts(keys, opts) {
  opts = opts || {};
  var ch = chan();
  go(function*() {
    if(opts.lazy) {
      for(var i=0; i<keys.length; i++) {
        yield put(ch, yield take(getPost(keys[i])));
      }
      ch.close();
    }
    else {
      pipeChans(keys.map(k => getPost(k)), ch);
    }
  });
  return ch;
}

function getAllPosts(withDrafts, opts) {
  var ch = chan();
  go(function*() {
    var keys = yield take(db('zrevrange', dbkey('posts'), 0, -1));
    ops.pipe(_getPosts(keys, opts), ch);
  });
  return ch;
}

function getPosts(withDrafts) {
  return getAllPosts(withDrafts, { lazy: true });
}

function getAllPostsByTag(tag, opts) {
  var ch = chan();
  go(function*() {
    var keys = yield take(db('zrevrange', dbkey('tag', tag), 0, -1));
    ops.pipe(_getPosts(keys, opts), ch);
  });
  return ch;
}

function getPostsByTag(tag) {
  return getAllPostsByTag(tag, { lazy: true })
}

function getAllTags() {
  var ch = chan();
  go(function*() {
    var keys = yield take(db('keys', dbkey('tag', '*')));
    keys = keys.map(key => {
      var k = dbSplitKey(key);
      return k[k.length - 1];
    });

    for(var i=0; i<keys.length; i++) {
      yield put(ch, keys[i]);
    }
    ch.close();
  });
  return ch;
}

function renamePost(post, newKey) {
  return promise(function*() {
    var key = dbkey('post', post.shorturl);
    var multi = client.multi();

    multi.rename(key, newKey)
      .zrem(dbkey('posts'), key)
      .zadd(dbkey('posts'), post.date, newKey);

    post.tags.forEach(function(tag) {
      multi.zrem(dbkey('tag', tag), key)
        .zadd(dbkey('tag', tag), post.date, newKey);
    });

    return yield take(invokeCallbackM(multi, multi.exec));
  });
}

function savePost(post) {
  return promise(function*() {
    post = clone(post);
    post.tags = post.tags.join(',');
    var key = dbkey('post', post.shorturl);

    yield take(db('hmset', key, post));
    yield take(db('zadd', dbkey('posts'), dateToInt(post.date), key));
  });
}

function getUser(email) {
  return promise(function*() {
    var user = yield take(db('hgetall', dbkey('user', email)));
    if(user) {
      user.admin = user.admin === 'y';
    }
    return user;
  });
}

function saveUser(user) {
  return promise(function*() {
    user.admin = user.admin ? 'y' : 'n';
    return yield take(db('hmset', dbkey('user', user.email)));
  });
}

function saveAutosave(shorturl, content) {
  return promise(function*() {
    yield take(db('set', 'autosave-' + shorturl));
  });
}

function getAutosave(shorturl) {
  return promise(function*() {
    yield take(db('get', 'autosave-' + shorturl));
  });
}

function removeAutosave(shorturl) {
  return promise(function*() {
    yield take(db('del', 'autosave-' + shorturl));
  });
}

module.exports = {
  getAllPosts: getAllPosts,
  getPosts: getPosts,
  getAllPostsByTag: getAllPostsByTag,
  getPostsByTag: getPostsByTag,
  getAllTags: getAllTags,
  renamePost: renamePost,
  savePost: savePost,
  getUser: getUser,
  saveUser: saveUser,
  saveAutosave: saveAutosave,
  getAutosave: getAutosave,
  removeAutosave: removeAutosave,
  quit: quit,
  dbkey: dbkey,
  client: client
};
