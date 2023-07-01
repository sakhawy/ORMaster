import * as path from 'path';
import * as fs from 'fs-extra';
import executeShellCommand from '../../utils/shell';
import { EXTENSION_HOME_PATH } from '../../constants';
import { openWorkspaceDir, setWorkspaceDir } from '../../utils/workspace';

export class DjangoEnvironmentManager {
    constructor () {}

    getDjangoPath(): string {
        return path.join(EXTENSION_HOME_PATH, 'django')
    }

    async validateEnvironment(): Promise<any>{
        return true
        // try {
        //     const pythonVersion: string = await executeShellCommand('python3', ['--version'])
        //     const pipVersion: string = await executeShellCommand('pip3', ['--version'])
        //     const venvVersion: string = await executeShellCommand('python3', ['-m', 'venv', '--version'])        
        //     return true
        // } catch (error) {
        //     return false
        // }
    }

    async projectExists(): Promise<boolean> {
        return fs.existsSync(this.getDjangoPath())
    }

    async setUpEnvironment(): Promise<void> {
        // Spins up a new django project 
        fs.emptyDirSync(this.getDjangoPath())

        // Create a virtual environment
        const venvPath = path.join(this.getDjangoPath(), 'venv')
        await executeShellCommand('python3', ['-m', 'venv', venvPath])

        // Install django
        const pythonBinPath = path.join(venvPath, 'bin', 'python3')
        const pipPath = path.join(venvPath, 'bin', 'pip3')
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

    // async createApp(appName: string): Promise<void> {
    //     const pythonBinPath = path.join(this.getDjangoPath(), 'venv', 'bin', 'python3')
    //     // remove the directory if it exists
    //     const appPath = path.join(this.getDjangoPath(), appName)

    //     if (fs.existsSync(appPath)) {
    //         fs.removeSync(appPath)
    //     }
        
    //     fs.mkdirSync(appPath)
    //     await executeShellCommand(pythonBinPath, ['-m', 'django', 'startapp', appName, appPath])
    // }

}

const djangoEnvironmentManager: DjangoEnvironmentManager = new DjangoEnvironmentManager();
export default djangoEnvironmentManager;