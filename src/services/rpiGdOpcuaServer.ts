import {
    AddressSpace,
    BindVariableOptionsVariation1,
    DataType,
    Namespace,
    OPCUAServer,
    StatusCodes,
    UAObject,
    UAVariable,
    Variant
} from 'node-opcua';
import { IAppConfig } from '..';

const ModuleName = 'RpiGdOpcuaServer';

export interface IOpcAssetInfo {
    asset: UAObject;
    variables: Map<string, IOpcVariable>;
}

export interface IOpcVariable {
    variable: UAVariable;
    sampleInterval: number;
    value: any;
}

interface IAssetTag {
    name: string;
    description: string;
    sampleInterval: number;
    dataType: DataType;
    value: any;
    writeable: boolean;
}

interface IAssetConfig {
    name: string;
    tags: IAssetTag[];
}

export class RpiGdOpcuaServer {
    private app: IAppConfig;
    private opcuaServer: OPCUAServer;
    private addressSpace: AddressSpace;
    private localServerNamespace: Namespace;
    private opcAssetMap: Map<string, IOpcAssetInfo> = new Map<string, IOpcAssetInfo>();
    private opcVariableMap: Map<string, IOpcVariable> = new Map<string, IOpcVariable>();

    constructor(app: IAppConfig) {
        this.app = app;
    }

    public async start(): Promise<void> {
        this.app.log([ModuleName, 'info'], `Instantiating opcua server`);

        try {
            this.opcuaServer = new OPCUAServer(this.app.serverConfig.server);

            await this.opcuaServer.initialize();

            await this.constructAddressSpace();

            this.app.log([ModuleName, 'info'], `Starting server...`);
            await this.opcuaServer.start();

            this.app.log([ModuleName, 'info'], `Server started listening on port: ${this.opcuaServer.endpoints[0].port}`);
        }
        catch (ex) {
            this.app.log([ModuleName, 'error'], `Error during server startup: ${ex.message}`);
        }
    }

    public async stop(): Promise<void> {
        await this.opcuaServer.shutdown(10 * 1000);
    }

    public getEndpoint(): string {
        let endpoint = '';

        try {
            endpoint = this.opcuaServer?.endpoints[0]?.endpointDescriptions()[0]?.endpointUrl;
        }
        catch (ex) {
            this.app.log([ModuleName, 'error'], `Error getting server endpoint - may be another running instance at this port: ${this.app.serverConfig?.server?.port}`);
        }

        return endpoint;
    }

    private async constructAddressSpace(): Promise<void> {
        try {
            this.addressSpace = this.opcuaServer.engine.addressSpace;
            this.localServerNamespace = this.addressSpace.getOwnNamespace();

            this.app.log([ModuleName, 'info'], `Processing server configuration...`);
            await this.createAssets();
        }
        catch (ex) {
            this.app.log([ModuleName, 'error'], `Error while constructing server address space: ${ex.message}`);
        }
    }

    private async createAssets(): Promise<void> {
        try {
            const assetConfigs: IAssetConfig[] = this.app.serverConfig.assets;

            for (const assetConfig of assetConfigs) {
                const assetVariables: Map<string, IOpcVariable> = new Map<string, IOpcVariable>();

                const opcAsset = this.localServerNamespace.addObject({
                    organizedBy: this.addressSpace.rootFolder.objects,
                    browseName: assetConfig.name,
                    displayName: assetConfig.name
                });

                for (const tag of assetConfig.tags) {
                    const opcVariable: IOpcVariable = {
                        variable: undefined,
                        sampleInterval: tag.sampleInterval || 0,
                        value: tag.value
                    };

                    opcVariable.variable = await this.createAssetVariable(opcAsset, tag, opcVariable.value);

                    assetVariables.set(tag.name, opcVariable);
                    this.opcVariableMap.set(opcVariable.variable.nodeId.value.toString(), opcVariable);
                }

                const opcAssetInfo: IOpcAssetInfo = {
                    asset: opcAsset,
                    variables: assetVariables
                };

                this.opcAssetMap.set(assetConfig.name, opcAssetInfo);
            }
        }
        catch (ex) {
            this.app.log([ModuleName, 'error'], `Error while processing server configuration (adding variables): ${ex.message}`);
        }
    }

    private async createAssetVariable(asset: UAObject, tag: IAssetTag, varRef: any): Promise<UAVariable> {
        return this.localServerNamespace.addVariable({
            componentOf: asset,
            browseName: tag.name,
            displayName: tag.name,
            description: tag.description,
            dataType: tag.dataType,
            minimumSamplingInterval: tag.sampleInterval,
            value: {
                get: () => {
                    return new Variant({
                        dataType: tag.dataType, value: varRef
                    });
                }
            }
        });
    }

    private createDataAccessor(tag: IAssetTag, varRef: any): BindVariableOptionsVariation1 {
        return {
            ...{
                get: () => {
                    return new Variant({
                        dataType: tag.dataType, value: varRef
                    });
                }
            },
            ...(tag.writeable && {
                set: (variant: any) => {
                    varRef = this.parseRefVariable(tag.dataType, variant.value);
                    return StatusCodes.Good;
                }
            })
        };
    }

    private parseRefVariable(dataType: DataType, varRef: any): any {
        switch (dataType) {
            case DataType.Float:
            case DataType.Double:
                return parseFloat(varRef);

            case DataType.Boolean:
                return !!varRef;

            case DataType.Int16:
            case DataType.UInt16:
            case DataType.Int32:
            case DataType.UInt32:
            case DataType.Int64:
            case DataType.UInt64:
                return parseInt(varRef, 10);

            default:
                return varRef;
        }
    }
}
