import {
    OPCUAServerOptions,
    UAObject,
    UAVariable
} from 'node-opcua';

export interface IAppConfig {
    serverConfig: OPCUAServerOptions;
    assetRootConfig: IAssetRootConfig;
    storageRootDirectory: string;
    log: (tags: any, message: any) => void;
}

export interface IOpcAssetInfo {
    asset: UAObject;
    variables: Map<string, IOpcVariable>;
}

export interface IOpcVariable {
    variable: UAVariable;
    sampleInterval: number;
    value: any;
}

export interface IAssetTag {
    name: string;
    description: string;
    sampleInterval: number;
    dataTypeName: string;
    value: any;
    writeable?: boolean;
}

export interface IAssetConfig {
    name: string;
    tags: IAssetTag[];
}

export interface IAssetRootConfig {
    rootFolderName: string;
    assets: IAssetConfig[];
}
