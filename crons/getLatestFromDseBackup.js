var  sequelize  = require('../Sequelize');
var axios = require('axios');
var DomParser = require('dom-parser');
var parser = new DomParser();
var db = require('../db');

var keyBy = require('lodash.keyby');
var moment = require('moment');
var mysql      = require('mysql2');
var connection = mysql.createConnection({
  host     : '10.10.0.10',
  user     : 'root',
  password : 'nevergonnagetit',
  database : 'stocknow'
});


var mds = require('./test')


// async function abc(){
// var d = await mds()
// // console.log(d)    
// }
// abc()
// return 

function createNewInstrument(code) {
    // console.log(code, 'this is create new instroment code console log')
        try {
                axios.get('https://dse.stocknow.mobi/displayCompany.php?name='+code).then((r)=>{
                const regex = /<th>Sector<\/th>.+?<td>(.+?)<\/td>/gims;
                const nameRegx = /Company Name: <i>(.+?)<\/i>/gims;
                const found = [...r.data.matchAll(regex)];
                var name = [...r.data.matchAll(nameRegx)];

                try {
                var sector = (found[0][1]);
                name = name[0][1];

                } catch(e) {
                    return 
                    sector = "Miscellaneous"
                    // statements
                    console.log(e);
                }


                    db.query("select `id` from sector_lists where name = '"+sector+"'", (err, result)=>{
                        if(err){
                            // throw "Sector not found";
                        }
                        var sector_id = result[0].id;
                        var q = "insert into instruments (`code`, `name`, `sector_id`) values ('"+code+"', '"+name+"', '"+sector_id+"')";
                        db.query(q, function (e) {
                            if(e){
                                // throw  "Insert failed";
                            }                   
                        })

                        // db.query()

                    })
                    // console.log(match)
                })
        } catch(e) {
            // statements
           // console.log(e)
            // axios.post("https://stocknow.mobi/v1/contact", {name: "System Cron message", mobile:'err', device:'server', message: "New share insert failed\n"+JSON.stringify(e)}).then((r)=>{
            //     console.log("ssssmmm")
            // })
         
        }

}

 var updateIndex = require('./updateIndex');

 function isSameDay(date, date2 = moment()) {
    return  moment(date).isSame(date2, 'day');
     // if(diff == 0){
     //     return true
     // }
     // return false
 }

// var Sequelize = require('sequelize');
// const sequelize = new Sequelize('stocknow', 'root', 'nevergonnagetit', {
//   host: '172.105.121.84',
//   dialect: 'mysql'
// });


// cron.schedule('* * * * *', () => {
    // get existing rows 

