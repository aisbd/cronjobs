var db = require('./db')
const util = require('util');

// node native promisify
var query = util.promisify(db.query).bind(db);
// query('select * from configs')
module.exports = query;