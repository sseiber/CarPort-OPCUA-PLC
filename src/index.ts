import { RpiGdOpcuaServer } from './services/rpiGdOpcuaServer';
import { forget } from './utils';
import * as fse from 'fs-extra';
import { resolve as pathResolve } from 'path';
import * as dotenv from 'dotenv';
dotenv.config({
    path: `${pathResolve(__dirname, '..', 'configs', 'envConfig')}.env`
});

export interface IAppConfig {
    serverConfig: any;
    server: RpiGdOpcuaServer;
    storageRootDirectory: string;
    log: (tags: any, message: any) => void;
}

const app: IAppConfig = {
    serverConfig: {},
    server: null,
    storageRootDirectory: '',
    log: (tags: any, message: any) => {
        const tagsMessage = (tags && Array.isArray(tags)) ? `[${tags.join(', ')}]` : '[]';

        // eslint-disable-next-line no-console
        console.log(`[${new Date().toTimeString()}] [${tagsMessage}] ${message}`);
    }
};

async function start() {
    try {
        const stopServer = async () => {
            if (app.server) {
                app.log(['shutdown', 'info'], '☮︎ Stopping opcua server');
                await app.server.stop();
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
        app.serverConfig = fse.readJSONSync(systemConfigPath);

        app.log(['startup', 'info'], `Initializing server...`);
        app.server = new RpiGdOpcuaServer(app);

        await app.server.start();

        app.log(['startup', 'info'], `Server started ( press CTRL+C to stop)`);

        app.log(['startup', 'info'], `Server endpoint: ${app.server.getEndpoint()}`);
    }
    catch (ex) {
        // eslint-disable-next-line no-console
        console.log(`['startup', 'error'], 👹 Error starting server: ${ex.message}`);
    }
}

forget(start);
