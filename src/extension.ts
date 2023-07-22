import * as vscode from 'vscode';
import * as path from 'path';
import HackerRank from './aggregators/hackerrank';
import { IChallenge } from './aggregators/base';
import djangoProjectManager from './ormManagers/django/projectManager';
import { openWorkspaceDir } from './utils/workspace';
import { showInformationMessage, withProgress } from './utils/notifications';
import djangoEnvironmentManager from './ormManagers/django/environmentManager';
import { problemPreviewWebView } from './webview/problemPreviewWebview';
import { mainTreeDataProvider } from './treeDataProvider/mainTreeDataProvider';

class CustomCodeLensProvider implements vscode.CodeLensProvider {
    public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken):
        vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
			let codeLensLine: number = document.lineCount - 1;
			// add a code lens on the last line of the document
			return [
				new vscode.CodeLens(
					new vscode.Range(
						new vscode.Position(codeLensLine, 0),
						new vscode.Position(codeLensLine, 0)
					),
					{
						title: "Submit Challenge",
						command: "ormaster.submitChallenge",
						arguments: [document.uri]
					}
				)
			];
		}
}

async function setupChallenge (challenge: IChallenge) {
	// create the application
	// TODO: make sure the name follow the convention
	const modelsPath = await djangoProjectManager.createApp(challenge.slug.replace(/-/g, '_'))

	// open the models.py file in a new vscode window
	vscode.workspace.openTextDocument(modelsPath).then(
		(doc) => {
			vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Two })
		}
	)
}

async function submitChallenge(uri: vscode.Uri, hackerrank: HackerRank){
	// [...]/${challengeSlug}/models.py
	const challengeSlug: string = uri.path.split("/").slice(-2)[0]
	var sql = await djangoProjectManager.runQueryset(challengeSlug)
	sql += ';'

	const slug = challengeSlug.replace(/_/g, '-')

	const response = await hackerrank.submitChallenge(slug, sql)
	
	if (response) {
		showInformationMessage(response.model.status)
	}
}

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
	
	const hackerrank = new HackerRank()
	await hackerrank.login()

	mainTreeDataProvider.initialize(hackerrank)

	vscode.window.createTreeView('ormaster', { treeDataProvider: mainTreeDataProvider })

	vscode.commands.registerCommand("ormaster.login", () => hackerrank.login(true))

	vscode.commands.registerCommand("ormaster.submitChallenge", async (uri) => {
		await withProgress(
			'Submitting challenge...',
			() => submitChallenge(uri, hackerrank)
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
			async () => {
				const challengeHTML = await hackerrank.getChallenge(challenge)
				problemPreviewWebView.show(challenge, challengeHTML!)
			}
		)
	})

	// register the code lens provider
	context.subscriptions.push(
		vscode.languages.registerCodeLensProvider(
			{ scheme: "file" },
			new CustomCodeLensProvider()
		)
	)
}

export function deactivate() {}
