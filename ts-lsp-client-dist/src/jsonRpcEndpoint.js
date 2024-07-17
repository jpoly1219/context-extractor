"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSONRPCEndpoint = void 0;
const tslib_1 = require("tslib");
const json_rpc_2_0_1 = require("json-rpc-2.0");
const stream_1 = require("stream");
const jsonRpcTransform_1 = require("./jsonRpcTransform");
const logger_1 = require("./logger");
class JSONRPCEndpoint extends stream_1.EventEmitter {
    constructor(writable, readable, options) {
        super(options);
        this.nextId = 0;
        const createId = () => this.nextId++;
        this.writable = writable;
        this.readable = readable;
        this.readableByline = jsonRpcTransform_1.JSONRPCTransform.createStream(this.readable, options);
        this.client = new json_rpc_2_0_1.JSONRPCClient((jsonRPCRequest) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            const jsonRPCRequestStr = JSON.stringify(jsonRPCRequest);
            logger_1.Logger.log(`sending: ${jsonRPCRequestStr}`, logger_1.LoggerLevel.DEBUG);
            this.writable.write(`Content-Length: ${jsonRPCRequestStr.length}\r\n\r\n${jsonRPCRequestStr}`);
        }), createId);
        this.readableByline.on('data', (jsonRPCResponseOrRequest) => {
            const jsonrpc = JSON.parse(jsonRPCResponseOrRequest);
            logger_1.Logger.log(`[transform] ${jsonRPCResponseOrRequest}`, logger_1.LoggerLevel.DEBUG);
            if (Object.prototype.hasOwnProperty.call(jsonrpc, 'id')) {
                const jsonRPCResponse = jsonrpc;
                if (jsonRPCResponse.id === (this.nextId - 1)) {
                    this.client.receive(jsonRPCResponse);
                }
                else {
                    logger_1.Logger.log(`[transform] ${jsonRPCResponseOrRequest}`, logger_1.LoggerLevel.ERROR);
                    this.emit('error', `[transform] Received id mismatch! Got ${jsonRPCResponse.id}, expected ${this.nextId - 1}`);
                }
            }
            else {
                const jsonRPCRequest = jsonrpc;
                this.emit(jsonRPCRequest.method, jsonRPCRequest.params);
            }
        });
    }
    send(method, message) {
        return this.client.request(method, message);
    }
    notify(method, message) {
        this.client.notify(method, message);
    }
}
exports.JSONRPCEndpoint = JSONRPCEndpoint;
//# sourceMappingURL=jsonRpcEndpoint.js.map