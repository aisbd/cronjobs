// tasks of this cron: 
// Update sector
// update year end 
// update EPS ---- !!!!important notice is that we havee to parsee it from news and makee an automatic newes parser
// update PE
process.on('uncaughtException', function (err) {
  console.log('Caught exception: ', err);
});
var axios = require('axios')
var moment = require('moment')
var db = require('../db');
var axios = require ('axios')
var moment = require('moment')

const {insertFundamentalMeta} = require('./helpers');

const util = require('util');

// node native promisify
const query = util.promisify(db.query).bind(db);

// functions
async function updateNoOfShare(instrument, html){
    var regex = /Total No. of Outstanding Securities<\/th>.+?<td>(.+?)<\/td>/gims
        var data = [...html.data.matchAll(regex)];
        // console.log(data[0][1])
        // console.log(Object.keys(data[0]))        
        var totalShare = data[0][1];
        totalShare = totalShare.trim().replace(new RegExp(',', 'g'), "")
            // total_no_securities
        var oldFundaData = await query(`select * from fundamentals where code = '${instrument.code}' and meta_key = 'total_no_securities' and is_latest = 1`)
        oldFundaData = oldFundaData[0]
        if(oldFundaData && oldFundaData.meta_value == totalShare){
            return;
        }


       var fundaData =  {meta_key: 'total_no_securities', code: instrument.code, meta_date: moment().format("YYYY-MM-DD"), meta_value: totalShare};
       insertFundamentalMeta(fundaData)

}

async function updatePaidUp(instrument, html){
    var regex = /Paid-up.+?([0-9.,].+?)<\/td/gims
     var data = [...html.data.matchAll(regex)];
     var paidUp = data[0][1];
     paidUp = paidUp.replace(",", "")
     paidUp = paidUp.replace(",", "")
     paidUp = paidUp.replace(",", "")
     paidUp = paidUp.replace(",", "")
     paidUp = paidUp.replace(",", "")
    var oldFundaData = await query(`select * from fundamentals where code = '${instrument.code}' and meta_key = 'paid_up_capital' and is_latest = 1`)
    oldFundaData = oldFundaData[0]
    if(oldFundaData && oldFundaData.meta_value == paidUp){
        return;
    }
       var fundaData =  {meta_key: 'paid_up_capital', code: instrument.code, meta_date: moment().format("YYYY-MM-DD"), meta_value: paidUp};
       // console.log(oldFundaData)
       insertFundamentalMeta(fundaData)     
}

