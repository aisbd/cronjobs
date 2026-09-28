
/* Automatic Trading Algorithm Beta
    1. Get all sahre total number of shares
    2. Generate the % amount that today traded on total no of share
    3. 


*/




var lastMsgTime;

var cp = require('child_process');
var moment =  require('moment-timezone');

var db = require('./Sequelize')

var axios = require('axios');

async function getShareHoldings(){
    var totalShares = await db.query(`select code, meta_value from fundamentals where meta_key = 'total_no_of_securities' and is_latest = 1`)
    totalShares = totalShares[0]
    var data = {}
    for(var key in totalShares){
        var row = totalShares[key]
        data[row.code] = row.meta_value
       
    }
    return data
  
}

async function main(){
    var shareHoldings =  await getShareHoldings()

var WebSocketClient = require('websocket').client;

var client = new WebSocketClient();



function restart(){
    // process.exit()   
    // cp.fork(__dirname + '/wsqs.js');
}

function connect(){
    client.connect('wss://itrade.lbsbd.com/wsqs', null,  {
            "Accept-Encoding": "gzip, deflate", 
            "Accept-Language": "en-US,en;q=0.9,mt;q=0.8",
            "Cache-Control": "no-cache",
            "Connection": "Upgrade",
            "Host": "itrade.lbsbd.com",
            "Origin": "https://itrade.lbsbd.com",
            "Pragma": "no-cache",
            "Sec-WebSocket-Extensions": "permessage-deflate; client_max_window_bits",
            "Sec-WebSocket-Version": 13,
            "Upgrade": "websocket",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36"    

    });      
}

async function  processMarketDepth(data){
        // console.log(data)
        var rows = JSON.parse(await redisClient.get(data.sym)) || [[], []];
        for(var k in data.D){
            var row = data.D[k]

            var obj1 = rows[row.type][row.lvl] || {}
            rows[row.type][row.lvl] ={...obj1, ...row}
        }
        await redisClient.set(data.sym, JSON.stringify(rows), {
          EX: 6000,
        });       
}


client.on('connect', function(connection) {
    console.log('WebSocket Client Connected');
    connection.send('116{"AUTHVER":"10","LOGINIP":"","CLVER":"1.0.0","PDM":"56","LAN":"EN","METAVER":"0","SSOTOK":"DEMO1UNI","SSOTYPE":"2"}\n')
    setTimeout(async function(){
        // connection.send('21{"40":"7","E":"DSE"}\n') //get dse indice updates
        connection.send('21{"40":"0","E":"DSE"}\n') //mixed live data
        // connection.send('23{"40":"277","E":"DSE"}\n') //mixed live data

    }, 200)
    connection.on('error',  function(error) {

        // axios.post('https://stocknow.com.bd/api/v1/contact', {message: JSON.stringify(error)+' Market depth server error information, forward this email to Selim, Error: '})

        restart()

        console.log("Connection Error: " + error.toString());
    });
    connection.on('close',  function() {
         // axios.post('https://stocknow.com.bd/api/v1/contact', {message: ' Market depth server error information,  forward this email to Selim closed' })

        restart()
        // connect()
        console.log('echo-protocol Connection Closed');
    });
    connection.on('message', function(message) { //trade
        // console.log(message)
        lastMsgTime = Math.floor(Date.now() / 1000)
  
        if (message.type === 'utf8') {
          var data  =  message.utf8Data;
          const regex = /^[0-9]+/i;
          data = data.replace(regex, '')
          data = JSON.parse(data)
          if(data.vol != null){

                        // {
                        //   '1': 3,
                        //   sym: 'MONOSPOOL`PB',
                        //   exg: 'DSE',
                        //   inst: 0,
                        //   chg: -6.5,
                        //   pctChg: -2.18,
                        //   tovr: 10137490.9,
                        //   vol: 34619,
                        //   trades: 533,
                        //   ltp: 291.8,
                        //   ltq: 83,
                        //   ltt: '055401',
                        //   bap: 292.1,
                        //   baq: 56,
                        //   bbp: 291.8,
                        //   bbq: 17,
                        //   taq: 20855,
                        //   tbq: 23756,
                        //   cit: 3809940.6,
                        //   civ: 13021
                        // }         
            try {
                percentOfTotalShare =  parseFloat(data.vol * 100 / shareHoldings[data.sym.split("`")[0]] ).toFixed(2)
                data.percentOfTotalShare = percentOfTotalShare!= 'NaN'?percentOfTotalShare:0
                // console.log(data)
                insertRawDataToDatabase(data)
                // statements
            } catch(e) {
                console.log(data)
                // statements
                // console.log(e);
            }                           
           
    
          }
          // if(data['1'] && data['1'] == 9){
          //   processMarketDepth(data)
          // }
        
          return
        }
    });

});

  connect()

}

function insertRawDataToDatabase(obj){
    if(obj.eps){
        return 
    }


    var query = `INSERT INTO lanka_itrade_raw_data ( sym, exg, inst, chg, pctChg, tovr, vol, trades, ltp, ltq, ltt, bap, baq, bbp, bbq, taq, tbq, cit, civ, percentOfTotalShare)
VALUES (
    '${obj.sym}',
    '${obj.exg}',
    '${obj.inst}',
    '${obj.chg}',
    '${obj.pctChg}',
    '${obj.tovr}',
    '${obj.vol}',
    '${obj.trades}',
    '${obj.ltp}',
    '${obj.ltq}',
    '${obj.ltt}',
    '${obj.bap}',
    '${obj.baq}',
    '${obj.bbp}',
    '${obj.bbq}',
    '${obj.taq}',
    '${obj.tbq}',
    '${obj.cit}',
    '${obj.civ}',
    '${obj.percentOfTotalShare}'
)`

  db.query(query)
}

try {
    main()
} catch(e) {
    // statements
    console.log(e);
}


setInterval(function () {
    console.log('checking last msg => '+ lastMsgTime)
    console.log(moment().tz("Asia/Dhaka"))
     var now = Math.floor(Date.now() / 1000)
     if(now > lastMsgTime + 30){
        console.log('msg time expired, process exiting for reconnect')
        
        // process.exit()
     }
}, 10000)
