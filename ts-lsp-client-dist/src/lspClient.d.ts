/// <reference types="node" />
import { JSONRPCEndpoint } from "./jsonRpcEndpoint";
import { DefinitionParams, DidChangeTextDocumentParams, DidCloseTextDocumentParams, DidOpenTextDocumentParams, DocumentSymbol, DocumentSymbolParams, InitializeParams, InitializeResult, LocationLink, ReferenceParams, ResponseError, ShutdownResult, SignatureHelp, SignatureHelpParams, SymbolInformation, TypeDefinitionParams, Location, HoverParams, Hover, DeclarationParams, CompletionParams, CompletionItem, CompletionList, InlayHintParams, InlayHint, TypeHierarchyPrepareParams, TypeHierarchyItem } from "./models";
import { once } from 'events';
export declare class LspClient {
    private endpoint;
    constructor(endpoint: JSONRPCEndpoint);
    initialize(params: InitializeParams): PromiseLike<InitializeResult>;
    initialized(): void;
    shutdown(): PromiseLike<ShutdownResult>;
    exit(): void;
    didOpen(params: DidOpenTextDocumentParams): void;
    didClose(params: DidCloseTextDocumentParams): void;
    didChange(params: DidChangeTextDocumentParams): void;
    documentSymbol(params: DocumentSymbolParams): PromiseLike<DocumentSymbol[] | SymbolInformation[] | null>;
    references(params: ReferenceParams): PromiseLike<Location[] | ResponseError | null>;
    definition(params: DefinitionParams): PromiseLike<Location | Location[] | LocationLink[] | ResponseError | null>;
    typeDefinition(params: TypeDefinitionParams): PromiseLike<Location | Location[] | LocationLink[] | ResponseError | null>;
    signatureHelp(params: SignatureHelpParams): PromiseLike<SignatureHelp | null>;
    once(method: string): ReturnType<typeof once>;
    hover(params: HoverParams): PromiseLike<Hover>;
    gotoDeclaration(params: DeclarationParams): PromiseLike<Location | Location[] | LocationLink[] | null>;
    completion(params: CompletionParams): PromiseLike<CompletionItem[] | CompletionList | null>;
    inlayHint(params: InlayHintParams): PromiseLike<InlayHint[] | null>;
    prepareTypeHierarchy(params: TypeHierarchyPrepareParams): PromiseLike<TypeHierarchyItem[] | null>;
}
