
var proxy = require('../proxy');
var axios = require('axios')
var  db  = require('../Sequelize');
const {insertFundamentalMeta} = require('./helpers');
var DomParser = require('dom-parser');
var parser = new DomParser();
const HtmlTableToJson = require('html-table-to-json');
async function main(){

    var r = await axios.get('https://dse.stocknow.mobi/dse30_share.php')

   var dom = parser.parseFromString(r.data);
   var table = dom.getElementsByClassName('shares-table')[0].outerHTML
   var res = HtmlTableToJson.parse(table)
   res = res.results[0]   
   await db.query("update fundamentals set meta_value = 0 where meta_key = 'ds30_listed' ")
   for(var key in res){
      try {
            var row = res[key]
            var code = row['TRADING CODE']
            var meta_key = 'ds30_listed'
            var meta_date = '2021-09-10'
            var meta = {code: code, meta_key: meta_key, meta_value: 1, meta_date: meta_date};
             
              await insertFundamentalMeta(meta)        
      } catch(e) {
        // statements
        console.log(e);
      }
   }
   // 
   // 
   // 
   // 
   // 


    var r = await axios.get('https://dse.stocknow.mobi/dseX_share.php')

   var dom = parser.parseFromString(r.data);
   var table = dom.getElementsByClassName('shares-table')[0].outerHTML
   var res = HtmlTableToJson.parse(table)
   res = res.results[0]   
       await db.query("update fundamentals set meta_value = 0 where meta_key = 'dsex_listed'")



   for(var key in res){
      try {
            var row = res[key]
            var code = row['TRADING CODE']
            var meta_key = 'dsex_listed'
            var meta_date = '2021-09-10'
            var meta = {code: code, meta_key: meta_key, meta_value: 1, meta_date: meta_date};
             // await db.query("update fundamentals set meta_value = 0 where meta_key = 'dsex_listed' and code = '"+code+"'")
              await insertFundamentalMeta(meta)        
      } catch(e) {
        // statements
        console.log(e);
      }
   }
   // 
   // 
   // 
   // 
   // 



}
setTimeout(function(){
    main()
}, 90000)
