import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

class ConfigManager {
    // simple key-value store
    private config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("ormaster");

    // get config value
    public get(key: string): any {
        return this.config.get(key);
    }

    // set config value
    public async set(key: any, value: string): Promise<any> {
        await this.config.update(key, value, true);
        return await this.config.get(key);
    }

    // public async getOrSet(key: any, callback: any): Promise<any> {
    //     // get or set to the callback value
    //     if (this.config.get(key) === '') {
    //         const value = await callback()
    //         return this.set(key, value);
    //     }
    // }

}

const configManager = new ConfigManager();
export default configManager;