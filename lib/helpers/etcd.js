const EventEmitter = require('events');
const EtcdClient = require('@hkube/etcd');
const Logger = require('@hkube/logger');
const component = require('../../common/consts/componentNames').ETCD;
let log;
class Etcd extends EventEmitter {
    constructor() {
        super();
        this._etcd = null;
    }

    async init(options) {
        log = Logger.GetLogFromContainer();
        this._etcd = new EtcdClient();
        log.info(`Initializing etcd with options: ${JSON.stringify(options.etcd)}`, { component });
        
        await this._etcd.init(options.etcd);
        //   await this._etcd.jobs.watch({ jobId: 'hookWatch' });
    }
    
    getAlgorithmTemplate({ algorithmName }) {
        return this._etcd.algorithms.templatesStore.get({ name: algorithmName });
    }

    async getAlgorithmTemplatesWithDebugAsOptions() {
        const algorithms = await this._etcd.algorithms.templatesStore.list();
        const algorithmsForDebug = algorithms.filter(a => a.options && a.options.debug === true);
        return algorithmsForDebug;
    }

    async storeAlgorithmData(algorithmName, data) {
        this._etcd.algorithmDebug.set({algorithmName, data});
    }
    async removeAlgorithmData(algorithmName) {
        this._etcd.algorithmDebug.delete({algorithmName});
    }
}

module.exports = new Etcd();
