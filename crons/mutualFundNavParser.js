var db = require('../db');
var axios = require('axios')
var  sequelize  = require('../Sequelize');
var  moment  = require('moment');
const {insertFundamentalMeta} = require('./helpers');

async function parseNav(ins) {
    var instrument = ins
        if(instrument.sector_id != 14 ){
            // ignoree all except mutual funds
            return
        }     

  try {
    
      // return
       var news = await sequelize.query(`select * from news where  trash != 1 and prefix = '${ins.code}' and details like '% (NAV) of Tk. %' order by post_date desc limit 1`, {logging: false})
        news = news[0][0] || {}
         
        if(news.details == null){
            // console.log(ins.code)
          return
        }
   

        if(news.details && news.details.includes('Fund has reported')){
            // regex for mutual fund
            var rgx = /operation on (.+) the.+? \(NAV\) of Tk. (.+?) per/gi;
            var result = [...news.details.matchAll(rgx)]
            var nav = result[0][2]            
            var date = result[0][1]            
        }

         date = date.replace(',', '').trim()
         // var year = date.split(' ')[2]
         //  if(year.length < 4){
         //      year = "20"+year;
         //  }         
         //  date = year+months[date.split(' ')[0]]

           meta_date = moment(new Date(date)).format('YYYY-MM-DD');


  } catch(e) {  
    // statements
   //  var rows = [{code: news.prefix, meta: 'net_asset_val_per_share', dse: news.post_date, stocknow: news.details}]
   // await sequelize.models.Mismatch.bulkCreate(rows, {updateOnDuplicate:['dse', 'stocknow', 'meta']})
    return;
  }
  nav = nav.replace('(', '-').replace(')', '').replace(',', '')
var meta = {code: news.prefix, meta_key: 'net_asset_val_per_share', meta_value: nav, meta_date: meta_date};
// console.log(meta)
// if(!meta.meta_value){
//   console.log(meta, news.details)
// }
      insertFundamentalMeta(meta)
 
    // console.log(news)
 } 

 async function main(){

   db.query('select * from instruments where updated_at is not null and sector_id is not null', function (e, r) {
        for(var key in r){
              parseNav(r[key])
              // console.log(key)
        }
    })

    
 }

 main()
 setTimeout(function() {
    db.end();
    process.exit();
}, 600000);

