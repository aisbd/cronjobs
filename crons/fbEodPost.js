var axios = require('axios')
var fb = require('../fb')

var cp = require('child_process');
var FormData = require('form-data');
var   fs  =   require('fs')
function bn(val){
    val = new String(val)
    var en = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    var bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']
    for(var k in en){
        var re = new RegExp(en[k], 'g');
       val =  val.replace(re, bn[k])
    }
    return val
}
async function main() {
    var trades = await axios.get('https://stocknow.mobi/v1/trades')
    var instruments = await axios.get('https://stocknow.mobi/v1/instruments')
    instruments = instruments.data 
    
    var up = 0;
    var down = 0;
    var unchange = 0;
    for(var code in instruments){
        var instrument = instruments[code]
        if (instrument.sector_id == 23 || instrument.sector_id == 24 || instrument.sector_id == 22 || instrument.sector_id == null || instrument.sector_id == 4 || instruments.DSEX.updated_at.substring(0, 10) != instrument.updated_at.substring(0, 10)) {
           continue
        }        
        if(instruments[code].close == instruments[code].ycp){
            unchange++
        }else if(instruments[code].close > instruments[code].ycp){
            up++
        }else{
            down++
        }
    }
    trades = trades.data
    var change = (instruments.DSEX.close - instruments.DSEX.ycp).toFixed(2)
    var  changeText = "বেড়েছে";
    if(change < 0){
        changeText = "কমেছে"

    }

    var txt = `ঢাকা স্টক এক্সচেঞ্জে আজ ${bn((trades.value/10).toFixed(2))} কোটি টাকার লেনদেন হয়েছে।  দাম বেড়েছে ${bn(up)} টির কমেছে ${bn(down)} টির অপরিবর্তিত আছে ${bn(unchange)} টির। DSEX সূচক ${changeText} ${ bn(change)} পয়েন্ট। সূচকের বর্তমান অবস্থান ${bn(instruments.DSEX.close)}`
   
     
    var tOld =  fs.readFileSync('eod.txt', 'utf8')
  
    if(txt == tOld){
        return
    }
     fs.writeFile('eod.txt', txt, ()=>{}, ()=>{})
     // var proc = cp.fork(__dirname + '/../capture-website/index.js');
 
        var form = new FormData()
        // var file =  fs.readFileSync('screenshot.png');

        // console.log(file)
        form.append("url", 'http://stocknow.com.bd/api/v1/crons/fbMarketSummary?url=https://stocknow.com.bd')
        form.append("message", txt)
        const formHeaders = form.getHeaders();
        // formData.append("message", "StockNow Web")
        var res = await fb.post('/1942670509115283/photos',    form,   {  
            headers: {
             ...formHeaders,
            }
        } )

        // console.log(url.data)

          // var res = await fb.post('/1942670509115283/photos?message=StockNow Web', formData, {
          //       headers: {
          //           "Content-Type": "multipart/form-data"
          //       },
          // })
          // console.log(formData, 'sssssssss')

    // console.log(capture)
    
}
main()