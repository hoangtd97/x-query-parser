'use strict';

class ERR_INVALID_QUERY extends Error {
  constructor({ errors, model }) {
    super();
    this.message   = 'Invalid query';
    this.code      = 'ERR_INVALID_QUERY';
    this.model     = model;
    this.errors    = errors;
    this.reactions = ['FIX_DATA'];
  }
}

module.exports = ERR_INVALID_QUERY;