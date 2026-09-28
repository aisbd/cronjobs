var axios = require('axios')
const { k8sApi } = require('../k8sApi');

async function restartDeployment( deploymentName) {
      var namespace = 'default'

    try {
        // Get the current deployment
        const { body: deployment } = await k8sApi.readNamespacedDeployment(deploymentName, namespace);

        // Update the annotation to trigger a rolling update
        if (!deployment.spec.template.metadata.annotations) {
            deployment.spec.template.metadata.annotations = {};
        }
        deployment.spec.template.metadata.annotations['kubectl.kubernetes.io/restartedAt'] = new Date().toISOString();

        // Apply the update to the deployment
        await k8sApi.replaceNamespacedDeployment(deploymentName, namespace, deployment);
        console.log(`Deployment ${deploymentName} in namespace ${namespace} restarted successfully.`);
    } catch (error) {
        console.error(`Failed to restart deployment: ${error.message}`);
    }
}



async function Vscale(dp, request, limit = '1000m') {
      const res = await k8sApi.readNamespacedDeployment(dp, 'default');
      let deployment = res.body;
      deployment.spec.template.spec.containers[0].resources.requests.cpu = request
       deployment.spec.template.spec.containers[0].resources.limits.cpu = request
      await k8sApi.replaceNamespacedDeployment(dp, 'default', deployment);    
}



async function scale(dp, replicas) {
      const res = await k8sApi.readNamespacedDeployment(dp, 'default');
      let deployment = res.body;
      deployment.spec.replicas = replicas;
      await k8sApi.replaceNamespacedDeployment(dp, 'default', deployment);    
}



async function main() {



      await Vscale('cacheserver1', '300m')



   await  Vscale('php',  "300m")
   await  Vscale('phpvip',  "800m")
   await  Vscale('ws',  "80m")
   await  Vscale('nginx', "100m")
   

        // await scale('php', 20)

      await Vscale('entryserver', '100m')


      setTimeout( async function(){
            await Vscale('cacheserver1', '100m')
      }, 3000)


}

main()