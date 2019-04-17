# [BETA] X-QUERY-PARSER

Parse query to mongoose filter

# Usage 

* With mongoose schema 

```js
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
  created_at    : { type : Date },
  status        : { type : String },
  private_field : { type : Number },
  order_number  : { type : String },
});
```

* You can create a parser

```js
const { Parser }  = require('x-query-parser');

const parse = Parser({
  schema    : OrderSchema,
  required  : ['shop_id'],
  blackList : ['private_field'],
  whiteList : [],
  alias     : {
    barcode : 'line_items.barcode'
  },
  defaults  : {
    page  : 1,
    limit : 20,
    sort  : 'created_at',
  },
  custom : {
    keyword : (value) => { return { $or : [
      { 'order_number'   : new RegExp(value, 'gi') },
      { 'customer.phone' : new RegExp(value, 'gi') }
    ]}} 
  }
});
```

* That parse query object to mongoose filter

```js
it ('should parser query to mongoose filter successfully', () => {

  let query = {
    'shop_id'              : 100000001,
    'created_at_gte'       : '2019-04-01',
    'created_at_lte'       : '2019-04-30',
    'customer.name_like'   : 'hoang',
    'barcode'              : 'HEO',
    'status_in'            : 'NEW,ASSIGN_EMPLOYEE',
    'keyword'              : '0968726159',
    // pagination
    'page'                 : 2, 
    'limit'                : 20,
    'sort'                 : 'created_at_asc,id_desc'
  };

  let { errors, page, filter, skip, limit, sort } = parse(query);

  let expectedFilter = {
    'shop_id' : 100000001,
    'created_at' : { 
      $gte : '2019-04-01',
      $lte : '2019-04-30'
    },
    'customer.name'      : new RegExp('hoang', 'gi'),
    'line_items.barcode' : 'HEO',
    'status'             : { $in : ['NEW', 'ASSIGN_EMPLOYEE'] },
    '$or' : [
      { 'order_number'   : new RegExp('0968726159', 'gi') },
      { 'customer.phone' : new RegExp('0968726159', 'gi') }
    ],
  };

  assert.deepEqual(filter, expectedFilter);
  assert.equal(page, 2);
  assert.equal(skip, 20);
  assert.equal(limit, 20);
  assert.deepEqual(sort, { created_at : 1, id : -1 });
});
```

* And prevent wrong query

```js
it ('should parser query to mongoose filter fail when mis required field and use wrong operator', () => {

  let query = {
    'customer.name_gte' : 'hoang',
    private_field_gt : 10,
  };

  let { errors, filter } = parse(query);

  let expectedErrors = [
    {
      code : 'ERR_WRONG_OPERATOR',
      field : 'customer.name',
      type : 'string',
      operator : 'gte',
      message : `Can't use operator gte on customer.name has type string`
    },
    {
      code    : 'ERR_UNAVAILABLE_FIELD',
      field   : 'private_field',
      message : `Can't search on field private_field`
    },
    {
      code : 'ERR_REQUIRED',
      field : 'shop_id',
      message : 'shop_id is required'
    }
  ];

  assert.deepEqual(errors, expectedErrors);
});
```

* Support permission on operators : equal, in

```js
it ('should return not permission error', () => {

  let query = {
    shop_id        : 1000001,
    location_id_in : [10001],
    store_id       : 10000,
  };

  let { errors, filter } = parse(query, { 
    permission : { 
      location_id : [10000],
      store_id    : [10001]
    } 
  });

  let expectedErrors = [
    {
      code    : 'ERR_NOT_PERMISSION',
      field   : 'location_id',
      value   : 10001,
      message : `Can't see item has location_id = 10001`
    },
    {
      code    : 'ERR_NOT_PERMISSION',
      field   : 'store_id',
      value   : 10000,
      message : `Can't see item has store_id = 10000`
    }
  ];

  assert.deepEqual(errors, expectedErrors);
});
```

# Full API documents is coming soon ...

# Testing

```sh
npm test
```