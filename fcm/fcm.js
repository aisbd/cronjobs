
var fcm = require("firebase-admin");

var serviceAccount = require("./serviceAccountKey.json");

fcm.initializeApp({
  credential: fcm.credential.cert(serviceAccount),
  databaseURL: "https://stocknow-cfe44.firebaseio.com"
});

module.exports = fcm