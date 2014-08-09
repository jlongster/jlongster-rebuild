var moment = require('moment');

// Util

function forcefulDate(date) {
  if(typeof date == 'number') {
    date = intToDate(date);
  }
  else if(typeof date == 'string') {
    date = intToDate(parseInt(date));
  }
  else {
    date = moment();
  }

  return date;
}

function formatDate(date, format) {
  return forcefulDate(date).format(format || 'MMMM DD YYYY');
}

function dateToInt(date) {
  return parseInt(date.format('YYYYMMDD'));
}

function intToDate(x) {
  return moment(x.toString(), 'YYYYMMDD');
}

function dateToRFC3339(date) {
  // For Atom Feeds
  // http://tools.ietf.org/html/rfc3339
  var utc = forcefulDate(date).utc();

  function pad(n) {
    return n < 10 ? '0' + n : n;
  }

  return utc.year() + '-'
    + pad(utc.month() + 1) + '-'
    + pad(utc.date()) + 'T'
    + pad(utc.hours()) + ':'
    + pad(utc.minutes()) + ':'
    + pad(utc.seconds()) + 'Z';
}

function previousDates() {
  var current = moment();
  var end = moment().subtract('years', 2);
  var dates = [];

  while(current > end) {
    dates.push(dateToInt(current));
    current = current.subtract('days', 1);
  }

  return dates;
}

function rootUrl(req, port, noPort) {
  // For some reason req doesn't have the port
  var base = req.protocol + '://' + req.host;

  if(!noPort && port != 80) {
    base += ':' + port;
  }

  return base;
}

function tmpFile() {
  // TODO: use a proper tmp file lib
  return 'blogthing-' + Math.floor(Math.random()*10000) + Date.now();
}

function slugify(name) {
  return name.replace(/[ !@#$%^&*():"'|?=]/g, '-');
}

function handleError(err, next) {
  if(err) {
    if(next) {
      next(err);
    }
    else {
      console.error(err);
    }
  }

  return err;
}

function base32(input) {
  var chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  var res = [];

  while(input != 0) {
    res.push(chars[input % 36]);
    input = input / 36 | 0;
  }

  return res.join('');
}

module.exports = {
  formatDate: formatDate,
  dateToRFC3339: dateToRFC3339,
  dateToInt: dateToInt,
  intToDate: intToDate,
  previousDates: previousDates,
  rootUrl: rootUrl,
  tmpFile: tmpFile,
  slugify: slugify,
  handleError: handleError,
  base32: base32
};