async function updateAuthorizedCapital(instrument, html){
    var regex = /Authorized Capital.+?([0-9.,].+?)<\/td/gims
     html.data = html.data.replace(/width="25%"/g, "")
     var data = [...html.data.matchAll(regex)];
     var paidUp = data[0][1];
     paidUp = paidUp.replace(",", "")
     paidUp = paidUp.replace(",", "")
     paidUp = paidUp.replace(",", "")
     paidUp = paidUp.replace(",", "")
     paidUp = paidUp.replace(",", "")

    var oldFundaData = await query(`select * from fundamentals where code = '${instrument.code}' and meta_key = 'authorized_capital' and is_latest = 1`)
    oldFundaData = oldFundaData[0]
    if(oldFundaData && oldFundaData.meta_value == paidUp){
        return;
    }
       var fundaData =  {meta_key: 'authorized_capital', code: instrument.code, meta_date: moment().format("YYYY-MM-DD"), meta_value: paidUp};
       // console.log(oldFundaData)
       insertFundamentalMeta(fundaData)     
}
async function shortTermLoan(instrument, html){
    html.data = html.data.replace(/<td align="right">0<\/td>/g, '<td align="right">0.0</td>')
    var regex = /short-term.+?([0-9,]+\.+[0-9]+?)./gims
     // html.data = html.data.replace(/width="25%"/g, "")
     var metaDatergx = /Present Loan Status as on (.+?)<\/td>/gims
     var metaDate = [...html.data.matchAll(metaDatergx)];
     metaDate = metaDate[0][1];
     metaDate = moment(new Date(metaDate)).format('YYYY-MM-DD');


     var data = [...html.data.matchAll(regex)];
     var paidUp = data[0][1];
     paidUp = paidUp.replace(",", "")
     paidUp = paidUp.replace(",", "")
     paidUp = paidUp.replace(",", "")
     paidUp = paidUp.replace(",", "")
     paidUp = paidUp.replace(",", "")

    var oldFundaData = await query(`select * from fundamentals where code = '${instrument.code}' and meta_key = 'short_term_loan' and is_latest = 1`)
    oldFundaData = oldFundaData[0]
    if(oldFundaData && oldFundaData.meta_value == paidUp){
        return;
    }
       var fundaData =  {meta_key: 'short_term_loan', code: instrument.code, meta_date: metaDate, meta_value: paidUp};
       // console.log(oldFundaData)
       insertFundamentalMeta(fundaData)     
}
async function longTermLoan(instrument, html){
     html.data = html.data.replace(/<td align="right">0<\/td>/g, '<td align="right">0.0</td>')

    var regex = /long-term.+?([0-9,\.]+)/gims
     // html.data = html.data.replace(/width="25%"/g, "")
     var metaDatergx = /Present Loan Status as on (.+?)<\/td>/gims
     var metaDate = [...html.data.matchAll(metaDatergx)];
     metaDate = metaDate[0][1];
     metaDate = moment(new Date(metaDate)).format('YYYY-MM-DD');


     var data = [...html.data.matchAll(regex)];
     try {
         // statements
          var paidUp = data[0][1];
     } catch(e) {
         // statements
         console.log(e);
         return
     }
    
     paidUp = paidUp.replace(",", "")
     paidUp = paidUp.replace(",", "")
     paidUp = paidUp.replace(",", "")
     paidUp = paidUp.replace(",", "")
     paidUp = paidUp.replace(",", "")

    var oldFundaData = await query(`select * from fundamentals where code = '${instrument.code}' and meta_key = 'long_term_loan' and is_latest = 1`)
    oldFundaData = oldFundaData[0]
    if(oldFundaData && oldFundaData.meta_value == paidUp){
        return;
    }
       var fundaData =  {meta_key: 'long_term_loan', code: instrument.code, meta_date: metaDate, meta_value: paidUp};
       // console.log(oldFundaData)
       insertFundamentalMeta(fundaData)     
}

async function operational_status(instrument, html){
    var regex = /Present Operational Status.+?>([A-Za-z].+?)<\/td>/gims
     // html.data = html.data.replace(/width="25%"/g, "")

     var data = [...html.data.matchAll(regex)];
     var paidUp = data[0][1];
     paidUp = paidUp.replace(",", "")
     paidUp = paidUp.replace(",", "")
     paidUp = paidUp.replace(",", "")
     paidUp = paidUp.replace(",", "")
     paidUp = paidUp.replace(",", "")

     if(paidUp.includes("Present Loan Status")){
        paidUp = "N/A"
     }

    var oldFundaData = await query(`select * from fundamentals where code = '${instrument.code}' and meta_key = 'operational_status' and is_latest = 1`)
    oldFundaData = oldFundaData[0]
    if(oldFundaData && oldFundaData.meta_value == paidUp){
        return;
    }
       var fundaData =  {meta_key: 'operational_status', code: instrument.code, meta_date: moment().format("YYYY-MM-DD"), meta_value: paidUp};
       // console.log(oldFundaData)
       insertFundamentalMeta(fundaData)     
}

