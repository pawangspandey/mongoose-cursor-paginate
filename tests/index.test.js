'use strict';

let mongoose = require('mongoose');
let expect = require('chai').expect;
let mongooseCursorPaginate = require('../index.js');
let config = require('../config');

let MONGO_URI = 'mongodb://127.0.0.1/mongoose_paginate';

let AuthorSchema = new mongoose.Schema({ name: String });
let Author = mongoose.model('Author', AuthorSchema);

let PostSchema = new mongoose.Schema({
  title: String,
  date: Date,
  body : String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'Author'
  }
});

PostSchema.plugin(mongooseCursorPaginate);

let Post = mongoose.model('Post', PostSchema);

describe('mongoose-cursor-paginate', function() {

  before(function(done) {
    mongoose.connect(MONGO_URI, done);
  });

  before(function(done) {
    mongoose.connection.db.dropDatabase(done);
  });

  before(function() {
    let post, posts = [];
    let date = new Date();
    return Author.create({ name: 'Pawan Pandey' }).then(function(author) {
      for (let i = 1; i <= 100; i++) {
        post = new Post({
          title: 'Post #' + i,
          date: new Date(date.getTime() + i),
          author: author._id,
          body : 'Post Body #' + i,
        });
        posts.push(post);
      }
      return Post.create(posts);
    });
  });

  it('return promise', function(){
    let promise = Post.paginate();
    expect(promise.then).to.be.an.instanceof(Function);
  })

  it('resolve object', function(done){
    let promise = Post.paginate();
    promise
    .then((result) => {
      expect(result).to.be.an('object');
      done();
    })
    .catch((error) => {
      done(error);
    });
  })

  it('resolve object should have results, previous, hasPrevious, next, hasNext properties', function(done){
    let promise = Post.paginate();
    promise
    .then((result) => {
      expect(result).to.haveOwnProperty('results');
      expect(result).to.haveOwnProperty('previous');
      expect(result).to.haveOwnProperty('hasPrevious');
      expect(result).to.haveOwnProperty('next');
      expect(result).to.haveOwnProperty('hasNext');
      done();
    })
    .catch((error) => {
      done(error);
    });
  })

  it(`return default ${config.DEFAULT_LIMIT} number\\s of data`, function(done){
    let promise = Post.paginate();
    promise
    .then((result) => {
      expect(result.results.length).to.be.equal(config.DEFAULT_LIMIT);
      done();
    })
    .catch((error) => {
      done(error);
    });
  })

  it('should find query result', function(done){
    let promise = Post.paginate({ query : {  title : 'Post #1' } });
    promise
    .then((result) => {
      expect(result.results.length).to.be.equals(1);
      expect(result.hasNext).to.be.equals(false);
      expect(result.hasPrevious).to.be.equals(false);
      expect(result.previous).to.be.equals(result.next);
      done();
    })
    .catch((error) => {
      done(error);
    });
  })

  it('should resolve regex query result', function(done){
    let promise = Post.paginate({ query : {  title : { $regex : new RegExp('^Post.*$') } } });
    promise
    .then((result) => {
      expect(result.results.length).to.be.equals(config.DEFAULT_LIMIT);
      expect(result.hasNext).to.be.equals(true);
      expect(result.hasPrevious).to.be.equals(false);
      expect(result.previous).to.be.a('string');
      expect(result.next).to.be.a('string');
      done();
    })
    .catch((error) => {
      done(error);
    });
  })

  it('should sort by another field', function(done){
    let promise = Post.paginate({ paginatedField : 'date' });
    promise
    .then((result) => {
      expect(result.results.length).to.be.equals(config.DEFAULT_LIMIT);
      expect(result.hasNext).to.be.equals(true);
      expect(result.hasPrevious).to.be.equals(false);
      expect(result.previous).to.be.a('string');
      expect(result.next).to.be.a('string');
      done();
    })
    .catch((error) => {
      done(error);
    });
  })

  it('should sort in descending order', function(done){
    let promise = Post.paginate({ paginatedField : 'date', sortAscending : false, limit : 5 });
    promise
    .then((result) => {
      expect(result.results.length).to.be.equals(5);
      expect(result.hasNext).to.be.equals(true);
      expect(result.hasPrevious).to.be.equals(false);
      expect(result.previous).to.be.a('string');
      expect(result.next).to.be.a('string');

      expect(result.results[0].date).to.be.greaterThan(result.results[1].date);
      expect(result.results[1].date).to.be.greaterThan(result.results[2].date);
      expect(result.results[2].date).to.be.greaterThan(result.results[3].date);
      expect(result.results[3].date).to.be.greaterThan(result.results[4].date);
      done();
    })
    .catch((error) => {
      done(error);
    });
  })

  it('should only return selected fields', function(done){
    let promise = Post.paginate({ limit : 5, fields : { date : 1, title : 1, _id : 0 } });
    promise
    .then((result) => {
      expect(result.results.length).to.be.equals(5);
      expect(result.hasNext).to.be.equals(true);
      expect(result.hasPrevious).to.be.equals(false);
      expect(result.previous).to.be.a('string');
      expect(result.next).to.be.a('string');
      expect(result.results[0]).to.have.keys('date', 'title');
      done();
    })
    .catch((error) => {
      done(error);
    });
  })

  it('should only return selected fields with sort by another field', function(done){
    let promise = Post.paginate({ limit : 5, fields : { date : 1, title : 1, _id : 0 }, paginatedField : 'date'});
    promise
    .then((result) => {
      expect(result.results.length).to.be.equals(5);
      expect(result.hasNext).to.be.equals(true);
      expect(result.hasPrevious).to.be.equals(false);
      expect(result.previous).to.be.a('string');
      expect(result.next).to.be.a('string');
      expect(result.results[0]).to.have.keys('date', 'title');
      done();
    })
    .catch((error) => {
      done(error);
    });
  })

  it('query --> next should have data', function(done){
    let promise = Post.paginate({ limit : 5, fields : { date : 1, title : 1, _id : 0 }, paginatedField : 'date'});
    promise
    .then((result) => {
      expect(result.results.length).to.be.equals(5);
      expect(result.hasNext).to.be.equals(true);
      expect(result.hasPrevious).to.be.equals(false);
      expect(result.previous).to.be.a('string');
      expect(result.next).to.be.a('string');
      expect(result.results[0]).to.have.keys('date', 'title');
      return Post.paginate({ limit : 5, fields : { date : 1, title : 1, _id : 0 }, paginatedField : 'date', next : result.next})
    })
    .then((result) => {
      expect(result.results.length).to.be.equals(5);
      expect(result.hasNext).to.be.equals(true);
      expect(result.hasPrevious).to.be.equals(true);
      expect(result.previous).to.be.a('string');
      expect(result.next).to.be.a('string');
      expect(result.results[0]).to.have.keys('date', 'title');
      done();
    })
    .catch((error) => {
      done(error);
    });
  })

  it('query --> next --> previous should have initial data', function(done){
    let promise = Post.paginate({ limit : 5, fields : { date : 1, title : 1, _id : 0 }, paginatedField : 'date'});
    promise
    .then((result) => {
      expect(result.results.length).to.be.equals(5);
      expect(result.hasNext).to.be.equals(true);
      expect(result.hasPrevious).to.be.equals(false);
      expect(result.previous).to.be.a('string');
      expect(result.next).to.be.a('string');
      expect(result.results[0]).to.have.keys('date', 'title');
      return Post.paginate({ limit : 5, fields : { date : 1, title : 1, _id : 0 }, paginatedField : 'date', next : result.next})
    })
    .then((result) => {
      expect(result.results.length).to.be.equals(5);
      expect(result.hasNext).to.be.equals(true);
      expect(result.hasPrevious).to.be.equals(true);
      expect(result.previous).to.be.a('string');
      expect(result.next).to.be.a('string');
      expect(result.results[0]).to.have.keys('date', 'title');
      return Post.paginate({ limit : 5, fields : { date : 1, title : 1, _id : 0 }, paginatedField : 'date', previous : result.previous})
      done();
    })
    .then((result) => {
      expect(result.results.length).to.be.equals(5);
      expect(result.hasNext).to.be.equals(true);
      expect(result.hasPrevious).to.be.equals(false);
      expect(result.previous).to.be.a('string');
      expect(result.next).to.be.a('string');
      expect(result.results[0]).to.have.keys('date', 'title');
      done();
    })
    .catch((error) => {
      done(error);
    });
  })

  it('query --> next --> previous should have initial data with all options', function(done){
    let promise = Post.paginate({ limit : 5, fields : { date : 1, title : 1, _id : 0 }, paginatedField : 'date', sortAscending: false, query : {  title : { $regex : new RegExp('^Post.*$') } } });
    promise
    .then((result) => {
      expect(result.results.length).to.be.equals(5);
      expect(result.hasNext).to.be.equals(true);
      expect(result.hasPrevious).to.be.equals(false);
      expect(result.previous).to.be.a('string');
      expect(result.next).to.be.a('string');
      expect(result.results[0]).to.have.keys('date', 'title');
      return Post.paginate({ limit : 5, fields : { date : 1, title : 1, _id : 0 }, paginatedField : 'date', sortAscending: false, query : {  title : { $regex : new RegExp('^Post.*$') } }, next : result.next})
    })
    .then((result) => {
      expect(result.results.length).to.be.equals(5);
      expect(result.hasNext).to.be.equals(true);
      expect(result.hasPrevious).to.be.equals(true);
      expect(result.previous).to.be.a('string');
      expect(result.next).to.be.a('string');
      expect(result.results[0]).to.have.keys('date', 'title');
      return Post.paginate({ limit : 5, fields : { date : 1, title : 1, _id : 0 }, paginatedField : 'date', sortAscending: false, query : {  title : { $regex : new RegExp('^Post.*$') } }, previous : result.previous})
      done();
    })
    .then((result) => {
      expect(result.results.length).to.be.equals(5);
      expect(result.hasNext).to.be.equals(true);
      expect(result.hasPrevious).to.be.equals(false);
      expect(result.previous).to.be.a('string');
      expect(result.next).to.be.a('string');
      expect(result.results[0]).to.have.keys('date', 'title');
      done();
    })
    .catch((error) => {
      done(error);
    });
  })

  
  
  after(function(done) {
    mongoose.connection.db.dropDatabase(done);
  });

  after(function(done) {
    mongoose.disconnect(done);
  });

});