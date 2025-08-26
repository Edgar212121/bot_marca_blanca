require('dotenv').config();
require('@babel/register')({
  presets: ['@babel/preset-env'],
  plugins: [['@babel/transform-runtime']],
});

// Import the rest of our application.
module.exports = require('./src/index');