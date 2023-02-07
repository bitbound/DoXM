﻿<#
.SYNOPSIS
   Installs the DoXM Client.
.DESCRIPTION
   Do not modify this script.  It was generated specifically for your account.
.EXAMPLE
   powershell.exe -f Install-Win10-x64.ps1
#>

[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
$LogPath = "$env:TEMP\DoXM_Install.txt"
[string]$HostName = $null
[string]$Organization = $null
$ConnectionInfo = $null
$ArgList = New-Object System.Collections.ArrayList
foreach ($arg in $args){
	$ArgList.Add($arg.ToLower()) | Out-Null
}
$InstallPath = "$env:ProgramFiles\DoXM"

function Write-Log($Message){
	Write-Host $Message
	"$((Get-Date).ToString()) - $Message" | Out-File -FilePath $LogPath -Append
}
function Do-Exit(){
	Write-Host "Exiting..."
	Start-Sleep -Seconds 3
	exit
}
function Is-Administrator() {
    $Identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $Principal = New-Object System.Security.Principal.WindowsPrincipal -ArgumentList $Identity
    return $Principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
} 

function Run-StartupChecks {
	if ([System.Environment]::Is64BitOperatingSystem -eq $false){
		Write-Log -Message "This script is for 64-bit operating systems.  Use the x86 (32-bit) install script on this machine."
		Do-Exit
	}
	if ([System.Environment]::Is64BitProcess -eq $false) {
        Write-Log -Message "You must run the script from the 64-bit version of PowerShell."
        Do-Exit
    }
	if ($HostName -eq $null -or $Organization -eq $null) {
		Write-Log "Required parameters are missing.  Please try downloading the installer again."
		Do-Exit
	}

	if ((Is-Administrator) -eq $false) {
		Write-Log -Message "Install script requires elevation.  Attempting to self-elevate..."
		Start-Sleep -Seconds 3
		$param = "-f `"$($MyInvocation.ScriptName)`""
		foreach ($arg in $ArgList){
			$param += " $arg"
		}
		Start-Process -FilePath powershell.exe -ArgumentList "$param" -Verb RunAs
		exit
	}
}

function Uninstall-DoXM {
	Start-Process -FilePath "cmd.exe" -ArgumentList "/c sc delete DoXM_Service" -Wait  -WindowStyle Hidden
	Stop-Process -Name DoXM_Client -Force -ErrorAction SilentlyContinue
	Remove-Item -Path $InstallPath -Force -Recurse -ErrorAction SilentlyContinue
}

function Install-DoXM {
	if ((Test-Path -Path "$InstallPath") -eq $true){
		if ((Test-Path -Path "$InstallPath\ConnectionInfo.json") -eq $true){
			$ConnectionInfo = Get-Content -Path "$InstallPath\ConnectionInfo.json" | ConvertFrom-Json
			if ($ConnectionInfo -ne $null) {
				$ConnectionInfo.Host = $HostName
				$ConnectionInfo.OrganizationID = $Organization
				$ConnectionInfo.ServerVerificationToken = ""
			}
		
		}
	}
	else {
		New-Item -ItemType Directory -Path "$InstallPath" -Force
	}

	if ($ConnectionInfo -eq $null) {
		$ConnectionInfo = @{
			MachineID = (New-Guid).ToString();
			Host = $HostName;
			OrganizationID = $Organization;
			ServerVerificationToken = "";
		}
	}

	Start-Process -FilePath "cmd.exe" -ArgumentList "/c sc delete DoXM_Service" -Wait  -WindowStyle Hidden
    Get-Process | Where-Object {$_.Name -like "DoXM_Client"} | Stop-Process -Force
	Get-ChildItem -Path "C:\Program Files\DoXM" | Where-Object {$_.Name -notlike "ConnectionInfo.json"} | Remove-Item -Recurse -Force

	if ($HostName.EndsWith("/")) {
		$HostName = $HostName.Substring(0, $HostName.LastIndexOf("/"))
	}

	if ($ArgList.Contains("-path")) {
		Write-Log "Copying install files..."
		$SourceIndex = $ArgList.IndexOf("-path") + 1
		$SourcePath = $ArgList[$SourceIndex].Replace("`"", "").Replace("'", "")
		Copy-Item -Path $ArgList[$SourceIndex] -Destination "$InstallPath\DoXM-Win10-x64.zip"

	}
	else {
		$ProgressPreference = 'SilentlyContinue'
		Write-Log "Downloading client..."
		Invoke-WebRequest -Uri "$HostName/Downloads/DoXM-Win10-x64.zip" -OutFile "$InstallPath\DoXM-Win10-x64.zip" -UseBasicParsing
		$ProgressPreference = 'Continue'
	}

	Expand-Archive -Path "$InstallPath\DoXM-Win10-x64.zip" -DestinationPath "$InstallPath"  -Force

	New-Item -ItemType File -Path "$InstallPath\ConnectionInfo.json" -Value (ConvertTo-Json -InputObject $ConnectionInfo) -Force

	New-Service -Name "DoXM_Service" -BinaryPathName "$InstallPath\DoXM_Client.exe" -DisplayName "DoXM Service" -StartupType Automatic -Description "Background service that maintains a connection to the DoXM server.  The service is used for remote support and maintenance by this computer's administrators."
	Start-Process -FilePath "cmd.exe" -ArgumentList "/c sc.exe failure `"DoXM_Service`" reset=5 actions=restart/5000" -Wait -WindowStyle Hidden
	Start-Service -Name DoXM_Service
}

try {
	Run-StartupChecks

	if ($ArgList.Contains("-uninstall")) {
		Write-Log "Uninstall started."
		Uninstall-DoXM
		Write-Log "Uninstall completed."
		exit
	}
	else {
		Write-Log "Install started."
		Install-DoXM
		Write-Log "Install completed."
		exit
	}
}
catch {
	Write-Log -Message "Error occurred: $($Error[0].InvocationInfo.PositionMessage)"
	Do-Exit
}
