import * as path from 'path';
import * as fs from 'fs-extra';
import * as vscode from 'vscode';
import * as os from 'os';
import executeShellCommand from '../../utils/shell';
import { EXTENSION_HOME_PATH } from '../../constants';
import { openWorkspaceDir, setWorkspaceDir } from '../../utils/workspace';

export class DjangoEnvironmentManager {
    private _platform: string
    private _python: string
    private _pip: string
    
    constructor () {
        this._platform = os.platform()
        this._python = 'python3'
        this._pip = 'pip'
    }

    getDjangoPath(): string {
        return path.join(EXTENSION_HOME_PATH, 'django')
    }

    getPythonPath(): string {
        if (os.platform() === 'win32') {
            const pythonVenvPath: string = vscode.workspace.getConfiguration('ormaster').get('pythonVenvPathWindows')!
            return path.join(this.getDjangoPath(), pythonVenvPath)
        } else {
            const pythonVenvPath: string = vscode.workspace.getConfiguration('ormaster').get('pythonVenvPathLinux')!
            return path.join(this.getDjangoPath(), pythonVenvPath)
        } 
    }

    getPipPath(): string {
        if (os.platform() === 'win32') {
            const pipVenvPath: string = vscode.workspace.getConfiguration('ormaster').get('pipVenvPathWindows')!
            return path.join(this.getDjangoPath(), pipVenvPath)
        } else {
            const pipVenvPath: string = vscode.workspace.getConfiguration('ormaster').get('pipVenvPathLinux')!
            return path.join(this.getDjangoPath(), pipVenvPath)
        }
    }

    async validateEnvironment(): Promise<boolean>{
        try {
            const pythonVersion: string = await executeShellCommand(this._python, ['--version'])
        } catch (error) {
            try {
                const pythonVersion: string = await executeShellCommand('python', ['--version'])
                this._python = 'python'   
            }
            catch (error) {

                vscode.window.showErrorMessage('Python3 is not installed! Make sure `python3` is in your PATH.')
                return false
            }
        }
        try {
            const pipVersion: string = await executeShellCommand(this._python, ['-m', 'pip', '--version'])
        } catch (error) {
            vscode.window.showErrorMessage('pip is not installed! Try `sudo apt install python3-pip`.')
            return false
        }

        return true
    }

    async validateSetup(): Promise<boolean> {
        // check if the django project exists
        if (!await this.projectExists()) {
            return false
        }
        return true
    }

    async projectExists(): Promise<boolean> {
        return fs.existsSync(this.getDjangoPath())
    }

    async setUpEnvironment(): Promise<void> {
        // Spins up a new django project 
        fs.emptyDirSync(this.getDjangoPath())

        // Create a virtual environment
        const venvPath = path.join(this.getDjangoPath(), 'venv')
        await executeShellCommand(this._python, ['-m', 'venv', venvPath])

        // Install django
        const pythonBinPath = this.getPythonPath()
        const pipPath = this.getPipPath()
        await executeShellCommand(pipPath, ['install', 'django'])

        // Create a django project
        const projectPath = path.join(this.getDjangoPath());
        await executeShellCommand(pythonBinPath, ['-m', 'django', 'startproject', 'ormaster', projectPath])

        // Setup the database backend to sqlite3 in memory
        const settingsPath = path.join(this.getDjangoPath(), 'ormaster', 'settings.py')
        const settings = fs.readFileSync(settingsPath, 'utf-8')
        const newSettings = settings.replace(
            '        \'ENGINE\': \'django.db.backends.sqlite3\',',
            '        \'ENGINE\': \'django.db.backends.sqlite3\',\n        \'NAME\': \':memory:\','
        )

        setWorkspaceDir()
        openWorkspaceDir()
    }
}

const djangoEnvironmentManager: DjangoEnvironmentManager = new DjangoEnvironmentManager();
export default djangoEnvironmentManager;