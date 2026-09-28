var cron = require('node-cron');
var cp = require('child_process');

cron.schedule('5,10,15,20,25,30,35,40,45,50,55,59 * 9,10,11,12,13,14 * * 0,1,2,3,4,6', () => {
    // cron that run on trade hour every 10 second
    cp.fork(__dirname + '/crons/dse_sn_db_sync.js');
    // cp.fork(__dirname + '/crons/getLatestFromDse.js');
});
cron.schedule('59 * 9,10,11,12,13,14 * * 0,1,2,3,4,6', () => {
    // cron that run on trade hour every minute
    cp.fork(__dirname + '/fcm/priceAlert.js');

    cp.fork(__dirname + '/crons/sme/smePriceUpdate.js');
   
    // cp.fork(__dirname + '/crons/minuteDataUpdate.js');
    cp.fork(__dirname + '/crons/sectorminuteDataUpdate.js');
    cp.fork(__dirname + '/crons/updateTAValues.js');
});

cron.schedule('*/5 * * * *', () => {
    // cron that run on every 5 minute
    cp.fork(__dirname + '/crons/notify.js');
});

cron.schedule('* * * * *', () => {
    // cron that run on every 5 minute
    cp.fork(__dirname + '/crons/apiCronJobs.js'); //sector pe/ dsex pe/
});


cron.schedule('2,7,12,17,22,27,32,37,42,47,52,57 9,10,11,12,13,14,15,16 * * 0,1,2,3,4,6', () => {
    //Translate news eveery 5 minutes
    
    cp.fork(__dirname + '/crons/translate.js');
});

cron.schedule('2,7,17,22,27,37,42,47,52,57 10,11,12 * * 0,1,2,3,4,6', () => {
    //sme open price eveery 5 minutes
    
    // cp.fork(__dirname + '/crons/sme/smeOpenPriceUpdater.js');
});
cron.schedule('* 9,10,11,12,13,14,15,16 * * 0,1,2,3,4,6', () => {
    //parse news eveery 1 minutes
    cp.fork(__dirname + '/crons/updateDseNews.js');
     cp.fork(__dirname + '/fcm/newsNotfication.js');

});


// cron.schedule('50 13,14 * * 0,1,2,3,4,6', () => { //for ramadan schedul
cron.schedule('50 14,15 * * 0,1,2,3,4,6', () => { //regular schedule
    
    // cron that run after trade hour at  4 pm to reset yearly high low and fundamental data
    // any daily once basis data processing 
    cp.fork(__dirname + '/crons/correlationGenerate.js');
    cp.fork(__dirname + '/crons/newDeveloperTasks2025/AnalyzeChartImage/index.js');
    cp.fork(__dirname + '/crons/dayEndDataSync.js');
    // cp.fork(__dirname + '/crons/epsParser.js');
    cp.fork(__dirname + '/crons/parseShareHolding.js');
    // cp.fork(__dirname + '/crons/divdendParser.js');
    cp.fork(__dirname + '/crons/mutualFundNavParser.js');


    cp.fork(__dirname + '/crons/dse_sn_db_sync.js');
    // cp.fork(__dirname + '/crons/getLatestFromDse.js');
    
    // block transaction
    cp.fork(__dirname + '/crons/mst.js');

    cp.fork(__dirname + '/crons/k8sScaleDown.js');
    cp.fork(__dirname + '/crons/deleteLankaDeployment.js');

    cp.fork(__dirname + '/crons/fundamentalUpdater.js');
    
    cp.fork(__dirname + '/crons/clearCacheFundamental.js');
    cp.fork(__dirname + '/crons/fbEodPost.js');

});

cron.schedule('1 14 * * 0,1,2,3,4,6', () => {
    
    // cron that run after trade hour at  1 2 3 4 pm to reset yearly high low and fundamental data
    // any daily once basis data processing 
    // cp.fork(__dirname + '/crons/dayEndDataSync.js');
    // cp.fork(__dirname + '/crons/epsParser.js');
    // cp.fork(__dirname + '/crons/parseShareHolding.js');
    // cp.fork(__dirname + '/crons/divdendParser.js');


    // cp.fork(__dirname + '/crons/getLatestFromDse.js');
    
    cp.fork(__dirname + '/crons/mst.js');
    
    // cp.fork(__dirname + '/crons/clearCacheFundamental.js');
});

cron.schedule('30 9 * * 0,1,2,3,4,6', () => {
    // run daily at 9:30am --------30 minute before starting market for warmup cache servers.
    cp.fork(__dirname + '/crons/k8sScaleUp.js');
});

cron.schedule('50 9 * * 0,1,2,3,4,6', () => {
    // run daily at 9:53am
    cp.fork(__dirname + '/crons/circuitParser.js');
    cp.fork(__dirname + '/crons/dsexAndDs30ListUpdate.js');
    // cp.fork(__dirname + '/crons/clearCacheFundamental.js');
    
    cp.fork(__dirname + '/crons/k8sScaleUp.js');
    cp.fork(__dirname + '/crons/createLankaDeployment.js');
    cp.fork(__dirname + '/crons/sme/smePriceUpdate.js');  //6 minute delayed
    // cp.fork(__dirname + '/crons/fundamentalUpdater.js.js');
});

cron.schedule('50 2 * * 0,1,2,3,4,6', () => {
    // run daily at 2:50am
    cp.fork(__dirname + '/crons/resetFileDataEod.js');
});
cron.schedule('30 4 * * 0,1,2,3,4,6', () => {
    // run daily at 04:30am/Midnight
    cp.fork(__dirname + '/crons/eodAdjust.js');
});

cron.schedule('0 0 * * 0,1,2,3,4,6', () => {
    // run daily at 12:00am/Midnight
    cp.fork(__dirname + '/crons/closePricesUpdateToInstrumentsTableForchangeByTimeFrame.js');
});

