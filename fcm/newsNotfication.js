var fcm = require('./fcm')
var  db  = require('../Sequelize');

async function sendMessage(element, tokens){
            const message = {
              data: {
                type: 'promotion',
                url: '/news',
                buttonText: 'Show details'
              },
              notification: {
                body: element.code+' News | '+element.news,
                title: 'Your favorit '+element.code+' update' ,
              },  
              android:{
                notification:{
                  'sound': 'default',
                  'channel_id': 'stocknow'
                }
              },      
              apns:{
                "payload": {
                    "aps": {
                        "sound": "default",
                         'channel_id': 'stocknow'
                    }
                }
            },
            tokens: tokens
            };         

            r = await  fcm.messaging().sendEachForMulticast(message)     



}

async function main(){
    var query = `
            SELECT id, prefix as code, details as news
            FROM news
            where \`date\` = curdate() and trash = 0 and notified = 0 and prefix in (select code from instruments) and details not like '(Continuation news%'
    `;
    var news = await db.query(query);

    // console.log(news[0])
    // return

    news[0].forEach( async function(element, index) {
      
        await db.query(`update news set notified = 1 where id = '${element.id}'`)
        // statements
        var tokens = await db.query(`select token from fcm_tokens where user_id in 
          ( select user_id from watchlist_items where code = '${element.code}') 
          or 
          user_id in 
          ( select user_id from portfolio_scrips left join portfolios on portfolios.id = portfolio_scrips.portfolio_id  where share_status = 'buy' and instrument_id = '${element.code}' and portfolios.deleted_at is null ) `)
                
            element.news = element.news.substring(0, 900);
            var tkns = []


            for (var i = tokens[0].length - 1; i >= 0; i--) {
               tkns.push(tokens[0][i].token)
               if(tkns.length > 499 || i == 0){
                await sendMessage(element, tkns)
                tkns = [];
               }
            }


            // update neews as notified
           
      



            // console.log(message)
        // process.exit()
    });

}

main()

  setTimeout(function() {
    process.exit()
  }, 300000);