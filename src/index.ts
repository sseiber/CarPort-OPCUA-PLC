import { forget } from './utils';
import * as fse from 'fs-extra';
import { resolve as pathResolve } from 'path';
import * as dotenv from 'dotenv';
import { ServerState } from 'node-opcua';
import { IAppConfig } from './models/carportTypes';
import { RpiGdOpcuaServer } from './services/rpiGdOpcuaServer';
dotenv.config({
    path: `${pathResolve(__dirname, '..', 'configs', 'envConfig')}.env`
});

const app: IAppConfig = {
    serverConfig: undefined,
    assetRootConfig: undefined,
    storageRootDirectory: undefined,
    log: (tags: any, message: any) => {
        const tagsMessage = (tags && Array.isArray(tags)) ? `[${tags.join(', ')}]` : '[]';

        // eslint-disable-next-line no-console
        console.log(`[${new Date().toTimeString()}] [${tagsMessage}] ${message}`);
    }
};

async function start() {
    try {
        const stopServer = async () => {
            if (opcuaServer) {
                if (opcuaServer.server.engine.serverStatus.state === ServerState.Shutdown) {
                    app.log(['shutdown', 'info'], `Server shutdown already requested... shutdown will happen in ${opcuaServer.server.engine.serverStatus.secondsTillShutdown} seconds`);
                    return;
                }

                app.log(['shutdown', 'info'], '☮︎ Stopping opcua server');
                await opcuaServer.stop();
            }

            app.log(['shutdown', 'info'], `⏏︎ Server stopped`);
            process.exit(0);
        };

        process.on('SIGINT', stopServer);
        process.on('SIGTERM', stopServer);

        app.storageRootDirectory = process.env.CONTENT_ROOT
            ? pathResolve(__dirname, '..', process.env.CONTENT_ROOT)
            : '/rpi-gd/data';

        app.log(['startup', 'info'], `Loading configuration files...`);
        const systemConfigPath = pathResolve(app.storageRootDirectory, 'systemConfig.json');
        const systemConfig = fse.readJSONSync(systemConfigPath);
        app.serverConfig = {
            ...systemConfig.serverConfig
        };
        app.assetRootConfig = {
            ...systemConfig.assetRootConfig
        };

        app.log(['startup', 'info'], `Initializing server...`);
        const opcuaServer = new RpiGdOpcuaServer(app);

        await opcuaServer.start();

        app.log(['startup', 'info'], `Server started ( press CTRL+C to stop)`);

        app.log(['startup', 'info'], `Server endpoint: ${opcuaServer.getEndpoint()}`);
    }
    catch (ex) {
        // eslint-disable-next-line no-console
        console.log(`['startup', 'error'], 👹 Error starting server: ${ex.message}`);
    }
}

forget(start);
