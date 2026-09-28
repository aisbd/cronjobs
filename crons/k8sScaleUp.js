var axios = require('axios')
const { k8sApi } = require('../k8sApi');
async function scale(dp, replicas) {
      const res = await k8sApi.readNamespacedDeployment(dp, 'default');
      let deployment = res.body;
      deployment.spec.replicas = replicas;
      await k8sApi.replaceNamespacedDeployment(dp, 'default', deployment);    
}


async function Vscale(dp, request, limit = '1000m') {
      const res = await k8sApi.readNamespacedDeployment(dp, 'default');
      let deployment = res.body;
      deployment.spec.template.spec.containers[0].resources.requests.cpu = request
       deployment.spec.template.spec.containers[0].resources.limits.cpu = request
      await k8sApi.replaceNamespacedDeployment(dp, 'default', deployment);    
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


      await Vscale('entryserver', '500m')
      await Vscale('cacheserver1', '1600m')


      await Vscale('nginx', '200m')
      await Vscale('ws', '850m') 
      await Vscale('php', '1800m') 
      await Vscale('phpvip', '1800m') 


        await scale('entryserver', 10)
        await scale('php', 5)
        await scale('nginx', 5)  
        await scale('ws', 5)
    }, 100)

}

main()