async function updateYearEnd(instrument, html){
    var regex = /Year End<\/th>.+?<td>(.+?)<\/td>/gims    
        var data = [...html.data.matchAll(regex)];
        // console.log(data[0][1])
        // console.log(Object.keys(data[0]))        
        var yearEnd = data[0][1];
            if(yearEnd.includes('Jun')){
                yearEnd = "2021-06-30"
            }else if(yearEnd.includes('Dec')){
                yearEnd = "2021-12-31"
            }else{
                return
            }

            // year_end
        var oldFundaData = await query(`select * from fundamentals where code = '${instrument.code}' and meta_key = 'year_end' and is_latest = 1`)
        oldFundaData = oldFundaData[0]
        if(oldFundaData && oldFundaData.meta_value == yearEnd){
            return;
        }


       var fundaData =  {meta_key: 'year_end', code: instrument.code, meta_date: moment().format("YYYY-MM-DD"), meta_value: yearEnd};
       // console.log(oldFundaData)
       insertFundamentalMeta(fundaData)

}
async function updateListinYear(instrument, html){
    var regex = /Listing Year<\/td>.+?>(.+?)<\/td>/gims    
        var data = [...html.data.matchAll(regex)];
        // console.log(data[0][1])
        // console.log(Object.keys(data[0]))        
        var yearEnd = data[0][1];
       yearEnd = yearEnd.trim()
            // year_end
        var oldFundaData = await query(`select * from fundamentals where code = '${instrument.code}' and meta_key = 'listing_year' and is_latest = 1`)
        oldFundaData = oldFundaData[0]
        if(oldFundaData && oldFundaData.meta_value == yearEnd){
            return;
        }


       var fundaData =  {meta_key: 'listing_year', code: instrument.code, meta_date: moment().format("YYYY-MM-DD"), meta_value: yearEnd};
       // console.log(oldFundaData)
       insertFundamentalMeta(fundaData)

}
async function updateLastAGM(instrument, html){

    var regex = /Last AGM held on: <i>(\d{2}-\d{2}-\d{4})<\/i>/gims ;
        var data = [...html.data.matchAll(regex)];
        // console.log(data[0][1])
        // console.log(Object.keys(data[0]))        
       if(data.length < 1){
        return
       }
        var yearEnd = data[0][1];
       yearEnd = yearEnd.trim()
            // year_end
        var oldFundaData = await query(`select * from fundamentals where code = '${instrument.code}' and meta_key = 'last_agm_held' and is_latest = 1`)
        oldFundaData = oldFundaData[0]
        if(oldFundaData && oldFundaData.meta_value == yearEnd){
            return;
        }


       var fundaData =  {meta_key: 'last_agm_held', code: instrument.code, meta_date: moment().format("YYYY-MM-DD"), meta_value: yearEnd};
       // console.log(oldFundaData)
       insertFundamentalMeta(fundaData)

}
async function updateReserve_and_surp(instrument, html){
    var regex = /Reserve & Surplus without OCI \(mn\)<\/th>.+?<td>(.+?)<\/td>/gims    
        var data = [...html.data.matchAll(regex)];
        // console.log(data[0][1])
        // console.log(Object.keys(data[0]))        
        var yearEnd = data[0][1];
       yearEnd = yearEnd.trim().replace(",", '').replace(",", '')
            // year_end
        var oldFundaData = await query(`select * from fundamentals where code = '${instrument.code}' and meta_key = 'reserve_and_surp' and is_latest = 1`)
        oldFundaData = oldFundaData[0]
        if(oldFundaData && oldFundaData.meta_value == yearEnd){
            return;
        }


       var fundaData =  {meta_key: 'reserve_and_surp', code: instrument.code, meta_date: moment().format("YYYY-MM-DD"), meta_value: yearEnd};
       // console.log(oldFundaData)
       insertFundamentalMeta(fundaData)

}

async function updateOffice_address(instrument, html){
    var regex = />Address<\/td.+?>(.+?)<\/td>/gims    
        var data = [...html.data.matchAll(regex)];
        // console.log(data[0][1])
        // console.log(Object.keys(data[0]))        
        var yearEnd = data[0][1];
       yearEnd = yearEnd.trim().replace(",", '').replace(",", '')
            // year_end
        var oldFundaData = await query(`select * from fundamentals where code = '${instrument.code}' and meta_key = 'office_address' and is_latest = 1`)
        oldFundaData = oldFundaData[0]
        if(oldFundaData && oldFundaData.meta_value == yearEnd){
            return;
        }


       var fundaData =  {meta_key: 'office_address', code: instrument.code, meta_date: moment().format("YYYY-MM-DD"), meta_value: yearEnd};
       // console.log(oldFundaData)
       insertFundamentalMeta(fundaData)
}

