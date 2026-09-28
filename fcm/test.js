var fcm = require('./fcm')
async function main(argument) {

var message = {
  data: {
    // type: 'alarm',
    type: 'promotion',
    code: 'KPCL',
    title: "sfsdffs",
    body:"dsfff",
    url: 'https://youtu.be/01LfI8Z7iec',
    buttonText: 'Show details'
  },

  notification: {
    body: "row.code+' price is now '+row.condition+' your target price '+row.value",
    title: "'Good news! '+row.code+' price is now '+row.close" ,
  },  
  android:{
    notification:{
      'sound': 'test.mp3',
      "priority":"high",
      'channel_id': 'stocknow2'
    }
  },
  apns:{

      "payload": {
          "aps": {
            "alert":{
              "body": "Your favorit stock has a news ",
              "title": 'helllo'
            },
              "sound": "test",
               'channel_id': 'stocknow2'
          }
      }
  },
  tokens: ["cNSFBa48_0z_sdmASwtBRL:APA91bEXgP3e9iHWZdylsQ-syCPsUQK270i16K0lAvrG9DCuL7erL-8-UE0A8CYtAWnzq-N5ubFnRuH7U567bFT1j9eEm-QxVbx4O2--Nj7ReUxE0pEW6fJqGGS4jM_abrcv55YJIhkv"]
  // token: "cvWmIPqrTNOt3eLhDy_imE:APA91bHkJiqrmN2cD8kmdIZ-FouFhXGm9R0RnspUOXVvi4hqqzQggZeusxtnUYCIA_NLPFZTKt0RYrMb5t82aknwuXoF7ZVJPGgwM_8YU1EwmHHaMgdQSTd1RfjqW7J_mVw_7xaPVgEa"
  // token: "cqcAytz_Gck:APA91bHenR8dnai2YZ-7KwYeU1wqR_iiRD7HNmXzyfcDfi27Np3MfBAzfYexuQFBDH5tok_m0ZW2xLdeFLWm8da36xa4UEb8MoYhdaGX-9mMYCL9jTTIoco_VMW_8bMpoyXXwC48bTMp"
};    
try {
//    message = {
//   data: {score: '850', time: '2:45'},
//   tokens: ["cNSFBa48_0z_sdmASwtBRL:APA91bEXgP3e9iHWZdylsQ-syCPsUQK270i16K0lAvrG9DCuL7erL-8-UE0A8CYtAWnzq-N5ubFnRuH7U567bFT1j9eEm-QxVbx4O2--Nj7ReUxE0pEW6fJqGGS4jM_abrcv55YJIhkv"],
// };
 var r = await fcm.messaging().sendEachForMulticast(message)
 console.log(r.responses)


} catch(e) {
  // statements
  console.log(e);
}
  // body...
}
main()