var React = require('react');
var RouterLink = require('react-nested-router').Link;
var makePath = require('react-nested-router/modules/helpers/makePath');
var dom = require('../shared/dom');

var Link = React.createClass({
  render: function() {
    if(history.pushState) {
      return RouterLink(this.props, this.props.children);
    }
    else {
      return dom.a({ href: makePath(this.props.to) },
                   this.props.children);
    }
  }
});

module.exports = Link;
