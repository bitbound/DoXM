"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WriteLog = void 0;
const os_1 = require("os");
const fs_1 = require("fs");
const path_1 = require("path");
function WriteLog(message) {
    var logPath = (0, path_1.join)((0, os_1.tmpdir)(), "\\DoXM_Remote_Control.log");
    if ((0, fs_1.existsSync)(logPath)) {
        while ((0, fs_1.statSync)(logPath).size > 1000000) {
            var content = (0, fs_1.readFileSync)(logPath, { encoding: "utf8" });
            (0, fs_1.writeFileSync)(logPath, content.substring(1000));
        }
    }
    var entry = `${(new Date()).toLocaleString()}  -  ${message}\r\n`;
    (0, fs_1.appendFileSync)(logPath, entry);
}
exports.WriteLog = WriteLog;
//# sourceMappingURL=Logger.js.map