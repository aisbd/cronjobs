var axios = require('axios');
 axios.get("https://stocknow.mobi/v1/instruments?cache=false").then((r)=>{

            axios.post("https://ws.stocknow.mobi/storeUpdate", {data: r.data}).then((r)=>{console.log('sent to socket')}).catch((e)=>{console.log("error on socket req")})
         })