// var db = require('../db');
function mysql_real_escape_string (str) {

     if (typeof str !== 'string' && str instanceof String  === false){
        return str
     }


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
var  db  = require('../Sequelize');
exports.insertFundamentalMeta = async function (meta) {
    // remove this when live
    // return;
        // if(meta.code == 'DESCO'){
        //      console.log('updating', meta)
        // }
        
        // console.log('\x1b[33m%s\x1b[0m', "making all 0")
       await db.query(`update fundamentals set is_latest = 0 where meta_key = '${meta.meta_key}' and code = '${meta.code}'`)
        // console.log('\x1b[33m%s\x1b[0m', "made all")
       await db.query(`insert into fundamentals (code, meta_key, meta_value, meta_date, is_latest, updated_at) values ('${meta.code}', '${meta.meta_key}',  '${mysql_real_escape_string(meta.meta_value)}', '${meta.meta_date}', 1, now())
                
                    ON DUPLICATE KEY UPDATE
                    code = values(code),
                    meta_key = values(meta_key),
                    meta_value = values(meta_value),
                    is_latest = values(is_latest),
                    meta_date = values(meta_date),
                    updated_at = values(updated_at)
                `)            

}