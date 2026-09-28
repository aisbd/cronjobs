const { LocalStorage } = require('node-localstorage');
// Create a LocalStorage instance and specify a directory for storing the data
const localStorage = new LocalStorage('./sector_temp');



const getTodayDate = () => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const day = String(today.getDate()).padStart(2, '0'); // Ensure two digits for day

  return `${year}-${month}-${day}`;
};

const date = getTodayDate()

const prevDataQuery = `select m.* from minute_data m inner join 
(select code, max(created_at) last_update
from minute_data 
where date = '${date}' and code in (select name from sector_lists) 
group by code) latest on latest.code = m.code and last_update = m.created_at`;


var  db  = require('../Sequelize');

async function main(){
        var prevData = JSON.parse(localStorage.getItem('prevData'))
        // console.log(prevData)
        // return
         var result = await db.query('SELECT code, close as price, volume, trades, updated_at as created_at FROM `instruments`  WHERE `code` in (select name from sector_lists) and updated_at like'+ `'${date}%' `) 
         result = result[0]
         var data = [];
         var dataForLocalStorage = {}
         for (var key in result){
            var row = result[key]
            row.date = row.created_at.split(' ')[0]
            dataForLocalStorage[row.code] = JSON.parse(JSON.stringify(row))

            if(prevData && prevData[row.code] ){
                if(prevData[row.code].created_at == row.created_at){
                    continue;
                }

                if(prevData[row.code].date == row.date){
                    row.volume = row.volume - prevData[row.code].volume || 0
                    row.trades = row.trades - prevData[row.code].trades || 0
                }
            }

            data.push([row.code, row.price, row.volume, row.trades, row.date,  row.created_at]);
         }

        localStorage.setItem('prevData', JSON.stringify(dataForLocalStorage))
         db.query('insert into minute_data (code, price, volume, trades, date, created_at) Values ? ',{
            replacements: [data],
            type: db.QueryTypes.INSERT,
         });

         // console.log(dataForLocalStorage)
         // console.log(data)
}
main()

