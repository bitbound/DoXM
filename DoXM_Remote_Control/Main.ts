import { app, BrowserWindow, screen, session, ipcMain } from "electron";
import * as Logger from "./Services/Logger";

global["TargetHost"] = "my.doxm.app";
global["Proxy"] = "";
global["ServiceID"] = "";

var args = processArgs()
var mainWindow: BrowserWindow;

function createNormalPage() {
    global["Mode"] = "Normal";
    mainWindow = new BrowserWindow({
        width: 475,
        height: 475,
        minHeight: 475,
        minWidth: 475,
        show: false,
        icon: __dirname + '/Assets/DoXM_Icon_Transparent.png'
    });
    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadURL(__dirname + '/Pages/NormalPage.html');
    mainWindow.show();
    setSessionHeaders(mainWindow.webContents.session);
}
function createUnattendedPage(mode: string) {
    if (mode.toLowerCase() == "unattended") {
        global["Mode"] = "Unattended";
    }
    else if (mode.toLowerCase() == "desktopswitch") {
        global["Mode"] = "DesktopSwitch";
    }
    global["RequesterID"] = args["requester"];
    global["ServiceID"] = args["serviceid"];
    global["Desktop"] = args["desktop"];
    global["ViewerIDs"] = args["viewers"];

    var windowWidth = 80;
    var windowHeight = 80;
    mainWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        backgroundColor: "black",
        alwaysOnTop: true,
        autoHideMenuBar: true,
        resizable: false,
        titleBarStyle: "hidden",
        show: false,
        icon: __dirname + '/Assets/DoXM_Icon_Transparent.png',
        frame: false
    });
    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadURL('file://' + __dirname + '/Pages/UnattendedPage.html');
    mainWindow.show();
    setSessionHeaders(mainWindow.webContents.session);

    var currentScreen = screen.getDisplayMatching(mainWindow.getBounds());
    mainWindow.setPosition(currentScreen.workArea.width - windowWidth, currentScreen.workArea.height - windowHeight);
}
function createWindow() {
    if (args["proxy"]) {
        global["Proxy"] = args["proxy"];
    }
    if (args["mode"]) {
        createUnattendedPage(args["mode"]);
    }
    else {
        createNormalPage();
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

}
function processArgs() {
    var argDict = {};
    var argsStartIndex = process.argv.findIndex(x => x.startsWith("-"));
    for (var i = argsStartIndex; i < process.argv.length; i += 2) {
        var key = process.argv[i];
        if (key) {
            key = key.trim().replace("-", "").toLowerCase();
            var value = process.argv[i + 1];
            if (value) {
                argDict[key] = process.argv[i + 1].trim();
            }

        }
    }
    return argDict;
}

ipcMain.on("SetIceConfiguration", (ev, iceConfiguration) => {
    global["IceConfiguration"] = iceConfiguration;
    ev.returnValue = "";
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('ready', () => {
    setSessionHeaders(session.defaultSession);
    createWindow();
});
app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (this.MainWindow == null) {
        createWindow();
    }
})
function setSessionHeaders(currentSession: Electron.Session) {
    currentSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: Object.assign(details.responseHeaders, {
                'Content-Security-Policy': [`default-src 'self' 'unsafe-inline' https://${global["TargetHost"]} wss://${global["TargetHost"]};`]
            })
        })
    })
}


