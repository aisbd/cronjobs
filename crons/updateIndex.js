var db = require('../db')
var updateIndex = async function updateIndex(data){
    // data is IDX object from stockbanaldesh/dse table response
    var  data =  await db.query("select * from instruments limit 10", function (r, e) {
        console.log(r)
        console.log(e)
    })

    console.log("done")
}

module.exports = updateIndex;