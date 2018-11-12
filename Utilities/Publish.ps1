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
$ErrorActionPreference = "Stop"
$Year = (Get-Date).Year.ToString()
$Month = (Get-Date).Month.ToString().PadLeft(2, "0")
$Day = (Get-Date).Day.ToString().PadLeft(2, "0")
$Hour = (Get-Date).Hour.ToString().PadLeft(2, "0")
$Minute = (Get-Date).Minute.ToString().PadLeft(2, "0")
$CurrentVersion = "$Year.$Month.$Day.$Hour$Minute"
$ArgList = New-Object -TypeName System.Collections.ArrayList
$HostName = ""
$OutDir = ""
# RIDs are described here: https://docs.microsoft.com/en-us/dotnet/core/rid-catalog
$RID = ""


function Replace-LineInFile($FilePath, $MatchPattern, $ReplaceLineWith){
    [string[]]$Content = Get-Content -Path $FilePath
    for ($i = 0; $i -lt $Content.Length; $i++)
    { 
        if ($Content[$i] -ne $null -and $Content[$i].Contains($MatchPattern)) {
            $Content[$i] = $ReplaceLineWith
        }
    }
    $Content | Out-String | Out-File -FilePath $FilePath -Force -Encoding utf8
}

if ($args.Count -eq 0){
    $Options = Read-Host "Select Args: [C]ore, [R]emote Control, and/or [S]erver?"
    foreach ($option in $Options.Split(",")){
        $ArgList.Add($option.ToLower().Trim())
    }
    if ([string]::IsNullOrWhiteSpace($HostName)) {
        $HostName = Read-Host "Host Name"
    }

    if ($ArgList.Contains("s")){
        if ([string]::IsNullOrWhiteSpace($OutDir)) {
            $OutDir = Read-Host "Server Out Dir"
        }
        if ([string]::IsNullOrWhiteSpace($RID)) {
            $RID = Read-Host "Server Runtime ID"
        }
    }
}
else {
    $ArgList.Add("c")
    $ArgList.Add("r")
    $ArgList.Add("s")
    for ($i = 0; $i -lt $args.Count; $i++)
    { 
        $arg = $args[$i].ToString().ToLower()
        if ($arg.Contains("hostname")){
            $HostName = $args[$i+1]
        }
        elseif ($arg.Contains("outdir")){
            $OutDir = $args[$i+1]
        }
        elseif ($arg.Contains("rid")){
            $RID = $args[$i+1]
        }
    }
}

Set-Location -Path (Get-Item -Path $MyInvocation.MyCommand.Source).Directory.Parent.FullName

git pull

if ($ArgList.Contains("c")) {
    # Clear publish folders.
	if ((Test-Path -Path ".\DoXM_Client\bin\Release\netcoreapp2.1\win10-x64\publish") -eq $true) {
		Get-ChildItem -Path ".\DoXM_Client\bin\Release\netcoreapp2.1\win10-x64\publish" | Remove-Item -Force -Recurse
	}
	if ((Test-Path -Path  ".\DoXM_Client\bin\Release\netcoreapp2.1\win10-x86\publish" ) -eq $true) {
		Get-ChildItem -Path  ".\DoXM_Client\bin\Release\netcoreapp2.1\win10-x86\publish" | Remove-Item -Force -Recurse
	}
	if ((Test-Path -Path ".\DoXM_Client\bin\Release\netcoreapp2.1\linux-x64\publish") -eq $true) {
		Get-ChildItem -Path ".\DoXM_Client\bin\Release\netcoreapp2.1\linux-x64\publish" | Remove-Item -Force -Recurse
	}

    Push-Location -Path ".\DoXM_Client"

    # Publish Core clients.
    dotnet publish /p:Version=$CurrentVersion /p:FileVersion=$CurrentVersion --runtime win10-x64 --configuration Release
    dotnet publish /p:Version=$CurrentVersion /p:FileVersion=$CurrentVersion --runtime win10-x86 --configuration Release
    dotnet publish /p:Version=$CurrentVersion /p:FileVersion=$CurrentVersion --runtime linux-x64 --configuration Release

    Pop-Location

    # Compress Core clients.
    Push-Location -Path ".\DoXM_Client\bin\Release\netcoreapp2.1\win10-x64\publish"
    Compress-Archive -Path ".\*" -DestinationPath "DoXM-win10-x64.zip" -CompressionLevel Optimal -Force
    while ((Test-Path -Path ".\DoXM-win10-x64.zip") -eq $false){
        Start-Sleep -Seconds 1
    }
    Pop-Location
    Move-Item -Path ".\DoXM_Client\bin\Release\netcoreapp2.1\win10-x64\publish\DoXM-win10-x64.zip" -Destination ".\DoXM_Server\wwwroot\Downloads\DoXM-win10-x64.zip" -Force

    Push-Location -Path ".\DoXM_Client\bin\Release\netcoreapp2.1\win10-x86\publish"
    Compress-Archive -Path ".\*" -DestinationPath "DoXM-win10-x86.zip" -CompressionLevel Optimal -Force
    while ((Test-Path -Path ".\DoXM-win10-x86.zip") -eq $false){
        Start-Sleep -Seconds 1
    }
    Pop-Location
    Move-Item -Path ".\DoXM_Client\bin\Release\netcoreapp2.1\win10-x86\publish\DoXM-win10-x86.zip" -Destination ".\DoXM_Server\wwwroot\Downloads\DoXM-win10-x86.zip" -Force

    Push-Location -Path ".\DoXM_Client\bin\Release\netcoreapp2.1\linux-x64\publish"
    Compress-Archive -Path ".\*" -DestinationPath "DoXM-linux.zip" -CompressionLevel Optimal -Force
    while ((Test-Path -Path ".\DoXM-linux.zip") -eq $false){
        Start-Sleep -Seconds 1
    }
    Pop-Location
    Move-Item -Path ".\DoXM_Client\bin\Release\netcoreapp2.1\linux-x64\publish\DoXM-linux.zip" -Destination ".\DoXM_Server\wwwroot\Downloads\DoXM-linux.zip" -Force

}

