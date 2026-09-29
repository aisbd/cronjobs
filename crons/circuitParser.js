var  sequelize  = require('../Sequelize');
const cheerio = require('cheerio')

var proxy = require('../proxy');
const {insertFundamentalMeta} = require('./helpers');
var  axios = require('axios')
const HtmlTableToJson = require('html-table-to-json');

async function main() {
    // var html = await axios.get('https://dse.stocknow.mobi/cbul.php')
    var html = await axios.get('https://dsebd.org/cbul.php', { ...proxy, timeout: 20000 })

    const $ = cheerio.load(html.data)
    const data = []

     const tableRows = $('.table tbody tr').toArray();
   for (const r of tableRows) {
        const cells = $(r).find('td');
        if (cells.length < 3) {
            continue
        }
        const row = {
            'Trade Code': $(cells[1]).text().trim(),
            'Lower Limit': $(cells[5]).text().trim(),
            'Upper Limit': $(cells[6]).text().trim(),
            'Open Adj. Price': $(cells[4]).text().trim(),
            'Ref. Floor Price': $(cells[7]).text().trim(),
        }

      
            // if(row['Trade Code'] == 'ABBANK'){
            //     console.log(row)
            // }
            // return isTrusted

            await insertFundamentalMeta({meta_key: 'circuit_down', code: row['Trade Code'], meta_date: '2021-04-21', meta_value: parseFloat(row['Lower Limit'].replace(',', '')) || 0});
            await insertFundamentalMeta({meta_key: 'circuit_up', code: row['Trade Code'], meta_date: '2021-04-21', meta_value: parseFloat(row['Upper Limit'].replace(',', '')) || 0}) ;       
            await insertFundamentalMeta({meta_key: 'open_adj_price', code: row['Trade Code'], meta_date: '2021-04-21', meta_value: parseFloat(row['Open Adj. Price'].replace(',', '')) || 0}) ;  
            
            // console.log(row['Upper Limit'], row['Trade Code'])

            if(row['Upper Limit'] != '-'){
                 await insertFundamentalMeta({meta_key: 'floor', code: row['Trade Code'], meta_date: '2021-04-21', meta_value: parseFloat(row['Ref. Floor Price'].replace(',', '')) || 0});  
            }     
                 
            continue;            
 

     }
        // console.log(data)
        // process.exit()

        // console.log(table.slice(0, 600))
        // return

        await sequelize.query(`
                        update instruments
                        left join fundamentals

                        on meta_key = 'floor' and fundamentals.code = instruments.code
                         set floor = meta_value
                         
                        `)

}

main()
    .then(async function () {
        console.log('Circuit breaker parsed successfully');
        await sequelize.close();
        process.exit(0);
    })
    .catch(async function (err) {
        console.error('Circuit breaker parse failed:', err);
        await sequelize.close();
        process.exit(1);
    });

