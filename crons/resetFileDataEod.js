var axios = require('axios')
axios.get('https://stocknow.com.bd/api/v1/test2')
setTimeout(function() {
    process.exit();
}, 10000);