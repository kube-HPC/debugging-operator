
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
            type:'worker-debug'
        }
    },

    spec: {
        replicas: 1,
        selector: {
            matchLabels: {
                app: `worker-${algorithmName}`
            }
        },
        nodeSelector: {
            worker: 'true'
        },
        template: {
            metadata: {
                labels: {
                    app: `worker-${algorithmName}`,
                    group: 'hkube',
                    'metrics-group': 'worker-debug'
                }
            },
            spec: {
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
                                value: '60000'
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
                                // value: 'http://10.32.10.24:9000'
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
                            }
                        ],
                        volumeMounts: [
                            {
                                name: 'varlog',
                                mountPath: '/var/log'
                            },
                            {
                                name: 'varlibdockercontainers',
                                mountPath: '/var/lib/docker/containers',
                                readOnly: true
                            }
                        ],
                        securityContext: {
                            privileged: true
                        },
                        port:{
                            containerPort:3000
                        }
                    }
                ],
                 volumes: [
                    {
                        name: 'varlog',
                        hostPath: {
                            path: '/var/log'
                        }
                    },
                    {
                        name: 'varlibdockercontainers',
                        hostPath: {
                            path: '/var/lib/docker/containers'
                        }
                    }
                ],

            }
        },
        serviceAccountName: 'worker-serviceaccount',
       
      
    },


    // spec: {
    //     replicas: 1,
    //     selector: {
    //         matchLabels: {
    //             app: `worker-${algorithmName}`
    //         }
    //     },
    //     template: {
    //         metadata: {
    //             labels: {
    //                 app: `worker-${algorithmName}`,
    //                 group: 'hkube',
    //                 'metrics-group': 'worker-debug'
    //             }
    //         },
    //         spec: {
    //             nodeSelector: {
    //                 core: 'true'
    //             },
    //             containers: [
    //                 {
    //                     name: 'worker',
    //                     image: `${imageName}`,
    //                     ports: [
    //                         {
    //                             containerPort: 3000
    //                         }
    //                     ],
    //                     env: [
    //                         {
    //                             name: 'ALGORITHM_TYPE',
    //                             value: 'algorithm-name'
    //                         },
    //                         {
    //                             name: 'NODE_ENV',
    //                             value: 'production'
    //                         },
    //                         {
    //                             name: 'METRICS_PORT',
    //                             value: '3001'
    //                         },
    //                         {
    //                             name: 'JAEGER_AGENT_SERVICE_HOST',
    //                             valueFrom: {
    //                                 fieldRef: {
    //                                     fieldPath: 'status.hostIP'
    //                                 }
    //                             }
    //                         }
    //                     ]
    //                 }
    //             ]
    //         }
    //     }
    // }
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
            type:'worker-debug'
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
})
const workerIngress = (algorithmName = '') => ({
    apiVersion: 'extensions/v1beta1',
    kind: 'Ingress',
    metadata: {
        name: `ingress-worker-${algorithmName}`,
        annotations: {
            'nginx.ingress.kubernetes.io/rewrite-target': '/',
            'nginx.ingress.kubernetes.io/ssl-redirect': "false"
        },
        labels: {
            app: 'ingress-worker-debug',
            core: 'true',
            type:'worker-debug'
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
})


module.exports = {
    deyploymentDebugTemplate,
    workerIngress,
    workerService


};
