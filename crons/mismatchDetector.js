var  sequelize  = require('../Sequelize');
var axios = require('axios')
const HtmlTableToJson = require('html-table-to-json');

axios.defaults.baseURL = 'https://dse.stocknow.mobi'
// sequelize.models.Mismatch.sync()
class Mismatch {
    constructor(){
        this.eps()
    }

    /*eps mismatch detector*/
    async eps(){
        // parse dse data
        var r = await axios.get('/latest_PE.php')
        var rgx = /(<table class="table table-bordered background-white  shares-table fixedHeader">.+?<\/table>)/gims
        var table =  [...r.data.matchAll(rgx)]
        var res = HtmlTableToJson.parse(table[0][1]).results[0]
        var dseEpsData = {};
        for(var key in res){
            var pe = res[key]['P/E 1*(Basic)']
            if(pe == 'n/a'){
                pe = res[key]['P/E 5*']
            }
            dseEpsData[res[key]['Trade Code']] = (res[key]['Close Price'] / pe).toFixed(2)
            
        }

        // get earning per share meta
        var results = await sequelize.query("select * from fundamentals where meta_key in ('earning_per_share', 'q1_eps_cont_op', 'half_year_eps_cont_op', 'q3_nine_months_eps') and is_latest = 1 order by meta_date desc");
        results = results[0]
        var snEpsData = {}
        for(var key in results){
            if(snEpsData[results[key].code]){
                continue;
            }
            snEpsData[results[key].code] = results[key]
        }

        var salts = {
            q1_eps_cont_op: 3,
            half_year_eps_cont_op: 6,
            q3_nine_months_eps: 9,
            earning_per_share: 12,
        };
        var rows = []
        for(var key in dseEpsData){
            try {
                var snEps = ((snEpsData[key].meta_value/salts[snEpsData[key].meta_key])*12).toFixed(2)
            } catch(e) {
                // statements
                snEpsData[key] = {meta_key: 'earning_per_share'}
               var snEps = null
            }
            if(dseEpsData[key] != 'NaN' && snEps != dseEpsData[key]){
                rows.push({code: key, meta: snEpsData[key].meta_key, dse: dseEpsData[key], stocknow: snEps})
            }           
            
        }


        sequelize.models.Mismatch.bulkCreate(rows, {updateOnDuplicate:['dse', 'stocknow', 'meta']})

        // console.log(Object.keys(results[1]));
        return;



    }

}

 new Mismatch()