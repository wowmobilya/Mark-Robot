import {writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import path from 'node:path';

// On Windows the POSIX creation mode does not set access permissions. Supply
// the ACL to CreateNew itself so even the first byte is written owner-only.
const windowsWrite = `
$ErrorActionPreference = 'Stop'
$sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
$acl = [System.Security.AccessControl.FileSecurity]::new()
$acl.SetOwner($sid)
$acl.SetAccessRuleProtection($true, $false)
$acl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($sid, 'FullControl', 'Allow'))
try {
  $file = [System.IO.FileStream]::new($env:WOW_PRIVATE_OUTPUT, 'CreateNew', [System.Security.AccessControl.FileSystemRights]::Write, 'None', 4096, 'None', $acl)
} catch {
  $reason = $_.Exception.GetBaseException().HResult -band 65535
  if ($reason -in 80,183) { exit 17 }
  exit 1
}
try { [Console]::OpenStandardInput().CopyTo($file) } finally { $file.Dispose() }
`;

export async function writePrivateFile(filename, data){
 if(process.platform!=='win32')return writeFile(filename,data,{flag:'wx',mode:0o600});
 const shell=path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe');
 await new Promise((resolve,reject)=>{
   const child=execFile(shell,['-NoLogo','-NoProfile','-NonInteractive','-Command',windowsWrite],{
     windowsHide:true,env:{...process.env,WOW_PRIVATE_OUTPUT:filename}
   },error=>{
     if(!error)return resolve();
     if(error.code===17)return reject(Object.assign(Error('EEXIST'),{code:'EEXIST'}));
     reject(Error('PRIVATE_FILE_WRITE_FAILED'));
   });
   child.stdin.on('error',error=>{if(error.code!=='EPIPE'&&error.code!=='EOF')reject(error);});
   child.stdin.end(data);
 });
}
