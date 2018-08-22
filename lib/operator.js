const Logger = require('@hkube/logger');
const fs = require('fs');
const component = require('../common/consts/componentNames').OPERATOR;
const etcd = require('./helpers/etcd');
const kubernetes = require('./helpers/kubernetes');
const reconciler = require('./reconcile/reconciler');
const { WORKER_DEBUG } = require('../common/consts/label-selector');
let log;

class Operator {
    async init(options = {}) {
        log = Logger.GetLogFromContainer();
        this._intervalMs = options.intervalMs || 3000;
        // just for local testing. to be removed
        const versionsFilePath = `${__dirname}/../versions.json`;
        if (fs.existsSync(versionsFilePath)) {
            this._versions = JSON.parse(fs.readFileSync(versionsFilePath));
        }

        this._startInterval();
    }

    _startInterval() {
        setTimeout(this._intervalCallback.bind(this), this._intervalMs);
    }

    async _intervalCallback() {
        log.debug('Reconcile inteval.', { component });
        try {
            const {versions, registry} = await kubernetes.getVersionsConfigMap();
            const kubernetesKinds = await kubernetes.getAlgorithmForDebug({ labelSelector: WORKER_DEBUG });
            const algorithms = await etcd.getAlgorithmTemplatesWithDebugAsOptions();
            await reconciler.reconcile({
                kubernetesKinds,
                algorithms,
                versions,
                registry
            });
        }
        catch (error) {
            log.error(`Fail to Reconcile ${error}`, { component });
        }
        finally {
            setTimeout(this._intervalCallback.bind(this), this._intervalMs);
        }
    }
}

module.exports = new Operator();
