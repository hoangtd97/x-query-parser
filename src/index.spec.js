'use strict';

const assert     = require('assert');
const mongoose   = require('mongoose');
const Schema     = mongoose.Schema;
const { Parser } = require('.');

const OrderSchema = new Schema({
  shop_id  : { type : Number },
  id       : { type : Number },
  customer : {
    id   : { type : Number },
    name : { type : String },
    phone : { type : String },
  },
  line_items : [{
    id       : { type : Number },
    barcode  : { type : String },
    quantity : { type : Number }
  }],
  created_at         : { type : Date },
  updated_at         : { type : Date },
  status             : { type : String },
  private_field      : { type : Number },
  order_number       : { type : String },
  location_id        : { type : Number },
  fulfillment_status : { type : String },
  is_deleted         : { type : Boolean }
});

const parse = Parser({
  schema    : OrderSchema,
  required  : ['shop_id'],
  blackList : ['private_field'],
  whiteList : ['*'],
  alias     : {
    barcode : 'line_items.barcode'
  },
  defaults  : {
    page       : 1,
    limit      : 20,
    sort       : 'created_at_asc',
    is_deleted : false
  },
  deniedValues : ['', null, undefined],
  custom : {
    keyword : (value) => { return { $or : [
      { 'order_number'   : new RegExp(value, 'gi') },
      { 'customer.phone' : new RegExp(value, 'gi') }
    ]}} 
  }
});

it ('should parse query to mongoose filter successfully', () => {

  let query = {
    'shop_id'              : '100000001',
    'created_at_gte'       : '2019-04-01T03:15:00.000Z',
    'created_at_lte'       : '2019-04-30T03:15:00.000Z',
    'updated_at_from_date' : '2019-04-01T03:15:00.000Z',
    'updated_at_to_date'   : '2019-04-30T03:15:00.000Z',
    'customer.id'          : '',
    'customer.name_like'   : 'hoang',
    'barcode'              : 'HEO',
    'status_in'            : 'NEW,ASSIGN_EMPLOYEE',
    'location_id_in'       : '1000,2000',
    'keyword'              : '0969728159',
    // pagination
    'page'                 : '2', 
    'limit'                : '20',
    'sort'                 : 'created_at_asc,id_desc',
    'fields'               : '-customer',
  };

  let { errors, page, filter, fields, skip, limit, sort } = parse(query);

  let expectedFilter = {
    'shop_id' : 100000001,
    'created_at' : { 
      $gte : '2019-04-01T03:15:00.000Z',
      $lte : '2019-04-30T03:15:00.000Z'
    },
    'updated_at' : {
      $gte : new Date(new Date('2019-04-01T03:15:00.000Z').setHours(0, 0, 0, 0)),
      $lte : new Date(new Date('2019-04-30T03:15:00.000Z').setHours(23, 59, 59, 999))
    },
    'customer.name'      : new RegExp('hoang', 'gi'),
    'line_items.barcode' : 'HEO',
    'status'             : { $in : ['NEW', 'ASSIGN_EMPLOYEE'] },
    'location_id'        : { $in : [1000, 2000] },
    '$or' : [
      { 'order_number'   : new RegExp('0969728159', 'gi') },
      { 'customer.phone' : new RegExp('0969728159', 'gi') }
    ],
    'is_deleted'         : false
  };

  assert.equal(errors, null);
  assert.deepEqual(filter, expectedFilter);
  assert.deepEqual(fields, { private_field : 0, customer : 0 });
  assert.equal(page, 2);
  assert.equal(skip, 20);
  assert.equal(limit, 20);
  assert.deepEqual(sort, { created_at : 1, id : -1 });
});

it ('should parse query to mongoose filter fail when mis required field and use wrong operator', () => {

  let query = {
    'customer.name_gte' : 'hoang',
    'private_field_gt'  : '10',
    'unknown_field_lt'  : '0'
  };

  let { errors, filter } = parse(query);

  let expectedErrors = [
    {
      code     : 'ERR_WRONG_OPERATOR',
      field    : 'customer.name',
      type     : 'string',
      operator : 'gte',
      message  : `Can't use operator gte on customer.name has type string`
    },
    {
      code    : 'ERR_UNAVAILABLE_FIELD',
      field   : 'private_field',
      message : `Can't search on field private_field`
    },
    {
      code    : 'ERR_INVALID_FIELD',
      field   : 'unknown_field',
      message : `Invalid field unknown_field`
    },
    {
      code    : 'ERR_REQUIRED',
      field   : 'shop_id',
      message : 'shop_id is required'
    }
  ];

  assert.deepEqual(errors, expectedErrors);
});

it ('should return not permission error with operator equal', () => {

  let query = {
    shop_id        : 1000001,
    location_id    : '2000',
  };

  let { errors, filter } = parse(query, { 
    permission : { 
      location_id : [1000, 3000],
    } 
  });

  assert.deepEqual(errors, [{
    code    : 'ERR_NOT_PERMISSION',
    field   : 'location_id',
    value   : 2000,
    message : `Can't see item has location_id = 2000`
  }]);

});

it ('should return not permission error with operator in', () => {

  let query = {
    shop_id        : 1000001,
    location_id_in : '1000,2000',
  };

  let { errors, filter } = parse(query, { 
    permission : { 
      location_id : [1000, 3000],
    } 
  });

  assert.deepEqual(errors, [{
    code    : 'ERR_NOT_PERMISSION',
    field   : 'location_id',
    value   : 2000,
    message : `Can't see item has location_id = 2000`
  }]);

});

it ('should auto assign field has permission to filter that not exists in query', () => {

  let query = {
    shop_id        : 1000001
  };

  let { errors, filter } = parse(query, { 
    permission : { 
      location_id : [1000, 3000],
    } 
  });

  assert.deepEqual(filter, {
    shop_id     : 1000001,
    location_id : { $in : [1000, 3000] },
    is_deleted  : false
  });

});

it ('should auto assign field has permission to filter when only query with operators ne, nin', () => {

  let query = {
    shop_id         : 1000001,
    location_id_nin : '1000,2000',
    location_id_ne  : '4000'

  };

  let { errors, filter } = parse(query, { 
    permission : { 
      location_id : [1000, 3000],
    } 
  });

  assert.deepEqual(filter, {
    shop_id     : 1000001,
    location_id : { 
      $ne  : '4000',
      $nin : [1000, 2000],
      $in  : [1000, 3000] 
    },
    is_deleted : false
  });
});
