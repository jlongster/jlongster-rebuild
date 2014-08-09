var webpack = require('webpack');

var config = {
  cache: true,
  entry: './static/js/main.js',
  output: {
    filename: './static/js/bundle.js'
  },
  resolve: {
    extensions: ['', '.js', '.sjs'],
    // alias: {
    //   csp: '../../build/csp'
    // },
    fallback: __dirname
  },
  module: {
    loaders: [
      {test: /\.js$/,
       exclude: [/static\/js\/lib\/.*\.js$/,
                 /node_modules\/.*/],
       loader: 'regenerator!sweetjs?modules[]=es6-macros&readers[]=jsx-reader'},
      {test: /\.less$/, loader: "style!css!less"},
      {test: /\.css$/, loader: "style!css"}
    ]
  },
  plugins: [
    new webpack.ProvidePlugin({
      wrapGenerator: "static/js/regenerator.js"
    })
  ]
};

if(process.env.NODE_ENV === 'production') {
  config.plugins = config.plugins.concat([
    new webpack.DefinePlugin({
      "process.env": {
        NODE_ENV: JSON.stringify("production")
      }
    }),
    new webpack.optimize.UglifyJsPlugin(),
    new webpack.optimize.OccurenceOrderPlugin()
  ]);
}
else {
  config.devtool = 'sourcemap';
  config.debug = true;
}

module.exports = config;
