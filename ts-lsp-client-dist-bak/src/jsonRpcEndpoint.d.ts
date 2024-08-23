/// <reference types="node" />
/// <reference types="node" />
import { JSONRPCClient } from 'json-rpc-2.0';
import { EventEmitter, Readable, TransformOptions, Writable } from 'stream';
import { JSONRPCParams } from "json-rpc-2.0/dist/models";
export declare class JSONRPCEndpoint extends EventEmitter {
    private writable;
    private readable;
    private readableByline;
    private client;
    private nextId;
    constructor(writable: Writable, readable: Readable, options?: ConstructorParameters<typeof EventEmitter>[0] & TransformOptions);
    send(method: string, message?: JSONRPCParams): ReturnType<JSONRPCClient["request"]>;
    notify(method: string, message?: JSONRPCParams): void;
}
