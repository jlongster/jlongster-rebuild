var React = require('react');
var dom = require('./shared/dom');

module.exports = React.createClass({
  render: function() {
    return dom.html(
      dom.head(
        dom.title('James Long'),
        dom.meta({
          name: 'viewport',
          content: 'width=device-width, initial-scale=1'
        }),
        dom.link({
          rel: 'shortcut icon',
          type: 'image/x-icon',
          href: '/favicon.ico'
        }),
        dom.link({
          rel: 'alternate',
          type: 'application/atom+xml',
          href: 'http://feeds.feedburner.com/jlongster',
          title: 'Atom Feed'
        })
        // dom.link({
        //   rel: 'stylesheet',
        //   type: 'text/css',
        //   href: '/css/main.css'
        // })
      ),

      dom.body(
        dom.div({ id: 'mount' }, this.props.html),
        dom.script({ src: '/js/bundle.js' })
      )
    );
  }
});
