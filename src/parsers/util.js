'use strict';

const _ = {
  get : require('lodash.get')
}

const type_names = new Map([
  [Number   , 'number'  ],
  [String   , 'string'  ],
  [Boolean  , 'boolean' ],
  [Object   , 'object'  ],
  [Array    , 'array'   ],
  [Date     , 'date'    ],
  ['string' , 'string'  ],
  ['boolean', 'boolean' ],
  ['long'   , 'long'    ],
  ['integer', 'integer' ],
  ['short'  , 'short'   ],
  ['byte'   , 'byte'    ],
  ['double' , 'double'  ],
  ['float'  , 'float'   ],
  ['date'   , 'date'    ],
  ['binary' , 'binary'  ],
]);

const type_caster = new Map([
  [Number   , Number  ],
  [String   , String  ],
  [Boolean  , Boolean ],
  [Object   , Object  ],
  [Array    , Array   ],
  [Date     , Date    ],
  ['string' , String  ],
  ['boolean', Boolean ],
  ['long'   , Number  ],
  ['integer', Number  ],
  ['short'  , Number  ],
  ['byte'   , Number  ],
  ['double' , Number  ],
  ['float'  , Number  ],
  ['date'   , Date    ],
  ['binary' , Buffer  ],
]);

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
    if (isAvailableField({ field, it })) {
      if (value !== undefined) {
        it.filter[field] = value;
      }
      if (assign !== undefined) {
        it.filter[field] = Object.assign({}, it.filter[field], assign);
      }
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
  let fields = field.split('.');

  if (hasVal(it.blackList, field) || !(hasVal(it.whiteList, field) || hasVal(it.whiteList, fields[0]))) {
    it.errors.push({
      code    : 'ERR_UNAVAILABLE_FIELD',
      field   : field,
      message : `Can't search on field ${field}`
    });
    return false;
  }
  return true;
};

function checkSchemaField({ schema, field }) {
  let field_paths = field.split('.');

  let type = _.get(schema, field);

  if (type === undefined && field_paths.length > 0) {
    if (type === undefined) {
      type = _.get(schema, field_paths.join('.[0].'));
    }

    if (type === undefined) {
      type = _.get(schema, field_paths[0]);
    }
  }
  
  if (typeof type === 'object' && type.type !== undefined) {
    type = type.type;
  }

  if (type !== undefined) {
    return [true, type_names.get(type) || 'unknown', type_caster.get(type) || function (val) { return val }];
  }

  return [false];
}

function isAll(list) {
  return Array.isArray(list) && list.length === 1 && list[0] === '*';
}

function hasVal(list, val) {
  return isAll(list) || Array.isArray(list) && list.includes(val);
}

module.exports = { type_names, set, hasPermission, isAvailableField, checkSchemaField, isAll, hasVal };