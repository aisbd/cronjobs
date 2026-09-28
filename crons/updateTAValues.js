

var axios = require('axios')
// return;
axios.get('https://stocknow.com.bd/api/v1/crons/generateTechnicalIndicatorValues')
setTimeout(function() {
    process.exit();
}, 50000);