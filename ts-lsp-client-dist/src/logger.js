"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LoggerLevel = void 0;
const pino_1 = require("pino");
var LoggerLevel;
(function (LoggerLevel) {
    LoggerLevel["TRACE"] = "10";
    LoggerLevel["DEBUG"] = "20";
    LoggerLevel["INFO"] = "30";
    LoggerLevel["WARN"] = "40";
    LoggerLevel["ERROR"] = "50";
    LoggerLevel["FATAL"] = "60";
})(LoggerLevel = exports.LoggerLevel || (exports.LoggerLevel = {}));
class Logger {
    static setLogLevel(logLevel, isJsonFormatEnabled) {
        logLevel = logLevel.toLowerCase();
        this.isJsonFormatEnabled = isJsonFormatEnabled;
        if (!isJsonFormatEnabled) {
            this.logger = (0, pino_1.default)({
                name: 'ts-lsp-client',
                level: logLevel,
                prettyPrint: {
                    levelFirst: true,
                    colorize: true,
                    translateTime: true,
                    ignore: 'pid,hostname'
                }
            });
        }
        else {
        }
    }
    static log(message, logLevel) {
        if (this.logger === null || this.logger === undefined)
            return;
        if (this.isJsonFormatEnabled)
            return;
        switch (logLevel) {
            case LoggerLevel.TRACE:
                this.logger.trace(message);
                break;
            case LoggerLevel.DEBUG:
                this.logger.debug(message);
                break;
            case LoggerLevel.INFO:
                this.logger.info(message);
                break;
            case LoggerLevel.WARN:
                this.logger.warn(message);
                break;
            case LoggerLevel.ERROR:
                this.logger.error(message);
                break;
            case LoggerLevel.FATAL:
                this.logger.fatal(message);
                break;
        }
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map