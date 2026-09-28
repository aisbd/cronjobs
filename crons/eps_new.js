var db = require('../db');
var axios = require('axios')
var  sequelize  = require('../Sequelize');
var  moment  = require('moment');
const {insertFundamentalMeta} = require('./helpers');

var yearEnds;

function stringToDate( offset, d = new Date()) {
    // create Date object for current location
    

    // convert to msec
    // subtract local time zone offset
    // get UTC time in msec
    var utc = d.getTime() + (d.getTimezoneOffset() * 60000);

    // create new Date object for different city
    // using supplied offset
    var nd = new Date(utc + (3600000*offset));

    // return time as a string

    var a =  nd.toLocaleString([], {
        year: "numeric",
        hourCycle: 'h23',
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"        

    }).split(' ');
    var time = a[1];
    var mdy = a[0];

    // We then parse  the mdy into parts
    mdy = mdy.split('/');
    var month = mdy[0];
    // if(month < 10){
    //     month = '0'+month
    // }    
    // if(day < 10){
    //     day = '0'+day
    // }
    var day = parseInt(mdy[1]);
    var year = parseInt(mdy[2]);
    return year + '-' + month + '-' + day 
}



// (Q3 Un-audited): EPS was Tk. (0.15) for January-March 2020 as against Tk. (0.27) for January-March 2019; EPS was Tk. (0.52) for July 2019-March 2020 as against Tk. (0.80) for July 2018-March 2019. NOCFPS was Tk. 0.03 for July 2019-March 2020 as against Tk. 0.01 for July 2018-March 2019. NAV per share was Tk. 11.75 as on March 31, 2020 and Tk. 12.33 as on June 30, 2019.
// nav regex =>  .+? nav .+? tk.(.+?) as
// eps regex =>  eps was tk. (.*?) for (.*?) as 

var months = {}
months['January'] = "-01-31"
months['March'] = "-03-31"
months['June'] = "-06-30"
months['July'] = "-07-31"
months['September'] = "-09-30"
months['November'] = "-11-30"
months['December'] = "-12-31"




function prepareMeta(data) {
    var meta = {};
        // console.log(data)
    meta.meta_value = data[1].trim().replace("(", "-").replace(")", "");

    meta.meta_date = data[2].split('-')[1].trim().replace(',', '').replace("'", " ").replace('as', '')

    var year = meta.meta_date.split(' ')[1];
    if(year.length < 4){
        year = "20"+year;
    }
    year = year.replace('.', '')
    meta.meta_date = year + months[meta.meta_date.split(' ')[0]]
    return meta;
}

