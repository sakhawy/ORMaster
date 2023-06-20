import * as fs from 'fs-extra'
import * as path from 'path'
import djangoEnvironmentManager, { DjangoEnvironmentManager } from './environmentManager'
import executeShellCommand from '../../utils/shell'

export class DjangoProjectManager {
    environmentManager: DjangoEnvironmentManager = djangoEnvironmentManager

    private getInjectionFunction(): string { 
        return `
# THIS FUNCTION MUST RETURN THE SOLUTION QuerySet.
def get_queryset(self) -> models.QuerySet:
    pass
`
    }

    async createApp(appName: string): Promise<string> {
        const pythonBinPath = path.join(this.environmentManager.getDjangoPath(), 'venv', 'bin', 'python3')
        // remove the directory if it exists
        const appPath = path.join(this.environmentManager.getDjangoPath(), appName)

        console.log(appPath)
        if (fs.existsSync(appPath)) {
            fs.removeSync(appPath)
        }
        fs.mkdirSync(appPath)

        await executeShellCommand(pythonBinPath, ['-m', 'django', 'startapp', appName, appPath])

        // add the app to the settings.py file
        const settingsPath = path.join(this.environmentManager.getDjangoPath(), 'ormaster', 'settings.py')
        const settingsFile = fs.readFileSync(settingsPath, 'utf-8')
        const newSettingsFile = settingsFile.replace(
            '\'django.contrib.staticfiles\',', 
            `'django.contrib.staticfiles\',\n    \'${appName}\',`
        )
        fs.writeFileSync(settingsPath, newSettingsFile, 'utf-8')

        // append the function to models.py
        const modelsPath = path.join(this.environmentManager.getDjangoPath(), appName, 'models.py')
        const modelsFile = fs.readFileSync(modelsPath, 'utf-8')
        const newModelsFile = modelsFile + this.getInjectionFunction()
        fs.writeFileSync(modelsPath, newModelsFile, 'utf-8')

        return modelsPath
    }
}

const djangoProjectManager: DjangoProjectManager = new DjangoProjectManager();
export default djangoProjectManager;