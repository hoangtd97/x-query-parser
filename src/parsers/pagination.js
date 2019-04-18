'use strict';

const pagination_parsers = [
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

module.exports = pagination_parsers;