import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

import * as defaultConfig from './defaultConfig.json';

class ConfigManager {
    // simple key-value store

    config: any;
    extensionPath: string;

    constructor() {
        // TODO: make this the workspace or the extension path.
        this.extensionPath = path.join(os.homedir(), '.ormaster');
        this.config = this.loadConfigFile();
    }

    // load config file
    private loadConfigFile(): any {
        // check if config.json exists in extension path
        const configPath = path.join(this.extensionPath, "config.json")
        if (fs.existsSync(configPath)) {
            return fs.readJsonSync(configPath);
        } else {
            return defaultConfig;
        }
    }

    // get config value
    public get(key: string): any {
        return this.config[key];
    }

    // set config value
    public set(key: any, value: string): any {
        // check if config.json exists in extension path
        // if not create one & copy the default config
        // then set the value
        const configPath = path.join(this.extensionPath, "config.json")
        fs.ensureFileSync(configPath);
        this.config[key] = value;
        fs.writeJsonSync(configPath, this.config);

        return this.config[key];
    }

    public async getOrSet(key: any, callback: any): Promise<any> {
        // get or set to the callback value
        if (this.config[key] === null) {
            const value = await callback()
            return this.set(key, value);
        }
    }

}

const configManager = new ConfigManager();
export default configManager;