var axios = require('axios')
var  sequelize  = require('../../Sequelize');
var DomParser = require('dom-parser');
var moment = require('moment');
var parser = new DomParser();
const HtmlTableToJson = require('html-table-to-json');
var db = require('../../dseDB')
async function main(){


        var sme = await db.query('select * from SME_MKISTAT')
            sme = sme[0]



            var items = []
            var query = "insert into instruments (code, open, high, low, close, ycp, volume, trades, value, updated_at) VALUES "
           for(var seRow of sme){

            var symbol = {}
             var ltp = seRow.MKISTAT_PUB_LAST_TRADED_PRICE > 0 ? seRow.MKISTAT_PUB_LAST_TRADED_PRICE : seRow.MKISTAT_SPOT_LAST_TRADED_PRICE
                symbol.code = seRow['MKISTAT_INSTRUMENT_CODE']


            symbol.close = parseFloat(seRow['MKISTAT_CLOSE_PRICE']) == 0?ltp : seRow['MKISTAT_CLOSE_PRICE']
            symbol.open = seRow['MKISTAT_OPEN_PRICE']
            symbol.ycp = seRow['MKISTAT_YDAY_CLOSE_PRICE']
            symbol.trade = seRow['MKISTAT_TOTAL_TRADES']
 
            symbol.high = seRow['MKISTAT_HIGH_PRICE']
            symbol.low = seRow['MKISTAT_LOW_PRICE']
            symbol.value = seRow['MKISTAT_TOTAL_VALUE']
            symbol.volume = seRow['MKISTAT_TOTAL_VOLUME']
            symbol.updated_at = seRow['MKISTAT_LM_DATE_TIME']
            console.log(symbol)
            if(symbol.trade == 0){
                continue;
            }

             var str = "( ";
             str += "'" + symbol.code + "', ";
             str += "'" + parseFloat(symbol.open) + "', ";
             str += "'" + parseFloat(symbol.high) + "', ";
             str += "'" + parseFloat(symbol.low) + "', ";
             str += "'" + parseFloat(symbol.close) + "', ";
             
             str += "'" + parseFloat(symbol.ycp) + "', ";
             str += "'" + symbol.volume + "', ";
             str += "'" + symbol.trade + "', ";
             str += "'" + symbol.value + "', ";
             str += "'" + symbol.updated_at + "' ";
             str += " ) ";

             items.push(str)
           }
           query += items.join(',')
           query+= " ON DUPLICATE KEY UPDATE sme = 1, open = VALUES(open),  nv = IF( 1 > VALUES(volume) - volume  , nv, VALUES(volume) - volume)  ,  high = VALUES(high),  low = VALUES(low),  close = VALUES(close),   ycp = VALUES(ycp),   trades = VALUES(trades), value = VALUES(value), volume = VALUES(volume), updated_at = VALUES(updated_at)";
           
           await sequelize.query(query)
}


main()


