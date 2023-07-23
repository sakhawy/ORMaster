import * as vscode from 'vscode'
import { IChallenge } from "../aggregators/base"
import djangoProjectManager from "../ormManagers/django/projectManager"
import { showInformationMessage } from './notifications'
import { HackerRank, hackerrank } from '../aggregators/hackerrank'
import { problemPreviewWebView } from '../webview/problemPreviewWebview'

export async function login() {
    hackerrank.login(true)
}

export async function previewChallenge(challenge: IChallenge) {
    const challengeHTML = await hackerrank.getChallenge(challenge)
    problemPreviewWebView.show(challenge, challengeHTML!)
}

export async function setupChallenge (challenge: IChallenge) {
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

export async function submitChallenge(uri: vscode.Uri){
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