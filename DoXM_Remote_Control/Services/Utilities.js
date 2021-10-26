"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StringifyCircular = exports.GetAbsolutePointFromPercents = exports.When = exports.TryUntil = void 0;
const Electron = require("electron");
async function TryUntil(action, rejectCondition) {
    return new Promise((resolve, reject) => {
        var tryAction = () => {
            try {
                action();
                resolve();
            }
            catch (ex) {
                console.log("Error caught in TryUntil:");
                console.log(ex);
                if (rejectCondition) {
                    if (rejectCondition()) {
                        console.error("TryUntil rejected.");
                        reject();
                        return;
                    }
                }
                window.setTimeout(() => {
                    tryAction();
                }, 500);
            }
        };
        tryAction();
    });
}
exports.TryUntil = TryUntil;
async function When(predicate) {
    return new Promise((resolve, reject) => {
        function checkCondition() {
            if (predicate()) {
                resolve();
            }
            else {
                window.setTimeout(() => {
                    checkCondition();
                }, 500);
            }
        }
        checkCondition();
    });
}
exports.When = When;
function GetAbsolutePointFromPercents(percentX, percentY, viewer) {
    var currentScreen = Electron.screen.getAllDisplays()[viewer.CurrentScreenIndex];
    var absoluteX = (currentScreen.bounds.width * percentX) + currentScreen.bounds.x;
    var absoluteY = (currentScreen.bounds.height * percentY) + currentScreen.bounds.y;
    return { x: absoluteX, y: absoluteY };
}
exports.GetAbsolutePointFromPercents = GetAbsolutePointFromPercents;
function StringifyCircular(serializableObject) {
    var tempArray = new Array();
    var jsonString = JSON.stringify(serializableObject, function (key, value) {
        if (typeof value == "object" && value != null) {
            if (tempArray.findIndex(x => x == value) > -1) {
                return "[Possible circular reference.]";
            }
            else {
                tempArray.push(value);
            }
        }
        return value;
    });
    return jsonString;
}
exports.StringifyCircular = StringifyCircular;
//# sourceMappingURL=Utilities.js.map