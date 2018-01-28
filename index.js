'use strict';

const config = require('./config');
const _ = require('lodash');
const objectPath = require('object-path');
const bsonUrlEncoding = require('./utils/bsonUrlEncoding');
const Promise = require('bluebird');


/**
 * 
 * @param {Object} params
 * @param {Object} params.query The find query.
 * @param {Number} params.limit  The page size. Must be between 1 and `config.MAX_LIMIT`.
 * @param {Object} params.fields Fields to query in the Mongo object format, e.g. {_id: 1, timestamp :1}.
 *      The default is to query all fields.
 * @param {String} params.paginatedField  The field name to query the range for. The field must be:
 *        1. Orderable. We must sort by this value. If duplicate values for paginatedField field
 *          exist, the results will be secondarily ordered by the _id.
 *        2. Indexed. For large collections, this should be indexed for query performance.
 *        3. Immutable. If the value changes between paged queries, it could appear twice.
 *      The default is to use the Mongo built-in '_id' field, which satisfies the above criteria.
 *      The only reason to NOT use the Mongo _id field is if you chose to implement your own ids.
 * @param {String} params.next The value to start querying the page.
 * @param {String} params.previous The value to start querying previous page.
 * @param {Boolean} params.sortAscending The value to sort data in asc.
 */

function  paginate(params = {}) {
  if (params.previous) params.previous = bsonUrlEncoding.decode(params.previous);
  if (params.next) params.next = bsonUrlEncoding.decode(params.next);

  params = _.defaults(params, {
    query: {},
    limit: config.DEFAULT_LIMIT,
    paginatedField: '_id'
  });

  const queries = [params.query];

  if (params.limit < 1) params.limit = 1;
  if (params.limit > config.MAX_LIMIT) params.limit = config.MAX_LIMIT;

  // If the paginated field is not _id, then it might have duplicate values in it. This is bad
  // because then we can't exclusively use it for our range queries (that use $lt and $gt). So
  // to fix this, we secondarily sort on _id, which is always unique.
  const shouldSecondarySortOnId = params.paginatedField !== '_id';

  const fieldsToBeRemoveInResponse = [];

  let removePaginatedFieldInResponse = false;

  let fields;
  
  // The query must always include the paginatedField so we can construct the cursor.
  if (params.fields) {

    if (params.fields._id === 0) {
      removePaginatedFieldInResponse = true;
      fieldsToBeRemoveInResponse.push('_id');
    }

    fields = _.extend(params.fields, {
      _id: 1 // Including _id field as it is require to make previous and next fields. 
    });

    if (!fields[params.paginatedField]) {
      fields[params.paginatedField] = 1;
      removePaginatedFieldInResponse = true;
      fieldsToBeRemoveInResponse.push(params.paginatedField);
    }
  }

  const sortAsc = (!params.sortAscending && params.previous) || (params.sortAscending && !params.previous);
  const comparisonOp = sortAsc ? '$gt' : '$lt';

  if (params.next) {
    if (shouldSecondarySortOnId) {
      queries.push({
        $or: [{
          [params.paginatedField]: {
            [comparisonOp]: params.next[0]
          }
        }, {
          [params.paginatedField]: {
            $eq: params.next[0]
          },
          _id: {
            [comparisonOp]: params.next[1]
          }
        }]
      });
    } else {
      queries.push({
        [params.paginatedField]: {
          [comparisonOp]: params.next
        }
      });
    }
  } else if (params.previous) {
    if (shouldSecondarySortOnId) {
      queries.push({
        $or: [{
          [params.paginatedField]: {
            [comparisonOp]: params.previous[0]
          }
        }, {
          [params.paginatedField]: {
            $eq: params.previous[0]
          },
          _id: {
            [comparisonOp]: params.previous[1]
          }
        }]
      });
    } else {
      queries.push({
        [params.paginatedField]: {
          [comparisonOp]: params.previous
        }
      });
    }
  }

  const sortDir = sortAsc ? 1 : -1;
  let sort;
  if (shouldSecondarySortOnId) {
    sort = {
      [params.paginatedField]: sortDir,
      _id: sortDir
    };
  } else {
    sort = {
      [params.paginatedField]: sortDir
    };
  }


  return Promise.resolve(this.find({ $and: queries }, fields)
    .sort(sort)
    .limit(params.limit + 1) // Query one more element to see if there's another page.
    .lean(true)
    .then((results) => {
      const hasMore = results.length > params.limit;
      // Remove the extra element that we added to 'peek' to see if there were more entries.
      if (hasMore) results.pop();
    
      const hasPrevious = !!params.next || !!(params.previous && hasMore);
      const hasNext = !!params.previous || hasMore;
    
      // If we sorted reverse to get the previous page, correct the sort order.
      if (params.previous) results = results.reverse();
    
      const response = {
        results,
        previous: results[0],
        hasPrevious,
        next: results[results.length - 1],
        hasNext
      };
    
      if (response.previous) {
        const previousPaginatedField = objectPath.get(response.previous, params.paginatedField);
        if (shouldSecondarySortOnId) {
          response.previous = bsonUrlEncoding.encode([previousPaginatedField, response.previous._id]);
        } else {
          response.previous = bsonUrlEncoding.encode(previousPaginatedField);
        }
      }
      if (response.next) {
        const nextPaginatedField = objectPath.get(response.next, params.paginatedField);
        if (shouldSecondarySortOnId) {
          response.next = bsonUrlEncoding.encode([nextPaginatedField, response.next._id]);
        } else {
          response.next = bsonUrlEncoding.encode(nextPaginatedField);
        }
      }
    
      // Remove fields that we added to the query (such as paginatedField and _id) that the user didn't ask for.
      if (removePaginatedFieldInResponse) {
        response.results = _.map(response.results, (result) => _.omit(result, fieldsToBeRemoveInResponse));
      }
    
      return response;
    }));
}


/**
 * @param {Schema} schema
 */

module.exports = function(schema) {
  schema.statics.paginate = paginate;
};

module.exports.paginate = paginate;
