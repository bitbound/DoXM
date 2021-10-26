<#
.SYNOPSIS
   Publishes the DoXM client.
.DESCRIPTION
   Publishes the DoXM client.
   For automated deployments, supply the following arguments: -hostname example.com -rid win10-x64 -outdir path\to\dir
.COPYRIGHT
   Copyright ©  2018 Translucency Software.  All rights reserved.
.EXAMPLE
   Run it from the Utilities folder (located in the solution directory).
   Or run "powershell -f PublishClients.ps1 -hostname example.com -rid win10-x64 -outdir path\to\dir
#>

param (
	[string]$OutDir = "",
    # RIDs are described here: https://docs.microsoft.com/en-us/dotnet/core/rid-catalog
	[string]$RID = "",
	[string]$Hostname = "",
	[string]$CertificatePath = "",
    [string]$CertificatePassword = "",
    [string]$CurrentVersion = ""
)


$ErrorActionPreference = "Stop"
$Year = (Get-Date).Year.ToString()
$Month = (Get-Date).Month.ToString().PadLeft(2, "0")
$Day = (Get-Date).Day.ToString().PadLeft(2, "0")
$Hour = (Get-Date).Hour.ToString().PadLeft(2, "0")
$Minute = (Get-Date).Minute.ToString().PadLeft(2, "0")
$CurrentVersion = "$Year.$Month.$Day.$Hour$Minute"


function Replace-LineInFile($FilePath, $MatchPattern, $ReplaceLineWith, $MaxCount = -1){
    [string[]]$Content = Get-Content -Path $FilePath
    $Count = 0
    for ($i = 0; $i -lt $Content.Length; $i++)
    {
        if ($Content[$i] -ne $null -and $Content[$i].Contains($MatchPattern)) {
            $Content[$i] = $ReplaceLineWith
            $Count++
        }
        if ($MaxCount -gt 0 -and $Count -ge $MaxCount) {
            break
        }
    }
    ($Content | Out-String).Trim() | Out-File -FilePath $FilePath -Force -Encoding utf8
}

Set-Location -Path (Get-Item -Path $PSScriptRoot).Parent.FullName

# Clear publish folders.
if ((Test-Path -Path ".\DoXM_Client\bin\publish\win10-x64") -eq $true) {
	Get-ChildItem -Path ".\DoXM_Client\bin\publish\win10-x64" | Remove-Item -Force -Recurse
}
if ((Test-Path -Path  ".\DoXM_Client\bin\publish\win10-x86" ) -eq $true) {
	Get-ChildItem -Path  ".\DoXM_Client\bin\publish\win10-x86" | Remove-Item -Force -Recurse
}
if ((Test-Path -Path ".\DoXM_Client\bin\publish\linux-x64") -eq $true) {
	Get-ChildItem -Path ".\DoXM_Client\bin\publish\linux-x64" | Remove-Item -Force -Recurse
}

Push-Location -Path ".\DoXM_Client"

# Publish Core clients.
dotnet publish /p:Version=$CurrentVersion /p:FileVersion=$CurrentVersion --runtime win10-x64 --configuration Release
dotnet publish /p:Version=$CurrentVersion /p:FileVersion=$CurrentVersion --runtime win10-x86 --configuration Release
dotnet publish /p:Version=$CurrentVersion /p:FileVersion=$CurrentVersion --runtime linux-x64 --configuration Release

Pop-Location

# Compress Core clients.
Push-Location -Path ".\DoXM_Client\bin\publish\win10-x64"
Compress-Archive -Path ".\*" -DestinationPath "DoXM-Win10-x64.zip" -CompressionLevel Optimal -Force
while ((Test-Path -Path ".\DoXM-Win10-x64.zip") -eq $false){
    Start-Sleep -Seconds 1
}
Pop-Location
Move-Item -Path ".\DoXM_Client\bin\publish\win10-x64\DoXM-Win10-x64.zip" -Destination ".\DoXM_Server\wwwroot\Downloads\DoXM-Win10-x64.zip" -Force

Push-Location -Path ".\DoXM_Client\bin\publish\win10-x86"
Compress-Archive -Path ".\*" -DestinationPath "DoXM-Win10-x86.zip" -CompressionLevel Optimal -Force
while ((Test-Path -Path ".\DoXM-Win10-x86.zip") -eq $false){
    Start-Sleep -Seconds 1
}
Pop-Location
Move-Item -Path ".\DoXM_Client\bin\publish\win10-x86\DoXM-Win10-x86.zip" -Destination ".\DoXM_Server\wwwroot\Downloads\DoXM-Win10-x86.zip" -Force