async function updatePhone(instrument, html){
    var regex = />Contact Phone<\/td.+?>(.+?)<\/td>/gims    
        var data = [...html.data.matchAll(regex)];
        // console.log(data[0][1])
        // console.log(Object.keys(data[0]))        
        var yearEnd = data[0][1];
       yearEnd = yearEnd.trim().replace("'", '').replace("'", '')
            // year_end
        var oldFundaData = await query(`select * from fundamentals where code = '${instrument.code}' and meta_key = 'phone_number' and is_latest = 1`)
        oldFundaData = oldFundaData[0]
        if(oldFundaData && oldFundaData.meta_value == yearEnd){
            return;
        }


       var fundaData =  {meta_key: 'phone_number', code: instrument.code, meta_date: moment().format("YYYY-MM-DD"), meta_value: yearEnd};
       // console.log(oldFundaData)
       insertFundamentalMeta(fundaData)
}

async function updateWebsite(instrument, html){
    var regex = />Web Address.+?(http.+?)"/gims    
        var data = [...html.data.matchAll(regex)];
        // console.log(data[0][1])
        // console.log(Object.keys(data[0]))        
        // console.log(data)
        var yearEnd = data[0][1];

   
       yearEnd = yearEnd.trim().replace("'", '').replace("'", '')
            // year_end
        var oldFundaData = await query(`select * from fundamentals where code = '${instrument.code}' and meta_key = 'website' and is_latest = 1`)
        oldFundaData = oldFundaData[0]
        if(oldFundaData && oldFundaData.meta_value == yearEnd){
            return;
        }


       var fundaData =  {meta_key: 'website', code: instrument.code, meta_date: moment().format("YYYY-MM-DD"), meta_value: yearEnd};
       // console.log(oldFundaData)
       insertFundamentalMeta(fundaData)
}

// functions





async function main() {
    var dateFrom = moment(Date.now() - 7 * 24 * 3600 * 1000).format('YYYY-MM-DD'); 
      const instruments = await query('select * from instruments where  updated_at > "'+dateFrom+'" and sector_id is not null and sector_id not in (24, 23, 22, 5, 4) order by code asc')

        for(var key in instruments){
            var instrument = instruments[key]
            
            var result = false;
            try {
                var url = 'dse.stocknow.mobi/displayCompany.php'
                if(instrument.sme){
                    console.log('sme website called')
                    url = 'sme.dsebd.org/sme_displayCompany.php'
                }
  
                   result = await axios.get('https://'+url+'?name='+instrument.code, {}, {...proxy, timeout: 20000,
                                      headers: {
                                        'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1'
                                      }
                                    })
            } catch(e) {
                // statements
                console.log(e);
            }

            if(result == false){
                continue; 
            }
          
            try {
            console.log(instrument.code)
                updateLastAGM(instrument, result)
                process.exit
                updateNoOfShare(instrument, result)
                updateYearEnd(instrument, result)
                updatePaidUp(instrument, result)
                updateAuthorizedCapital(instrument, result)
                shortTermLoan(instrument, result)
                longTermLoan(instrument, result)
                operational_status(instrument, result)     
                updateReserve_and_surp(instrument, result)           
                updateListinYear(instrument, result)      
                 updateOffice_address(instrument, result) 
                 updatePhone(instrument, result) 
                 updateWebsite(instrument, result)  




                // statements
            } catch(e) {
                // statements
              axios.post('https://stocknow.com.bd/api/v1/contact', {message: JSON.stringify(e)+' notify admin about this error. this is system generated message from updateDseNews.js line 34' })

                // console.log(e);
            }

         
        }      


}

main()


setTimeout(function() {
    db.end();
    process.exit();
}, 7200000);
