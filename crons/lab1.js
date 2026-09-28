var axios = require('axios')
var moment = require('moment')
var  sequelize  = require('../Sequelize');


async function main() {
        // sync database

        const [result] = await sequelize.query(`SELECT * FROM TRD inner join trades on trades.TRD_LM_DATE_TIME = TRD.TRD_LM_DATE_TIME`);
         if( result.length > 0){
            return 
         }

         // new data updated 

         console.log("has new data")
         
     


}

main()
