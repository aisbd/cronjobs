var axios = require('axios')
const fs = require('fs');
const { k8sApi } = require('../k8sApi');


async function getDeployment(deployment, namespace = 'default') {
       const existingDeployment = await k8sApi.readNamespacedDeployment(deployment, namespace);
           return existingDeployment.body;

}


async function main() {

    axios.defaults.headers.common['Authorization'] = "Bearer 643b6f817a99ab866c52cee3aac5a2670239b4725e54db7948339d43d34544c2";
    axios.defaults.baseURL = 'https://api.linode.com/v4/';    


    // var id = res.data.data[0].id

    // var res = await axios.post('/lke/clusters/'+id+'/pools', {
    //     count: 3,
    //     type: 'g6-standard-4'
    // })

    setTimeout(async function () {
        // for (var i = 12 ; i >= 0; i--) {
        //         var res = await  axios.post('/lke/clusters/25657/pools', {
        //             "type": "g6-standard-2",
        //             "count": 1,
        //           })
        // }

      // await Vscale('nginx', '250m')

        
        fs.readFile('lankaDeployment.yaml', 'utf8',  async (err, data) => {
          if (err) {
            console.error('Error reading file:', err);
            return;
          }
         var data = JSON.parse(data)
         try {
             await k8sApi.createNamespacedDeployment('default', data);
             // statements
         } catch(e) {
             // statements
             console.log(e.response.body);
         }
          
        });        
       

    }, 300000)

}

main()