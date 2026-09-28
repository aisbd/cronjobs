var axios = require('axios')

async function main(){
    var time = new Date();
    time = time.getTime();
    var funda = await axios.get("https://stocknow.com.bd/api/v1/fundamentals?tt=118"+time)
    // console.log(funda.data)
    await axios.post("https://ws.stocknow.com.bd/state", {data: {key: 'fundamentals', value: funda.data} })
    process.exit()
}


main()