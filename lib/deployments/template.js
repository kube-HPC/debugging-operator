
const deyploymentDebugTemplate = (algorithmName = '', imageName = 'hkube/worker:latest') => ({
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
        name: `worker-${algorithmName}`,
        labels: {
            app: `worker-${algorithmName}`,
            group: 'hkube',
            core: 'true',
            'metrics-group': 'worker-debug',
            type: 'worker-debug'
        }
    },

    spec: {
        replicas: 1,
        selector: {
            matchLabels: {
                app: `worker-${algorithmName}`
            }
        },
        template: {
            metadata: {
                labels: {
                    app: `worker-${algorithmName}`,
                    group: 'hkube',
                    'metrics-group': 'worker-debug',
                    type: 'worker-debug'
                }
            },
            spec: {
                nodeSelector: {
                    worker: 'true'
                },
                serviceAccountName: 'worker-serviceaccount',
                containers: [
                    {
                        name: 'worker',
                        image: `${imageName}`,
                        env: [
                            {
                                name: 'NODE_ENV',
                                value: 'production'
                            },
                            {
                                name: 'ALGORITHM_TYPE',
                                value: `${algorithmName}`
                            },
                            {
                                name: 'METRICS_PORT',
                                value: '3001'
                            },
                            {
                                name: 'INACTIVE_PAUSED_WORKER_TIMEOUT_MS',
                                value: '2147483647'
                            },
                            {
                                name: 'INACTIVE_WORKER_TIMEOUT_MS',
                                value: '2147483647'
                            },
                            {
                                name: 'ALGORITHM_DISCONNECTED_TIMEOUT_MS',
                                value: '2147483647'
                            },
                            {
                                name: 'POD_ID',
                                valueFrom: {
                                    fieldRef: {
                                        fieldPath: 'metadata.uid'
                                    }
                                }
                            },
                            {
                                name: 'POD_NAME',
                                valueFrom: {
                                    fieldRef: {
                                        fieldPath: 'metadata.name'
                                    }
                                }
                            },
                            {
                                name: 'AWS_ACCESS_KEY_ID',
                                valueFrom: {
                                    secretKeyRef: {
                                        name: 's3-secret',
                                        key: 'awsKey'
                                    }
                                }
                            },
                            {
                                name: 'AWS_SECRET_ACCESS_KEY',
                                valueFrom: {
                                    secretKeyRef: {
                                        name: 's3-secret',
                                        key: 'awsSecret'
                                    }
                                }
                            },
                            {
                                name: 'S3_ENDPOINT_URL',
                                valueFrom: {
                                    secretKeyRef: {
                                        name: 's3-secret',
                                        key: 'awsEndpointUrl'
                                    }
                                }
                            },
                            {
                                name: 'DEFAULT_STORAGE',
                                value: 's3'
                            },
                            {
                                name: 'JAEGER_AGENT_SERVICE_HOST',
                                valueFrom: {
                                    fieldRef: {
                                        fieldPath: 'status.hostIP'
                                    }
                                }
                            },
                            {
                                name: 'DEBUG_MODE',
                                value: 'true'
                            },
                            {
                                name: 'DISABLE_ALGORITHM_LOGGING',
                                value: 'true'
                            }
                        ],
                        port: {
                            containerPort: 3000
                        }
                    }
                ]

            }
        }
    }
});


const workerService = (algorithmName = '') => ({
    kind: 'Service',
    apiVersion: 'v1',
    metadata: {
        name: `worker-service-${algorithmName}`,
        annotations: {
            'prometheus.io/scrape': 'true'
        },
        labels: {
            app: `worker-${algorithmName}`,
            group: 'hkube',
            core: 'true',
            type: 'worker-debug'
        }
    },
    spec: {
        selector: {
            'metrics-group': 'worker-debug',
            group: 'hkube',
            app: `worker-${algorithmName}`,
        },
        ports: [
            {
                name: 'metrics',
                port: 80,
                targetPort: 3000
            }
        ]
    }
});
const workerIngress = (algorithmName = '') => ({
    apiVersion: 'extensions/v1beta1',
    kind: 'Ingress',
    metadata: {
        name: `ingress-worker-${algorithmName}`,
        annotations: {
            'nginx.ingress.kubernetes.io/rewrite-target': '/',
            'nginx.ingress.kubernetes.io/ssl-redirect': 'false'
        },
        labels: {
            app: 'ingress-worker-debug',
            core: 'true',
            type: 'worker-debug'
        }
    },
    spec: {
        rules: [
            {
                http: {
                    paths: [{
                        path: `/hkube/debug/${algorithmName}`,
                        backend: {
                            serviceName: `worker-service-${algorithmName}`,
                            servicePort: 80
                        }
                    }
                    ]
                }
            }
        ]
    }
});


module.exports = {
    deyploymentDebugTemplate,
    workerIngress,
    workerService


};
