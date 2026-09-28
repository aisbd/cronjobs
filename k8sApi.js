const fs = require('fs');
const os = require('os');
const path = require('path');
const k8s = require('@kubernetes/client-node');

const DEFAULT_KUBECONFIG_PATHS = [
  process.env.KUBECONFIG,
  process.env.STOCKNOW_KUBECONFIG,
  path.join(os.homedir(), '.kube', 'stocknow-new-server'),
  path.join(os.homedir(), '.kube', 'config'),
  '/home/stocknow/.kube/stocknow-new-server',
  '/home/stocknow/.kube/config'
].filter(Boolean);

function loadKubeConfig() {
  const kc = new k8s.KubeConfig();
  const kubeconfigPath = DEFAULT_KUBECONFIG_PATHS.find((filePath) => {
    try {
      return fs.existsSync(filePath);
    } catch (_) {
      return false;
    }
  });

  if (kubeconfigPath) {
    kc.loadFromFile(kubeconfigPath);
    return kc;
  }

  kc.loadFromDefault();
  return kc;
}

const kc = loadKubeConfig();
const k8sApi = kc.makeApiClient(k8s.AppsV1Api);

exports.k8sApi = k8sApi;
exports.k8s = k8s;
exports.kc = kc;
