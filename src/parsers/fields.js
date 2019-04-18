'use strict';

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
          if (raw_field.startsWith('-')) {
            let field = raw_field.slice(1);
            fields[field] = -1;
          }
          else {
            fields[raw_field] = 1;
          }
        }
      }

      it.fields = fields;
    },
  },
];

module.exports = fields_parser;