var React = require('react');
var dom = React.DOM;

var App = require('../components/app.js');
var Header = require('../components/header.js');
var Main = require('../components/main.js');

var PostHeader = React.createClass({
  render: function() {
    return dom.header(
      dom.div({ className: 'titlebar' },
              Link({ to: 'home' },
                   'The Blog of James Long, a Mozilla developer')),
      content
    )
  }
});

module.exports = React.createClass({
  title: function() {
    return 'posteeeed';
  },

  render: function() {
    return App(
      PostHeader(),
      Main(null, 'post...')
    );
  }
});
