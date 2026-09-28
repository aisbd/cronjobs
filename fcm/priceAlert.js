var fcm = require('./fcm')
var db = require('../db')
var moment = require('moment')

async function sendMessage(result){
    // console.log(result[0])
        var ids = []
        var tokens = []

        for(var key in result){
           var row = result[key]

           console.log(row)
            var message = {
              data: {
                type: 'alarm',
                price:  row.close.toString(),
                code: row.code
              },
              notification: {
                body: row.code+' price is now '+row.condition+' your target price '+row.value,
                title: 'Good news! '+row.code+' price is now '+row.close ,
              },  
              android:{
                notification:{
                  'sound': 'test',
                  "priority":"high",
                  'channel_id': 'stocknow2'
                }
              },      
              apns:{
                "payload": {
                    "aps": {
                        "sound": "test.wav",
                         'channel_id': 'stocknow2'
                    }
                }
            },
              token: row.token
            };    

            // remove sound if vip expired
           if( moment().diff(moment(result.expired_at), 'days') ){

           }
           // console.log(row.expired_at)
            if(message, moment(row.expired_at).diff(moment(), 'days') < 0){
              // noot viip
              // removee soound
              message.android= null
              message.apns= null
            }


            var r
            try {
                if(!ids.includes(row.id)){
                  await db.promise().query(
                    "insert into notifications (`user_id`, `content`, `path`, `published`, `read`, `created_at`, `updated_at` ) values (?, ?, '/', '1', 0, now(), now() )",
                    [row.user_id, message.notification.body]
                  )
                  await db.promise().query(
                    "insert into user_notifications (user_id, title, content, image, notification_category, url, notification_payload, is_read, is_seen, is_clicked, created_at) values (?, ?, ?, null, (select id from notification_categories where `key` = 'PRICE_ALERT' limit 1), '/stock-alarm', null, 0, 0, 0, now())",
                    [row.user_id, message.notification.title, message.notification.body]
                  )
                  ids.push(row.id)                   
                }
                if(row.token != null){
                        r = await  fcm.messaging().send(message)
                }
                // notify

            } catch(e) {
                // statements
                r = false
            }

            if(r == false){
                if(row.token){
                    tokens.push("'"+row.token+"'")
                }else{
                  // console.log(row)
                   // ids.push(row.id)
                }
             }else{
                 // ids.push(row.id)
             }
       
            
           // if(sendMessage(row) == true){
           //       ids.push(row.id)
           // }else{
           //      tokens.push(row.token)
           // }

        }

        if(ids.length > 0){
            await db.promise().query("update stock_alarms set executed = 1 where id in ("+ids.join(', ')+")")
            
        }
        if(tokens.length > 0){
           await   db.promise().query("delete from fcm_tokens where token in ("+tokens.join(', ')+")")
        }

        db.end()
}

db.promise().query(`
select stock_alarms.*,  instruments.close,  users.expired_at, token  from stock_alarms 
left join instruments on instruments.code = stock_alarms.code 
left join fcm_tokens on fcm_tokens.user_id = stock_alarms.user_id
left join users on stock_alarms.user_id = users.id
where 
((close >= stock_alarms.value and \`condition\` = 'above') or (close <= stock_alarms.value and \`condition\` = 'below'))
and executed is null 
    `).then(async function ( result) {

      await  sendMessage(result[0]);


})


  setTimeout(function() {
    process.exit()
  }, 300000);
