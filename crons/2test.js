var  sequelize  = require('../Sequelize');
var axios = require('axios');
var DomParser = require('dom-parser');
var parser = new DomParser();
var db = require('../db');

var keyBy = require('lodash.keyby');
var moment = require('moment');
var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : '10.10.0.10',
  user     : 'root',
  password : 'nevergonnagetit',
  database : 'stocknow'
});


var mds = require('./test2')


// async function abc(){
// var d = await mds()
// // console.log(d)    
// }
// abc()
// return 

function createNewInstrument(code) {
    console.log(code)
        try {
                axios.get('https://dse.stocknow.mobi/displayCompany.php?name='+code).then((r)=>{
                const regex = /<th>Sector<\/th>.+?<td>(.+?)<\/td>/gims;
                const nameRegx = /Company Name: <i>(.+?)<\/i>/gims;
                const found = [...r.data.matchAll(regex)];
                var name = [...r.data.matchAll(nameRegx)];

                var sector = (found[0][1]);
                name = name[0][1];


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
    connection.query('SELECT * from instruments where active = 1', function (error, results, fields) {
      if (error) throw error;

      var insertQuery = "insert into instruments (id, open, high, low, close, ycp, trades, value, volume, category, spot, updated_at) values ";
            queryValues = [];
        var instruments =  keyBy(results, 'code')



        var minuteDataQuery = "insert into minute_data (code, price, volume, trades, date, created_at) VALUES ";
        var minuteQueryValues = [];


    
        // console.log(r.data.TRD)
        // return 
        var indexData = r.data.IDX;
        var trd = r.data.TRD[0];

        if(trd.TRD_TOTAL_TRADES < 1){
              process.exit(); 
            return
        }

        connection.query(`insert into trades (TRD_TOTAL_TRADES, TRD_TOTAL_VOLUME, TRD_TOTAL_VALUE, TRD_LM_DATE_TIME) 
        values 
         (
             '${trd.TRD_TOTAL_TRADES}',
             '${trd.TRD_TOTAL_VOLUME}',
             '${trd.TRD_TOTAL_VALUE}',
             '${trd.TRD_LM_DATE_TIME}'
             
            )`, (e)=>{
                if(e){
                    console.log(e, 'eexiting from line 125')
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
             var newTrades = trades - instruments[code].trades;            

            if(instruments[code].volume == volume || newTrades < 0){
               ignoreMinuteUpdate = true;
               // continue;
            }



             // set new volume for dsex
             if(instruments[code].category == 'A' || instruments[code].category == 'B'){
                dsexTotalVol = dsexTotalVol + volume
                dsexNewVol = dsexNewVol + newVolume
                dsexNewTrd = dsexNewTrd + newTrades;
                dsexTotalTrd = dsexTotalTrd + trades;   

             }

             if(newVolume < 1){
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

             if(!ignoreMinuteUpdate){
                    var  minute_data_str = "( '"+code+"', '"+ltp+"', '"+ newVolume +"', '"+newTrades+"', CURDATE(), '"+datetime+"' )  ";
                    minuteQueryValues.push(minute_data_str);
             }


           

        }
         // //push  data for indexes


         // minute chart data
         // take the last three rows of data
         index1 = indexData[indexData.length - 1];
         index2 = indexData[indexData.length - 2];
         index3 = indexData[indexData.length - 3];
         


         if (indexData.length > 3) {

            // fiirst three row is yesterday close
            var yesterdayCloseData = {};
            yesterdayCloseData[indexData[0].IDX_INDEX_ID] = indexData[0].IDX_CAPITAL_VALUE
            yesterdayCloseData[indexData[1].IDX_INDEX_ID] = indexData[1].IDX_CAPITAL_VALUE
            yesterdayCloseData[indexData[2].IDX_INDEX_ID] = indexData[2].IDX_CAPITAL_VALUE

            // yesterdayCloseData[indexData[0].IDX_INDEX_ID] = instruments[indexData[0].IDX_INDEX_ID].ycp
            // yesterdayCloseData[indexData[1].IDX_INDEX_ID] = instruments[indexData[1].IDX_INDEX_ID].ycp
            // yesterdayCloseData[indexData[2].IDX_INDEX_ID] = instruments[indexData[2].IDX_INDEX_ID].ycp
            // console.log(yesterdayCloseData)


        
         // to do : add volume and trades for iindex
         if (moment(index1.IDX_DATE_TIME).format('HH:mm:ss') != moment(instruments[index1.IDX_INDEX_ID].updated_at).format('HH:mm:ss')) {

            if(dsexNewTrd > 0){
                minuteQueryValues.push(`( '${index1.IDX_INDEX_ID}',  '${index1.IDX_CAPITAL_VALUE}', '${index1.IDX_INDEX_ID == 'DSEX'?dsexNewVol:0}', '${index1.IDX_INDEX_ID == 'DSEX'?dsexNewTrd:0}', CURDATE(), '${index1.IDX_DATE_TIME}')`);
                minuteQueryValues.push(`( '${index2.IDX_INDEX_ID}',  '${index2.IDX_CAPITAL_VALUE}', '${index2.IDX_INDEX_ID == 'DSEX'?dsexNewVol:0}', '${index2.IDX_INDEX_ID == 'DSEX'?dsexNewTrd:0}', CURDATE(), '${index2.IDX_DATE_TIME}')`);
                minuteQueryValues.push(`( '${index3.IDX_INDEX_ID}',  '${index3.IDX_CAPITAL_VALUE}', '${index3.IDX_INDEX_ID == 'DSEX'?dsexNewVol:0}', '${index3.IDX_INDEX_ID == 'DSEX'?dsexNewTrd:0}', CURDATE(), '${index3.IDX_DATE_TIME}')`);

            }



         }


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
        if(index1.IDX_INDEX_ID == 'DSEX'){
            vlm = dsexTotalVol
            trd = dsexTotalTrd
        }
                     var str = "( "+id+", '"+ open + "', ";
             str += "'" + high + "', ";
             str += "'" + low + "', ";
             str += "'" + close + "', ";
             
             str += "'" + ycp + "', ";
             str += "'" + trd + "', ";
             str += "'" + 1 + "', ";
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
            vlm = dsexTotalVol
            trd = dsexTotalTrd
        }            
        var str = "( "+id+", '"+ open + "', ";
             str += "'" + high + "', ";
             str += "'" + low + "', ";
             str += "'" + close + "', ";
             
             str += "'" + ycp + "', ";
             str += "'" + trd + "', ";
             str += "'" + 1 + "', ";
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
            vlm = dsexTotalVol
            trd = dsexTotalTrd
        }        
             var str = "( '"+id+"', '"+ open + "', ";
             str += "'" + high + "', ";
             str += "'" + low + "', ";
             str += "'" + close + "', ";
             
             str += "'" + ycp + "', ";
             str += "'" + trd + "', ";
             str += "'" + 1 + "', ";
             str += "'" + vlm + "', ";
             str += " '', ";
             str += "'"+ 0 + "', ";
             str += " '" + datetime + "' ) ";

             // if(code == "WALTONHIL"){
             //    console.log(str)
             // }



             queryValues.push(str)
        }
        
            // end of stdex 1

          insertQuery += queryValues.join(', ');
       
          insertQuery += "ON DUPLICATE KEY UPDATE open = VALUES(open),  high = VALUES(high),  low = VALUES(low),  close = VALUES(close),   ycp = VALUES(ycp),   trades = VALUES(trades),   value = VALUES(value),   volume = VALUES(volume),  category = VALUES(category), spot = VALUES(spot), updated_at = VALUES(updated_at);";
            
        minuteDataQuery += minuteQueryValues.join(', ');
        minuteDataQuery +=" ON DUPLICATE KEY UPDATE volume = values(volume) + volume, trades = trades + values(trades), price = values(price)";


        // console.log('inserting in table');
        // console.log('sddffdf')
        console.log(insertQuery)

        try {
         connection.query(insertQuery, async function (error, e) {


            // generate sector cchart from latest instruments data
            var secctorquery = `
                  insert into instruments (code, open, high, low, close, ycp, volume, trades, value, updated_at) 

                 SELECT sector_lists.name, round(avg(instruments.open), 2) as open, round(avg(instruments.high), 2) as high, 
                 round(avg(instruments.low), 2) as low, round(avg(instruments.close), 2) as close, round(avg(instruments.ycp), 2) as ycp, 
                 round(sum(instruments.volume)) as volume,  round(sum(instruments.trades), 2) as trade,  
                 round(sum(instruments.value), 2) as value, max(updated_at) as updated_at
                    FROM instruments
                    left join sector_lists on sector_lists.id = sector_id
                    where sector_id  not in (23, 24, 22)
                    and updated_at like CONCAT( ( select  cast(max(updated_at) as date) from instruments) , '%')
                    group by sector_id

                    ON DUPLICATE KEY UPDATE  open= values(open), high= values(high), low= values(low), close= values(close), ycp= values(ycp), volume= values(volume), trades= values(trades), value= values(value), updated_at= values(updated_at)
                `;
              await sequelize.query(secctorquery);




            // console.log(error, e)

            if(!error){
                console.log('trying cache')
              try {
                     axios.get("https://stocknow.mobi/v1/noCachedIns/4R76GGFD3KFD").then((r)=>{

                                console.log('sending')
                                axios.post("https://ws.stocknow.mobi/storeUpdate", {data: r.data}).then((r)=>{console.log('sent to socket')}).catch((e)=>{console.log("error on socket req", e.response)})
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



             connection.query(`
                insert into eod (code, open, high, low, close, volume, trade, value, date) 
                select code, open, high, low, close, volume, trades as trade, value, updated_at as date  
                from instruments where updated_at > CURDATE() and volume > 0

                ON DUPLICATE KEY UPDATE 
                open = instruments.open,
                high = instruments.high,
                low = instruments.low,
                close = instruments.close,
                volume = instruments.volume,
                trade = instruments.trades,
                value = instruments.value
                `, function (e) {

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
            //     axios.get('https://old.dsebd.org/latest_share_price_all.php').then((r)=>{
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
}, 60000);

// });