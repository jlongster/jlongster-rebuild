var React = require('react');
var $ = require('jquery');
var dom = React.DOM;

var App = require('../components/app.js');
var Header = require('../components/header.js');
var Main = require('../components/main.js');
//var Link = require('../components/link.js');

var TestComp = React.createClass({
  getInitialState: function() {
    return {
      poop: 5
    }
  },

  componentDidMount: function() {
    setTimeout(() => {
      this.setState({ poop: 6 });
    }, 2000);
  },

  render: function() {
    return dom.div(null, this.state.poop);
  }
});

module.exports = React.createClass({
  getInitialState: function() {
    return { posts: null };
  },

  componentDidMount: function() {
    $.getJSON('/api/posts?limit=10', res => {
      this.setState({ posts: res });
    });
  },

  render: function() {
    var posts = this.state.posts;

    return App(
      null,
      Header(),
      posts ?
        Main(
          null,
          TestComp(),
          GLOBAL,
          dom.div(
            { className: "intro" },
            "My name is ",
            dom.a({ href: "http://twitter.com/jlongster" }, "James"),
            ". I hope you like to create things and read about technology." +
              " That's pretty much what I do here. ",
            dom.strong(null, "Read my latest post:")
          ),
          dom.div(
            { className: 'major-post' },
            dom.h1(null,
                   dom.a({ href: '/' + posts[0].shorturl }),
                   posts[0].title),
            dom.p(null, posts[0].abstract)
          ),
          dom.ul(
            null,
            posts.map(post => {
              return dom.li({ key: post.shorturl },
                            dom.a({ href: '/post' }, post.title));
              // return dom.li({ key: post.shorturl },
              //               Link({ to: 'post' }, post.title));
            })
          )
        ) :
        Main(null, 'Loading...')
    );
  }
});
