import * as vscode from 'vscode';
import configManager from "../config/configManager";
import { EXTENSION_HOME_PATH } from "../constants";

export async function setWorkspaceDir(dirPath: string = EXTENSION_HOME_PATH): Promise<void> {
	const workspaceDir = configManager.get('workspaceDir')
	await configManager.set('workspaceDir', dirPath)		
}

export async function openWorkspaceDir(): Promise<void> {
	const workspaceDir = configManager.get('workspaceDir')
	
	// environmetn is not set up yet
	if (workspaceDir !== ''){
		await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(workspaceDir), false);
	}
}
