"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
global["TargetHost"] = "my.doxm.app";
global["Proxy"] = "";
global["ServiceID"] = "";
var args = processArgs();
var mainWindow;
function createNormalPage() {
    global["Mode"] = "Normal";
    mainWindow = new electron_1.BrowserWindow({
        width: 475,
        height: 475,
        minHeight: 475,
        minWidth: 475,
        show: false,
        icon: __dirname + '/Assets/DoXM_Icon_Transparent.png'
    });
    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadFile(__dirname + '/Pages/NormalPage.html');
    mainWindow.show();
    setSessionHeaders(mainWindow.webContents.session);
}
function createUnattendedPage(mode) {
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
    mainWindow = new electron_1.BrowserWindow({
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
    mainWindow.loadFile('file://' + __dirname + '/Pages/UnattendedPage.html');
    mainWindow.show();
    setSessionHeaders(mainWindow.webContents.session);
    var currentScreen = electron_1.screen.getDisplayMatching(mainWindow.getBounds());
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
electron_1.ipcMain.on("SetIceConfiguration", (ev, iceConfiguration) => {
    global["IceConfiguration"] = iceConfiguration;
    ev.returnValue = "";
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('ready', () => {
    setSessionHeaders(electron_1.session.defaultSession);
    createWindow();
});
electron_1.app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (this.MainWindow == null) {
        createWindow();
    }
});
function setSessionHeaders(currentSession) {
    currentSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: Object.assign(details.responseHeaders, {
                'Content-Security-Policy': [`default-src 'self' 'unsafe-inline' https://${global["TargetHost"]} wss://${global["TargetHost"]};`]
            })
        });
    });
}
//# sourceMappingURL=Main.js.map