var db = require('../db');
var cheerio = require('cheerio')
var proxy = require('../proxy');
var exec = require('child_process').exec;
const axios = require('axios')
const moment = require('moment')
const {insertFundamentalMeta} = require('./helpers');


/*
     18   share_percentage_director   Currently USE   2014-07-21 12:22:29 ss  dd  Dir%    1
     19   share_percentage_govt   in use  2014-07-21 12:22:29 NULL    NULL    Gov%    1
     20   share_percentage_institute  Currently in use    2014-07-21 12:22:29 NULL    NULL    Ins%    1
     21   share_percentage_foreign    in use  2014-07-21 12:22:29 NULL    NULL    Fgn%    1
     22   share_percentage_public currently in use
*/

async function getShareHoldingDataFromCSE(symbol) {
  if(symbol.sme == 1){
    return { date : '1971-09-09' }
  }
  try {
    const { data } = await axios.get("https://www.cse.com.bd/company/companydetails/"+symbol.code);
    const $ = cheerio.load(data);
    const shareHoldingTable = $('td:contains("Sponsor/Director")')
    .last().closest('table')
    .find('tr').slice(1).first()

    const cells = shareHoldingTable.find('td');

    const latestData = {
      date: $(cells[0]).text().replace("As on", "").trim(),
      dir: parseFloat($(cells[1]).text().trim()),
      gov: parseFloat($(cells[2]).text().trim()),
      inst: parseFloat($(cells[3]).text().trim()),
      foreign: parseFloat($(cells[4]).text().trim()),
      pub: parseFloat($(cells[5]).text().trim())
    };


    console.log('Latest Shareholding Data CSE:', latestData); // Log only the latest entry
     return latestData
  } catch (error) {
    console.error('Error fetching data:', error);
  }
 
}
 async function getShareHoldingDataFromDSE(symbol){
  
        var url = 'old.dsebd.org/displayCompany.php'
        if(symbol.sme){
            url = 'sme.dsebd.org/sme_displayCompany.php'
        }        
        console.log(url)
        // console.log(symbol.code)
      var page = await axios.get("https://"+url+"?name="+symbol.code, {...proxy, timeout: 20000});

      const $ = cheerio.load(page.data);    

        // Find the table containing shareholding information
        let latestShareholding = {};      

        $('td:contains("Share Holding Percentage")').each((i, el) => {
            // Ensure this is the latest table by checking the date inside 'as on'
            const dateText = $(el).text();

              if (dateText.includes("of the Company")){
                //skip remark table 
                return
              } 


            if (dateText.includes("as on")) {
                const date = dateText.match(/\[(as on .*?)]/g)[0];
                latestShareholding.date = date.replace('as on', '').replace('[', '').replace(']', '').trim();

                // Navigate to the next table containing the percentages
                const dataRow = $(el).next('td').find('table tr').first();
                
                latestShareholding.dir = dataRow.find('td:contains("Sponsor/Director")').text().replace('Sponsor/Director:', '').trim();
                latestShareholding.gov = dataRow.find('td:contains("Govt")').text().replace('Govt:', '').trim();
                latestShareholding.inst = dataRow.find('td:contains("Institute")').text().replace('Institute:', '').trim();
                latestShareholding.foreign = dataRow.find('td:contains("Foreign")').text().replace('Foreign:', '').trim();
                latestShareholding.pub = dataRow.find('td:contains("Public")').text().replace('Public:', '').trim();           
            }
        });
         console.log('Latest Shareholding Data DSE:', latestShareholding); // Log only the latest entry
        return latestShareholding;


}
async function wait(time){
    return new Promise((resolve)=>{
        setTimeout(()=>{
             resolve()
        }, time*1000)
    })
}

async function scrape(symbol){

        await wait(5);
         var cseHolding = { date: '1971-09-09' }
        try {
         cseHolding =  await getShareHoldingDataFromCSE(symbol)
        } catch (error) {
          
        }
        if (cseHolding == undefined || cseHolding.date == '' ){
             cseHolding = {date: '1971-09-09'}
          }

        // statements
        var dseHolding = await getShareHoldingDataFromDSE(symbol)

              if(dseHolding.date == ''){
                 dseHolding.date = '1971-09-09'
              }
      // console.log(e)
      // statements
      // console.log(e);

    // console.log(dseHolding)


    var dseDt = new Date(dseHolding.date) 
    var cseDt = new Date(cseHolding.date)
     dseHolding.date = moment(dseDt).format("YYYY-MM-DD");
     cseHolding.date = moment(cseDt).format("YYYY-MM-DD");


     
     if(dseDt.getTime() >= cseDt.getTime()){
      holding = dseHolding
     }else{
      holding = cseHolding
     }

    // if(symbol.code == 'AGRANINS'){
    //    console.log(holding, instrument_id)
    // }    
    // return


    // if(holding.dir == null){
    //     return;
    // }
    
   

    var instrument_id = symbol.code ;
 
    // console.log(share_percentage_director)
    if(holding.date == '1971-09-09'){
        try {
            // statements
       await  axios.post('https://stocknow.com.bd/api/v1/contact', {message: instrument_id + ' share holding has error --- notify admin about this error. this is system generated message from parseShareHoldin.js line 134' })
        } catch(e) {
            // statements
            console.log(e);
        }

        return 
    }


    var share_percentage_director = {meta_key: 'share_percentage_director', code: instrument_id, meta_date: holding.date, meta_value: holding.dir};
    var share_percentage_govt = {meta_key: 'share_percentage_govt', code: instrument_id, meta_date: holding.date, meta_value: holding.gov};
    var share_percentage_institute = {meta_key: 'share_percentage_institute', code: instrument_id, meta_date: holding.date, meta_value: holding.inst};
    var share_percentage_foreign = {meta_key: 'share_percentage_foreign', code: instrument_id, meta_date: holding.date, meta_value: holding.foreign};
    var share_percentage_public = {meta_key: 'share_percentage_public', code: instrument_id, meta_date: holding.date, meta_value: holding.pub};

    // return
    await insertFundamentalMeta(share_percentage_director);
    await insertFundamentalMeta(share_percentage_govt);
    await insertFundamentalMeta(share_percentage_institute);
    await insertFundamentalMeta(share_percentage_foreign);
    await insertFundamentalMeta(share_percentage_public);

      var a = exec('curl -H "senocache: true" -X GET -D – https://api.stocknow.com.bd/v1/fundamentals/'+symbol.code, (err, stdout, stderr)=>{
          // console.log(stderr)
          // console.log(err)
          // console.log(stdout)
      })             

}

    db.query("select instruments.code, instruments.sme from instruments left join fundamentals on instruments.code = fundamentals.code and meta_key = 'share_percentage_public' and is_latest = 1 where instruments.updated_at > DATE_SUB(NOW(), INTERVAL 10 day) and sector_id != 23 order by fundamentals.updated_at asc", async function (err, result) {
        for(var k in result){
          // console.log(k)
          // if (result[k].code != "UNITEDFIN"){
          //   continue;
          // }
          // console.log('ppp')
          console.log(result[k].code);
    // continue          
      // result[k].code = "GIB"
      await  scrape(result[k]);

          // reset growth cache 
          // axios.get('https://stocknow.mobi/v1/fundamentals/'+result[k].code+'/growth')
 


        }
    })






setTimeout(function() {
    db.end();
    process.exit();
}, 6000000);
