import { Viewer } from "../Models/Viewer";
import * as Electron from "electron";


export async function TryUntil(action: () => void, rejectCondition: () => boolean) {
    return new Promise<void>((resolve, reject) => {
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
        }
        tryAction();
    });
}

export async function When(predicate: () => boolean) {
    return new Promise<void>((resolve, reject) => {
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
    })
}

export function GetAbsolutePointFromPercents(percentX: number, percentY: number, viewer: Viewer): Electron.Point {
    var currentScreen = Electron.screen.getAllDisplays()[viewer.CurrentScreenIndex];
    var absoluteX = (currentScreen.bounds.width * percentX) + currentScreen.bounds.x;
    var absoluteY = (currentScreen.bounds.height * percentY) + currentScreen.bounds.y;
    return { x: absoluteX, y: absoluteY };
}

export function StringifyCircular(serializableObject: any): string {
    var tempArray = new Array<any>();
    var jsonString = JSON.stringify(serializableObject, function (key, value) {
        if (typeof value == "object" && value != null) {
            if (tempArray.findIndex(x => x == value) > -1) {
                return "[Possible circular reference.]"
            }
            else {
                tempArray.push(value);
            }
        }
        return value;
    });
    return jsonString;
}