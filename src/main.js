"use strict";
var http = require('http');
var fs = require('fs');
var nconf = require('nconf');
var express = require('express');
var React = require('react');
var { range } = require('lodash');
var { go, chan, take, put, operations: ops } = require('./shared/csp');
var { serve: serveAPI, methods: api } = require('./api');
var db = require('./db');
var Bootstrap = require('./template');

// config

nconf.env('_');
nconf.defaults({
  http: {
    port: 4000
  },
  redis: {
    host: '127.0.0.1',
    port: 6379
  }
});

// setup

var app = express();
app.use(express.static(__dirname + '/../static'));

// util

function renderString(res, props) {
  res.send(
    '<!DOCTYPE html>' +
      React.renderComponentToStaticMarkup(Bootstrap(props))
  );
}

// This is not used yet. When react-nested-router supports server-side
// rendering, we will render components server-side.
function renderComponent(res, comp) {
  var str = React.renderComponentToString(comp);
  res.send(
    '<!DOCTYPE html>' +
      React.renderComponentToStaticMarkup(Bootstrap({ html: str }))
  );
}

// api routes

app.get('/api/posts', (req, res) => {
  serveAPI(res, api.posts({ limit: parseInt(req.query.limit) }));
});

// default route handler

app.get(/^\/(.*)$/, (req, res) => {
  renderString(res, { html: '' });
});

var server = http.createServer(app);
server.listen(nconf.get('http:port'));

console.log('Started server on ' + nconf.get('http:port') + '...');
