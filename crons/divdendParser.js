var axios = require('axios');
var db = require('../db')

var moment = require('moment')
var code = "KPCLl";

const {insertFundamentalMeta} = require('./helpers');
const util = require('util');

// node native promisify
const query = util.promisify(db.query).bind(db);

function mergedData(cash, stock) {
  var data = {}
  for(var k in cash){
        if(cash[k][1] == null){
          continue;
        }
        if(data[cash[k][1].trim()]  == null){
            data[cash[k][1].trim()] =  {};
        }
        data[cash[k][1].trim()].cash =  cash[k][0].trim();
    }

  for(var k in stock){
        if(stock[k][1] ==null){
          continue;
        }
        if(data[stock[k][1].trim()]  == null){
            data[stock[k][1].trim()] =  {};
        }
        data[stock[k][1].trim()].stock =  stock[k][0].trim();
    }

  return data;
}

function parseDividendString(str) {
  str = str.trim().replace(/RIU/g, '');
  str = str.trim().replace(/B/g, '');
  // console.log(str)
  var data = str.split(',')
  for(var k in data){
    data[k] = data[k].split('%')
  }
  return data
}

(async () => {
  try {
    const instruments = await query("select * from instruments WHERE `updated_at` is not null and category in ('A', 'B', 'N', 'Z') and active = 1 order by code asc");

    for(var ins in instruments){

        var instrument = instruments[ins];

       

          try {
               console.log("parsing =>", instrument.code)
                   var r = await axios.get('https://dse.stocknow.mobi/displayCompany.php?name='+instrument.code, 
                    { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.64 Safari/537.31' } )
                        var values = []
                        var metaDatas = []
                        var cashRgx = /Cash.+70%">(.+?)<\/td>/gims
                        var stockRgx = /Stock.*?td>(.+?)<\/td>/gims
                        var cashString = [...r.data.matchAll(cashRgx)]
                        var stockString = [...r.data.matchAll(stockRgx)]
                        cashString = cashString[0][1];
                        stockString = stockString[1][1];
                        var cashArray = parseDividendString(cashString)
                        var stockArray = parseDividendString(stockString)
                        var data = mergedData(cashArray, stockArray);

                        for(var key in data){
                          var yr = key;
                          yr = yr.replace(/\./g, '')
                          if(/^[\d\d]{2}$/.test(key)){
                            if(parseInt(key) > 30){
                              yr = '19'+key
                            }else{
                               yr = '20'+key
                            }
                          }
                          if(/^[\d\d\d\d]{4}$/.test(yr) == false){
                            console.log(instrument.code)
                            console.log(key)
                            // console.log(yr)
                            continue;
                          }
                          var str = "( '"+instrument.code+"', '"+yr+'-12-31'+"',  '"+(data[key].cash || 0)+"',  '"+(data[key].stock || 0)+"', '"+0+"' )";
                           values.push(str)
                           metaDatas.push({meta_key: 'stock_dividend', meta_value: (data[key].stock || 0), meta_date: yr+'-12-31', code: instrument.code })
                           metaDatas.push({meta_key: 'cash_dividend', meta_value: (data[key].cash || 0), meta_date: yr+'-12-31',  code: instrument.code })


                        }
                        if(values.length < 1){
                          continue;
                        }

                          var sortedMeta = await metaDatas.sort((a, b)=>{
                            if(a.meta_date < b.meta_date){
                              return -1
                            }
                            return 1
                          })


                          for( const element of sortedMeta){
                            // console.log(element, 'inside for')
                           var obj = Object.assign({}, element)
                           // console.log('\x1b[33m%s\x1b[0m', obj)
                            await insertFundamentalMeta(obj);                            
                          }
                         

                            var q = "insert IGNORE into dividends (`code`, `date`, `cash`, `stock`, `news_id`) values "+ values.join(", ")
                            try {
                              // statements
                               query(q).catch((e)=>{
                                   console.log(instrument.code)
                                 console.log(e)
                               })     
                            } catch(e) {
                              // statements
                              console.log(instrument.code);
                              console.log(e);
                            }       


          } catch(e) {
            // statements
               console.log("erooro =>", instrument.code)
          }




    }

    // console.log(id)

    // console.log(news);
  } catch(e) {
    console.log(instrument.code)
    console.log(e)
    // db.end();
  }
})()

setTimeout(function() {
    connection.end();
    process.exit();
}, 12000000);
