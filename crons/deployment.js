var axios = require('axios')
async function main() {


    // axios.defaults.headers.common['Authorization'] = "Bearer 9762ef7daf8f3f80d8d459c5a3a7c92b0749cd7092ab4c9235983d135821b31a";
    // axios.defaults.baseURL = 'https://api.linode.com/v4/';    

    // var res = await  axios.get('/lke/clusters')
    // var id = res.data.data[0].id

    // var res = await axios.post('/lke/clusters/'+id+'/pools', {
    //     count: 6,
    //     type: 'g6-standard-1'
    // })
    //   console.log(res.data.id)



    const k8sApi = require('../k8sApi');

    const res = await k8sApi.readNamespacedDeployment('php', 'default');

      let deployment = res.body;
      deployment.spec.replicas = 8;
      await k8sApi.replaceNamespacedDeployment('php', 'default', deployment);
      console.log(deployment)


}

main()