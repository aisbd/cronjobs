var axios = require('axios')
axios.get('https://vip.stocknow.com.bd/v1/crons/adjustAll')
axios.post('https://vip.stocknow.com.bd/v1/crons/resetFileData')
setTimeout(function() {
    process.exit();
}, 10000);