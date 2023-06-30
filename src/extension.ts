import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import HackerRank from './aggregators/hackerrank';
import { IChallenge } from './aggregators/base';
import djangoProjectManager from './ormManagers/django/projectManager';
import configManager from './config/configManager';

class ORMasterItem extends vscode.TreeItem {
	// TODO: pass the challenge object to the constructor
	constructor(
		public readonly title: string,
		public readonly slug: string,
		public readonly difficulty: string,
		public readonly url: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState
	) {
		super(title, collapsibleState);
		this.tooltip = `${this.label}`;
		this.description = `${this.label}`;
		this.slug = `${this.slug}`;
		this.url = `${this.url}`
	}

	iconPath = {
		light: path.join(__filename, '..', '..', 'resources', 'light', 'aggregator.svg'),
		dark: path.join(__filename, '..', '..', 'resources', 'dark', 'aggregator.svg')
	};

	contextValue = 'aggregator';
}

class ORMasterProvider implements vscode.TreeDataProvider<ORMasterItem> {
	hackerrank: HackerRank

	constructor (private worspaceRoot: string, hackerrank_aggregator: HackerRank) {
		this.hackerrank = hackerrank_aggregator
	}

	getTreeItem(element: ORMasterItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: ORMasterItem): Thenable<ORMasterItem[]> {
		return Promise.resolve(this.getORMasterChildren());
	}

	private getORMasterChildren(element?: string): Promise<ORMasterItem[]> {
		const data = this.hackerrank.listChallenges().then(
			(data: IChallenge[]) => data.map(
				(challenge) => new ORMasterItem(
					challenge.title,
					challenge.slug,
					challenge.difficulty,
					challenge.url,
					vscode.TreeItemCollapsibleState.None
				)
			)
		)
		return data
	}
}

function getWebviewContent(data: string) {
	const button: { element: string, script: string } = {
		element: `<button id="solve">Solve</button>`,
		script: `const button = document.getElementById('solve');
				button.onclick = () => vscode.postMessage({
					command: 'setupChallenge',
				});`,
	};
	
	return `
		<html>
			<body>
				${data}
				${button.element}
			</body>
			<script>
				const vscode = acquireVsCodeApi();
				${button.script}
			</script>
		</html>
	`;
}


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

export async function activate(context: vscode.ExtensionContext) {
	const rootPath =
	vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
		? vscode.workspace.workspaceFolders[0].uri.fsPath
		: undefined;
	
	const hackerrank = new HackerRank()
	await hackerrank.login()

	const ormasterProvider = new ORMasterProvider(
		rootPath!, 
		hackerrank
	)

	const tree = vscode.window.createTreeView('ormaster', {
		treeDataProvider: ormasterProvider
	});

	vscode.commands.registerCommand("ormaster.login", () => hackerrank.login(true))

	vscode.commands.registerCommand("ormaster.submitChallenge", async (uri) => {
		
		// [...]/${challengeSlug}/models.py
		const challengeSlug: string = uri.path.split("/").slice(-2)[0]
		var sql = await djangoProjectManager.runQueryset(challengeSlug)
		sql += ';'

		const slug = challengeSlug.replace(/_/g, '-')

		hackerrank.submitChallenge(slug, sql)
	})

	// register the code lens provider
	context.subscriptions.push(
		vscode.languages.registerCodeLensProvider(
			{ scheme: "file" },
			new CustomCodeLensProvider()
		)
	)

	tree.onDidChangeSelection(async e => {
		// get the html
		const challenge_url = e.selection[0].url
		const challengeHTML = await hackerrank.getChallenge(challenge_url)
		vscode.commands.registerCommand("ormaster.setupChallenge", async (challenge: IChallenge) => {
			// create the application
			// TODO: make sure the name follow the convention
			const modelsPath = await djangoProjectManager.createApp(challenge.slug.replace(/-/g, '_'))

			// open the models.py file in a new vscode window
			vscode.workspace.openTextDocument(modelsPath).then(
				(doc) => {
					vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Two })
				}
			)
		})

		const panel = vscode.window.createWebviewPanel(
			'ormaster',
			'ORMaster',
			vscode.ViewColumn.One,
			{
				enableScripts: true
			}
		)
		
		panel.webview.html = getWebviewContent(challengeHTML!)!
		panel.webview.onDidReceiveMessage(
			(message) => {
				switch(message.command) {
					case 'setupChallenge':
						return vscode.commands.executeCommand("ormaster.setupChallenge", e.selection[0]);
				}
			}
		)

	})

}

export function deactivate() {}
