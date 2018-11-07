using DoXM_Library.Services;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Management.Automation;
using System.Text;

namespace DoXM_Client.Services
{
    public class Uninstaller
    {
        public static void UninstallClient()
        {
            if (OSUtils.IsWindows)
            {
                Process.Start("cmd.exe", "/c sc delete DoXM_Service");
                var tempFilePath = Path.Combine(Path.GetTempPath(), Path.GetTempFileName()) + ".ps1";
                var currentDir = AppDomain.CurrentDomain.BaseDirectory;
                var ps = PowerShell.Create();
                ps.AddScript($@"
                            $Success = $false;
                            $Count = 0;
                            while ((Test-Path ""{currentDir}"") -eq $true -and $Count -lt 10) {{
                                try {{
                                    Get-Process -Name DoXM_Client | Stop-Process -Force; 
                                    Start-Sleep -Seconds 3;
                                    Remove-Item ""{currentDir}"" -Force -Recurse;
                                    $Count++;
                                    continue;
                                }}
                                catch{{
                                    continue;
                                }}
                            }}
                        ");
                ps.Invoke();
            }
        }
    }
}
