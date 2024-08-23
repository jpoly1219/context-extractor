"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LspClient = void 0;
const events_1 = require("events");
class LspClient {
    constructor(endpoint) {
        this.endpoint = endpoint;
    }
    initialize(params) {
        return this.endpoint.send('initialize', params);
    }
    initialized() {
        this.endpoint.notify('initialized');
    }
    shutdown() {
        return this.endpoint.send('shutdown');
    }
    exit() {
        this.endpoint.notify('exit');
    }
    didOpen(params) {
        this.endpoint.notify('textDocument/didOpen', params);
    }
    didClose(params) {
        this.endpoint.notify('textDocument/didClose', params);
    }
    didChange(params) {
        this.endpoint.notify('textDocument/didChange', params);
    }
    documentSymbol(params) {
        return this.endpoint.send('textDocument/documentSymbol', params);
    }
    references(params) {
        return this.endpoint.send('textDocument/references', params);
    }
    definition(params) {
        return this.endpoint.send('textDocument/definition', params);
    }
    typeDefinition(params) {
        return this.endpoint.send('textDocument/typeDefinition', params);
    }
    signatureHelp(params) {
        return this.endpoint.send('textDocument/signatureHelp', params);
    }
    once(method) {
        return (0, events_1.once)(this.endpoint, method);
    }
    hover(params) {
        return this.endpoint.send('textDocument/hover', params);
    }
    gotoDeclaration(params) {
        return this.endpoint.send('textDocument/declaration', params);
    }
    completion(params) {
        return this.endpoint.send('textDocument/completion', params);
    }
    inlayHint(params) {
        return this.endpoint.send('textDocument/inlayHint', params);
    }
    prepareTypeHierarchy(params) {
        return this.endpoint.send('textDocument/prepareTypeHierarchy', params);
    }
    ocamlTypedHole(params) {
        return this.endpoint.send('ocamllsp/typedHoles', params);
    }
}
exports.LspClient = LspClient;
//# sourceMappingURL=lspClient.js.map