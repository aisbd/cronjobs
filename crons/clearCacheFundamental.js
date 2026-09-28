var exec = require('child_process').exec;
var axios = require('axios')
setTimeout(  function() {
    var a = exec('curl -H "senocache: true" -X GET -D – https://stocknow.com.bd/api/v1/fundamentals-hash',  async (err, stdout, stderr)=>{
        // console.log(stderr)
        // console.log(err)
        // console.log(stdout)
        var time = new Date();
        time = time.getTime();
        // var funda = await axios.get("https://api.stocknow.com.bd/v1/fundamentals?tt=118"+time)
        // console.log(funda.data)
        // await axios.post("https://ws.stocknow.com.bd/state", {data: {key: 'fundamentals', value: funda.data} })        
        })    
         exec('curl -H "senocache: true" -X GET -D – https://stocknow.com.bd/api/v1/fundamentals',  async (err, stdout, stderr)=>{
        // console.log(stderr)
        // console.log(err)
        // console.log(stdout)
        var time = new Date();
        time = time.getTime();
        // var funda = await axios.get("https://api.stocknow.com.bd/v1/fundamentals?tt=118"+time)
        // console.log(funda.data)
        // await axios.post("https://ws.stocknow.com.bd/state", {data: {key: 'fundamentals', value: funda.data} })        
        })
}, 60000);

