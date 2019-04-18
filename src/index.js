'use strict';

const _get = require('lodash.get');

const type_names = new Map([
  [Number , 'number' ],
  [String , 'string' ],
  [Boolean, 'boolean'],
  [Object , 'object' ],
  [Array  , 'array'  ]
]);

const common_operators = [
  {
    key          : 'eq',
    applyOnTypes : ['*'],
    setter       : ({ it, field, value, type }) =>  {
      value = type(value);
      if (hasPermission({ it, field, value })) {
        set({ it, field, assign : { $eq : value } })
      }
    }
  },
  {
    key          : 'ne',
    applyOnTypes : ['*'],
    setter       : ({ it, field, value, type }) =>  {
      value = type(value);
      set({ it, field, assign : { $ne : value } })
    }
  },
  {
    key          : 'gt',
    applyOnTypes : [Number, Date],
    setter       : ({ it, field, value }) =>  set({ it, field, assign : { $gt : value } })
  },
  {
    key          : 'gte',
    applyOnTypes : [Number, Date],
    setter       : ({ it, field, value }) =>  set({ it, field, assign : { $gte : value } })
  },
  {
    key          : 'lt',
    applyOnTypes : [Number, Date],
    setter       : ({ it, field, value }) =>  set({ it, field, assign : { $lt : value } })
  },
  {
    key          : 'lte',
    applyOnTypes : [Number, Date],
    setter       : ({ it, field, value }) =>  set({ it, field, assign : { $lte : value } })
  },
  {
    key          : 'in',
    applyOnTypes : ['*'],
    setter       : ({ it, field, value, type }) => {
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

      values = values.map(val => type(val));

      if (hasPermission({ it, field, values })) {
        set({ it, field, assign : { $in : values} });
      }
    }
  },
  {
    key          : 'nin',
    applyOnTypes : ['*'],
    setter       : ({ it, field, value, type }) => {
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

      values = values.map(val => type(val));

      set({ it, field, assign : { $nin : values} });
    }
  },
  {
    key          : 'like',
    applyOnTypes : [String],
    setter       : ({ it, field, value }) => {
      set({ it, field, value : new RegExp(value, 'gi') });
    }
  },
];

function hasPermission({ it, field, value, values }) {
  if (!Array.isArray(values)) {
    values = [value];
  }

  let allowed_values = it.permission[field];

  if (Array.isArray(allowed_values)) {
    for (value of values) {
      if (!allowed_values.includes(value)) {
        it.errors.push({
          code : 'ERR_NOT_PERMISSION',
          field : field,
          value : value,
          message : `Can't see item has ${field} = ${value}`
        });

        return false;
      }
    }
  }

  return true;
}

function set({ it, field, value, assign }) {
  if (field) {
    if (it.alias[field]) {
      field = it.alias[field];
    }
    if (!isAvailableField({ field, it })) {
      return it.errors.push({
        code    : 'ERR_UNAVAILABLE_FIELD',
        field   : field,
        message : `Can't search on field ${field}`
      });
    }
    if (value !== undefined) {
      it.filter[field] = value;
    }
    if (assign !== undefined) {
      it.filter[field] = Object.assign({}, it.filter[field], assign);
    }
  }
  else {
    if (Array.isArray(it.filter.$or) && Array.isArray(assign.$or)) {
      it.filter.$and = [it.filter.$or, assign.$or];
      delete it.filer.$or;
      delete it.assign.$or;
    }
    Object.assign(it.filter, assign);
  }
}

function isAvailableField({ field, it }) {
  if ((it.blackList.length > 0 && it.blackList.includes(field)) 
    || (it.whiteList.length > 0 && !it.whiteList.includes(field))) {
    return false;
  }
  return true;
};

function checkSchemaField({ schema, field }) {
  let type = _get(schema, field, _get(schema, field.replace('.', '[0]')));

  if (typeof type === 'object' && type.type !== undefined) {
    type = type.type;
  }

  if (type !== undefined) {
    return [true, type];
  }

  return [false];
}

