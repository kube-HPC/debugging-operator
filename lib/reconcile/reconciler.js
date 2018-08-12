const Logger = require('@hkube/logger');
const etcd = require('../helpers/etcd');
const log = Logger.GetLogFromContainer();
const { createKindsSpec } = require('../deployments/deploymentCreator');
const kubernetes = require('../helpers/kubernetes');
const { findVersion } = require('../helpers/images');
const component = require('../../common/consts/componentNames').RECONCILER;

const DOCKER_REPOSITORY = 'worker';

const _createKinds = async (algorithmName, options) => {
    log.debug(`need to add ${algorithmName} with details ${JSON.stringify(options, null, 2)}`, { component });
    const { deploymentSpec, ingressSpec, serviceSpec } = createKindsSpec({ algorithmName, ...options });
    const deploymentCreateResult = await kubernetes.createAlgorithmForDebug({ deploymentSpec, ingressSpec, serviceSpec });
    return deploymentCreateResult;
};


const getUpdatedData = ({ resDepolyment }, algorithms, versions) => {
    const version = findVersion({ versions, repositoryName: DOCKER_REPOSITORY });
    const deployments = resDepolyment.body.items.map(r => ({
        name: r.metadata.name.replace('worker-', ''),
        imageTag: r.spec.template.spec.containers[0].image.split(':')[1]
    }));
    const added = algorithms.filter(a => !deployments.find(d => d.name === a.name));
    const removed = deployments.filter(d => !algorithms.find(a => d.name === a.name));
    const updated = deployments.filter(d => d.imageTag !== version);

    return {
        added,
        removed,
        updated
    }
}

const reconcile = async ({ kubernetesKinds, algorithms, versions } = {}) => {
    const version = findVersion({ versions, repositoryName: DOCKER_REPOSITORY });
    const { added, removed, updated } = getUpdatedData(kubernetesKinds, algorithms, versions)
    if (added.length > 0 || removed.length > 0 || updated.length > 0) {
        log.info(`added:\n ${JSON.stringify(added, null, 2)}\nremoved:\n${JSON.stringify(removed, null, 2)}\nupdated:\n${JSON.stringify(updated, null, 2)}`);
    }
    else {
        log.debug(`added:\n ${JSON.stringify(added, null, 2)}\nremoved:\n${JSON.stringify(removed, null, 2)}\nupdated:\n${JSON.stringify(updated, null, 2)}`);
    }
    const createPromises = [];
    const reconcileResult = {};
    for (let algorithm of added) { // eslint-disable-line
        createPromises.push(_createKinds(algorithm.name, { version }));
    }
    for (let algorithm of removed) { // eslint-disable-line
        createPromises.push(kubernetes.deleteAlgorithmForDebug(algorithm.name));
    }
    for (let deployment of updated) { // eslint-disable-line
        createPromises.push(_updateDeployment(deployment, { version }));
    }
    await Promise.all(createPromises);
    added.forEach(a => etcd.storeAlgorithmData(a.name, { algorithmData: a, path: `hkube/debug/${a.name}` }))
    removed.forEach(a => etcd.removeAlgorithmData(a.name))

    return reconcileResult;
};

module.exports = {
    reconcile,
};
