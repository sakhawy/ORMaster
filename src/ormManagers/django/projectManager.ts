import * as fs from 'fs-extra'
import * as path from 'path'
import djangoEnvironmentManager, { DjangoEnvironmentManager } from './environmentManager'
import executeShellCommand from '../../utils/shell'

export class DjangoProjectManager {
    environmentManager: DjangoEnvironmentManager = djangoEnvironmentManager

    private getInjectionFunction(): string { 
        return `
# THIS FUNCTION MUST RETURN THE SOLUTION QuerySet.
def get_queryset() -> models.QuerySet:
    pass
`
    }

    async createApp(appName: string, hard: boolean = false): Promise<string> {
        const modelsPath = path.join(this.environmentManager.getDjangoPath(), appName, 'models.py')
        if (fs.existsSync(modelsPath) && !hard) {
            return modelsPath
        }

        const pythonBinPath = this.environmentManager.getPythonPath()
        // remove the directory if it exists
        const appPath = path.join(this.environmentManager.getDjangoPath(), appName)

        fs.removeSync(appPath)
        fs.mkdirSync(appPath)

        await executeShellCommand(pythonBinPath, ['-m', 'django', 'startapp', appName, appPath])

        // add the app to the settings.py file
        // check if it's already there
        const settingsPath = path.join(this.environmentManager.getDjangoPath(), 'ormaster', 'settings.py')        
        const settingsFile = fs.readFileSync(settingsPath, 'utf-8')
        
        if (!settingsFile.includes(`'${appName}',`)) {
            const newSettingsFile = settingsFile.replace(
                '\'django.contrib.staticfiles\',', 
                `'django.contrib.staticfiles\',\n    \'${appName}\',`
            )
            fs.writeFileSync(settingsPath, newSettingsFile, 'utf-8')
        }
        

        // append the function to models.py
        const modelsFile = fs.readFileSync(modelsPath, 'utf-8')
        const newModelsFile = modelsFile + this.getInjectionFunction()
        fs.writeFileSync(modelsPath, newModelsFile, 'utf-8')

        return modelsPath
    }

    async runQueryset(appName: string): Promise<string> {
        // makemigrations
        const pythonBinPath = this.environmentManager.getPythonPath()
        const managePath = path.join(this.environmentManager.getDjangoPath(), 'manage.py')
        await executeShellCommand(pythonBinPath, [managePath, 'makemigrations'])

        // migrate
        await executeShellCommand(pythonBinPath, [managePath, 'migrate'])

        // exec the models.py file through the shell
        const modelsPath = path.join(this.environmentManager.getDjangoPath(), appName, 'models.py')

        // inject the django setup script into a temporary file and add models.py to that file then execute the python code in that file
        const ormasterPath = path.join(this.environmentManager.getDjangoPath())
        const injectionScript = `
import sys, os, django
BASE_DIR = r"${ormasterPath}"
sys.path.insert(0, BASE_DIR)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ormaster.settings")
os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"
django.setup()

from ${appName}.models import *

print(str(get_queryset().query).replace('${appName}_', ''))
`        
        const injectionPath = path.join(this.environmentManager.getDjangoPath(), 'injection.py')
        const modelsPathContent = fs.readFileSync(modelsPath, 'utf-8')
        fs.writeFileSync(injectionPath, injectionScript , 'utf-8')

        const sql = await executeShellCommand(pythonBinPath, [managePath, 'shell', '-c', `exec(open(r'${injectionPath}').read())`])
    
        return sql
    }
}

const djangoProjectManager: DjangoProjectManager = new DjangoProjectManager();
export default djangoProjectManager;