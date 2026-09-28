var exec = require('child_process').exec;
var axios = require('axios')
setTimeout(  async function() {
        var funda = await axios.get("https://vip.stocknow.com.bd/v1/crons/correlation")
}, 6);

