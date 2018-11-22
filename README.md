# DoXM
A remote control and remote scripting solution, built with .NET Core, Electron, and WebRTC.

Website: https://doxm.app  
Public Server: https://my.doxm.app

## Pre-Built Server
The build environment for all of DoXM's parts is rather complex and sometimes difficult to get working correctly.  If you'd prefer an easier setup, you can download a prebuilt server package from the DoXM website.

The only catch is that the hostname will need to be typed into remote control client for every user the first time it's used.  That's because the target hostname isn't hard-coded into the app, and it needs to be told where to connect.

* Download the a pre-built package.
    * Windows: https://doxm.app/Downloads/DoXM_Server_Win-x64.zip
    * Linux: https://doxm.app/Downloads/DoXM_Server_Linux-x64.zip
* Unzip the files and put them on your web server.
* Deploy a TURN server (instructions below).
* Change values in appsettings.json for your environment.

## Build Instructions (Windows 10)  
The following steps will configure your Windows 10 machine for building the DoXM server and clients.
* Install .NET Core SDK.
    * Here: https://www.microsoft.com/net/download
    * Or here: https://dot.net/v1/dotnet-install.ps1
* Install Node.js v10.2.0
    * https://nodejs.org/download/release/v10.2.0/
* Install Electron Builder globally with NPM.
    * npm install -g electron-builder
* Install Windows Build Tools globally with NPM.
    * npm install -g windows-build-tools
* Install Python 2.7.x.
    * https://www.python.org/downloads/ 
* Install Ubuntu WSL (Windows Subsystem for Linux).
    * https://docs.microsoft.com/en-us/windows/wsl/install-win10
    * In WSL, install the same prerequisites as in Setup_Ubuntu_Builder.sh.
    * This is required to build the Linux version of the remote control client.
* Run Publish.ps1 in the Utilities folder.
    * The output folder will now contain the server with the clients in the Downloads folder.
    * Change values in appsettings.json for your environment.
    * Documentation for hosting in IIS can be found here: https://docs.microsoft.com/en-us/aspnet/core/host-and-deploy/iis/index?view=aspnetcore-2.1

## Build Instructions (Linux)
See Setup_Ubuntu_Builder.sh and DoXM_Server_Install.sh in Utilities.

## TURN Server  
A TURN server is required for remote control.

### Windows
* Download the latest release of Pion TURN from https://github.com/pions/turn/releases.
* Change the variables in Register-TURNServer.ps1 in the Utilities folder.
* Run the script to register the start-up job.
* Add the TURN user credentials to the DoXM server's appsettings.json, under IceConfiguration.

### Linux
* Set up an Ubuntu server.  This will be the TURN server (using Coturn).
    * Run TURN_Install.sh with sudo, passing in necessary arguments.
    * Add the TURN user credentials to the DoXM server's appsettings.json, under IceConfiguration.
    * More documentation can be found at the Coturn project repo: https://github.com/coturn/coturn
