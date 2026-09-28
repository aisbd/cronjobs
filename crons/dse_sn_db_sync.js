var axios = require('axios')
var  sequelize  = require('../Sequelize');
var fs = require('fs');
var db = require('../dseDB')
var dbBackup = require('../dseDB_Backup_Server')
var proxy = require('../proxy');
var moment = require('moment')

var cp = require('child_process');

 async function syncDatabase(){

    // try another data source 

     var a = false;

// comment this if dse block acess start
    try {

        var data = {}

       var res = await db.query("select * from TRD", {raw:true, type: db.QueryTypes.SELECT})

        // check latency and switch to  DSE backup server 
        var fastServerUpdateTime = res[0].TRD_LM_DATE_TIME
        // console.log(moment(res[0].TRD_LM_DATE_TIME).diff(moment(), 'seconds'), 'negetive')
        var delayInSecond = moment().diff(moment(fastServerUpdateTime), 'seconds');

        if(delayInSecond > 20){
            db.close()
            db = dbBackup
            // run the trd table query again from backup server
            res = await db.query("select * from TRD", {raw:true, type: db.QueryTypes.SELECT})
            var backupServerUpdateTime = res[0].TRD_LM_DATE_TIME

            if( moment(backupServerUpdateTime).diff(moment(fastServerUpdateTime) < 1)){
                return new Promise((resolve, reject) => {
                    reject(a)
                })
            }
            console.log(backupServerUpdateTime, fastServerUpdateTime,  moment(backupServerUpdateTime).diff(moment(fastServerUpdateTime), 'seconds'),  'both server')
            // process.exit()
        }
        data.TRD = res
        // get dse server latest time 
        var dse_last_update_time = data.TRD[0].TRD_LM_DATE_TIME
        var [rw] = await sequelize.query("select * from TRD where TRD_LM_DATE_TIME >= '"+dse_last_update_time+"'")
        if(rw.length != 0){
            return
        }


         res = await db.query("select * from IDX  order by IDX_DATE_TIME asc", {raw:true, type: db.QueryTypes.SELECT})
         
        data.IDX = res
        res = await db.query("select * from MKISTAT order by MKISTAT_LM_DATE_TIME desc", {raw:true, type: db.QueryTypes.SELECT})
        data.MKISTAT = res
         // console.error(res[0], "IDX data")

       await db.close();
        a = {data:data}

        var insertQuery = `INSERT INTO IDX (IDX_INDEX_ID, IDX_DATE_TIME, IDX_CAPITAL_VALUE, IDX_DEVIATION, lDX_PERCENTAGE_DEVIATION) VALUES ${a.data.IDX.map(data => `('${data.IDX_INDEX_ID}' ,'${data.IDX_DATE_TIME}' ,'${data.IDX_CAPITAL_VALUE}' ,'${data.IDX_DEVIATION}' ,'${data.lDX_PERCENTAGE_DEVIATION}' )`).join(',')}`;
       await  sequelize.query("truncate table IDX")
       await  sequelize.query(insertQuery)


         insertQuery = `INSERT INTO TRD (TRD_SNO, TRD_TOTAL_TRADES, TRD_TOTAL_VOLUME, TRD_TOTAL_VALUE, TRD_LM_DATE_TIME) VALUES ${a.data.TRD.map(data => `('${data.TRD_SNO}' ,'${data.TRD_TOTAL_TRADES}' ,'${data.TRD_TOTAL_VOLUME}' ,'${data.TRD_TOTAL_VALUE}' ,'${data.TRD_LM_DATE_TIME}' )`).join(',')}`;
       await  sequelize.query("truncate table TRD")
       await  sequelize.query(insertQuery)


         insertQuery = `INSERT INTO MKISTAT (MKISTAT_INSTRUMENT_CODE, MKISTAT_INSTRUMENT_NUMBER, MKISTAT_QUOTE_BASES, MKISTAT_OPEN_PRICE, MKISTAT_PUB_LAST_TRADED_PRICE, MKISTAT_SPOT_LAST_TRADED_PRICE, MKISTAT_HIGH_PRICE, MKISTAT_LOW_PRICE, MKISTAT_CLOSE_PRICE, MKISTAT_YDAY_CLOSE_PRICE, MKISTAT_TOTAL_TRADES, MKISTAT_TOTAL_VOLUME, MKISTAT_TOTAL_VALUE, MKISTAT_PUBLIC_TOTAL_TRADES, MKISTAT_PUBLIC_TOTAL_VOLUME, MKISTAT_PUBLIC_TOTAL_VALUE, MKISTAT_SPOT_TOTAL_TRADES, MKISTAT_SPOT_TOTAL_VOLUME, MKISTAT_SPOT_TOTAL_VALUE, MKISTAT_LM_DATE_TIME) VALUES ${a.data.MKISTAT.map(data => `('${data.MKISTAT_INSTRUMENT_CODE}' ,'${data.MKISTAT_INSTRUMENT_NUMBER}' ,'${data.MKISTAT_QUOTE_BASES}' ,'${data.MKISTAT_OPEN_PRICE}' ,'${data.MKISTAT_PUB_LAST_TRADED_PRICE}' ,'${data.MKISTAT_SPOT_LAST_TRADED_PRICE}' ,'${data.MKISTAT_HIGH_PRICE}' ,'${data.MKISTAT_LOW_PRICE}' ,'${data.MKISTAT_CLOSE_PRICE}' ,'${data.MKISTAT_YDAY_CLOSE_PRICE}' ,'${data.MKISTAT_TOTAL_TRADES}' ,'${data.MKISTAT_TOTAL_VOLUME}' ,'${data.MKISTAT_TOTAL_VALUE}' ,'${data.MKISTAT_PUBLIC_TOTAL_TRADES}' ,'${data.MKISTAT_PUBLIC_TOTAL_VOLUME}' ,'${data.MKISTAT_PUBLIC_TOTAL_VALUE}' ,'${data.MKISTAT_SPOT_TOTAL_TRADES}' ,'${data.MKISTAT_SPOT_TOTAL_VOLUME}' ,'${data.MKISTAT_SPOT_TOTAL_VALUE}' ,'${data.MKISTAT_LM_DATE_TIME}' )`).join(',')}`;
       await  sequelize.query("truncate table MKISTAT")
       await  sequelize.query(insertQuery)


        // console.log(a)
    } catch(e) {
        console.log(e, 'ssssss')
        // statements
    }
// ccomment this if dse block acess end

// uncomment this if dse block acess start
    // try {
    //   a = await  axios.get('https://blog.stockbangladesh.com/wp-loader.php', {...proxy,  timeout: 20000 })
    // } catch(e) {
    //     console.log(e)
    //     // statements
    // }
// uncomment this if dse block acess end
}

async function main() {
    //  cp.fork(__dirname + '/getLatestFromDseNew.js');
        // sync database
        await syncDatabase()
        const [result] = await sequelize.query(`SELECT TRD.TRD_SNO FROM TRD inner join trades on trades.TRD_LM_DATE_TIME = TRD.TRD_LM_DATE_TIME`);
         if( result.length > 0){
            return 
         }

         // new data updated 
         cp.fork(__dirname + '/getLatestFromDse.js');
       


     


}

main()
