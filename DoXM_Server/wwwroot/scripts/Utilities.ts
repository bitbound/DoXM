﻿/**
 * Splits a string into "parts" number of pieces.  Once "parts" number is
 * reached, additional occurrences of the splitter are ignored.
 * @param splitter
 * @param parts
 */
export function Split(originalString:string, splitter: string, parts: number):Array<string> {
    var returnArray = [];
    var remainingString = originalString;
    for (var i = 1; i < parts; i++) {
        if (remainingString.indexOf(splitter) == -1) {
            break;
        }
        returnArray.push(remainingString.slice(0, remainingString.indexOf(splitter)));
        remainingString = remainingString.slice(remainingString.indexOf(splitter) + splitter.length);
    }
    returnArray.push(remainingString);
    return returnArray;
}

export function CreateGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function EncodeForHTML(text: string) {
    var tempDiv = document.createElement("div");
    tempDiv.innerText = text;
    return tempDiv.innerHTML;
}

export function ParseSearchString() {
    var queryStrings = {};
    var queryArray = location.search.substring(1).split("&");
    queryArray.forEach(value => {
        var keyValue = value.split("=");
        queryStrings[keyValue[0]] = keyValue[1];
    });
    return queryStrings;
}

export function GetDistanceBetween(fromX: number, fromY: number, toX: number, toY: number) {
    return Math.sqrt(Math.pow(fromX - toX, 2) +
        Math.pow(fromY - toY, 2));
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