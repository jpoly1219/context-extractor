/// <reference types="node" />
/// <reference types="node" />
import { Readable, Transform, TransformCallback, TransformOptions } from "stream";
export declare class JSONRPCTransform extends Transform {
    private _state;
    private _curContentLength;
    private _curChunk;
    private constructor();
    _transform(chunk: Buffer | string, encoding: BufferEncoding, done: TransformCallback): void;
    private _reencode;
    static createStream(readStream?: Readable, options?: TransformOptions): JSONRPCTransform;
}
