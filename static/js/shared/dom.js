var React = require('react');
var objProto = Object.getPrototypeOf({});

function proxy(type) {
  return function (props) {
    var args = Array.prototype.slice.call(arguments);

    if(props !== null &&
       !(typeof props === 'object' &&
         Object.getPrototypeOf(props) === objProto)) {
      args.unshift(null);
    }

    return type.apply(React.DOM, args);
  }
}

var dom = {};
for(var k in React.DOM) {
  if(React.DOM.hasOwnProperty(k)) {
    dom[k] = proxy(React.DOM[k]);
  }
}

module.exports = dom;