Push-Location -Path ".\DoXM_Client\bin\publish\linux-x64"
Compress-Archive -Path ".\*" -DestinationPath "DoXM-Linux.zip" -CompressionLevel Optimal -Force
while ((Test-Path -Path ".\DoXM-Linux.zip") -eq $false){
    Start-Sleep -Seconds 1
}
Pop-Location
Move-Item -Path ".\DoXM_Client\bin\publish\linux-x64\DoXM-Linux.zip" -Destination ".\DoXM_Server\wwwroot\Downloads\DoXM-Linux.zip" -Force

# Build remote control clients.
Push-Location -Path ".\DoXM_Remote_Control\"

npm install

if ((Test-Path -Path "dist") -eq $false)
{
	New-Item -Path "dist" -ItemType Directory
}

Replace-LineInFile -FilePath "Main.ts" -MatchPattern "global[`"TargetHost`"] =" -ReplaceLineWith "global[`"TargetHost`"] = `"$HostName`";" -MaxCount 1
tsc

$Package = Get-Content ".\package.json" | ConvertFrom-Json
$Package.version = "$Year.$Month.$Day"
$Package | ConvertTo-Json | Out-File -FilePath ".\package.json" -Encoding ascii
   

Get-Item -Path ".\dist\*" | Where-Object { $_.Name -ilike "*.exe*" } | Remove-Item -Force
build --win --ia32
Get-Item -Path ".\dist\*" | Where-Object { $_.Name -ilike "*.exe*" }| Rename-Item -NewName "DoXM_Remote_Control_x86.exe" -Force
Pop-Location
Move-Item -Path ".\DoXM_Remote_Control\dist\DoXM_Remote_Control_x86.exe" -Destination ".\DoXM_Server\wwwroot\Downloads\DoXM_Remote_Control_x86.exe" -Force
Get-ChildItem -Path ".\DoXM_Remote_Control\dist\win-ia32-unpacked\" | ForEach-Object {
    Compress-Archive -Path $_.FullName -DestinationPath ".\DoXM_Server\wwwroot\Downloads\RC-Winx86.zip" -Update
}


Push-Location -Path ".\DoXM_Remote_Control\"
Get-Item -Path ".\dist\*" | Where-Object { $_.Name -ilike "*appimage*" } | Remove-Item -Force

# This global variable would be true if running PowerShell Core on Linux.
if ($IsLinux) {
    build
}
else {
    bash -c build
}

Get-Item -Path ".\dist\*" | Where-Object { $_.Name -ilike "*.appimage*" } | Rename-Item -NewName "DoXM_Remote_Control.appimage" -Force
Pop-Location
Move-Item -Path ".\DoXM_Remote_Control\dist\DoXM_Remote_Control.appimage" -Destination ".\DoXM_Server\wwwroot\Downloads\DoXM_Remote_Control.appimage" -Force
Get-ChildItem -Path ".\DoXM_Remote_Control\dist\linux-unpacked\" | ForEach-Object {
    Compress-Archive -Path $_.FullName -DestinationPath ".\DoXM_Server\wwwroot\Downloads\RC-Linux.zip" -Update
}


Push-Location -Path ".\DoXM_Remote_Control\"
Get-Item -Path ".\dist\*" | Where-Object { $_.Name -ilike "*.exe*" } | Remove-Item -Force
build --win --x64
Get-Item -Path ".\dist\*" | Where-Object { $_.Name -ilike "*.exe*" } | Rename-Item -NewName "DoXM_Remote_Control.exe" -Force
Replace-LineInFile -FilePath "Main.ts" -MatchPattern "global[`"TargetHost`"] =" -ReplaceLineWith "global[`"TargetHost`"] = `"`";" -MaxCount 1
Pop-Location
Move-Item -Path ".\DoXM_Remote_Control\dist\DoXM_Remote_Control.exe" -Destination ".\DoXM_Server\wwwroot\Downloads\DoXM_Remote_Control.exe" -Force
Get-ChildItem -Path ".\DoXM_Remote_Control\dist\win-unpacked\" | ForEach-Object {
    Compress-Archive -Path $_.FullName -DestinationPath ".\DoXM_Server\wwwroot\Downloads\RC-Winx64.zip" -Update
}

if ($RID.Length -gt 0 -and $OutDir.Length -gt 0) {
    if ((Test-Path -Path $OutDir) -eq $false){
        New-Item -Path $OutDir -ItemType Directory
    }
    Push-Location -Path ".\DoXM_Server\"
    dotnet publish /p:Version=$CurrentVersion /p:FileVersion=$CurrentVersion --runtime $RID --configuration Release --output $OutDir
    Pop-Location
}
