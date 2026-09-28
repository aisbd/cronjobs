import captureWebsite from 'capture-website';
import  fs  from 'fs'
const path = './screenshot.png'

try {
    fs.unlinkSync(path)
} catch(e) {
    // statements
    console.log(e);
}

 captureWebsite.file('https://stocknow.com.bd', 'screenshot.png', {
    delay:20,
    height:800 ,
    launchOptions: {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    }
}).then((r)=>{
    console.log('ready')
   // process.send({ custom: 'message' });
})

export default captureWebsite