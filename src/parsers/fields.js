'use strict';

const { hasVal } = require('./util');

const fields_parser = [
  {
    matcher : ({ key }) => key === 'fields',
    setter  : ({ it, value }) => {
      let fields = {};

      if (typeof value === 'object') {
        fields = value;
      }
      if (typeof value === 'string' && value.length > 0) {
        let raw_fields = value.split(',');
        for (let raw_field of raw_fields) {
          let field = raw_field;
          if (raw_field.startsWith('-')) {
            field = raw_field.slice(1);
            if (hasVal(it.whiteList, field)) {
              fields[field] = 0;
            }
          }
          else {
            if (hasVal(it.whiteList, field) && !hasVal(it.blackList, field)) {
              fields[raw_field] = 1;
            }
          }
        }
      }

      it.fields = fields;
    },
  },
];

module.exports = fields_parser;