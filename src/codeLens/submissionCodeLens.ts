import * as vscode from "vscode";

export class SubmissionCodeLensProvider implements vscode.CodeLensProvider {
    public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken):
        vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
			let querysetLine: number = -1;
			for (let i: number = document.lineCount - 1; i >= 0; i--) {
				const lineContent: string = document.lineAt(i).text;
				if (lineContent.indexOf("def get_queryset") >= 0) {
					querysetLine = i;
					break;
				}
			}
			if (querysetLine !== -1) {
				return [
					new vscode.CodeLens(
						new vscode.Range(
							new vscode.Position(querysetLine, 0),
							new vscode.Position(querysetLine, 0),
						),
						{
							title: "Submit challenge",
							command: "ormaster.submitChallenge",
							arguments: [document.uri]
						}
					)
				];
			} else {
				return []
			}
		}
}

export class SubmissionCodeLensController implements vscode.Disposable {
    private provider: SubmissionCodeLensProvider;
    private registeredProvider: vscode.Disposable | undefined;
    private configurationChangeListener: vscode.Disposable;

    constructor() {
        this.provider = submissionCodeLensProvider;

        this.registeredProvider = vscode.languages.registerCodeLensProvider(
            { 
                scheme: "file"
            }, 
            this.provider
        );
    }

    public dispose(): void {
        if (this.registeredProvider) {
            this.registeredProvider.dispose();
        }
        this.configurationChangeListener.dispose();
    }
}

export const submissionCodeLensProvider: SubmissionCodeLensProvider = new SubmissionCodeLensProvider();
export const submissionCodeLensController: SubmissionCodeLensController = new SubmissionCodeLensController();