var axios = require('axios')
var moment = require('moment')
var proxy = require('../proxy');
const { Sequelize } = require("sequelize");

var  sequelize  = require('../Sequelize');

const MinuteData = sequelize.define("MinuteData", {
  code: {
    type: Sequelize.STRING
  },
  price: {
    type: Sequelize.FLOAT,
  },
  volume: {
    type: Sequelize.BIGINT,
  },
  value: {
    type: Sequelize.FLOAT,
  },
  trades: {
    type: Sequelize.INTEGER,
  },
  type: {
    type: Sequelize.STRING,
  },
  date: {
    type: Sequelize.DATEONLY,
  },
  created_at: {
    type: Sequelize.DATE,
  }
}, {
     tableName: 'minute_data',
  timestamps: false
});


async function main(){
// uncomment this if dse block acess start
    // get all instruments that traded today 

    var codes = await sequelize.query("select code from instruments where updated_at like '"+moment().format("YYYY-MM-DD")+"%' and sme != 1 and sector_id  in (select id from sector_lists) order by code asc")

    codes = codes[0]
    // console.log(codes)
    for(var key in codes){
        var minuteDataQuery = "insert into minute_data (code, price, volume, value, trades, type, date, created_at) VALUES ";

        var code  = codes[key].code
        var trades;

        try {
            // statements
           trades = await  axios.get('https://itrade.lbsbd.com/content?UID=317606&SID=7463JHDF-BS09-11QT-40E3-5648HFVSGDJ4&L=EN&UNC=1&UE=DSE&H=1&M=1&RT=12&E=DSE&S='+code+'%60PB&AS=0&CT=1&SO=DESC&SC=0&PGS=20000', {...proxy,  timeout: 20000 })
        } catch(e) {
            try {
                // statements
                 trades = await  axios.get('https://itrade.lbsbd.com/content?UID=317606&SID=7463JHDF-BS09-11QT-40E3-5648HFVSGDJ4&L=EN&UNC=1&UE=DSE&H=1&M=1&RT=12&E=DSE&S='+code+'%60PB&AS=0&CT=1&SO=DESC&SC=0&PGS=5000', {...proxy,  timeout: 20000 })
            } catch(e) {
                continue;
                console.log(e);
                // statements
            }
            // statements
            console.log(e);
        }

        trades = trades.data.DAT.TS
        var rows = []
        for(var k in trades){
            var row = (trades[k].split('|'))
            const formattedTime = moment.utc( row[0] , "HHmmss").utcOffset("+06:00").format("YYYY-MM-DD HH:mm:ss");

            var value = ( row[2] * row[3] ) / 1000000
            var obj = {created_at: formattedTime, price: row[2], volume: row[3], type: row[6], trades: row[7], date: moment().format("YYYY-MM-DD"), code: code, value: value}
            rows.push(obj)
            
        }
       await MinuteData.destroy({
          where: {
            code: code,
            date:  moment().format("YYYY-MM-DD")
          }
        })
        await MinuteData.bulkCreate(rows, {
          ignoreDuplicates: true
        })
        console.log(code)
         // return;
    }

// uncomment this if dse block acess end    
}

main()

