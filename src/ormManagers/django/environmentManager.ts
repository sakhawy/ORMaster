import * as path from 'path';
import * as fs from 'fs-extra';
import executeShellCommand from '../../utils/shell';
import { EXTENSION_HOME_PATH } from '../../constants';

class DjangoEnvironmentManager {
    constructor () {}

    getDjangoPath(): string {
        return path.join(EXTENSION_HOME_PATH, 'django')
    }

    async validateEnvironment(): Promise<any>{
        try {
            const pythonVersion: string = await executeShellCommand('python3', ['--version'])
            const pipVersion: string = await executeShellCommand('pip3', ['--version'])
            const venvVersion: string = await executeShellCommand('python3', ['-m', 'venv', '--version'])        
            return true
        } catch (error) {
            return false
        }
    }

    async setUpEnvironment(): Promise<void> {
        // Spins up a new django project 
        fs.emptyDirSync(this.getDjangoPath())

        // Create a virtual environment
        const venvPath = path.join(this.getDjangoPath(), 'venv')
        await executeShellCommand('python3', ['-m', 'venv', venvPath])

        // Install django
        const pythonBinPath = path.join(venvPath, 'bin', 'python3')
        await executeShellCommand(pythonBinPath, ['-m', 'pip', 'install', 'django'])

        // Create a django project
        const projectPath = path.join(this.getDjangoPath());
        await executeShellCommand(pythonBinPath, ['-m', 'django', 'startproject', 'ormaster', projectPath])
    }

    async createApp(appName: string): Promise<void> {
        const pythonBinPath = path.join(this.getDjangoPath(), 'venv', 'bin', 'python3')
        // remove the directory if it exists
        const appPath = path.join(this.getDjangoPath(), appName)

        if (fs.existsSync(appPath)) {
            fs.removeSync(appPath)
        }

        await executeShellCommand(pythonBinPath, ['-m', 'django', 'startapp', appName])
    }

}

export const djangoEnvironmentManager: DjangoEnvironmentManager = new DjangoEnvironmentManager();