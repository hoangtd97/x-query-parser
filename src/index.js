'use strict';

const { Parsers : DEFAULT_PARSERS, util } = require('./parsers');

const { set } = util;

function Parser({ schema, required = [], blackList = [], whiteList = [], defaults, custom = {}, alias = [] }) {
  if (typeof schema.obj === 'object') {
    schema = schema.obj;
  }

  let custom_parsers = [];

  for (let custom_key in custom) {
    custom_parsers.push({
      matcher : ({ key }) => key === custom_key,
      setter  : ({ it, key, value }) => {
        let custom_setter = custom[custom_key];
        let custom_value = custom_setter(value);

        set({ it, assign : custom_value });
      }
    });
  }

  let parsers = custom_parsers.concat(DEFAULT_PARSERS);

  return function parseQuery(query, { permission = {} }={}) {

    // let started_at = Date.now();

    let errors = [];

    const it = { errors, schema, required, blackList, whiteList, defaults, custom, alias, permission };
  
    Object.assign(it, { filter : {} }, defaults);
  
    parseIt({ parsers, it, query });

    // final process --------------------------

    if (Array.isArray(it.required) && it.required.length > 0) {
      for (let field of it.required) {
        if (it.filter[field] === undefined) {
          it.errors.push({
            code : 'ERR_REQUIRED',
            field : field,
            message : `${field} is required`
          });
        }
      }
    }

    for (let field in it.permission) {
      if (it.filter[field] === undefined
        || (typeof it.filter[field] === 'object' && (it.filter[field].$ne !== undefined || Array.isArray(it.filter[field].$nin)) && !Array.isArray(it.filter[field].$in))) {
        set({ it, field, assign : { $in : it.permission[field] }});
      }
    }

    if (it.page > 0 && it.limit > 0) {
      it.skip = (it.page - 1) * it.limit;
    }

    // console.log('time : ', Date.now() - started_at);

    return it;
  }
}

function parseIt({ it, parsers = DEFAULT_PARSERS, query}) {
  for (let key in query) {
    let value = query[key];

    for (let { matcher, setter } of parsers) {
      if (matcher({ key, value, it })) {
        setter({ key, value, it });
        break;
      }
    }
  }
}

module.exports = { Parser };