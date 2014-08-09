var React = require('react');
var Link = require('../components/link');
var dom = React.DOM;

var App = React.createClass({
  componentDidMount: function() {
    this.setWindowTitle();
  },

  componentDidUpdate: function() {
    this.setWindowTitle();
  },

  setWindowTitle: function() {
    var handler = this.refs.__activeRoute__;
    document.title = handler.title ? handler.title() : 'James Long';
  },

  render: function() {
    return this.props.activeRouteHandler()
  }
});

module.exports = App;
