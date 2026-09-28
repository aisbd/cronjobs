// https://stockbangladesh.com/dse-mk?t=TRD
//tables =>  TRD, IDX, MAN, MKISTAT
var sburi = "https://stockbangladesh.com/dse-mk?t=";
var SqlString = require('sqlstring');
var db = require('../db');
var  sequelize  = require('../Sequelize');
var axios = require('axios')

var proxy = require('../proxy');


var dse = require('../dseDB')

function mysql_real_escape_string (str) {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
            case "\0":
                return "\\0";
            case "\x08":
                return "\\b";
            case "\x09":
                return "\\t";
            case "\x1a":
                return "\\z";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "\"":
            case "'":
            case "\\":
            case "%":
                return "\\"+char; // prepends a backslash to backslash, percent,
                                  // and double/single quotes
            default:
                return char;
        }
    });
}




    dse.query("select * from MAN", {raw:true, type: dse.QueryTypes.SELECT}).then( async(res)=>{
        dse.close();
        var r = {}
    r.data =  res;

    var date = r.data[0].MAN_ANNOUNCEMENT_DATE_TIME.split(' ')[0]
    await sequelize.query(`update news set trash = 1 where date = '${date}'`);


            var insertNewsQuery = 'insert into news (prefix, details, post_date, date) values ';
            var arr = [];
            for(var key in r.data){
                var news = r.data[key]

                arr.push(`( '${news.MAN_ANNOUNCEMENT_PREFIX}', ${SqlString.escape(mysql_real_escape_string(news.MAN_ANNOUNCEMENT))}, '${news.MAN_ANNOUNCEMENT_DATE_TIME}', '${news.MAN_ANNOUNCEMENT_DATE_TIME.split(' ')[0]}' )`)
            }
            insertNewsQuery += arr.join(', ');
            insertNewsQuery += " ON DUPLICATE KEY UPDATE details = VALUES(details), trash = 0";


            db.query(insertNewsQuery, function (e) {
                if(e){
                    // console.log(e)
                    // axios.post('https://stocknow.mobi/v1/contact', {message: JSON.stringify(e)+' notify admin about this error. this is system generated message from updateDseNews.js line 34' })
                }
                db.end()
            })

})
// db.query("select * from instruments limit1", function (e, res) {
//     console.log(res)
// })

setTimeout(function() {
    db.end();
    process.exit();
}, 60000);