async function parseNav(ins) {

  try {
    
      // return
       var news = await sequelize.query(`select * from news where  trash != 1 and prefix = '${ins.code}' and (details like '%NAV per share was%' or details like '% (NAV) of Tk. 1%') order by post_date desc limit 1`)
        news = news[0][0] || {}
        if(news.details == null){
          return
        }
        if(news.details && news.details.includes('Fund has reported')){
            // regex for mutual fund
            var rgx = /operation on (.+) the.+? \(NAV\) of Tk. (.+?) per/gi;
            var result = [...news.details.matchAll(rgx)]
            var nav = result[0][2]            
            var date = result[0][1]            
        }else{      
            // regex for company earning_per_share
            var rgx = /NAV per share was Tk. (.+?) as (?:on|of) (.+?) (?:and|instead)/gi;
            var result = [...news.details.matchAll(rgx)]
            var nav = result[0][1]                 
            var date = result[0][2]                 
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
    var rows = [{code: news.prefix, meta: 'net_asset_val_per_share', dse: news.post_date, stocknow: news.details}]
   await sequelize.models.Mismatch.bulkCreate(rows, {updateOnDuplicate:['dse', 'stocknow', 'meta']})
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

 async function doEpsCorrection(news) {
    var result = news.details.matchAll(/(?:epu|eps) was tk. (.*?) instead of(?: tk.)? (.*?) /gi)

      var r = Array.from(result);  
      var newValue = r[0][1]  
      var oldValue = r[0][2]  



      newValue =  newValue.trim().replace("(", "-").replace(")", "");
      oldValue =  oldValue.trim().replace("(", "-").replace(")", "");

     // console.log([news.details])
    var meta_cont_op ;
    var meta_half_nine_final;
    if(news.details.includes("Q1")){
        // meta_cont_op = "q1_eps_cont_op"
        meta_cont_op = "q1_eps_cont_op"
    }else if(news.details.includes("Q2")){
         // meta_cont_op = "q2_eps_cont_op"
         meta_cont_op = "q2_eps_cont_op"
         // meta_half_nine_final = "half_year_eps_cont_op"
         meta_half_nine_final = "half_year_eps_cont_op"
         // also need halfyearly update
    }else if(news.details.includes("Q3")){
         // meta_cont_op = "q3_eps_cont_op"
         meta_cont_op = "q3_eps_cont_op"
         // meta_half_nine_final = "q3_nine_months_eps"
         meta_half_nine_final = "q3_nine_months_eps"
    }else{
        meta_cont_op = 'earning_per_share'
        meta_half_nine_final = 'earning_per_share'
    }
    var rows = await sequelize.query(`select * from fundamentals where code = '${news.prefix}' and is_latest = 1 and meta_key in ('${meta_cont_op}', '${meta_half_nine_final}') order by meta_value asc`)
    var change = oldValue - newValue




    // console.log(rows[0][0].id)
    // console.log(rows[1])
    try {
            if(newValue == rows[0][0].meta_value){
     
                return;
            }
    } catch(e) {
        // statements
        return
    }
    await sequelize.query(`update fundamentals set meta_value = '${newValue}' where id = ${rows[0][0].id}`)
    if(rows[0][1]){
        // console.log(rows[1])
        await sequelize.query(`update fundamentals set meta_value = '${(rows[0][1].meta_value - change).toFixed(2)}' where id = ${rows[0][1].id}`)
    }


    // console.log(meta_half_nine_final)

 }

async function  newsToMeta(news) {
    var result = news.details.matchAll(/(?:eps|epu) was tk. (.*?) for (.*?) (as|which) /gi)
    var navString = news.details.matchAll(/nav .+ tk. (.+) and/gi)
     navString = Array.from(navString)[0];
      var r = Array.from(result);

        // 3month 
        var  threeMonthEps = r[0];
        var  totalEps = r[1];
        // console.log(threeMonthEps)
        if(threeMonthEps == null){
            if(news.details.includes('instead')){

                doEpsCorrection(news)
                 return false
            }
        
        // console.log(news.prefix)
        // console.log(news.details)
        // return false
        }

          // console.log('successs', news.prefix)
      
      
     // insurance regex


   
    // nav have to do later

    var meta_cont_op ;
    var meta_half_nine_final;
    if(news.details.includes("Q1")){
        // meta_cont_op = "q1_eps_cont_op"
        meta_cont_op = "q1_eps_cont_op"
    }else if(news.details.includes("Q2")){
         // meta_cont_op = "q2_eps_cont_op"
         meta_cont_op = "q2_eps_cont_op"
         // meta_half_nine_final = "half_year_eps_cont_op"
         meta_half_nine_final = "half_year_eps_cont_op"
         // also need halfyearly update
    }else if(news.details.includes("Q3")){
         // meta_cont_op = "q3_eps_cont_op"
         meta_cont_op = "q3_eps_cont_op"
         // meta_half_nine_final = "q3_nine_months_eps"
         meta_half_nine_final = "q3_nine_months_eps"
    }




    //parse nav 
    // var navMeta = parseNavMeta(navString);

    try {
      // statements
      var meta = prepareMeta(threeMonthEps)
          meta.meta_key = meta_cont_op
          meta.code = news.prefix

          insertFundamentalMeta(meta)

      if(totalEps){
          var meta2 = prepareMeta(totalEps);
          meta2.meta_key = meta_half_nine_final
           meta2.code = news.prefix
         
          insertFundamentalMeta(meta2)
      }

    } catch(e) {
      // statements
            // statements
            var rows = [{code: news.prefix, meta: meta_cont_op+ ' critical error:', dse: news.post_date, stocknow: e.toString() }]
          await  sequelize.models.Mismatch.bulkCreate(rows, {updateOnDuplicate:['dse', 'stocknow', 'meta']})            
    }



}

 function parseEps(instrument) {
    db.query("select * from news where  trash != 1 and prefix = '"+instrument.code+"' and (details like '%EPS was Tk%' or details like '%EPU was Tk%') order by post_date desc limit 1", async function (e, result) {
        var result = result[0];
        if(!result){
            return;
        }
        result.instrument_id = instrument.id

        try {
             newsToMeta(result)
            // statements
        }  catch(e) {
            // statements
            var rows = [{code: news.prefix, meta: 'earning_per_share - auto parse failed - epsParser.js line:228', dse: news.post_date, stocknow: news.details}]
           await sequelize.models.Mismatch.bulkCreate(rows, {updateOnDuplicate:['dse', 'stocknow', 'meta']})            
        }
       
    })
}

function insert_earning_per_share(news) {
    // try {
    //     var result = news.details.matchAll(/reported EPS of tk.(.+?),.+ended on (.+?)\./gi)
    //     var result = Array.from(result)[0];
    //     console.log(result)
    //     var meta = {}
    //     meta.meta_key = "earning_per_share"
    //     meta.code = news.prefix
    //     meta.meta_value = result[1].trim()


    //     var d = result[2].split('as')[0].trim().replace(',', '').replace("'", " ")
    //     d = new Date(d)
    //     meta.meta_date = d.getFullYear()+'-'+("0" + (d.getUTCMonth()+1)).slice(-2) +'-'+("0" + (d.getUTCDate()+1)).slice(-2) ;
    //    insertFundamentalMeta(meta)
        
    // } catch(e) {
    //     // statements
    //      console.log(news, e);
    //     process.exit()
       
    // }

}

function parseAnnualEps(instrument) {

    // parse insert_earning_per_share

    db.query("select * from news where prefix = '"+instrument.code+"' and details like '%has% reported EPS%' and trash != 1 and post_date > '2020-01-01' order by post_date desc limit 1", function (e, result) {
        var result = result[0];
        if(!result){
            return;
        }

         var metaValue ;
         try {
              metaValue  = [...result.details.matchAll(/EPS.+?Tk\. (\(?[0-9.]+)\)?./gi)][0][1]
              metaDate  = [...result.details.matchAll(/EPS.+ended on (.+?)(?:\.| as | \()/gi)][0][1]
 
              metaDate = stringToDate( '+6', new Date(metaDate))


              metaValue = metaValue.replace("(", "-").trim()
         } catch(e) {
             // statements
             console.log(e, result);
             return
         }



            var meta = {code: result.prefix, meta_key: 'earning_per_share', meta_value: metaValue, meta_date: metaDate};
            // console.log(meta)
            // if(!meta.meta_value){
            //   console.log(meta, news.details)
            // }
            insertFundamentalMeta(meta)         
                   

          // console.log({m:result.details});
        // console.log(metaDate)
        return        

    })    
}

function parseDividend(instrument){
   db.query("select * from news where prefix = '"+instrument.code+"' and details like '%has recommended%' and trash != 1 and post_date > '2020-01-01' order by post_date desc limit 1", function (e, result) {
        var result = result[0];
        if(!result){
            return;
        }



         var metaValue ;
         // console.log(result)

         try {
            metaValue =  [...result.details.matchAll( /([0-9.]+)% (?:stock|cash)/gi )]
            if(metaValue.length == 0){
                return
             // statements
            }
             var metaDate  = yearEnds[instrument.code]
            
              metaDate = stringToDate( '+6', new Date(metaDate))

 

            var meta = metaValue[0]
            var meta_key = 'cash_dividend';
            if(meta[0].includes('stock')){
                meta_key = 'stock_dividend'
            }
            insertFundamentalMeta({code: result.prefix, meta_key: meta_key, meta_value: meta[1], meta_date: metaDate})

            // second vallue
             meta = metaValue[1]
             if(meta == null){
                return
             }
             meta_key = 'cash_dividend';
            if(meta[0].includes('stock')){
                meta_key = 'stock_dividend'
            }
             insertFundamentalMeta({code: result.prefix, meta_key: meta_key, meta_value: meta[1], meta_date: metaDate})

        } catch(e) {
             // statements
             console.log(e, result);
         }

     })

}

async function main() {
   var yearends = await sequelize.query("select meta_value, code from fundamentals where meta_key  = 'year_end' and is_latest = 1")
    yearends = yearends[1]
     yearEnds = {}
    for(var key in yearends){
        
         yearEnds[yearends[key].code] = yearends[key].meta_value
    }

   
   
   db.query('select * from instruments where updated_at is not null', function (e, r) {
       for(var key in r){
        try {
              parseEps(r[key])
        } catch(e) {
            console.log(e,)
            // statements
           
        }        
        try {
             parseNav(r[key])
        } catch(e) {
            // statements
           
        }        
        try {
             parseAnnualEps(r[key])
        } catch(e) {
            // statements
           
        }
         try {
               parseDividend(r[key])
        } catch(e) {
            // statements

        }
       
        
        
         // parseDividend(r[key])
         // parse eps and dividend

        // if(r[key].code == 'GREENDELT'){

           
            // console.log(metaDate)
            // process.exit
         // }               
       
        
       }
    })    
}


main()



setTimeout(function() {
    db.end();
    process.exit();
}, 600000);