# mongoose-cursor-paginate

This module is been developed to provide mongoose support for [mongo-cursor-pagination](https://github.com/mixmaxhq/mongo-cursor-pagination).
Please read [this blog post](https://mixmax.com/blog/api-paging-built-the-right-way) to get
clear understanding on cursor based pagination.


### Installation

```
npm install mongoose-cursor-paginate --save
```

### Usage

Define your mongoose schema and plug the mongoose-cursor-paginate module.

```js
const paginate = require('mongoose-cursor-paginate');

const PostSchema = new mongoose.Schema({
  title: String,
  date: Date,
  body : String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'Author'
  }
});

PostSchema.plugin(mongooseCursorPaginate);

const Post = mongoose.model('Post', PostSchema); // Post.paginate()

```

### Model.paginate([params])

**Parameters**

* `[params]` {Object}

  - `[query]` {Object} - Query criteria. [Documentation](https://docs.mongodb.org/manual/tutorial/query-documents)

  - `[limit]` {Number} - The page size.

  - `[fields]` {Object} - Fields to query in the Mongo object format, e.g. ```{_id: 1, timestamp :1}``` . The default is to query all fields.

  - `[paginatedField]` {String} - The field name to query the range for. The field must be:
    1. Orderable. We must sort by this value. If duplicate values for paginatedField field
    exist, the results will be secondarily ordered by the _id.
    2. Indexed. For large collections, this should be indexed for query performance.
    3. Immutable. If the value changes between paged queries, it could appear twice.

    The default is to use the Mongo built-in '_id' field, which satisfies the above criteria.
    
    The only reason to NOT use the Mongo _id field is if you chose to implement your own ids.
  
  - `[next]` {String} - The value to start querying the page.

  - `[previous]` {String} - The value to start querying previous page.

  - `[sortAscending]` {Boolean} - The value to sort data in asc



**Return value**


Promise fulfilled with object having properties:
* `results` {Array} - Array of documents
* `previous` {String} - previous id.
* `hasPrevious` {Boolean} - will be true only if previous data exist.
* `next` {String} - next id.
* `hasNext` {Boolean} - will be true only if next data exist.


### Examples

```js
Post.paginate({
  query : {  title : { $regex : new RegExp('^Post.*$') } },
  limit : 10,
  fields : { author : 1 },
  paginatedField : 'date',
})
.then((result) => {
 ...
})

```

## Tests

```
npm install
npm run test
```