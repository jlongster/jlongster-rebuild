var path = require('path');
var gulp = require('gulp');
var gutil = require('gulp-util');
var sourcemaps = require('gulp-sourcemaps');
var es = require('event-stream');
var webpack = require('webpack');
var sweetjs = require('gulp-sweetjs');
var regenerator = require('gulp-regenerator');
var rename = require('gulp-rename');
var cache = require('gulp-cached');
var header = require('gulp-header');
var nodemon = require('nodemon');
var webpackConfig = require('./webpack.config');

var webpackInst = webpack(webpackConfig);
gulp.task("webpack", function(cb) {
  webpackInst.run(function(err, stats) {
    if(err) throw new gutil.PluginError("webpack", err);
    //gutil.log("[webpack]", stats.toString());
    cb();
  });
});

function jsheader(text) {
  return es.through(function(file) {
    var contents = file.contents.toString('utf8');
    var strictRe = /^(['"]use strict['"];)/;

    if(contents.match(strictRe)) {
      contents = contents.replace(
        strictRe,
        '$1\n' + text
      );
    }
    else {
      contents = text + '\n' + contents;
    }

    file.contents = new Buffer(contents);
    this.emit('data', file);
  });
}

gulp.task("regenerate", function() {
  gulp.src('node_modules/js-csp/src/**/*.js')
    .pipe(gulp.dest('static/js/shared/csp'))
    .on('end', function() {
      gulp.src('static/js/shared/csp/csp.js')
        .pipe(rename('index.js'))
        .pipe(gulp.dest('static/js/shared/csp'));
    });
});

function makeNodeStream(src, withoutSourcemaps) {
  var stream = src.pipe(cache('src'))
      .pipe(sourcemaps.init())
      .pipe(sweetjs({
        readableNames: true,
        modules: ['es6-macros']
      }))
      .pipe(regenerator())
      .pipe(jsheader('var wrapGenerator = require("regenerator/runtime/dev").wrapGenerator;'))
      .pipe(jsheader('require("source-map-support");'));

  if(!withoutSourcemaps) {
    stream = stream.pipe(sourcemaps.write('.'));
  }
  return stream;
}

gulp.task("src", function(cb) {
  es.merge(
    makeNodeStream(gulp.src('src/**/*.js'))
      .pipe(gulp.dest('build')),
    makeNodeStream(gulp.src('static/js/shared/**/*.js'))
      .pipe(gulp.dest('build/shared')),
    gulp.src(['src/**/*', '!src/**/*.js']).pipe(gulp.dest('build'))
  ).on('end', function() {
    nodemon.restart();
    cb();
  });
});

gulp.task("bin", function() {
  makeNodeStream(gulp.src('bin/**/*.js'), true)
    .pipe(header('#!/usr/bin/env node\n'))
    .pipe(rename(function(path) {
      if(path.extname == '.js') {
        path.extname = '';
      }
    }))
    .pipe(gulp.dest('bin'));
});

gulp.task("watch", function() {
  gulp.watch(["static/js/**/*.js",
              "static/css*/*.less",
              "!static/js/bundle.js"], ["webpack"])

  gulp.watch(["src/**/*.js",
              "static/js/shared/**/*.js"], ["src"]);
});

gulp.task("run", ["watch"], function() {
  nodemon({
    execMap: {
      js: 'node --harmony'
    },
    script: 'build/main.js',
    ext: 'noop'
  }).on('restart', function() {
    console.log('restarted!');
  });
});

gulp.task("all", ["webpack", "src", "regenerate"]);
gulp.task('default', ['all']);
