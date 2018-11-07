"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = require("os");
const fs_1 = require("fs");
const path_1 = require("path");
function WriteLog(message) {
    var logPath = path_1.join(os_1.tmpdir(), "\DoXM_RC_Logs.txt");
    if (fs_1.existsSync(logPath)) {
        while (fs_1.statSync(logPath).size > 1000000) {
            var content = fs_1.readFileSync(logPath, { encoding: "utf8" });
            fs_1.writeFileSync(logPath, content.substring(1000));
        }
    }
    var entry = `${(new Date()).toLocaleString()}  -  ${message}\r\n`;
    fs_1.appendFileSync(logPath, entry);
}
exports.WriteLog = WriteLog;
//# sourceMappingURL=Logger.js.map