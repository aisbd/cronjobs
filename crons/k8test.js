var axios = require('axios')
const { k8sApi } = require('../k8sApi');
async function scale(dp, request, limit = '1000m') {
      const res = await k8sApi.readNamespacedDeployment(dp, 'default');
      let deployment = res.body;
      deployment.spec.template.spec.containers[0].resources.requests.cpu = request
      deployment.spec.template.spec.containers[0].resources.limits.cpu = limit
      await k8sApi.replaceNamespacedDeployment(dp, 'default', deployment);    
}



async function main() {
    scale('nginx-cache', '100m', '200m');
}

main()