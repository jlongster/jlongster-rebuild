var React = require('react');
var dom = require('../shared/dom');

module.exports = React.createClass({
  render: function() {
    return dom.header(dom.canvas({ className: 'home-demo' }))
  }
});
