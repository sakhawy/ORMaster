import * as vscode from 'vscode';
import * as path from 'path';
import HackerRank from './aggregators/hackerrank';
import { IChallenge } from './aggregators/base';
import djangoProjectManager from './ormManagers/django/projectManager';
import { openWorkspaceDir } from './utils/workspace';
import { withProgress } from './utils/notifications';

class ORMasterItem extends vscode.TreeItem {
	// TODO: pass the challenge object to the constructor
	constructor(
		public readonly challenge: IChallenge,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState
	) {
		super(challenge.title, collapsibleState);
		this.tooltip = `${this.label}`;
		this.challenge = challenge
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

	private async getORMasterChildren(element?: string): Promise<ORMasterItem[]> {
		const challenges = await withProgress(
			'Fetching challenges...',
			() => this.hackerrank.listChallenges()
		)
		const result = challenges.map(
			(challenge: IChallenge) => new ORMasterItem(
				challenge,
				vscode.TreeItemCollapsibleState.None
			)
		)
		return result
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
	await openWorkspaceDir()
	
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

	// register the code lens provider
	context.subscriptions.push(
		vscode.languages.registerCodeLensProvider(
			{ scheme: "file" },
			new CustomCodeLensProvider()
		)
	)

	tree.onDidChangeSelection(async e => {
		// get the challenge
		const challenge = e.selection[0].challenge
		const challengeHTML = await withProgress(
			"Fecthing challenge...",
			() => {
				return hackerrank.getChallenge(challenge)
			}
		)

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