connection.connect();
mds().then((r)=>{
    connection.query('SELECT * from instruments where active = 1', async function (error, results, fields) {
      if (error) throw error;

      var insertQuery = "insert into instruments (id, open, high, low, close, ycp, trades, value, volume, category, spot, updated_at) values ";
            queryValues = [];
        var instruments =  keyBy(results, 'code')



        var minuteDataQuery = "insert into minute_data (code, price, volume, value, trades, date, created_at) VALUES ";
        var minuteQueryValues = [];


    
        // console.log(r.data.TRD)
        // return 
        var indexData = r.data.IDX;
        var trd = r.data.TRD[0];
        // console.log(r.data.IDX)
        var tradeData = trd


         


        // if trades is 0 exit process 
        if(trd.TRD_TOTAL_TRADES < 1){
              process.exit(); 
            return
        }

        // if StockNow data is updated then exit process
        var lastUpdateDateTime = await sequelize.query("select TRD_LM_DATE_TIME from trades where TRD_LM_DATE_TIME >= '"+trd.TRD_LM_DATE_TIME+"'");
       if(lastUpdateDateTime[0].TRD_LM_DATE_TIME){
        // updated row available
              process.exit(); 
            return        
       }
        // if(trd.TRD_LM_DATE_TIME)

        connection.query(`insert into trades (TRD_TOTAL_TRADES, TRD_TOTAL_VOLUME, TRD_TOTAL_VALUE, TRD_LM_DATE_TIME) 
        values 
         (
             '${trd.TRD_TOTAL_TRADES}',
             '${trd.TRD_TOTAL_VOLUME}',
             '${trd.TRD_TOTAL_VALUE}',
             '${trd.TRD_LM_DATE_TIME}'
             
            )`, (e)=>{
                console.log(e)
                if(e){
                    // changed here
                     process.exit(); 
                     return
                }
               
            })
        // try {
        //   updateIndex(r.data.IDX)
        // } catch(e) {
        
        //   console.log(e);
        // }


        r.data = r.data.MKISTAT;


        // console.log(r.data);

        var rows = r.data;
            // MKISTAT_INSTRUMENT_CODE: 'EBL1STMF',
            // MKISTAT_INSTRUMENT_NUMBER: 1859,
            // MKISTAT_QUOTE_BASES: 'A-MF',
            // MKISTAT_OPEN_PRICE: '4.40',
            // MKISTAT_PUB_LAST_TRADED_PRICE: '4.30',
            // MKISTAT_SPOT_LAST_TRADED_PRICE: '0.00',
            // MKISTAT_HIGH_PRICE: '4.40',
            // MKISTAT_LOW_PRICE: '4.20',
            // MKISTAT_CLOSE_PRICE: '4.30',
            // MKISTAT_YDAY_CLOSE_PRICE: '4.30',
            // MKISTAT_TOTAL_TRADES: 20,
            // MKISTAT_TOTAL_VOLUME: 64800,
            // MKISTAT_TOTAL_VALUE: '0.2790',
            // MKISTAT_PUBLIC_TOTAL_TRADES: 20,
            // MKISTAT_PUBLIC_TOTAL_VOLUME: 64800,
            // MKISTAT_PUBLIC_TOTAL_VALUE: '0.28',
            // MKISTAT_SPOT_TOTAL_TRADES: 0,
            // MKISTAT_SPOT_TOTAL_VOLUME: 0,
            // MKISTAT_SPOT_TOTAL_VALUE: '0.00',
            // MKISTAT_LM_DATE_TIME: '2020-03-12 14:30:00'


        var dsexNewVol = 0;
 
        var dsexTotalVal = 0;
        var dsexTotalVol = 0;
        var dsexNewTrd = 0;
        var dsexTotalTrd = 0;
        for(var key in rows){
            var row = rows[key];

            var code = row.MKISTAT_INSTRUMENT_CODE
            var open = row.MKISTAT_OPEN_PRICE

            var close = row.MKISTAT_CLOSE_PRICE

            var ltp = row.MKISTAT_PUB_LAST_TRADED_PRICE > 0 ? row.MKISTAT_PUB_LAST_TRADED_PRICE : row.MKISTAT_SPOT_LAST_TRADED_PRICE

            var high = row.MKISTAT_HIGH_PRICE
            var low = row.MKISTAT_LOW_PRICE

            var ycp = row.MKISTAT_YDAY_CLOSE_PRICE

            // if(ycp == 0){
            //     ycp = 10
            // }

            var trades = parseInt(row.MKISTAT_TOTAL_TRADES)
            var value = parseFloat(row.MKISTAT_TOTAL_VALUE)
            var volume = parseInt(row.MKISTAT_TOTAL_VOLUME)
            var category = row.MKISTAT_QUOTE_BASES[0]
            var datetime = row.MKISTAT_LM_DATE_TIME
            var spot =  row.MKISTAT_SPOT_TOTAL_TRADES == 0?0:1
                /*stockbangladesh api to dse database parser !!!!*/


             if(trades < 1 ){
                continue;
             }





            // check is database have this instruments
            if(!instruments[code]){
                // instrument is noot in table have to insert
                createNewInstrument(code)
                continue;
            }

            // if date is previous date the set the volume to -> 0
            if(volume < instruments[code].volume){
                instruments[code].volume = 0
            }

            var ignoreMinuteUpdate = false;

             var newVolume = volume - instruments[code].volume;
             var newValue = value - instruments[code].value;
             var newTrades = trades - instruments[code].trades;       


            // console.log(volume, instruments[code].volume, newTrades, "ss000")
            if(instruments[code].volume == volume ){
               ignoreMinuteUpdate = true;
               // continue;
            }

            if(newTrades < 0){
                newTrades = trades
            }



             // set new volume for dsex
             if(instruments[code].category == 'A' || instruments[code].category == 'B'){
                dsexTotalVol = dsexTotalVol + volume
                dsexTotalVal = dsexTotalVal + value
                dsexNewVol = dsexNewVol + newVolume
                dsexNewTrd = dsexNewTrd + newTrades;
                dsexTotalTrd = dsexTotalTrd + trades;   

             }

             if(newVolume < 0){
                newVolume = volume
                // ignoreMinuteUpdate = true;
                // continue;
             }
             if(newVolume < 1){
                // newVolume = volume
                ignoreMinuteUpdate = true;
                // continue;
             }


            // open price have to set
            if(close == 0 ){
                close = ltp;
            }


            var str = "( "+instruments[code].id+", '"+ open + "', ";
             str += "'"+ high + "', ";
             str += "'"+ low + "', ";
             // str += "'" + ltp + "', ";
             str += "'" + close + "', ";
             str += "'"+ ycp + "', ";
             str += "'"+ trades + "', ";
             str += "'"+ value + "', ";
             str += "'"+ volume + "', ";
             str += "'"+ category + "', ";
             str += "'"+ spot + "', ";
             str += " '"+datetime+"' ) ";

             queryValues.push(str)

             // miinutedata 
             // (code, price, volume, trades)
          
             if( moment(instruments[code].updated_at).diff(moment(datetime)) > 0 ){
                ignoreMinuteUpdate = true
             }

             if(!ignoreMinuteUpdate){
                    var  minute_data_str = "( '"+code+"', '"+ltp+"', '"+ newVolume +"', '"+ newValue +"', '"+newTrades+"', CURDATE(), '"+datetime+"' )  ";
                    minuteQueryValues.push(minute_data_str);
             }


           

        }
         // //push  data for indexes
        var dsexNVVOl = dsexNewVol
        
        console.error(indexData[indexData.length -1], 'hiiiii')     
        console.error(indexData[indexData.length -2], 'hiiiii')     
        console.error(indexData[indexData.length -3], 'hiiiii')     
            

         // minute chart data
         // take the last three rows of data
         index1 = indexData[indexData.length - 1];
         index2 = indexData[indexData.length - 2];
         index3 = indexData[indexData.length - 3];
         



         if (indexData.length > 3) {

            // fiirst three row is yesterday close
            var yesterdayCloseData = {};

            var res = await sequelize.query(`select code, close from eod where code in ('DSEX', 'DSES', 'DS30') and date < '${trd.TRD_LM_DATE_TIME.split(" ")[0]}' order by date desc limit 3` )


            yesterdayCloseData[res[0][0].code] = res[0][0].close
            yesterdayCloseData[res[0][1].code] = res[0][1].close
            yesterdayCloseData[res[0][2].code] = res[0][2].close
      



            // yesterdayCloseData[indexData[0].IDX_INDEX_ID] = instruments[indexData[0].IDX_INDEX_ID].ycp
            // yesterdayCloseData[indexData[1].IDX_INDEX_ID] = instruments[indexData[1].IDX_INDEX_ID].ycp
            // yesterdayCloseData[indexData[2].IDX_INDEX_ID] = instruments[indexData[2].IDX_INDEX_ID].ycp
            // console.log(yesterdayCloseData)


        
         // to do : add volume and trades for iindex
         // console.log(index3)
         // console.log("sssssss", moment(index3.IDX_DATE_TIME).format('HH:mm:ss'), moment(instruments[index1.IDX_INDEX_ID].updated_at).format('HH:mm:ss'))
         // if (moment(index1.IDX_DATE_TIME).format('HH:mm:ss') != moment(instruments[index1.IDX_INDEX_ID].updated_at).format('HH:mm:ss')) {
            // console.log(dsexNewTrd, "date matched")
            if(dsexNewTrd > 0){

             if( moment(instruments['DSEX'].updated_at).diff(moment(index1.IDX_DATE_TIME)) < 0 ){
               // console.log(['updatingg index minnute'])
                minuteQueryValues.push(`( '${index1.IDX_INDEX_ID}',  '${index1.IDX_CAPITAL_VALUE}', '${index1.IDX_INDEX_ID == 'DSEX'?dsexNewVol:0}', 0, '${index1.IDX_INDEX_ID == 'DSEX'?dsexNewTrd:0}', CURDATE(), '${index1.IDX_DATE_TIME}')`);
                minuteQueryValues.push(`( '${index2.IDX_INDEX_ID}',  '${index2.IDX_CAPITAL_VALUE}', '${index2.IDX_INDEX_ID == 'DSEX'?dsexNewVol:0}', 0, '${index2.IDX_INDEX_ID == 'DSEX'?dsexNewTrd:0}', CURDATE(), '${index2.IDX_DATE_TIME}')`);
                minuteQueryValues.push(`( '${index3.IDX_INDEX_ID}',  '${index3.IDX_CAPITAL_VALUE}', '${index3.IDX_INDEX_ID == 'DSEX'?dsexNewVol:0}', 0, '${index3.IDX_INDEX_ID == 'DSEX'?dsexNewTrd:0}', CURDATE(), '${index3.IDX_DATE_TIME}')`);

             }                
 
            }


         // }


         // // eod data
         //             var str = "( "+instruments[code].id+", '"+ open + "', ";
         //     str += "'"+ high + "', ";
         //     str += "'"+ low + "', ";
         //     str += "'" + ltp + "', ";
         //     // str += "'" + close == 0? ltp: close + "', ";
         //     str += "'"+ ycp + "', ";
         //     str += "'"+ trades + "', ";
         //     str += "'"+ value + "', ";
         //     str += "'"+ volume + "', ";
         //     str += " NOW() ) ";
         
         var id = instruments[index1.IDX_INDEX_ID].id;
         var open = instruments[index1.IDX_INDEX_ID].open
         var ycp = yesterdayCloseData[index1.IDX_INDEX_ID]?yesterdayCloseData[index1.IDX_INDEX_ID]:0
         var high = instruments[index1.IDX_INDEX_ID].high < index1.IDX_CAPITAL_VALUE ? index1.IDX_CAPITAL_VALUE : instruments[index1.IDX_INDEX_ID].high;
         var low = instruments[index1.IDX_INDEX_ID].low > index1.IDX_CAPITAL_VALUE ? index1.IDX_CAPITAL_VALUE : instruments[index1.IDX_INDEX_ID].low;

         var close = index1.IDX_CAPITAL_VALUE;

        var datetime = index1.IDX_DATE_TIME

        if (!isSameDay(instruments[index1.IDX_INDEX_ID].updated_at)) {       
            // yesterday
            open = instruments[index1.IDX_INDEX_ID].close
            high = index1.IDX_CAPITAL_VALUE
            low = index1.IDX_CAPITAL_VALUE
            
            // yesterday cloose = ycp
            // ycp = instruments[index1.IDX_INDEX_ID].close
        }
        var vlm = 1
        var trd = 1
        var val = 1
        if(index1.IDX_INDEX_ID == 'DSEX'){
            // vlm = dsexTotalVol
            trd = dsexTotalTrd
            val = tradeData.TRD_TOTAL_VALUE
            vlm = val * 1000000
        }
                     var str = "( "+id+", '"+ open + "', ";
             str += "'" + high + "', ";
             str += "'" + low + "', ";
             str += "'" + close + "', ";
             
             str += "'" + ycp + "', ";
             str += "'" + trd + "', ";
             str += "'" + val + "', ";
             str += "'" + vlm + "', ";
             str += " '', ";
             str += "'"+ 0 + "', ";
             str += " '" + datetime + "' ) ";



             queryValues.push(str)
                // end of index 1
         
         var id = instruments[index2.IDX_INDEX_ID].id;
         var open = instruments[index2.IDX_INDEX_ID].open
          
            var ycp = yesterdayCloseData[index2.IDX_INDEX_ID]?yesterdayCloseData[index2.IDX_INDEX_ID]:0
         var high = instruments[index2.IDX_INDEX_ID].high < index2.IDX_CAPITAL_VALUE ? index2.IDX_CAPITAL_VALUE : instruments[index2.IDX_INDEX_ID].high;
         var low = instruments[index2.IDX_INDEX_ID].low > index2.IDX_CAPITAL_VALUE ? index2.IDX_CAPITAL_VALUE : instruments[index2.IDX_INDEX_ID].low;
            datetime = index2.IDX_DATE_TIME
         var close = index2.IDX_CAPITAL_VALUE;
        if (!isSameDay(instruments[index2.IDX_INDEX_ID].updated_at)) {
            // yesterday
            open = instruments[index2.IDX_INDEX_ID].close
            high = index2.IDX_CAPITAL_VALUE
            low = index2.IDX_CAPITAL_VALUE
            
            // yesterday cloose = ycp
            // ycp = instruments[index2.IDX_INDEX_ID].close
        }
        var vlm = 1
        var trd = 1
        if(index2.IDX_INDEX_ID == 'DSEX'){
            // vlm = dsexTotalVol
            trd = dsexTotalTrd
            val = tradeData.TRD_TOTAL_VALUE
            vlm = val * 1000000
        }            
        var str = "( "+id+", '"+ open + "', ";
             str += "'" + high + "', ";
             str += "'" + low + "', ";
             str += "'" + close + "', ";
             
             str += "'" + ycp + "', ";
             str += "'" + trd + "', ";
             str += "'" + val + "', ";
             str += "'" + vlm + "', ";
             str += " '', ";
             str += "'"+ 0 + "', ";
             str += " '" + datetime + "' ) ";

             queryValues.push(str)
            // end of index 1
         
         var id = instruments[index3.IDX_INDEX_ID].id;
         var open = instruments[index3.IDX_INDEX_ID].open;
          var ycp = yesterdayCloseData[index3.IDX_INDEX_ID]?yesterdayCloseData[index3.IDX_INDEX_ID]:0
         var high = instruments[index3.IDX_INDEX_ID].high < index3.IDX_CAPITAL_VALUE ? index3.IDX_CAPITAL_VALUE : instruments[index3.IDX_INDEX_ID].high;
         var low = instruments[index3.IDX_INDEX_ID].low > index3.IDX_CAPITAL_VALUE ? index3.IDX_CAPITAL_VALUE : instruments[index3.IDX_INDEX_ID].low;
        datetime = index3.IDX_DATE_TIME
         var close = index3.IDX_CAPITAL_VALUE;
        if (!isSameDay(instruments[index3.IDX_INDEX_ID].updated_at)) {
            // yesterday
            open = instruments[index3.IDX_INDEX_ID].close
            high = index3.IDX_CAPITAL_VALUE
            low = index3.IDX_CAPITAL_VALUE
            
            // yesterday cloose = ycp
            // ycp = instruments[index3.IDX_INDEX_ID].close
        }
        var vlm = 1
        var trd = 1
        if(index3.IDX_INDEX_ID == 'DSEX'){
            // vlm = dsexTotalVol
            trd = dsexTotalTrd
            val = tradeData.TRD_TOTAL_VALUE
            vlm = val * 1000000
        }        
             var str = "( '"+id+"', '"+ open + "', ";
             str += "'" + high + "', ";
             str += "'" + low + "', ";
             str += "'" + close + "', ";
             
             str += "'" + ycp + "', ";
             str += "'" + trd + "', ";
             str += "'" + val + "', ";
             str += "'" + vlm + "', ";
             str += " '', ";
             str += "'"+ 0 + "', ";
             str += " '" + datetime + "' ) ";
             // var dsexNV = val - instruments["DSEX"].value
             // console.log(dsexNV, 'nvvv')
             if(id == 10001 &&  instruments["DSEX"].value == val ){

                    // console.log(code,  instruments["DSEX"].value, val, 'sssttttttee')
                    // continue;

             }else{
                  queryValues.push(str)
             }


             // if(code == "DSEX" && instruments["DSEX"].value == val ){
             //   continue
             // }             

             // if(code == "WALTONHIL"){
             //    console.log(str)
             // }



           
        }
        
            // end of stdex 1

          insertQuery += queryValues.join(', ');
       
          insertQuery += "ON DUPLICATE KEY UPDATE nv = IF( 1 > VALUES(volume) - volume  , nv, VALUES(volume) - volume), new_value = IF( 1 > VALUES(value) - value  , new_value, VALUES(value) - value)   , open = VALUES(open),  high = VALUES(high),  low = VALUES(low),  close = VALUES(close),   ycp = VALUES(ycp),   trades = VALUES(trades),   value = VALUES(value),   volume = VALUES(volume),  category = VALUES(category), spot = VALUES(spot), updated_at = VALUES(updated_at);";
            
        minuteDataQuery += minuteQueryValues.join(', ');
        minuteDataQuery +=" ON DUPLICATE KEY UPDATE volume = values(volume) + volume, trades = trades + values(trades), price = values(price)";


        // console.log('inserting in table');
        // console.log('sddffdf')
        // console.log(insertQuery)
        // console.log(tradeData)

        try {
         connection.query(insertQuery, async function (error, e) {
            console.log(error)
            sequelize.query(`update instruments set nv = ${dsexNVVOl} where code = 'DSEX'`)
            // generate sector cchart from latest instruments data
const maxDateQuery = 'SELECT @maxDate := DATE(MAX(updated_at)) FROM instruments';
const secctorquery = `INSERT INTO instruments (code, open, high, low, close, ycp, volume, trades, value, updated_at) 
                     SELECT sector_lists.name, ROUND(AVG(instruments.open), 2) AS open, ROUND(AVG(instruments.high), 2) AS high, 
                      ROUND(AVG(instruments.low), 2) AS low, ROUND(AVG(instruments.close), 2) AS close, eod.close as ycp,
                      ROUND(SUM(instruments.volume)) AS volume, ROUND(SUM(instruments.trades), 2) AS trades,  
                      ROUND(SUM(instruments.value), 2) AS value, MAX(updated_at) AS updated_at
                      FROM (SELECT sector_id,  open, high, low, close, ycp, IF(@maxDate = DATE(updated_at), volume, 0) AS volume, IF(@maxDate = DATE(updated_at), trades, 0) AS trades, IF(@maxDate = DATE(updated_at), value, 0) AS value , updated_at FROM instruments WHERE sector_id NOT IN (23, 24, 22) AND sme != 1) AS instruments
                      LEFT JOIN sector_lists ON sector_lists.id = sector_id
                        left join eod on eod.code = name AND eod.date = (
                           SELECT MAX(date) 
                           FROM eod 
                           WHERE date < @maxDate
                       )
                      GROUP BY sector_id
                      ON DUPLICATE KEY UPDATE open = VALUES(open), high = VALUES(high), low = VALUES(low), close = VALUES(close), ycp = VALUES(ycp), volume = VALUES(volume), trades = VALUES(trades), value = VALUES(value), updated_at = VALUES(updated_at)`;

     
   await sequelize.query(maxDateQuery);
     await sequelize.query(secctorquery);

  
              // await sequelize.query(secctorquery);




            // console.log(error, e)

            if(!error){
                console.log('trying cache')
              try {
                     // axios.get("https://stocknow.mobi/v1/pushUpdateData")
                     axios.get("https://stocknow.com.bd/api/v1/noCachedIns/4R76GGFD3KFD").then((r)=>{

                                console.log('sending')
                                axios.post("https://ws.stocknow.com.bd/storeUpdate", {data: r.data}).then((r)=>{console.log('sent to socket')}).catch((e)=>{console.log("error on socket req", e.response)})
                                axios.post("https://ws.stocknow.com.bd/push/trades/TradeUpdate", {data: `${tradeData.TRD_TOTAL_TRADES}|${tradeData.TRD_TOTAL_VOLUME}|${tradeData.TRD_TOTAL_VALUE}`}).then((r)=>{console.log('sent to socket')}).catch((e)=>{console.log("error on socket req", e.response)})
                                axios.post("https://stocknow.com.bd/api/v1/crons/UpdateFileData", {data: r.data}).then((r)=>{
                                            console.log('sent to file data', r.data)    
                                            // now broadcast all chart candles update
                                            axios.post('https://ws.stocknow.com.bd/chartUpdate', {data:r.data})
                                        }).catch((e)=>{console.log("error on file data", e.response)})

                             }).catch((e)=>{
                                console.log(e)
                                console.log("failed on cachee request")
                             })

              } catch(e) {
                  // statements
                  console.log("from error")
                 
              } 
            }
            // console.log("still working")
            // sync data from instruments table to eod table


            var eodQuery = `
                insert into eod (code, open, high, low, close, volume, trade, value, date) 
                select code,  if(open, open, 0), high, low, close, volume, trades as trade, value, updated_at as date  
                from instruments where updated_at > CURDATE() and volume > 0

                ON DUPLICATE KEY UPDATE 
                open = instruments.open,
                high = instruments.high,
                low = instruments.low,
                close = instruments.close,
                volume = instruments.volume,
                trade = instruments.trades,
                value = instruments.value
                `
             connection.query(eodQuery, function (e) {
                    // console.log(eodQuery.replace(/insert into eod/g, "insert into adjusted_eod"))
                    connection.query(eodQuery.replace(/insert into eod/g, "insert into adjusted_eod"), function(e){ console.log(e) })
                    if(minuteQueryValues.length){
                        connection.query(minuteDataQuery, function (error) {
                            
                        })
                    }else{

                    }

                });

         })

            
        } catch(e) {
            // statements
            console.log(e);
        }

         // console.log('sdff')
    
        /*old.dsebd.org latest sharee price parse, !!!!open price is missing there !!!!*/
            //     // console.log(instruments['ADNTEL'].ycp)
            //     axios.get('https://www.old.dsebd.org/latest_share_price_all.php').then((r)=>{
            //         var dom = parser.parseFromString(r.data);
            //         var rows = dom.getElementsByTagName("tr");
            // // 1 code , 2 ltp, 3 high, 4 low, 5 closep, 6 ycp, 8 trade, 9 value, 10 volume
            //         for(var key in rows){
            //             if(key == 0){
            //                 continue;
            //             }
            //             var row = rows[key];
            //             var cols = row.getElementsByTagName('td');

            //             var code = cols[1].textContent.trim()
            //             var ltp = parseFloat(cols[2].textContent.trim().replace(/,/g, ''))
            //             var open = ltp

            //             var high = parseFloat(cols[3].textContent.trim().replace(/,/g, ''))
            //             var low = parseFloat(cols[4].textContent.trim().replace(/,/g, ''))
            //             var close = parseFloat(cols[5].textContent.trim().replace(/,/g, ''))
            //             var ycp = parseFloat(cols[6].textContent.trim().replace(/,/g, ''))
            //             var trades = parseInt(cols[8].textContent.trim().replace(/,/g, ''))
            //             var value = parseFloat(cols[9].textContent.trim().replace(/,/g, ''))
            //             var volume = parseInt(cols[10].textContent.trim().replace(/,/g, ''))
                /*old.dsebd.org latest sharee price parse, !!!!open price is missing there !!!!*/


                /* parse stockbangladesh.com to dse database parser !!!!*/
                // console.log(instruments['ADNTEL'].ycp)
                // https://stockbangladesh.com/dse-mk?t=TRD
            //tables =>  TRD, IDX, MAN, MKISTAT

        // return;
   
 

});

})



// connection.end();

setTimeout(function() {
    connection.end();
    process.exit();
}, 30000);

// });