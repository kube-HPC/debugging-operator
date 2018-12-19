ARG BASE_PRIVATE_REGISTRY=""
FROM ${BASE_PRIVATE_REGISTRY}hkube/base-node:v1.1.1
LABEL maintainer="yehiyam@gmail.com"
RUN mkdir /hkube
COPY . /hkube/debugging-operator
RUN cd /hkube/debugging-operator
WORKDIR /hkube/debugging-operator
CMD ["node", "app.js"]