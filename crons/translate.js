
var unirest = require("unirest");
var db = require('../db')
const util = require('util');
var query = util.promisify(db.query).bind(db);
var index = 0
function mysqlEscape(stringToEscape){
    if(stringToEscape == '') {
        return stringToEscape;
    }

    return stringToEscape
        .replace(/\\/g, "\\\\")
        .replace(/\'/g, "\\\'")
        .replace(/\"/g, "\\\"")
        .replace(/\n/g, "\\\n")
        .replace(/\r/g, "\\\r")
        .replace(/\x00/g, "\\\x00")
        .replace(/\x1a/g, "\\\x1a");
}
async function update(key, resp) {

        var req = unirest("POST", "https://nlp-translation.p.rapidapi.com/v1/translate");

        req.headers({
            "content-type": "application/x-www-form-urlencoded",
            "x-rapidapi-key": "2873a5be3amsh637d29895aa0bf3p142010jsn6a47e33631e9",
            "x-rapidapi-host": "nlp-translation.p.rapidapi.com",
            "useQueryString": true
        });

        req.form({
            "text": resp[key].details,
            "to": "bn",
            "from": "en"
        });


       await req.end(function (res) {
            if (res.error) throw new Error(res.error);
            // console.log(res.body)
            if(res.body.translated_text != null){
                var string = mysqlEscape(res.body.translated_text.bn+'..')
                query(`update news set bn = '${string}' where id = '${resp[key].id}'`)
            }

            index += 1
            if(index < resp.length){
                 update(index, resp)
            }            
           
            // console.log(res.body.translated_text.bn);
        });        
        
}


async function main() {

    var resp = await query("select id, details from news where  bn is null  and trash != 1 and post_date > '2015-12-31 00:00:00' order by id desc limit 100")

    var key = 0
    update(key, resp)
}
main();
setTimeout(function() {
    connection.end();
    process.exit();
}, 1600000);
