var React = require('react');
var dom = require('../shared/dom');

module.exports = React.createClass({
  render: function() {
    return dom.div(
      { id: 'app' },
      this.props.children
    );
  }
});
