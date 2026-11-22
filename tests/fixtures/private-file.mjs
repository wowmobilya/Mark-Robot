import assert from 'node:assert/strict';
import {stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';

export async function assertPrivateFile(file){
 if(process.platform!=='win32'){
   assert.equal((await stat(file)).mode&0o777,0o600);
   return;
 }
 const shell=path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe');
 execFileSync(shell,['-NoProfile','-NonInteractive','-Command',`
   $ErrorActionPreference='Stop'
   $acl=[System.IO.File]::GetAccessControl($env:WOW_PRIVATE_OUTPUT)
   $sid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User
   $rules=$acl.GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier])
   if (!$acl.AreAccessRulesProtected -or $rules.Count -ne 1 -or $rules[0].IdentityReference -ne $sid -or $rules[0].AccessControlType -ne 'Allow') { exit 1 }
 `],{env:{...process.env,WOW_PRIVATE_OUTPUT:file},windowsHide:true});
}
