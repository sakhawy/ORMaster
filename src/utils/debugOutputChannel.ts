import * as vscode from 'vscode';

export class DebugOutputChannel {
    private outputChannel: vscode.OutputChannel;
    private readonly name: string = 'ORMaster Output';

    initialize() {
        this.outputChannel = vscode.window.createOutputChannel(this.name);
    }

    // method to show the debug terminal
    public show(): void {
        this.outputChannel.show();
    }

    // method to write debug messages to the terminal
    public write(message: string): void {
        // Show before displaying messages 
        this.show();
        this.outputChannel.appendLine(message);
    }
}

export const debugOutputChannel: DebugOutputChannel = new DebugOutputChannel();