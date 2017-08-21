import $ from 'jquery';
const d3 = require('d3');

// Color related utility functions go in this object
export const bnbColors = [
    '#78e067',
    '#289df5',
    '#8ed0c7',
    '#5d8dc0',
    '#40557d',
    '#ffd733',
    '#f7e9e0',
    '#6495ed',
    '#f4eebb',
    '#3471b0',
    '#b9cbfd',
    '#f3c3ad',
    '#66cdaa',
    '#00c5cd',
    '#5cacee',
    '#f08080',
    '#258ddc',
    '#53b1f7',
    '#cd96cd',
    '#667797',
    '#00ffeb',
];

const spectrums = {
  blue_white_yellow: [
    '#00d1c1',
    'white',
    '#ffb400',
  ],
  fire: [
    'white',
    'yellow',
    '#f3c3ad',
    'black',
  ],
  white_black: [
    'white',
    'black',
  ],
  black_white: [
    'black',
    'white',
  ],
};

export const category21 = (function () {
  // Color factory
  let seen = {};
  let lastType = undefined;
  return function (s, currentType) {
    if (!s) {
      return;
    }
    if(!lastType) {//for first step into
      lastType = currentType;
    }
    if(lastType !== currentType) {
      seen = {};
      lastType = currentType;
    }
    let stringifyS = String(s);
    // next line is for superset series that should have the same color
    stringifyS = stringifyS.replace('---', '');
    if (seen[stringifyS] === undefined) {
      seen[stringifyS] = Object.keys(seen).length;
    }
    /* eslint consistent-return: 0 */
    return bnbColors[seen[stringifyS] % bnbColors.length];
  };
}());

export const colorScalerFactory = function (colors, data, accessor) {
  // Returns a linear scaler our of an array of color
  if (!Array.isArray(colors)) {
    /* eslint no-param-reassign: 0 */
    colors = spectrums[colors];
  }
  let ext = [0, 1];
  if (data !== undefined) {
    ext = d3.extent(data, accessor);
  }
  const points = [];
  const chunkSize = (ext[1] - ext[0]) / colors.length;
  $.each(colors, function (i) {
    points.push(i * chunkSize);
  });
  return d3.scale.linear().domain(points).range(colors);
};
