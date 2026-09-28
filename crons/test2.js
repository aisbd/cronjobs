var axios = require('axios')
var  sequelize  = require('../Sequelize');
var DomParser = require('dom-parser');
var parser = new DomParser();
const HtmlTableToJson = require('html-table-to-json');
var fs = require('fs');
// var db = require('../dseDB')
var proxy = require('../proxy');


function calcTime( offset, d = new Date()) {
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
    return year + '-' + month + '-' + day + ' ' + time;
}

var datetime = calcTime('+6')



var exp = async function preparestaticData(){

    // try another data source 

     var a = false;

// comment this if dse block acess start
    try {

        var data = {}
        var res = await db.query("select * from IDX  order by IDX_DATE_TIME asc", {raw:true, type: db.QueryTypes.SELECT})
        data.IDX = res
        res = await db.query("select * from MKISTAT", {raw:true, type: db.QueryTypes.SELECT})
        data.MKISTAT = res

        res = await db.query("select * from TRD", {raw:true, type: db.QueryTypes.SELECT})
        data.TRD = res
       
        a = {data:data}
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



    if(a !== false ){
        return new Promise((resolve, reject) => {
            resolve(a)
        })
    }
    return 



var data = {}


 var homepage = await axios.get('https://dse.stocknow.mobi')
 homepage = homepage.data
 homepage = parser.parseFromString(homepage);
 var nodes = homepage.getElementsByClassName('LeftColHome')
 var time = nodes[0].getElementsByClassName("Bodyheading")[0].innerHTML.replace("Last update on ", '')
 time = new Date( time.replace("at ", '') )
// console.log(time.getHours())
  datetime = calcTime('+6', time)



 var node = nodes[0]
 var divs = node.getElementsByClassName("midrow")

 var dsexNodes = divs[0].getElementsByTagName("div")
    var dsex = {
    "IDX_INDEX_ID": "DSEX",
    "IDX_DATE_TIME": datetime,
    "IDX_CAPITAL_VALUE": dsexNodes[1].innerHTML.trim().replace(',', ''),
    "IDX_DEVIATION": dsexNodes[2].innerHTML.trim().replace(',', ''),
    "lDX_PERCENTAGE_DEVIATION": dsexNodes[3].innerHTML.trim().replace('%', '')
    } 
 
   dsexNodes = divs[1].getElementsByTagName("div")
    var dses = {
    "IDX_INDEX_ID": "DSES",
    "IDX_DATE_TIME": datetime,
    "IDX_CAPITAL_VALUE": dsexNodes[1].innerHTML.trim().replace(',', ''),
    "IDX_DEVIATION": dsexNodes[2].innerHTML.trim().replace(',', ''),
    "lDX_PERCENTAGE_DEVIATION": dsexNodes[3].innerHTML.trim().replace('%', '')
    }  

   dsexNodes = divs[2].getElementsByTagName("div")
    var ds30 = {
    "IDX_INDEX_ID": "DS30",
    "IDX_DATE_TIME": datetime,
    "IDX_CAPITAL_VALUE": dsexNodes[1].innerHTML.trim().replace(',', ''),
    "IDX_DEVIATION": dsexNodes[2].innerHTML.trim().replace(',', ''),
    "lDX_PERCENTAGE_DEVIATION": dsexNodes[3].innerHTML.trim().replace('%', '')
    } 

 
  // data.IDX[0].IDX_CAPITAL_VALUE = 



   dsexNodes = divs[4].getElementsByTagName("div")

    data.TRD = [{
            "TRD_SNO": "1",
            "TRD_TOTAL_TRADES": dsexNodes[0].innerHTML.trim().replace(',', ''),
            "TRD_TOTAL_VOLUME": dsexNodes[1].innerHTML.trim().replace(',', ''),
            "TRD_TOTAL_VALUE": dsexNodes[2].innerHTML.trim().replace(',', ''),
            "TRD_LM_DATE_TIME": datetime    
    }]

    divs = nodes[2].getElementsByClassName("midrow")


  dsexNodes = divs[2].getElementsByTagName("div")
    var ds30Prev = {
    "IDX_INDEX_ID": "DS30",
    "IDX_DATE_TIME": datetime,
    "IDX_CAPITAL_VALUE": dsexNodes[1].innerHTML.trim().replace(',', ''),
    "IDX_DEVIATION": dsexNodes[2].innerHTML.trim().replace(',', ''),
    "lDX_PERCENTAGE_DEVIATION": dsexNodes[3].innerHTML.trim().replace('%', '')
    } 
    dsexNodes = divs[0].getElementsByTagName("div")
    var dsexPrev = {
    "IDX_INDEX_ID": "DSEX",
    "IDX_DATE_TIME": datetime,
    "IDX_CAPITAL_VALUE": dsexNodes[1].innerHTML.trim().replace(',', ''),
    "IDX_DEVIATION": dsexNodes[2].innerHTML.trim().replace(',', ''),
    "lDX_PERCENTAGE_DEVIATION": dsexNodes[3].innerHTML.trim().replace('%', '')
    } 
 
   dsexNodes = divs[1].getElementsByTagName("div")
    var dsesPrev = {
    "IDX_INDEX_ID": "DSES",
    "IDX_DATE_TIME": datetime,
    "IDX_CAPITAL_VALUE": dsexNodes[1].innerHTML.trim().replace(',', ''),
    "IDX_DEVIATION": dsexNodes[2].innerHTML.trim().replace(',', ''),
    "lDX_PERCENTAGE_DEVIATION": dsexNodes[3].innerHTML.trim().replace('%', '')
    }  



  data.IDX = [ds30Prev, dsesPrev, dsexPrev,
  ds30, dses, dsex,
  ds30, dses, dsex]

  // console.log(data.IDX)


     var staticData = {}
var res =  await sequelize.query("select * from instruments");
for(var k in res[0]){
    staticData[res[0][k].code] = {category : res[0][k].category}
   
}

 var html = await axios.get('https://dse.stocknow.mobi/cbul.php')
        var rgx = /(<table class="table table-bordered background-white text-center">.+?<\/table>)/gims
        var table =  [...html.data.matchAll(rgx)]
        var res = HtmlTableToJson.parse(table[0][1]).results[0]
       await res.every((row)=> {
            // if(row['Trade Code'] == 'ABBANK'){
            staticData[row['Trade Code']].open = row['Open Adj. Price']
            return true;    
        })
       // return staticData
        // console.log(staticData)

    var r = await axios.get('https://dse.stocknow.mobi/latest_share_price_scroll_l.php')
               var dom = parser.parseFromString(r.data);
               var table = dom.getElementsByClassName('shares-table')[0].outerHTML
               var res = HtmlTableToJson.parse(table)
                   res = res.results[0]
                var items = []
                   for(var key in res){
                            var seRow = res[key]
                            var code = seRow['TRADING CODE']
                           if( staticData[code].open == null){
                                staticData[code].open = '0'
                           }
                            // console.log(seRow)
                            var item =    {
                                            MKISTAT_INSTRUMENT_CODE: code,
                                            MKISTAT_INSTRUMENT_NUMBER: 1859,
                                            MKISTAT_QUOTE_BASES: staticData[code].category+'-MF',
                                            MKISTAT_OPEN_PRICE: staticData[code].open.replace(',', ''),
                                            MKISTAT_PUB_LAST_TRADED_PRICE: seRow['LTP*'].replace(',', ''),
                                            MKISTAT_SPOT_LAST_TRADED_PRICE: '0.00',
                                            MKISTAT_HIGH_PRICE:seRow['HIGH'].replace(',', ''),
                                            MKISTAT_LOW_PRICE: seRow['LOW'].replace(',', ''),
                                            MKISTAT_CLOSE_PRICE: seRow['CLOSEP*'].replace(',', ''),
                                            MKISTAT_YDAY_CLOSE_PRICE: seRow['YCP*'].replace(',', ''),
                                            MKISTAT_TOTAL_TRADES: seRow['TRADE'].replace(',', '').replace(',', ''),
                                            MKISTAT_TOTAL_VOLUME: seRow['VOLUME'].replace(',', '').replace(',', ''),
                                            MKISTAT_TOTAL_VALUE: seRow['VALUE (mn)'].replace(',', ''),
                                            MKISTAT_PUBLIC_TOTAL_TRADES: seRow['TRADE'].replace(',', '').replace(',', ''),
                                            MKISTAT_PUBLIC_TOTAL_VOLUME: seRow['VOLUME'].replace(',', '').replace(',', ''),
                                            MKISTAT_PUBLIC_TOTAL_VALUE: seRow['VALUE (mn)'].replace(',', ''),
                                            MKISTAT_SPOT_TOTAL_TRADES: 0,
                                            MKISTAT_SPOT_TOTAL_VOLUME: 0,
                                            MKISTAT_SPOT_TOTAL_VALUE: '0.00',
                                            MKISTAT_LM_DATE_TIME: datetime    
                                }

                                item.MKISTAT_OPEN_PRICE =  (parseFloat(item.MKISTAT_PUB_LAST_TRADED_PRICE ) - parseFloat(seRow['CHANGE'].replace(',', ''))).toFixed(2)


                                items.push(item)
                   }

 
        data.MKISTAT = items

       return new Promise((resolve, reject)=>{
            resolve({data})
       })


}

// async function dd(){
//     var data  = await exp()
//     console.log(data)
// }
// dd()
module.exports = exp;