const pagination_transpilers = [
  {
    matcher : ({ key }) => key === 'page',
    setter  : ({ value, it }) => {
      let page = parseInt(value);
      if (Number.isNaN(page) || !(page > 0)) {
        it.page = null;
        it.errors.push({
          code    : 'ERR_INVALID_TYPE',
          message : 'page must be an integer and greater than 0',
          key     : 'page'
        });
        return;
      }
      it.page = page;
    },
  },
  {
    matcher : ({ key }) => key ==='limit',
    setter : ({ value, it }) => {
      let limit = parseInt(value);
      if (Number.isNaN(limit) || !(limit >= 0)) {
        it.limit = null;
        it.errors.push({
          code    : 'ERR_INVALID_TYPE',
          message : 'limit must be an positive integer',
          key     : 'limit'
        });
        return;
      }
      it.limit = limit;
    },
  },
  {
    matcher : ({ key }) => key ==='sort',
    setter : ({ value, it }) => {
      let sort     = {};
      let raw_sort = value;

      let list_field_direction = raw_sort.split(',');

      for (let field_direction of list_field_direction) {
        if (field_direction.endsWith('_asc')) {
          let field = field_direction.slice(0, -('_asc'.length));
          sort[field] = 1;
          continue;
        }
        if (field_direction.endsWith('_desc')) {
          let field = field_direction.slice(0, -('_desc'.length));
          sort[field] = -1;
          continue;
        }
        it.errors.push({
          code : 'INVALID_SORT',
          value : field_direction
        });
        return;
      }

      it.sort = sort;
    },
  }
];

const key_operator_transpilers = [
  {
    matcher  : ({ key }) => common_operators.find(operator => key.endsWith('_' + operator.key)),
    setter   : ({ key, value, it }) => {
      let operator = common_operators.find(operator => key.endsWith('_' + operator.key));
      let field = key.slice(0, -(operator.key.length + 1));

      let [schema_has_field, type] = checkSchemaField({ schema : it.schema, field });

      if (!schema_has_field) {
        return it.errors.push({
          code : 'ERR_INVALID_FIELD',
          field : field,
          message : `Invalid field ${field}`
        });
      }

      if (operator.applyOnTypes[0] !== '*' && !operator.applyOnTypes.includes(type)) {
        let type_name = type_names.get(type);
        return it.errors.push({
          code     : 'ERR_WRONG_OPERATOR',
          field    : field, 
          type     : type_name,
          operator : operator.key,
          message  : `Can't use operator ${operator.key} on ${field} has type ${type_name}`
        });
      }

      operator.setter({ it, field, value, type });
    },
  },
  {
    name    : 'equal',
    matcher : () => true,
    setter  : ({ key, value, it }) => {
      let field = key;

      if (hasPermission({ it, field, value })) {
        set({ it, field, value });
      }
    },
  }
];

const DEFAULT_TRANSPILERS = [].concat(pagination_transpilers).concat(key_operator_transpilers);

function transpile({ transpilers = DEFAULT_TRANSPILERS, query, it }) {
  for (let key in query) {
    let value = query[key];

    for (let { matcher, setter } of transpilers) {
      if (matcher({ key, value, it })) {
        setter({ key, value, it });
        break;
      }
    }
  }
}

function Parser({ schema, required = [], blackList = [], whiteList = [], defaults, custom = {}, alias = [] }) {
  if (typeof schema.obj === 'object') {
    schema = schema.obj;
  }

  let custom_transpilers = [];

  for (let custom_key in custom) {
    custom_transpilers.push({
      matcher : ({ key }) => key === custom_key,
      setter  : ({ it, key, value }) => {
        let custom_setter = custom[custom_key];
        let custom_value = custom_setter(value);

        set({ it, assign : custom_value });
      }
    });
  }

  let transpilers = custom_transpilers.concat(DEFAULT_TRANSPILERS);

  return function parse(query, { permission = {} }={}) {

    let errors = [];

    const it = { errors, schema, required, blackList, whiteList, defaults, custom, alias, permission };
  
    Object.assign(it, { filter : {} }, defaults);
  
    transpile({ transpilers, it, query });

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

    return it;
  }
}

module.exports = { Parser, isAvailableField, checkSchemaField, set };