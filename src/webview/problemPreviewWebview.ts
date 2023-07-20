
import * as vscode from 'vscode';
import { IChallenge } from '../aggregators/base';

export class ProblemPreviewWebView {
    private webViewPanel: vscode.WebviewPanel | undefined
    private challenge: IChallenge
    private readonly viewType: string = 'ormaster.problemPreviewWebView'
    private readonly title: string = 'ORMaster Problem Preview'
    private readonly viewColumn: vscode.ViewColumn = vscode.ViewColumn.One
    private readonly preserveFocus: boolean = false

    public show(challenge: IChallenge, html: string): void {
        this.challenge = challenge
        if (this.webViewPanel) {
            this.webViewPanel.reveal(this.viewColumn, this.preserveFocus)
        } else {
            this.webViewPanel = vscode.window.createWebviewPanel(
                this.viewType,
                this.title,
                this.viewColumn,
                {
                    enableScripts: true,
                }
            )

            this.webViewPanel.webview.html = this.getWebviewContent(html)
            this.webViewPanel.onDidDispose(() => this.dispose())
        }
    }

    protected getWebviewContent(data: string): string {
        const button: { element: string, script: string } = {
            element: `<button id="solve">Solve</button>`,
            script: `const button = document.getElementById('solve');
                    button.onclick = () => vscode.postMessage({
                        command: 'setupChallenge',
                    });`,
        };
        
        const htmlContent = `
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

        return htmlContent;
    }

    protected async onDidReceiveMessage(message: any): Promise<void> {
        switch (message.command) {
            case 'setupChallenge':
                vscode.commands.executeCommand('ormaster.setupChallenge', this.challenge)
                break
        }
    }

    public dispose(): void {
        this.webViewPanel?.dispose()
    }
}

export const problemPreviewWebView: ProblemPreviewWebView = new ProblemPreviewWebView();