var axios = require('axios');
var db = require('../db')
var moment = require('moment')
var code = "KPCLl";

const util = require('util');

// node native promisify
const query = util.promisify(db.query).bind(db);

(async () => {
  try {
    const news = await query("select *  from news WHERE   trash != 1 and ( details like '%\\% cash%' or details like '%\\% stock%') and `details` LIKE '% has recommended %' and `details` not like '%Qualified Opinion%'");
    var cashrgx = /([0-9\.]+)% cash | cash dividend @ ([0-9.]+)%/gims 
    var stockrgx = /([0-9.]+)% stock | stock dividend @ ([0-9.]+)%/gims 
    var datergx = /year ended on (.+?[0-9].{8})\.?/gims 
    var data = {};
    var values = [];
    news.forEach( async (element, index) => {
        var cashdiv = 0;
        var cash = [...element.details.matchAll(cashrgx)]
        if(cash[0]){

            cashdiv = cash[0][1] || cash[0][2] || 0 ;

        }
        var stockdiv = 0;
        var stock = [...element.details.matchAll(stockrgx)]
        if(stock[0]){
            stockdiv = stock[0][1] || stock[0][2]  || 0;
        }

        var d = [...element.details.matchAll(datergx)]
         var date ;
         if(d[0] && d[0][1]){
            date = d[0][1]
         }
         if(data[element.prefix]  == null){
             data[element.prefix] = [];
         }
        if(date != null){
             data[element.prefix].push({date: date, stock: stockdiv, cashdiv: cashdiv}) 
               var formatedDate  = '';
             try {
                    // Add all possibble datee formats in news 
                    date = date.trim()
                    var format = "LL";
                    if(date.length < 10){
                        format = "DD.MM.YY.";
                        // console.log(format)
                    }else if(date.length < 13){
                         format = "DD.MM.YYYY.";
                    }


                     formatedDate  = moment(date, format).format('Y-MM-DD');


                    if(formatedDate.includes(moment().format('YYYY')) || formatedDate.length != 10){
   

                      if(date.includes("June")){
                           formatedDate = moment(element.post_date).format('YYYY')+"-06-30";
                                         
                      }else if(date.includes("March")){
                           formatedDate = moment(element.post_date).format('YYYY')+"-03-31";
                      }else if(date.includes("August")){
                           formatedDate = moment(element.post_date).format('YYYY')+"-08-31";
                      }else if(date.includes("September")){
                           formatedDate = moment(element.post_date).format('YYYY')+"-09-30";
                      }else if(date.includes("October")){
                           formatedDate = moment(element.post_date).format('YYYY')+"-10-31";
                      }else if(date.includes("December")){
                           formatedDate = (moment(element.post_date).format('YYYY') - 1)+"-12-31";
                      }


                       // formatedDate  = moment(date, format).format('Y-MM-DD');
                    }

                    if(formatedDate.length != 10){
                      console.log(date, format, moment(date, format).format('Y-MM-DD'), element.id)
                    }else{
                       // console.log(formatedDate)
                    }
                  
                   // console.log(formatedDate)
                   // if(element.prefix == "AMANFEED"){
                   //      console.log(stock)
                   //      console.log(stockdiv)
                   // }
             } catch(e) {

                 // statements


              
             }
                 if(element.id == 578029){
                       // console.log(formatedDate);
                 }    
           
            var str = "( '"+element.prefix+"', '"+formatedDate+"',  '"+cashdiv+"',  '"+stockdiv+"', '"+element.id+"' )";
                   // if(element.prefix == "AMANFEED"){
                   //      console.log(d)
                   //      console.log(date)
                   //      console.log(str)
                     
                   // }            
           values.push(str);             
        }

    });
    
    var q = "insert IGNORE into dividends (`code`, `date`, `cash`, `stock`, `news_id`) values "+ values.join(", ")
    var id = await query(q)
    // console.log(id)

    // console.log(news);
  } finally {
    db.end();
  }
})()

setTimeout(function() {
    connection.end();
    process.exit();
}, 60000);
