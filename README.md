# CarPort OPCUA server and PLC
This project implements an OPCUA server using the node-OPCUA open source standard library and a PLC implementatio to the Raspberry Pi GPIO.

This module will implements:
* An OPCUA server
* OPCUA configuration representing the garage door controller and door sensors
* A PLC implementation to monitor and control the garage door assets

## Dependencies
* [Docker](https://www.docker.com/products/docker-desktop) engine
* [Visual Studio Code](https://code.visualstudio.com/Download) with [TSLint](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-typescript-tslint-plugin) extension installed
* [Node.js](https://nodejs.org/en/download/) v14
* [TypeScript](https://www.npmjs.com/package/typescript)
* [node-OPCUA](http://node-opcua.github.io/)

## Design
This project is written in NodeJS and TypeScript implements a OPCUA server using the open source node-OPCUA library. The server is configured by providing a configuration file. This file defines the server configuration and the list of "asset" files. The "asset" files represent OPCUA assets and their associated variables.

## Setup the dev environment
* Clone the repository from [here](https://github.com/sseiber/opcua-server-sample)
* Run the install commmand (requires NodeJS/NPM)
  ```
  npm i
  ```
* After installation you should see the following files in your project
  ```
  ./configs/imageConfig.json
  ./configs/local.json
  ```
  Edit the `./configs/imageConfig.json` file with your specific image name including the container registry. e.g.:
  ```
  {
    "arch": "amd64",
    "imageName": "mycontainerregistry.azurecr.io/iiot-gateway",
    "versionTag": "latest"
  }
  ```
  Note: The `./config/` files are ignored from source control. You can specify your image name that will be used when building the docker image as well as the version tag to use.

* Create a `./storage` directory in your cloned project
    * Note: this directory will be ignored from source control so you can use it to store your own copies of config files, or files with secrets like certificates, etc.
* Now you are ready to build the code. To build the code run the package.json script:
  ```
  npm run dockerbuild
  ```
 Note: if your `./configs/imageConfig.json` file specifies the `versionTag` field, this field will be used as the docker image tag. If you remove the `versionTag` field from this file it will use `latest` as the version tag. However, if you use the `npm version` command it will build and push the docker image using the `package.json` version field and also auto-increment the package.json version field. Example:
  ```
  npm version patch
  ```
## Run the project in VS Code
From VS Code you can simply hit F5 to run and debug the source code.

## Run the Docker container
To run the docker container you need to specific where your configuration files are in the `docker run` command. Here is an example command:
```
docker run \
    --name opcua-server \
    -d \
    --rm \
    -v <PATH_TO_OPCUA_CONFIG_FILES_ON_HOST>:/data/storage \
    -p 4334:4334 \
    <YOUR_CONTAINER_REGISTRY>/carport-opcua-plc:latest-amd64
```
To see the command running you can view the docker container logs with:
```
docker logs -f --tail 200 opcua-server
```