if ($ArgList.Contains("r")) {
    # Build remote control clients.
    Push-Location -Path ".\DoXM_Remote_Control\"

    Replace-LineInFile -FilePath "Main.ts" -MatchPattern "global[`"TargetHost`"] =" -ReplaceLineWith "global[`"TargetHost`"] = `"$HostName`";"
    tsc

    $Package = Get-Content ".\package.json" | ConvertFrom-Json
    $Package.version = "$Year.$Month.$Day"
    $Package | ConvertTo-Json | Out-File -FilePath ".\package.json" -Encoding ascii
   

    Get-Item -Path ".\dist\*.exe" | Remove-Item -Force
    build --win --ia32
    Get-Item -Path ".\dist\*.exe" | Rename-Item -NewName "DoXM_Remote_Control_x86.exe" -Force
    Pop-Location
    Move-Item -Path ".\DoXM_Remote_Control\dist\DoXM_Remote_Control_x86.exe" -Destination ".\DoXM_Server\wwwroot\Downloads\DoXM_Remote_Control_x86.exe" -Force
    Get-ChildItem -Path ".\DoXM_Remote_Control\dist\win-ia32-unpacked\" | ForEach-Object {
        Compress-Archive -Path $_.FullName -DestinationPath ".\DoXM_Server\wwwroot\Downloads\RC-Winx86.zip" -Update
    }


    Push-Location -Path ".\DoXM_Remote_Control\"
    Get-Item -Path ".\dist\*.appimage" | Remove-Item -Force
    bash -c "build --linux"
    Get-Item -Path ".\dist\*.appimage" | Rename-Item -NewName "DoXM_Remote_Control.appimage" -Force
    Pop-Location
    Move-Item -Path ".\DoXM_Remote_Control\dist\DoXM_Remote_Control.appimage" -Destination ".\DoXM_Server\wwwroot\Downloads\DoXM_Remote_Control.appimage" -Force
    Get-ChildItem -Path ".\DoXM_Remote_Control\dist\linux-unpacked\" | ForEach-Object {
        Compress-Archive -Path $_.FullName -DestinationPath ".\DoXM_Server\wwwroot\Downloads\RC-Linux.zip" -Update
    }

    Push-Location -Path ".\DoXM_Remote_Control\"
    Get-Item -Path ".\dist\*.exe" | Remove-Item -Force
    build --win --x64
    Get-Item -Path ".\dist\*.exe" | Rename-Item -NewName "DoXM_Remote_Control.exe" -Force
    Pop-Location
    Move-Item -Path ".\DoXM_Remote_Control\dist\DoXM_Remote_Control.exe" -Destination ".\DoXM_Server\wwwroot\Downloads\DoXM_Remote_Control.exe" -Force
    Get-ChildItem -Path ".\DoXM_Remote_Control\dist\win-unpacked\" | ForEach-Object {
        Compress-Archive -Path $_.FullName -DestinationPath ".\DoXM_Server\wwwroot\Downloads\RC-Winx64.zip" -Update
    }

}

if ($ArgList.Contains("s") -and $OutDir.Length -gt 0 -and (Test-Path -Path $OutDir) -eq $true) {
    Push-Location -Path ".\DoXM_Server\"
    dotnet publish /p:Version=$CurrentVersion /p:FileVersion=$CurrentVersion --runtime $RID --configuration Release --output $OutDir
    Pop-Location
}