import * as vscode from 'vscode';
import { hackerrank } from './aggregators/hackerrank';
import { IChallenge } from './aggregators/base';
import { openWorkspaceDir } from './utils/workspace';
import { withProgress } from './utils/notifications';
import djangoEnvironmentManager from './ormManagers/django/environmentManager';
import { mainTreeDataProvider } from './treeDataProvider/mainTreeDataProvider';
import { login, previewChallenge, setupChallenge, submitChallenge } from './utils/commands';
import { debugOutputChannel } from './utils/debugOutputChannel';
import { submissionCodeLensController } from './codeLens/submissionCodeLens';

export async function activate(context: vscode.ExtensionContext) {
	// setup the environment
	const isSetupValid = await djangoEnvironmentManager.validateSetup() 
	if (!isSetupValid) {
		await withProgress(
			'Setting up the Django environment...',
			async () => {
				const isEnvValid = await djangoEnvironmentManager.validateEnvironment()
				if (isEnvValid) {
					await djangoEnvironmentManager.setUpEnvironment()
				}
			}
		)
	}

	await openWorkspaceDir()
	
	await hackerrank.login()

	mainTreeDataProvider.initialize()

	// create the debug output channel
	debugOutputChannel.initialize()

	vscode.window.createTreeView('ormaster', { treeDataProvider: mainTreeDataProvider })

	vscode.commands.registerCommand("ormaster.login", () => login())

	vscode.commands.registerCommand("ormaster.submitChallenge", async (uri) => {
		await withProgress(
			'Submitting challenge...',
			() => submitChallenge(uri)
		)
	})
	
	vscode.commands.registerCommand("ormaster.setupChallenge", async (challenge: IChallenge) => {
		await withProgress(
			'Setting up the challenge...',
			() => setupChallenge(challenge)
		)
	})

	vscode.commands.registerCommand("ormaster.previewChallenge", async (challenge: IChallenge) => {
		await withProgress(
			"Fecthing challenge...",
			() => previewChallenge(challenge)
		)
	})

	// register the code lens provider
	context.subscriptions.push(
		submissionCodeLensController
	)
}

export function deactivate() {}
