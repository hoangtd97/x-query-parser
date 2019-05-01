'use strict';

const { type_names, set, hasPermission, checkSchemaField, isAll } = require('./util');


const common_operators = [
  {
    key          : 'eq',
    query_key    : '_eq',
    applyOnTypes : ['*'],
    setter       : ({ it, field, value, caster }) =>  {
      value = caster(value);
      if (hasPermission({ it, field, value })) {
        set({ it, field, assign : { $eq : value } })
      }
    }
  },
  {
    key          : 'ne',
    query_key    : '_ne',
    applyOnTypes : ['*'],
    setter       : ({ it, field, value }) =>  set({ it, field, assign : { $ne : value } })
  },
  {
    key          : 'gt',
    query_key    : '_gt',
    applyOnTypes : ['number', 'date'],
    setter       : ({ it, field, value }) =>  set({ it, field, assign : { $gt : value } })
  },
  {
    key          : 'gte',
    query_key    : '_gte',
    applyOnTypes : ['number', 'date'],
    setter       : ({ it, field, value }) =>  set({ it, field, assign : { $gte : value } })
  },
  {
    key          : 'from_date',
    query_key    : '_from_date',
    applyOnTypes : ['date'],
    setter       : ({ it, field, value }) =>  {
      let date = new Date(value);
      date.setHours(0, 0, 0, 0);
      set({ it, field, assign : { $gte : date } })
    }
  },
  {
    key          : 'lt',
    query_key    : '_lt',
    applyOnTypes : ['number', 'date'],
    setter       : ({ it, field, value }) =>  set({ it, field, assign : { $lt : value } })
  },
  {
    key          : 'lte',
    query_key    : '_lte',
    applyOnTypes : ['number', 'date'],
    setter       : ({ it, field, value }) =>  set({ it, field, assign : { $lte : value } })
  },
  {
    key          : 'to_date',
    query_key    : '_to_date',
    applyOnTypes : ['date'],
    setter       : ({ it, field, value }) =>  {
      let date = new Date(value);
      date.setHours(23, 59, 59, 999);
      set({ it, field, assign : { $lte : date } })
    }
  },
  {
    key          : 'in',
    query_key    : '_in',
    applyOnTypes : ['*'],
    setter       : ({ it, field, value, caster }) => {
      let values = value;
      if (typeof value === 'string') {
        values = value.split(',');
      }
      if (!Array.isArray(values)) {
        return it.errors.push({
          code     : 'ERR_INVALID_TYPE',
          field    : field,
          operator : 'in',
          type     : ['array', 'string'],
          value    : value,
          message  : `Operator in expect a string or array value, but received ${value}`
        });
      }

      values = values.map(val => caster(val));

      if (hasPermission({ it, field, values })) {
        set({ it, field, assign : { $in : values} });
      }
    }
  },
  {
    key          : 'nin',
    query_key    : '_nin',
    applyOnTypes : ['*'],
    setter       : ({ it, field, value, caster }) => {
      let values = value;

      if (typeof value === 'string') {
        values = value.split(',');
      }

      if (!Array.isArray(values)) {
        return it.errors.push({
          code     : 'ERR_INVALID_TYPE',
          field    : field,
          operator : 'in',
          type     : ['array', 'string'],
          value    : value,
          message  : `Operator in expect a string or array value, but received ${value}`
        });
      }

      values = values.map(val => caster(val));

      set({ it, field, assign : { $nin : values} });
    }
  },
  {
    key          : 'like',
    query_key    : '_like',
    applyOnTypes : ['string'],
    setter       : ({ it, field, value }) => set({ it, field, value : new RegExp(value, 'gi') })
  },
  {
    key          : '',
    query_key    : '',
    applyOnTypes : ['*'],
    setter       : ({ it, field, value, caster }) => {
      value = caster(value);
      if (hasPermission({ it, field, value })) {
        set({ it, field, value  });
      }
    }
  },
];

const key_operator_parsers = [
  {
    matcher  : ({ key }) => common_operators.find(operator => key.endsWith(operator.query_key)),
    setter   : ({ key, value, it }) => {
      let operator = common_operators.find(operator => key.endsWith(operator.query_key));
      let field = key;
      if (operator.query_key.length > 0) {
        field = key.slice(0, -(operator.query_key.length));
      }
      let alias;

      if (typeof it.alias[field] === 'string') {
        alias = field;
        field = it.alias[field];
      }

      let [is_schema_has_field, type, caster] = checkSchemaField({ schema : it.schema, field });

      if (!is_schema_has_field) {
        return it.errors.push({
          code : 'ERR_INVALID_FIELD',
          field : field,
          message : `Invalid field ${field}`
        });
      }

      if (!isAll(operator.applyOnTypes) && !operator.applyOnTypes.includes(type)) {
        return it.errors.push({
          code     : 'ERR_WRONG_OPERATOR',
          field    : field, 
          type     : type,
          operator : operator.key,
          message  : `Can't use operator ${operator.key} on ${field} has type ${type}`
        });
      }

      operator.setter({ it, field, value, type, caster });
    },
  }
];

module.exports = key_operator_parsers;