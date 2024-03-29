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

$Root = (Get-Item -Path $PSScriptRoot).Parent.FullName
Set-Location -Path $Root

$VersionString = git show -s --format=%ci
$VersionDate = [DateTimeOffset]::Parse($VersionString)

$Year = $VersionDate.Year.ToString()
$Month = $VersionDate.Month.ToString().PadLeft(2, "0")
$Day = $VersionDate.Day.ToString().PadLeft(2, "0")
$Hour = $VersionDate.Hour.ToString().PadLeft(2, "0")
$Minute = $VersionDate.Minute.ToString().PadLeft(2, "0")
$CurrentVersion = "$Year.$Month.$Day"

# Clear publish folders.
if ((Test-Path -Path "$Root\DoXM_Client\bin\publish\win10-x64") -eq $true) {
	Get-ChildItem -Path "$Root\DoXM_Client\bin\publish\win10-x64" | Remove-Item -Force -Recurse
}
if ((Test-Path -Path  "$Root\DoXM_Client\bin\publish\win10-x86" ) -eq $true) {
	Get-ChildItem -Path  "$Root\DoXM_Client\bin\publish\win10-x86" | Remove-Item -Force -Recurse
}
if ((Test-Path -Path "$Root\DoXM_Client\bin\publish\linux-x64") -eq $true) {
	Get-ChildItem -Path "$Root\DoXM_Client\bin\publish\linux-x64" | Remove-Item -Force -Recurse
}


# Publish Core clients.
Write-Host "Building dotnet clients."
dotnet publish /p:Version=$CurrentVersion /p:FileVersion=$CurrentVersion --runtime win10-x64 --configuration Release --output "$Root\DoXM_Client\bin\publish\win10-x64" "$Root\DoXM_Client"
dotnet publish /p:Version=$CurrentVersion /p:FileVersion=$CurrentVersion --runtime win10-x86 --configuration Release --output "$Root\DoXM_Client\bin\publish\win10-x86" "$Root\DoXM_Client"
dotnet publish /p:Version=$CurrentVersion /p:FileVersion=$CurrentVersion --runtime linux-x64 --configuration Release --output "$Root\DoXM_Client\bin\publish\linux-x64" "$Root\DoXM_Client"

# Compress Core clients.
Compress-Archive -Path "$Root\DoXM_Client\bin\publish\win10-x64\*" -DestinationPath "$Root\DoXM_Server\wwwroot\Downloads\DoXM-Win10-x64.zip" -CompressionLevel Optimal -Force
Compress-Archive -Path "$Root\DoXM_Client\bin\publish\win10-x86\*" -DestinationPath "$Root\DoXM_Server\wwwroot\Downloads\DoXM-Win10-x86.zip" -CompressionLevel Optimal -Force
Compress-Archive -Path "$Root\DoXM_Client\bin\publish\linux-x64\*" -DestinationPath "$Root\DoXM_Server\wwwroot\Downloads\DoXM-Linux.zip" -CompressionLevel Optimal -Force

# Build remote control clients.
Write-Host "Building remote control clients."
Push-Location -Path "$Root\DoXM_Remote_Control\"

npm install

if ((Test-Path -Path "dist") -eq $false)
{
	New-Item -Path "dist" -ItemType Directory
}

Replace-LineInFile -FilePath "Main.ts" -MatchPattern "global[`"TargetHost`"] =" -ReplaceLineWith "global[`"TargetHost`"] = `"$HostName`";" -MaxCount 1
npm run tsc

$Package = Get-Content ".\package.json" | ConvertFrom-Json
$Package.version = "$Year.$Month.$Day"
$Package | ConvertTo-Json | Out-File -FilePath ".\package.json" -Encoding ascii
   

Get-Item -Path ".\dist\*" | Where-Object { $_.Name -ilike "*.exe*" } | Remove-Item -Force
npm run --openssl_fips='' build-x86
Get-Item -Path ".\dist\*" | Where-Object { $_.Name -ilike "*.exe*" }| Rename-Item -NewName "DoXM_Remote_Control_x86.exe" -Force
Pop-Location
Move-Item -Path "$Root\DoXM_Remote_Control\dist\DoXM_Remote_Control_x86.exe" -Destination "$Root\DoXM_Server\wwwroot\Downloads\DoXM_Remote_Control_x86.exe" -Force
Get-ChildItem -Path "$Root\DoXM_Remote_Control\dist\win-ia32-unpacked\" | ForEach-Object {
    Compress-Archive -Path $_.FullName -DestinationPath "$Root\DoXM_Server\wwwroot\Downloads\RC-Winx86.zip" -Update
}


<#
Push-Location -Path "$Root\DoXM_Remote_Control\"
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
Move-Item -Path "$Root\DoXM_Remote_Control\dist\DoXM_Remote_Control.appimage" -Destination "$Root\DoXM_Server\wwwroot\Downloads\DoXM_Remote_Control.appimage" -Force
Get-ChildItem -Path "$Root\DoXM_Remote_Control\dist\linux-unpacked\" | ForEach-Object {
    Compress-Archive -Path $_.FullName -DestinationPath "$Root\DoXM_Server\wwwroot\Downloads\RC-Linux.zip" -Update
}
#>

Push-Location -Path "$Root\DoXM_Remote_Control\"
Get-Item -Path ".\dist\*" | Where-Object { $_.Name -ilike "*.exe*" } | Remove-Item -Force
npm run --openssl_fips='' build-x64
Get-Item -Path ".\dist\*" | Where-Object { $_.Name -ilike "*.exe*" } | Rename-Item -NewName "DoXM_Remote_Control.exe" -Force
Replace-LineInFile -FilePath "Main.ts" -MatchPattern "global[`"TargetHost`"] =" -ReplaceLineWith "global[`"TargetHost`"] = `"`";" -MaxCount 1
Pop-Location
Move-Item -Path "$Root\DoXM_Remote_Control\dist\DoXM_Remote_Control.exe" -Destination "$Root\DoXM_Server\wwwroot\Downloads\DoXM_Remote_Control.exe" -Force
Get-ChildItem -Path "$Root\DoXM_Remote_Control\dist\win-unpacked\" | ForEach-Object {
    Compress-Archive -Path $_.FullName -DestinationPath "$Root\DoXM_Server\wwwroot\Downloads\RC-Winx64.zip" -Update
}

if ($RID.Length -gt 0 -and $OutDir.Length -gt 0) {
    if ((Test-Path -Path $OutDir) -eq $false){
        New-Item -Path $OutDir -ItemType Directory
    }
    Push-Location -Path "$Root\DoXM_Server\"
    dotnet publish /p:Version=$CurrentVersion /p:FileVersion=$CurrentVersion --runtime $RID --configuration Release --output $OutDir
    Pop-Location
}
