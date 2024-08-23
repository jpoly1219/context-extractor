"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSONRPCTransform = void 0;
const stream_1 = require("stream");
class JSONRPCTransform extends stream_1.Transform {
    constructor(options) {
        options = options || {};
        options.objectMode = true;
        super(options);
        this.on('pipe', (src) => {
            if (!this.readableEncoding) {
                if (src instanceof stream_1.Readable) {
                    this.setEncoding(src.readableEncoding);
                }
            }
        });
        this._curChunk = Buffer.from([]);
        this._state = 'content-length';
    }
    _transform(chunk, encoding, done) {
        encoding = encoding || 'utf8';
        if (!Buffer.isBuffer(chunk)) {
            chunk = Buffer.from(chunk, encoding);
        }
        this._curChunk = Buffer.concat([this._curChunk, chunk]);
        const prefixMinLength = Buffer.byteLength('Content-Length: 0\r\n\r\n', encoding);
        const prefixLength = Buffer.byteLength('Content-Length: ', encoding);
        const prefixRegex = /^Content-Length: /i;
        const digitLength = Buffer.byteLength('0', encoding);
        const digitRe = /^[0-9]/;
        const suffixLength = Buffer.byteLength('\r\n\r\n', encoding);
        const suffixRe = /^\r\n\r\n/;
        while (true) {
            if (this._state === 'content-length') {
                if (this._curChunk.length < prefixMinLength)
                    break;
                const leading = this._curChunk.slice(0, prefixLength);
                if (!prefixRegex.test(leading.toString(encoding))) {
                    done(new Error(`[_transform] Bad header: ${this._curChunk.toString(encoding)}`));
                    return;
                }
                let numString = '';
                let position = leading.length;
                while (this._curChunk.length - position > digitLength) {
                    const ch = this._curChunk.slice(position, position + digitLength).toString(encoding);
                    if (!digitRe.test(ch))
                        break;
                    numString += ch;
                    position += 1;
                }
                if (position === leading.length || this._curChunk.length - position < suffixLength || !suffixRe.test(this._curChunk.slice(position, position + suffixLength).toString(encoding))) {
                    done(new Error(`[_transform] Bad header: ${this._curChunk.toString(encoding)}`));
                    return;
                }
                this._curContentLength = Number(numString);
                this._curChunk = this._curChunk.slice(position + suffixLength);
                this._state = 'jsonrpc';
            }
            if (this._state === 'jsonrpc') {
                if (this._curChunk.length >= this._curContentLength) {
                    this.push(this._reencode(this._curChunk.slice(0, this._curContentLength), encoding));
                    this._curChunk = this._curChunk.slice(this._curContentLength);
                    this._state = 'content-length';
                    continue;
                }
            }
            break;
        }
        done();
    }
    _reencode(chunk, chunkEncoding) {
        if (this.readableEncoding && this.readableEncoding != chunkEncoding) {
            return chunk.toString(this.readableEncoding);
        }
        else if (this.readableEncoding) {
            return chunk.toString(chunkEncoding);
        }
        else {
            return chunk;
        }
    }
    ;
    static createStream(readStream, options) {
        const jrt = new JSONRPCTransform(options);
        if (readStream) {
            readStream.pipe(jrt);
        }
        return jrt;
    }
}
exports.JSONRPCTransform = JSONRPCTransform;
//# sourceMappingURL=jsonRpcTransform.js.map