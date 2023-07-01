import * as vscode from 'vscode';

export async function withProgress(message: string, callback: Function): Promise<any> {
    let result: any;
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification }, async (p: vscode.Progress<{}>) => {
        return new Promise<void>(async (resolve: () => void, reject: (e: Error) => void): Promise<void> => {
            p.report({ message });
            try {
                result = await callback()
                resolve();
            } catch (e: any) {
                reject(e);
            }
        });
    });
    return result;
}

export async function showInformationMessage(message: string): Promise<void> {
    await vscode.window.showInformationMessage(message);
}