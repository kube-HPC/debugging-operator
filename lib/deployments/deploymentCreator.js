const clonedeep = require('lodash.clonedeep');
const Logger = require('@hkube/logger');
const decamelize = require('decamelize');
const log = Logger.GetLogFromContainer();
const component = require('../../common/consts/componentNames').K8S;
const { deyploymentDebugTemplate, workerIngress, workerService } = require('./template.js');
const { createImageName, parseImageName, isValidDeploymentName } = require('../helpers/images');

const applyImage = (inputSpec, image) => {
    const spec = clonedeep(inputSpec);
    const algorithmQueueContainer = spec.spec.template.spec.containers.find(c => c.name === 'worker');
    if (!algorithmQueueContainer) {
        const msg = 'Unable to create deployment spec. worker container not found';
        log.error(msg, { component });
        throw new Error(msg);
    }
    algorithmQueueContainer.image = image;
    return spec;
};

const applyAlgorithmName = (inputSpec, algorithmName) => {
    const spec = clonedeep(inputSpec);
    spec.metadata.labels['algorithm-name'] = algorithmName;
    const workerContainer = spec.spec.template.spec.containers.find(c => c.name === 'worker');
    if (!workerContainer) {
        const msg = 'Unable to create deployment spec. worker container not found';
        log.error(msg, { component });
        throw new Error(msg);
    }
    let algorithmTypeEnv = workerContainer.env.find(e => e.name === 'ALGORITHM_TYPE');
    if (!algorithmTypeEnv) {
        algorithmTypeEnv = { name: 'ALGORITHM_TYPE', value: algorithmName };
        workerContainer.env.push(algorithmTypeEnv);
    }
    else {
        algorithmTypeEnv.value = algorithmName;
    }
    return spec;
};
const applyName = (inputSpec, algorithmName) => {
    const spec = clonedeep(inputSpec);
    const validName = decamelize(algorithmName, '-');
    if (!isValidDeploymentName(validName)) {
        const msg = `Unable to create deployment spec. ${validName} is not a valid deployment name.`;
        log.error(msg, { component });
        throw new Error(msg);
    }
    const name = `worker-${validName}`;
    spec.metadata.name = name;
    return spec;
};

const applyNodeSelector = (inputSpec, clusterOptions = {}) => {
    const spec = clonedeep(inputSpec);
    if (!clusterOptions.useNodeSelector) {
        delete spec.spec.template.spec.nodeSelector;
    }
    return spec;
};

const _setAlgorithmImage = (version, registry) => {
    const imageName = 'hkube/worker';
    const imageParsed = parseImageName(imageName);
    if (registry) {
        imageParsed.registry = registry.registry;
    }
    if (imageParsed.tag) {
        return createImageName(imageParsed);
    }
    if (version) {
        imageParsed.tag = version;
    }
    return createImageName(imageParsed);
};

const applyEnvToContainer = (inputSpec, containerName, inputEnv) => {
    const spec = clonedeep(inputSpec);
    if (!inputEnv) {
        return spec;
    }
    const container = spec.spec.template.spec.containers.find(c => c.name === containerName);
    if (!container) {
        const msg = `Unable to create job spec. ${containerName} container not found`;
        log.error(msg, { component });
        throw new Error(msg);
    }
    if (!container.env) {
        container.env = [];
    }
    const { env } = container;
    Object.entries(inputEnv).forEach(([key, value]) => {
        const index = env.findIndex(i => i.name === key);
        const valueString = (typeof value === 'object') ? value : `${value}`;
        const valueKey = (typeof value === 'object') ? 'valueFrom' : 'value';
        if (index !== -1) {
            if (value == null) {
                env.splice(index, 1);
            }
            else {
                env[index] = { name: key, [valueKey]: valueString };
            }
        }
        else {
            env.push({ name: key, [valueKey]: valueString });
        }
    });
    return spec;
};

const createKindsSpec = ({ algorithmName, version, registry, clusterOptions, workerEnv }) => {
    if (!algorithmName) {
        const msg = 'Unable to create deployment spec. algorithmName is required';
        log.error(msg, { component });
        throw new Error(msg);
    }

    const image = _setAlgorithmImage(version, registry);
    let deploymentSpec = deyploymentDebugTemplate(algorithmName, image);
    deploymentSpec = applyNodeSelector(deploymentSpec, clusterOptions);
    deploymentSpec = applyEnvToContainer(deploymentSpec, 'worker', workerEnv);
    const ingressSpec = workerIngress(algorithmName);
    const serviceSpec = workerService(algorithmName);
    return {
        deploymentSpec,
        ingressSpec,
        serviceSpec
    };
};

module.exports = {
    createKindsSpec,
    applyImage,
    applyAlgorithmName,
    applyName,
    applyEnvToContainer
};

