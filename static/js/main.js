var React = require('react');
//var Route = require('react-nested-router').Route;
var App = require('./views/app');
var Home = require('./views/home');
var Post = require('./views/post');

require('../css/main.less');

React.renderComponent(Home(), document.getElementById('mount'));

// React.renderComponent(
//   Route(
//     { handler: App, location: 'history' },
//     Route({ name: "home", path: "/", handler: Home }),
//     Route({ name: "post", handler: Post })
//   ),
//   document.getElementById('mount')
// );
