export declare enum LoggerLevel {
    TRACE = "10",
    DEBUG = "20",
    INFO = "30",
    WARN = "40",
    ERROR = "50",
    FATAL = "60"
}
export declare class Logger {
    static setLogLevel(logLevel: string, isJsonFormatEnabled: boolean): void;
    static log(message: string, logLevel: LoggerLevel): void;
    private static logger;
    private static isJsonFormatEnabled;
}
