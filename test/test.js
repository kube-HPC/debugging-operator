/* eslint-disable global-require */
const { expect } = require('chai');
const mockery = require('mockery');
const etcd = require('../lib/helpers/etcd');
const decache = require('decache');
const { discoveryStub, templateStoreStub } = require('./stub/discoveryStub');
const { callCount, mock } = (require('./mocks/kubernetes.mock')).kubernetes()

describe('bootstrap', () => {
    before(async () => {
        mockery.enable({
            warnOnReplace: false,
            warnOnUnregistered: false,
            // useCleanCache: true
        });
        mockery.registerMock('./lib/helpers/kubernetes', mock);
        const bootstrap = require('../bootstrap');

        await bootstrap.init();
    });
    after(() => {
        mockery.disable();
        decache('../bootstrap');
    });
    it('should init without error', async () => {

    });

   
 it('should get template store', async () => {
        await Promise.all(Object.keys(templateStoreStub).map(path => etcd._etcd._client.put(path, templateStoreStub[path])));
        const template = await etcd.getAlgorithmTemplate({ algorithmName: 'algo2' });
        expect(template).to.eql(templateStoreStub['/algorithmTemplates/algo2']);
    });
});
