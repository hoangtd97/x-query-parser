'use strict';

module.exports = {
  Parsers : [].concat(require('./pagination')).concat(require('./keyword-operator')),
  util    : require('./util')
}