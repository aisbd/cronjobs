var fcm = require('./fcm')
var  db  = require('../Sequelize');

const verifyToken = async (token) => {
    // console.log(token)
  const message = {
    data: {
      score: "850",
      time: "2:45",
    },
    token,
  };
  return fcm.messaging().send(message, true);
};
async function main(){
    var limit = 10000
    var offset = 0
    while (true) {
        var tokens = await db.query(`select id, token from fcm_tokens limit ${offset}, ${limit}`);
         tokens = tokens[0];
         offset += tokens.length
         for(var i = 0, length1 = tokens.length; i < length1; i++){
            try {
                 await verifyToken(tokens[i].token) 
            } catch(error) {
                // console.log(error)
                if(  error.code === "messaging/registration-token-not-registered" ||   error.code === "messaging/invalid-argument" ){
                    await db.query(`delete from fcm_tokens where id = '${tokens[i].id}'`)
                    offset = offset-1;
                }
                // statements

            }
         }
         if(tokens.length < 1){
              break;
         }
      
    }
}

main()

  setTimeout(function() {
    process.exit()
  }, 46800000);
