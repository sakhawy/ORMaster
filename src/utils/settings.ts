import { workspace } from 'vscode';
import * as fs from 'fs-extra';
import { EXTENSION_HOME_PATH } from '../constants';

export function getExtensionWorspaceRoot(): string | undefined {
    return workspace.getConfiguration('ormaster').get<string>('workspaceRoots');
}

export function setExtensionWorkspaceRoot(): void {
    if (fs.existsSync(EXTENSION_HOME_PATH)) {
        // delete the old workspace dir if it exists
        fs.emptyDirSync(EXTENSION_HOME_PATH)
    } else {
        fs.mkdirSync(EXTENSION_HOME_PATH)
    }

    workspace.getConfiguration('ormaster').update('workspaceRoot', EXTENSION_HOME_PATH, true)
}