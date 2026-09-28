var mysql      = require('mysql2');
var connection = mysql.createConnection({
  host     : '10.10.0.10',
  user     : 'root',
  password : 'nevergonnagetit',
  database : 'stocknow'
});
connection.connect(function(err) {  
    if (err) throw err;
});

module.exports = connection;