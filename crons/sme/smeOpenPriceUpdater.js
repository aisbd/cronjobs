// var axios = require('axios')
// var  sequelize  = require('../../Sequelize');
// var DomParser = require('dom-parser');
// var moment = require('moment');
// var parser = new DomParser();
// const HtmlTableToJson = require('html-table-to-json');

// async function main(){
//     var instruments =  await sequelize.query("select * from instruments where sme = 1")
//     // console.log(instruments)
//     var instruments = instruments[0]
//     for(var k in instruments){
//        var instrument = instruments[k]
//      var url = "https://sme.old.dsebd.org/sme_displayCompany.php?name="+instrument.code
//        var r = await axios.get(url)    
//        var html = r.data
//         var regex = />Opening Price.+?([0-9.,]+?)<\/td/gims
//         var data = [...html.matchAll(regex)];
//         var price = data[0][1] || 0
//         if(price != 0){
//         await sequelize.query("update instruments set open = '"+price+"' where id = "+instrument.id)
            
//         }
//         // console.log(data[0][1]);

//     }

// }


// // main()

// // setTimeout(function(){
//     main()
// // }, 360000)


