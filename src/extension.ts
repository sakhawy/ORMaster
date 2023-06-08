import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import HackerRank from './aggregators/hackerrank';

class ORMasterItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState
	) {
		super(label, collapsibleState);
		this.tooltip = `${this.label}`;
		this.description = `${this.label}`;
	}

	iconPath = {
		light: path.join(__filename, '..', '..', 'resources', 'light', 'aggregator.svg'),
		dark: path.join(__filename, '..', '..', 'resources', 'dark', 'aggregator.svg')
	};

	contextValue = 'aggregator';
}

class ORMasterProvider implements vscode.TreeDataProvider<ORMasterItem> {
	data: any;

	constructor (private worspaceRoot: string) {}

	getTreeItem(element: ORMasterItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: ORMasterItem): Thenable<ORMasterItem[]> {
		return Promise.resolve(this.getORMasterChildren());
	}

	private getORMasterChildren(element?: string): Promise<ORMasterItem[]> {
		const hackerrank_aggregator = new HackerRank();
		const data = hackerrank_aggregator.list_challenges().then(
			(data) => data.map(
				(challenge: any) => new ORMasterItem(challenge.title, vscode.TreeItemCollapsibleState.None)
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

	const ormasterProvider = new ORMasterProvider(rootPath!)

	const tree = vscode.window.createTreeView('ormaster', {
		treeDataProvider: ormasterProvider
	});

	tree.onDidChangeSelection(e => {
		// open the WebView with the challenge details
	})
}

export function deactivate() {}
