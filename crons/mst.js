const axios = require('axios')

var proxy = require('../proxy');
var db = require('../db');
var sequelize = require('../Sequelize');
const util = require('util');
const query = util.promisify(db.query).bind(db);
async function main() {

   
  var datee = new Date();

   var txt = await axios.get('https://old.dsebd.org/mst.txt?a='+datee.getTime(), { ...proxy, timeout: 20000 })
   txt = txt.data


   var dtRgx = /TODAY'S SHARE MARKET : (.+?) ==/gims
   var dtRes = [...txt.matchAll(dtRgx)];
   var date = dtRes[0][1].trim();

   
   var mktRgx = /MARKET CAPITALISATION(.+)PRICES IN BLOCK TRANSACTIONS/gims
   var mktRes = [...txt.matchAll(mktRgx)];
   var mktTxt = mktRes[0][1].trim();


   var rows = mktTxt.split("\n")
   var mktD = {}
   for(var k in rows){
      var row = rows[k]
      var flds = row.trim().split(":");
      if(flds[0].trim().includes('EQUITY')){ mktD.equity = flds[1].trim() }
      else if(flds[0].trim().includes('MUTUAL')){  mktD.mutual_fund = flds[1].trim() }
      else if(flds[0].trim().includes('DEBT')){  mktD.debt_securities = flds[1].trim() }
      else if(flds[0].trim().includes('TOTAL')){  mktD.total = flds[1].trim()  }
   }
    // console.log(mktD)
   sequelize.query(`insert ignore into market_stats (date, equity, mutual_fund, debt_securities, total) values ('${date}', '${mktD.equity}', '${mktD.mutual_fund}', '${mktD.debt_securities}', '${mktD.total}')`)
// return 


   txt = txt.split("BLOCK TRANSACTIONS")[1]
   txt = txt.split("Total number of scrips traded in Block")[0]

   var rows = txt.trim().split("\n");
   var startIndex;
   for(var k in rows){
   var cols =  rows[k].trim().split(' ');
    if(cols[0] == 'Instr'){
        startIndex = parseInt(k)+1;
        var line = rows[startIndex].trim().split(' ');

        if(line.length < 3){
          startIndex = startIndex + 1
        }else{
           break;
        }
       
    }
   }

   var data = []

   // get ddate 
   // var date = rows[startIndex - 4]
   //     date = date.replace(/\s+/g, ' ')
   //     date = date.split(' ')
   //     date = date[date.length -2]

    
   //    if(date == "" || date.includes("===") ){
   //      date = rows[0]
   //     date = date.replace(/\s+/g, ' ')
   //     date = date.split(':')
   //     date = date[1].trim()        
   //    }   
        // console.log(rows[0], date)

        // console.log([date])
        // return
    startIndex--
   while (rows[startIndex]) {

    startIndex++

      var cols =  rows[startIndex].replace(/\s+/g, ' ').split(' ');
        if(cols[0] == ''){
            break;
        }
        var code = cols[0]
        var maxPrice = cols[1]
        var minPrice = cols[2]
        var trades = cols[3]
        var quantity = cols[4]
        var value = cols[5]
        data.push(`('${code}', '${maxPrice}', '${minPrice}', '${trades}', '${quantity}', '${value}', '${date}')`)

      
       // statement
   }
  // return console.log(data)

        // console.log(data)
        // return 
    var q = "insert into block_transactions (`code`, `maxPrice`, `minPrice`, `trades`, `volume`, `value`, `date`) values "+ data.join(', ');
      query(q)

   // console.log(txt)
}
main();

setTimeout(function() {

    process.exit();
}, 160000);

