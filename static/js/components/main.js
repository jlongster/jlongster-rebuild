var React = require('react');
var dom = require('../shared/dom');

module.exports = React.createClass({
  render: function() {
    return dom.main(
      { className: 'main clearfix' },
      dom.div(
        { className: 'main-wrapper clearfix' },
        this.props.children
      )
    );
  }
});
