import * as vscode from 'vscode';
import HackerRank from '../aggregators/hackerrank';
import { IChallenge } from '../aggregators/base';
import { withProgress } from '../utils/notifications';

class MainTreeDataProvider implements vscode.TreeDataProvider<IChallenge> {
    private _onDidChangeTreeData: vscode.EventEmitter<IChallenge | undefined | null> = new vscode.EventEmitter<IChallenge | undefined>();
    readonly onDidChangeTreeData: vscode.Event<IChallenge | undefined | null> = this._onDidChangeTreeData.event;

    private challenges: IChallenge[] = [];
    private hackerrank: HackerRank;

    initialize (hackerrank: HackerRank) {
        this.hackerrank = hackerrank;
        this.refresh();
    }

    async refresh(): Promise<void> {
        // load the challenges
        this.challenges = await withProgress(
			'Fetching challenges...',
			() => this.hackerrank.listChallenges()
		)

        this._onDidChangeTreeData.fire(null);
    }

    getTreeItem(challenge: IChallenge): vscode.TreeItem {
        return {
            label: challenge.title,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            command: {
                command: 'ormaster.previewChallenge',
                title: 'Preview challenge',
                arguments: [challenge]
            }
        };
    }

    getChildren(element?: IChallenge): IChallenge[] {
        return this.challenges;
    }

}
            

export const mainTreeDataProvider: MainTreeDataProvider = new MainTreeDataProvider();