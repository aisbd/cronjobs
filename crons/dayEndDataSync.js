var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : '10.10.0.10',
  user     : 'root',
  password : 'nevergonnagetit',
  database : 'stocknow'
});

connection.connect();
connection.query(`
update instruments 
inner join 
    (select code, max(high) as yearly_high, min(low) as yearly_low
    from eod where date > DATE_SUB(NOW(), INTERVAL 1 YEAR) 
    group by code) as eod 
on eod.code = instruments.code
set instruments.yearly_high = eod.yearly_high,
instruments.yearly_low = eod.yearly_low
`, function (e) {
    
    connection.end();
})