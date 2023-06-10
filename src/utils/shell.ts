import * as cp from 'child_process';
import { spawn, SpawnOptions } from 'child_process';

export default function executeShellCommand(command: string, args: string[], options?: SpawnOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const childProcess: cp.ChildProcess = spawn(command, args, {...options});

    let output = '';

    childProcess.stdout?.on('data', (data) => {
      output += data;
    });

    childProcess.stderr?.on('data', (data) => {
      // You can choose to reject the promise on error if desired
      // For now, we'll append the error data to the output
      output += data;
    });

    childProcess.on('error', (error) => {
      // Reject the promise if an error occurs
      reject(error);
    });

    childProcess.on('close', (code) => {
      if (code !== 0) {
        // Reject the promise if the command exits with a non-zero code
        reject(new Error(`Command '${command}' failed with code ${code}`));
      } else {
        // Resolve the promise with the output
        resolve(output);
      }
    });
  });
}
