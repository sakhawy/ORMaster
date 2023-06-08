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

	tree.onDidChangeSelection(e => {
		// get the html
		const challenge_url = e.selection[0].url
		console.log(challenge_url)
		hackerrank_aggregator.get_challenge(challenge_url).then(data => {
			const panel = vscode.window.createWebviewPanel(
				'ormaster',
				'ORMaster',
				vscode.ViewColumn.One,
				{
					enableScripts: true
				}
			)
			panel.webview.html = data!
		})
	})
}

export function deactivate() {}
