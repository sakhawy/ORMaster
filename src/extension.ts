import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import HackerRank from './aggregators/hackerrank';
import { IChallenge } from './aggregators/base';

class ORMasterItem extends vscode.TreeItem {
	constructor(
		public readonly title: string,
		public readonly difficulty: string,
		public readonly url: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState
	) {
		super(title, collapsibleState);
		this.tooltip = `${this.label}`;
		this.description = `${this.label}`;
		this.url = `${this.url}`
	}

	iconPath = {
		light: path.join(__filename, '..', '..', 'resources', 'light', 'aggregator.svg'),
		dark: path.join(__filename, '..', '..', 'resources', 'dark', 'aggregator.svg')
	};

	contextValue = 'aggregator';
}

class ORMasterProvider implements vscode.TreeDataProvider<ORMasterItem> {
	hackerrank_aggregator: HackerRank

	constructor (private worspaceRoot: string, hackerrank_aggregator: HackerRank) {
		this.hackerrank_aggregator = hackerrank_aggregator
	}

	getTreeItem(element: ORMasterItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: ORMasterItem): Thenable<ORMasterItem[]> {
		return Promise.resolve(this.getORMasterChildren());
	}

	private getORMasterChildren(element?: string): Promise<ORMasterItem[]> {
		const data = this.hackerrank_aggregator.list_challenges().then(
			(data: IChallenge[]) => data.map(
				(challenge) => new ORMasterItem(
					challenge.title,
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
		element: `<button id="solve">CLICK ME TO CONSOLE LOG :D</button>`,
		script: `const button = document.getElementById('solve');
				button.onclick = () => vscode.postMessage({
					command: 'previewChallenge',
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


export function activate(context: vscode.ExtensionContext) {
	const rootPath =
	vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
		? vscode.workspace.workspaceFolders[0].uri.fsPath
		: undefined;
	
	const hackerrank_aggregator = new HackerRank()

	const ormasterProvider = new ORMasterProvider(
		rootPath!, 
		hackerrank_aggregator
	)

	const tree = vscode.window.createTreeView('ormaster', {
		treeDataProvider: ormasterProvider
	});

	tree.onDidChangeSelection(async e => {
		// get the html
		const challenge_url = e.selection[0].url
		const challengeHTML = await hackerrank_aggregator.get_challenge(challenge_url)
		vscode.commands.registerCommand("ormaster.previewChallenge", (challenge: IChallenge) => {
			console.log('YOU JUST COMMUNICATED WITH THE VSCODE API FROM THE WEBVIEW!')
			// return challengePreviewWebview.showWebviewInternal(challenge)
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
					case 'previewChallenge':
						return vscode.commands.executeCommand("ormaster.previewChallenge");
				}
			}
		)

	})

}

export function deactivate() {}
