const EventEmitter = require('events');
const Logger = require('@hkube/logger');
const kubernetesClient = require('kubernetes-client');
const component = require('../../common/consts/componentNames').K8S;
const {WORKER,SERVICE,INGRESS} = require('../../common/consts/kubernetes-kind-prefix')
let log;

class KubernetesApi extends EventEmitter {
    async init(options = {}) {
        const k8sOptions = options.kubernetes || {};
        log = Logger.GetLogFromContainer();
        let config;
        if (!k8sOptions.isLocal) {
            try {
                config = kubernetesClient.config.fromKubeconfig();
            }
            catch (error) {
                log.error(`Error initializing kubernetes. error: ${error.message}`, { component }, error);
                return;
            }
        }
        else {
            config = kubernetesClient.config.getInCluster();
        }
        log.info(`Initialized kubernetes client with options ${JSON.stringify({ options: options.kubernetes, url: config.url })}`, { component });
        this._client = new kubernetesClient.Client({ config, version: '1.9' });
        this._namespace = k8sOptions.namespace;
    }

    async createAlgorithmForDebug({ deploymentSpec, ingressSpec, serviceSpec }) {
        log.info(`Creating serivces ${deploymentSpec.metadata.name}`, { component });
        let resDepolyment = null;
        let restIngress = null;
        let resService = null;
        try {
            try {
                 resDepolyment = await this._client.apis.apps.v1.namespaces(this._namespace).deployments.post({ body: deploymentSpec });
            } catch (error) {
                log.error(`unable to create deployment ${deploymentSpec.metadata.name}. error: ${error.message}`, { component }, error);
            }
            try {
                 resIngress = await this._client.apis.extensions.v1beta.namespaces(this._namespace).ingresses.post({ body: ingressSpec });
                
            } catch (error) {
                log.error(`unable to create Ingress ${deploymentSpec.metadata.name}. error: ${error.message}`, { component }, error);
                
            }
            try {
                 resService = await this._client.apis.v1.namespaces(this._namespace).services.post({ body: serviceSpec });
                
            } catch (error) {
                log.error(`unable to create service ${deploymentSpec.metadata.name}. error: ${error.message}`, { component }, error);
                
            }
            return {
                resDepolyment,
                resIngress,
                resService
            };
        }
        catch (error) {
            log.error(`faild to continue creating opration ${deploymentSpec.metadata.name}. error: ${error.message}`, { component }, error);
        }
        return null;
    }
 
    async deleteAlgorithmForDebug(algorithmName) {
        log.debug(`Deleting job ${algorithmName}`, { component });
        try {
            const resDepolyment = await this._client.apis.apps.v1.namespaces(this._namespace).deployment(`${WORKER}-${algorithmName}`).delete();
            const resIngress = await this._client.apis.extensions.v1beta.namespaces(this._namespace).ingresses(`${INGRESS}-${algorithmName}`).delete();
            const resService = await this._client.apis.v1.namespaces(this._namespace).services(`${SERVICE}-${algorithmName}`).delete();
            return {
                resDepolyment,
                resIngress,
                resService
            };
        }
        catch (error) {
            log.error(`unable to delete serivces ${deploymentName}. error: ${error.message}`, { component }, error);
        }
        return null;
    }

    async getAlgorithmForDebug({ labelSelector }) {
        try {
            const resDepolyment = await this._client.apis.apps.v1.namespaces(this._namespace).deployments().get({ qs: { labelSelector } });
            const resIngress = await this._client.apis.extensions.v1beta.namespaces(this._namespace).ingresses().get({ qs: { labelSelector } });
            const resService = await this._client.apis.v1.namespaces(this._namespace).services().get({ qs: { labelSelector } });
            return {
    
                resDepolyment,
                resIngress,
                resService
            };

        } catch (error) {
            return new Error(error)

        }
    }

    async getVersionsConfigMap() {
        try {
            const configMap = await this._client.api.v1.namespaces(this._namespace).configmaps('hkube-versions').get();
            const versions = JSON.parse(configMap.body.data['versions.json']);
            return versions;
        }
        catch (error) {
            log.error(`unable to get configmap. error: ${error.message}`, { component }, error);
            return null;
        }
    }
}

module.exports = new KubernetesApi();
