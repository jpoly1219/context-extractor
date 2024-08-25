export type integer = number;
export type uinteger = number;
export type decimal = number;
type ProgressToken = integer | string;
type DocumentUri = string;
type URI = string;
export type TraceValue = 'off' | 'messages' | 'verbose';
export type LSPObject = {
    [key: string]: LSPAny;
};
export type LSPArray = LSPAny[];
export type LSPAny = LSPObject | LSPArray | string | integer | uinteger | decimal | boolean | null;
interface Command {
    title: string;
    command: string;
    arguments?: LSPAny[];
}
export type ChangeAnnotationIdentifier = string;
export interface ResponseError {
    code: integer;
    message: string;
    data?: string | number | boolean | [] | Record<string, unknown> | null;
}
export interface WorkDoneProgressParams {
    workDoneToken?: ProgressToken;
}
export interface InitializeParams extends WorkDoneProgressParams {
    processId: integer | null;
    clientInfo?: {
        name: string;
        version?: string;
    };
    locale?: string;
    rootPath?: string | null;
    rootUri: DocumentUri | null;
    initializationOptions?: any;
    capabilities: ClientCapabilities;
    trace?: TraceValue;
    workspaceFolders?: WorkspaceFolder[] | null;
}
export interface ClientCapabilities {
    workspace?: {
        applyEdit?: boolean;
        workspaceEdit?: WorkspaceEditClientCapabilities;
        didChangeConfiguration?: DidChangeConfigurationClientCapabilities;
        didChangeWatchedFiles?: DidChangeWatchedFilesClientCapabilities;
        symbol?: WorkspaceSymbolClientCapabilities;
        executeCommand?: ExecuteCommandClientCapabilities;
        workspaceFolders?: boolean;
        configuration?: boolean;
        semanticTokens?: SemanticTokensWorkspaceClientCapabilities;
        codeLens?: CodeLensWorkspaceClientCapabilities;
        fileOperations?: {
            dynamicRegistration?: boolean;
            didCreate?: boolean;
            willCreate?: boolean;
            didRename?: boolean;
            willRename?: boolean;
            didDelete?: boolean;
            willDelete?: boolean;
        };
    };
    textDocument?: TextDocumentClientCapabilities;
    window?: {
        workDoneProgress?: boolean;
        showMessage?: ShowMessageRequestClientCapabilities;
        showDocument?: ShowDocumentClientCapabilities;
    };
    general?: {
        staleRequestSupport?: {
            cancel: boolean;
            retryOnContentModified: string[];
        };
        regularExpressions?: RegularExpressionsClientCapabilities;
        markdown?: MarkdownClientCapabilities;
        positionEncodings?: PositionEncodingKind[];
    };
    experimental?: any;
}
export interface WorkspaceFolder {
    uri: DocumentUri;
    name: string;
}
export interface ApplyWorkspaceEditParams {
    label?: string;
    edit: WorkspaceEdit;
}
export interface WorkspaceEdit {
    changes?: {
        [uri: string]: TextEdit[];
    };
    documentChanges?: (TextDocumentEdit[] | (TextDocumentEdit | CreateFile | RenameFile | DeleteFile)[]);
    changeAnnotations?: {
        [id: string]: ChangeAnnotation;
    };
}
interface TextEdit {
    range: Range;
    newText: string;
}
export interface Range {
    start: Position;
    end: Position;
}
export interface Position {
    line: uinteger;
    character: uinteger;
}
export interface TextDocumentEdit {
    textDocument: OptionalVersionedTextDocumentIdentifier;
    edits: (TextEdit | AnnotatedTextEdit)[];
}
export type TextDocumentContentChangeEvent = {
    range: Range;
    rangeLength?: uinteger;
    text: string;
} | {
    text: string;
};
interface TextDocumentIdentifier {
    uri: DocumentUri;
}
interface VersionedTextDocumentIdentifier extends TextDocumentIdentifier {
    version: integer;
}
interface OptionalVersionedTextDocumentIdentifier extends TextDocumentIdentifier {
    version: integer | null;
}
export interface AnnotatedTextEdit extends TextEdit {
    annotationId: ChangeAnnotationIdentifier;
}
export interface CreateFile {
    kind: 'create';
    uri: DocumentUri;
    options?: CreateFileOptions;
    annotationId?: ChangeAnnotationIdentifier;
}
export interface CreateFileOptions {
    overwrite?: boolean;
    ignoreIfExists?: boolean;
}
export interface RenameFile {
    kind: 'rename';
    oldUri: DocumentUri;
    newUri: DocumentUri;
    options?: RenameFileOptions;
    annotationId?: ChangeAnnotationIdentifier;
}
export interface RenameFileOptions {
    overwrite?: boolean;
    ignoreIfExists?: boolean;
}
export interface DeleteFile {
    kind: 'delete';
    uri: DocumentUri;
    options?: DeleteFileOptions;
    annotationId?: ChangeAnnotationIdentifier;
}
export interface DeleteFileOptions {
    recursive?: boolean;
    ignoreIfNotExists?: boolean;
}
export interface ChangeAnnotation {
    label: string;
    needsConfirmation?: boolean;
    description?: string;
}
export interface WorkspaceEditClientCapabilities {
    documentChanges?: boolean;
    resourceOperations?: ResourceOperationKind[];
    failureHandling?: FailureHandlingKind;
    normalizesLineEndings?: boolean;
    changeAnnotationSupport?: {
        groupsOnLabel?: boolean;
    };
}
export type ResourceOperationKind = 'create' | 'rename' | 'delete';
export type FailureHandlingKind = 'abort' | 'transactional' | 'undo' | 'textOnlyTransactional';
export interface DidChangeConfigurationClientCapabilities {
    dynamicRegistration?: boolean;
}
export interface DidChangeWatchedFilesClientCapabilities {
    dynamicRegistration?: boolean;
}
interface WorkspaceSymbolClientCapabilities {
    dynamicRegistration?: boolean;
    symbolKind?: {
        valueSet?: SymbolKind[];
    };
    tagSupport?: {
        valueSet: SymbolTag[];
    };
}
export declare enum SymbolKind {
    File = 1,
    Module = 2,
    Namespace = 3,
    Package = 4,
    Class = 5,
    Method = 6,
    Property = 7,
    Field = 8,
    Constructor = 9,
    Enum = 10,
    Interface = 11,
    Function = 12,
    Variable = 13,
    Constant = 14,
    String = 15,
    Number = 16,
    Boolean = 17,
    Array = 18,
    Object = 19,
    Key = 20,
    Null = 21,
    EnumMember = 22,
    Struct = 23,
    Event = 24,
    Operator = 25,
    TypeParameter = 26
}
export type SymbolTag = 1;
export interface ExecuteCommandClientCapabilities {
    dynamicRegistration?: boolean;
}
export interface SemanticTokensWorkspaceClientCapabilities {
    refreshSupport?: boolean;
}
export interface CodeLensWorkspaceClientCapabilities {
    refreshSupport?: boolean;
}
export interface TextDocumentClientCapabilities {
    synchronization?: TextDocumentSyncClientCapabilities;
    completion?: CompletionClientCapabilities;
    hover?: HoverClientCapabilities;
    signatureHelp?: SignatureHelpClientCapabilities;
    declaration?: DeclarationClientCapabilities;
    definition?: DefinitionClientCapabilities;
    typeDefinition?: TypeDefinitionClientCapabilities;
    implementation?: ImplementationClientCapabilities;
    references?: ReferenceClientCapabilities;
    documentHighlight?: DocumentHighlightClientCapabilities;
    documentSymbol?: DocumentSymbolClientCapabilities;
    codeAction?: CodeActionClientCapabilities;
    codeLens?: CodeLensClientCapabilities;
    documentLink?: DocumentLinkClientCapabilities;
    colorProvider?: DocumentColorClientCapabilities;
    formatting?: DocumentFormattingClientCapabilities;
    rangeFormatting?: DocumentRangeFormattingClientCapabilities;
    onTypeFormatting?: DocumentOnTypeFormattingClientCapabilities;
    rename?: RenameClientCapabilities;
    publishDiagnostics?: PublishDiagnosticsClientCapabilities;
    foldingRange?: FoldingRangeClientCapabilities;
    selectionRange?: SelectionRangeClientCapabilities;
    linkedEditingRange?: LinkedEditingRangeClientCapabilities;
    callHierarchy?: CallHierarchyClientCapabilities;
    semanticTokens?: SemanticTokensClientCapabilities;
    moniker?: MonikerClientCapabilities;
}
export interface TextDocumentSyncClientCapabilities {
    dynamicRegistration?: boolean;
    willSave?: boolean;
    willSaveWaitUntil?: boolean;
    didSave?: boolean;
}
export interface CompletionClientCapabilities {
    dynamicRegistration?: boolean;
    completionItem?: {
        snippetSupport?: boolean;
        commitCharactersSupport?: boolean;
        documentationFormat?: MarkupKind[];
        deprecatedSupport?: boolean;
        preselectSupport?: boolean;
        tagSupport?: {
            valueSet: CompletionItemTag[];
        };
        insertReplaceSupport?: boolean;
        resolveSupport?: {
            properties: string[];
        };
        insertTextModeSupport?: {
            valueSet: InsertTextMode[];
        };
        labelDetailsSupport?: boolean;
    };
    completionItemKind?: {
        valueSet?: CompletionItemKind[];
    };
    contextSupport?: boolean;
    insertTextMode?: InsertTextMode;
}
export type MarkupKind = 'plaintext' | 'markdown';
export type CompletionItemTag = 1;
export type InsertTextMode = 1 | 2;
export declare enum CompletionItemKind {
    Text = 1,
    Method = 2,
    Function = 3,
    Constructor = 4,
    Field = 5,
    Variable = 6,
    Class = 7,
    Interface = 8,
    Module = 9,
    Property = 10,
    Unit = 11,
    Value = 12,
    Enum = 13,
    Keyword = 14,
    Snippet = 15,
    Color = 16,
    File = 17,
    Reference = 18,
    Folder = 19,
    EnumMember = 20,
    Constant = 21,
    Struct = 22,
    Event = 23,
    Operator = 24,
    TypeParameter = 25
}
export interface HoverClientCapabilities {
    dynamicRegistration?: boolean;
    contentFormat?: MarkupKind[];
}
export interface SignatureHelpClientCapabilities {
    dynamicRegistration?: boolean;
    signatureInformation?: {
        documentationFormat?: MarkupKind[];
        parameterInformation?: {
            labelOffsetSupport?: boolean;
        };
        activeParameterSupport?: boolean;
    };
    contextSupport?: boolean;
}
export interface DeclarationClientCapabilities {
    dynamicRegistration?: boolean;
    linkSupport?: boolean;
}
export interface DefinitionClientCapabilities {
    dynamicRegistration?: boolean;
    linkSupport?: boolean;
}
export interface TypeDefinitionClientCapabilities {
    dynamicRegistration?: boolean;
    linkSupport?: boolean;
}
export interface ImplementationClientCapabilities {
    dynamicRegistration?: boolean;
    linkSupport?: boolean;
}
export interface ReferenceClientCapabilities {
    dynamicRegistration?: boolean;
}
export interface DocumentHighlightClientCapabilities {
    dynamicRegistration?: boolean;
}
export interface DocumentSymbolClientCapabilities {
    dynamicRegistration?: boolean;
    symbolKind?: {
        valueSet?: SymbolKind[];
    };
    hierarchicalDocumentSymbolSupport?: boolean;
    tagSupport?: {
        valueSet: SymbolTag[];
    };
    labelSupport?: boolean;
}
export interface CodeActionClientCapabilities {
    dynamicRegistration?: boolean;
    codeActionLiteralSupport?: {
        codeActionKind: {
            valueSet: CodeActionKind[];
        };
    };
    isPreferredSupport?: boolean;
    disabledSupport?: boolean;
    dataSupport?: boolean;
    resolveSupport?: {
        properties: string[];
    };
    honorsChangeAnnotations?: boolean;
}
export declare enum CodeActionKind {
    Empty = "",
    QuickFix = "quickfix",
    Refactor = "refactor",
    RefactorExtract = "refactor.extract",
    RefactorInline = "refactor.inline",
    RefactorRewrite = "refactor.rewrite",
    Source = "source",
    SourceOrganizeImports = "source.organizeImports"
}
export interface CodeLensClientCapabilities {
    dynamicRegistration?: boolean;
}
export interface DocumentLinkClientCapabilities {
    dynamicRegistration?: boolean;
    tooltipSupport?: boolean;
}
export interface DocumentColorClientCapabilities {
    dynamicRegistration?: boolean;
}
export interface DocumentFormattingClientCapabilities {
    dynamicRegistration?: boolean;
}
export interface DocumentRangeFormattingClientCapabilities {
    dynamicRegistration?: boolean;
}
export interface DocumentOnTypeFormattingClientCapabilities {
    dynamicRegistration?: boolean;
}
export type PrepareSupportDefaultBehavior = 1;
export interface RenameClientCapabilities {
    dynamicRegistration?: boolean;
    prepareSupport?: boolean;
    prepareSupportDefaultBehavior?: PrepareSupportDefaultBehavior;
    honorsChangeAnnotations?: boolean;
}
export interface PublishDiagnosticsClientCapabilities {
    relatedInformation?: boolean;
    tagSupport?: {
        valueSet: DiagnosticTag[];
    };
    versionSupport?: boolean;
    codeDescriptionSupport?: boolean;
    dataSupport?: boolean;
}
export type DiagnosticTag = 1 | 2;
export interface FoldingRangeClientCapabilities {
    dynamicRegistration?: boolean;
    rangeLimit?: uinteger;
    lineFoldingOnly?: boolean;
}
export interface SelectionRangeClientCapabilities {
    dynamicRegistration?: boolean;
}
export interface LinkedEditingRangeClientCapabilities {
    dynamicRegistration?: boolean;
}
interface CallHierarchyClientCapabilities {
    dynamicRegistration?: boolean;
}
interface SemanticTokensClientCapabilities {
    dynamicRegistration?: boolean;
    requests: {
        range?: boolean | object;
        full?: boolean | {
            delta?: boolean;
        };
    };
    tokenTypes: string[];
    tokenModifiers: string[];
    formats: TokenFormat[];
    overlappingTokenSupport?: boolean;
    multilineTokenSupport?: boolean;
}
export type TokenFormat = 'relative';
interface MonikerClientCapabilities {
    dynamicRegistration?: boolean;
}
export interface ShowMessageRequestClientCapabilities {
    messageActionItem?: {
        additionalPropertiesSupport?: boolean;
    };
}
export interface ShowDocumentClientCapabilities {
    support: boolean;
}
export interface RegularExpressionsClientCapabilities {
    engine: string;
    version?: string;
}
export interface MarkdownClientCapabilities {
    parser: string;
    version?: string;
}
export type PositionEncodingKind = string;
export interface InitializeResult {
    capabilities: ServerCapabilities;
    serverInfo?: {
        name: string;
        version?: string;
    };
}
interface ServerCapabilities {
    textDocumentSync?: TextDocumentSyncOptions | TextDocumentSyncKind;
    completionProvider?: CompletionOptions;
    hoverProvider?: boolean | HoverOptions;
    signatureHelpProvider?: SignatureHelpOptions;
    declarationProvider?: boolean | DeclarationOptions | DeclarationRegistrationOptions;
    definitionProvider?: boolean | DefinitionOptions;
    typeDefinitionProvider?: boolean | TypeDefinitionOptions | TypeDefinitionRegistrationOptions;
    implementationProvider?: boolean | ImplementationOptions | ImplementationRegistrationOptions;
    referencesProvider?: boolean | ReferenceOptions;
    documentHighlightProvider?: boolean | DocumentHighlightOptions;
    documentSymbolProvider?: boolean | DocumentSymbolOptions;
    codeActionProvider?: boolean | CodeActionOptions;
    codeLensProvider?: CodeLensOptions;
    documentLinkProvider?: DocumentLinkOptions;
    colorProvider?: boolean | DocumentColorOptions | DocumentColorRegistrationOptions;
    documentFormattingProvider?: boolean | DocumentFormattingOptions;
    documentRangeFormattingProvider?: boolean | DocumentRangeFormattingOptions;
    documentOnTypeFormattingProvider?: DocumentOnTypeFormattingOptions;
    renameProvider?: boolean | RenameOptions;
    foldingRangeProvider?: boolean | FoldingRangeOptions | FoldingRangeRegistrationOptions;
    executeCommandProvider?: ExecuteCommandOptions;
    selectionRangeProvider?: boolean | SelectionRangeOptions | SelectionRangeRegistrationOptions;
    linkedEditingRangeProvider?: boolean | LinkedEditingRangeOptions | LinkedEditingRangeRegistrationOptions;
    callHierarchyProvider?: boolean | CallHierarchyOptions | CallHierarchyRegistrationOptions;
    semanticTokensProvider?: SemanticTokensOptions | SemanticTokensRegistrationOptions;
    monikerProvider?: boolean | MonikerOptions | MonikerRegistrationOptions;
    workspaceSymbolProvider?: boolean | WorkspaceSymbolOptions;
    workspace?: {
        workspaceFolders?: WorkspaceFoldersServerCapabilities;
        fileOperations?: {
            didCreate?: FileOperationRegistrationOptions;
            willCreate?: FileOperationRegistrationOptions;
            didRename?: FileOperationRegistrationOptions;
            willRename?: FileOperationRegistrationOptions;
            didDelete?: FileOperationRegistrationOptions;
            willDelete?: FileOperationRegistrationOptions;
        };
    };
    experimental?: any;
}
export interface TextDocumentSyncOptions {
    openClose?: boolean;
    change?: TextDocumentSyncKind;
}
export declare enum TextDocumentSyncKind {
    None = 0,
    Full = 1,
    Incremental = 2
}
export interface CompletionOptions extends WorkDoneProgressOptions {
    triggerCharacters?: string[];
    allCommitCharacters?: string[];
    resolveProvider?: boolean;
    completionItem?: {
        labelDetailsSupport?: boolean;
    };
}
export interface WorkDoneProgressOptions {
    workDoneProgress?: boolean;
}
export type HoverOptions = WorkDoneProgressOptions;
export interface SignatureHelpOptions extends WorkDoneProgressOptions {
    triggerCharacters?: string[];
    retriggerCharacters?: string[];
}
export type DeclarationOptions = WorkDoneProgressOptions;
export interface DeclarationRegistrationOptions extends DeclarationOptions, TextDocumentRegistrationOptions, StaticRegistrationOptions {
}
export interface TextDocumentRegistrationOptions {
    documentSelector: DocumentSelector | null;
}
export type DocumentSelector = DocumentFilter[];
export interface DocumentFilter {
    language?: string;
    scheme?: string;
    pattern?: string;
}
export interface StaticRegistrationOptions {
    id?: string;
}
export interface TypeDefinitionRegistrationOptions extends TextDocumentRegistrationOptions, TypeDefinitionOptions, StaticRegistrationOptions {
}
export type DefinitionOptions = WorkDoneProgressOptions;
export type TypeDefinitionOptions = WorkDoneProgressOptions;
export type ImplementationOptions = WorkDoneProgressOptions;
export interface ImplementationRegistrationOptions extends TextDocumentRegistrationOptions, ImplementationOptions, StaticRegistrationOptions {
}
export type ReferenceOptions = WorkDoneProgressOptions;
export type DocumentHighlightOptions = WorkDoneProgressOptions;
export interface DocumentSymbolOptions extends WorkDoneProgressOptions {
    label?: string;
}
export interface CodeActionOptions extends WorkDoneProgressOptions {
    codeActionKinds?: CodeActionKind[];
    resolveProvider?: boolean;
}
export interface CodeLensOptions extends WorkDoneProgressOptions {
    resolveProvider?: boolean;
}
export interface DocumentLinkOptions extends WorkDoneProgressOptions {
    resolveProvider?: boolean;
}
export type DocumentColorOptions = WorkDoneProgressOptions;
export interface DocumentColorRegistrationOptions extends TextDocumentRegistrationOptions, StaticRegistrationOptions, DocumentColorOptions {
}
export type DocumentFormattingOptions = WorkDoneProgressOptions;
export type DocumentRangeFormattingOptions = WorkDoneProgressOptions;
export interface DocumentOnTypeFormattingOptions {
    firstTriggerCharacter: string;
    moreTriggerCharacter?: string[];
}
export interface RenameOptions extends WorkDoneProgressOptions {
    prepareProvider?: boolean;
}
export type FoldingRangeOptions = WorkDoneProgressOptions;
export interface FoldingRangeRegistrationOptions extends TextDocumentRegistrationOptions, FoldingRangeOptions, StaticRegistrationOptions {
}
export interface ExecuteCommandOptions extends WorkDoneProgressOptions {
    commands: string[];
}
export type SelectionRangeOptions = WorkDoneProgressOptions;
export interface SelectionRangeRegistrationOptions extends SelectionRangeOptions, TextDocumentRegistrationOptions, StaticRegistrationOptions {
}
export type LinkedEditingRangeOptions = WorkDoneProgressOptions;
export interface LinkedEditingRangeRegistrationOptions extends TextDocumentRegistrationOptions, LinkedEditingRangeOptions, StaticRegistrationOptions {
}
export type CallHierarchyOptions = WorkDoneProgressOptions;
export interface CallHierarchyRegistrationOptions extends TextDocumentRegistrationOptions, CallHierarchyOptions, StaticRegistrationOptions {
}
export interface SemanticTokensOptions extends WorkDoneProgressOptions {
    legend: SemanticTokensLegend;
    range?: boolean | object;
    full?: boolean | {
        delta?: boolean;
    };
}
export interface SemanticTokensLegend {
    tokenTypes: string[];
    tokenModifiers: string[];
}
export interface SemanticTokensRegistrationOptions extends TextDocumentRegistrationOptions, SemanticTokensOptions, StaticRegistrationOptions {
}
export type MonikerOptions = WorkDoneProgressOptions;
export interface MonikerRegistrationOptions extends TextDocumentRegistrationOptions, MonikerOptions {
}
export type WorkspaceSymbolOptions = WorkDoneProgressOptions;
export interface WorkspaceFoldersServerCapabilities {
    supported?: boolean;
    changeNotifications?: string | boolean;
}
interface FileOperationRegistrationOptions {
    filters: FileOperationFilter[];
}
export interface FileOperationFilter {
    scheme?: string;
    pattern: FileOperationPattern;
}
interface FileOperationPattern {
    glob: string;
    matches?: FileOperationPatternKind;
    options?: FileOperationPatternOptions;
}
export type FileOperationPatternKind = 'file' | 'folder';
export interface FileOperationPatternOptions {
    ignoreCase?: boolean;
}
export interface ShutdownResult {
    result: null;
    error?: ResponseError;
}
export interface DidOpenTextDocumentParams {
    textDocument: TextDocumentItem;
}
export interface TextDocumentItem {
    uri: DocumentUri;
    languageId: string;
    version: integer;
    text: string;
}
export interface DocumentSymbolParams extends WorkDoneProgressParams, PartialResultParams {
    textDocument: TextDocumentIdentifier;
}
export interface PartialResultParams {
    partialResultToken?: ProgressToken;
}
export interface DocumentSymbol {
    name: string;
    detail?: string;
    kind: SymbolKind;
    tags?: SymbolTag[];
    deprecated?: boolean;
    range: Range;
    selectionRange: Range;
    children?: DocumentSymbol[];
}
export interface SymbolInformation {
    name: string;
    kind: SymbolKind;
    tags?: SymbolTag[];
    deprecated?: boolean;
    location: Location;
    containerName?: string;
}
export interface Location {
    uri: DocumentUri;
    range: Range;
}
export interface ReferenceParams extends TextDocumentPositionParams, WorkDoneProgressParams, PartialResultParams {
    context: ReferenceContext;
}
interface TextDocumentPositionParams {
    textDocument: TextDocumentIdentifier;
    position: Position;
}
export interface ReferenceContext {
    includeDeclaration: boolean;
}
export interface DidChangeTextDocumentParams {
    textDocument: VersionedTextDocumentIdentifier;
    contentChanges: TextDocumentContentChangeEvent[];
}
export interface DidCloseTextDocumentParams {
    textDocument: TextDocumentIdentifier;
}
export interface DefinitionParams extends TextDocumentPositionParams, WorkDoneProgressParams, PartialResultParams {
}
export interface LocationLink {
    originSelectionRange?: Range;
    targetUri: DocumentUri;
    targetRange: Range;
    targetSelectionRange: Range;
}
export interface TypeDefinitionParams extends TextDocumentPositionParams, WorkDoneProgressParams, PartialResultParams {
}
export interface SignatureHelpParams extends TextDocumentPositionParams, WorkDoneProgressParams {
    context?: SignatureHelpContext;
}
export interface SignatureHelpContext {
    triggerKind: SignatureHelpTriggerKind;
    triggerCharacter?: string;
    isRetrigger: boolean;
    activeSignatureHelp?: SignatureHelp;
}
export declare enum SignatureHelpTriggerKind {
    Invoked = 1,
    TriggerCharacter = 2,
    ContentChange = 3
}
export interface SignatureHelp {
    signatures: SignatureInformation[];
    activeSignature?: uinteger;
    activeParameter?: uinteger;
}
export interface SignatureInformation {
    label: string;
    documentation?: string | MarkupContent;
    parameters?: ParameterInformation[];
    activeParameter?: uinteger;
}
export interface MarkupContent {
    kind: MarkupKind;
    value: string;
}
export interface ParameterInformation {
    label: string | [uinteger, uinteger];
    documentation?: string | MarkupContent;
}
export interface HoverParams extends TextDocumentPositionParams, WorkDoneProgressParams {
}
type MarkedString = string | {
    language: string;
    value: string;
};
export interface MarkupContent {
    kind: MarkupKind;
    value: string;
}
export interface Hover {
    contents: MarkedString | MarkedString[] | MarkupContent;
    range?: Range;
}
export interface DeclarationParams extends TextDocumentPositionParams, WorkDoneProgressParams, PartialResultParams {
}
export declare enum CompletionTriggerKind {
    Invoked = 1,
    TriggerCharacter = 2,
    TriggerForIncompleteCompletions = 3
}
export interface CompletionContext {
    triggerKind: CompletionTriggerKind;
    triggerCharacter?: string;
}
export interface CompletionParams extends TextDocumentPositionParams, WorkDoneProgressParams, PartialResultParams {
    context?: CompletionContext;
}
export declare enum InsertTextFormat {
    PlainText = 1,
    Snippet = 2
}
export interface InsertReplaceEdit {
    newText: string;
    insert: Range;
    replace: Range;
}
export interface CompletionItemLabelDetails {
    detail?: string;
    description?: string;
}
export interface CompletionItem {
    label: string;
    labelDetails?: CompletionItemLabelDetails;
    kind?: CompletionItemKind;
    tags?: CompletionItemTag[];
    detail?: string;
    documentation?: string | MarkupContent;
    deprecated?: boolean;
    preselect?: boolean;
    sortText?: string;
    filterText?: string;
    insertText?: string;
    insertTextFormat?: InsertTextFormat;
    insertTextMode?: InsertTextMode;
    textEdit?: TextEdit | InsertReplaceEdit;
    textEditText?: string;
    additionalTextEdits?: TextEdit[];
    commitCharacters?: string[];
    command?: Command;
    data?: LSPAny;
}
export interface CompletionList {
    isIncomplete: boolean;
    itemDefaults?: {
        commitCharacters?: string[];
        editRange?: Range | {
            insert: Range;
            replace: Range;
        };
        insertTextFormat?: InsertTextFormat;
        insertTextMode?: InsertTextMode;
        data?: LSPAny;
    };
    items: CompletionItem[];
}
export interface InlayHintParams extends WorkDoneProgressParams {
    textDocument: TextDocumentIdentifier;
    range: Range;
}
export declare enum InlayHintKind {
    Type = 1,
    Parameter = 2
}
export interface InlayHintLabelPart {
    value: string;
    tooltip?: string | MarkupContent;
    location?: Location;
    command?: Command;
}
export interface InlayHint {
    position: Position;
    label: string | InlayHintLabelPart[];
    kind?: InlayHintKind;
    textEdits?: TextEdit[];
    tooltip?: string | MarkupContent;
    paddingLeft?: boolean;
    paddingRight?: boolean;
    data?: LSPAny;
}
export interface TypeHierarchyPrepareParams extends TextDocumentPositionParams, WorkDoneProgressParams {
}
export interface TypeHierarchyItem {
    name: string;
    kind: SymbolKind;
    tags?: SymbolTag[];
    detail?: string;
    uri: DocumentUri;
    range: Range;
    selectionRange: Range;
    data?: LSPAny;
}
export interface Diagnostic {
    range: Range;
    severity?: DiagnosticSeverity;
    code?: integer | string;
    codeDescription?: CodeDescription;
    source?: string;
    message: string;
    tags?: DiagnosticTag[];
    relatedInformation?: DiagnosticRelatedInformation[];
    data?: LSPAny;
}
export declare enum DiagnosticSeverity {
    Error = 1,
    Warning = 2,
    Information = 3,
    Hint = 4
}
export interface DiagnosticRelatedInformation {
    location: Location;
    message: string;
}
export interface CodeDescription {
    href: URI;
}
export interface DocumentDiagnosticParams extends WorkDoneProgressParams, PartialResultParams {
    textDocument: TextDocumentIdentifier;
    identifier?: string;
    previousResultId?: string;
}
export declare enum DocumentDiagnosticReportKind {
    Full = "full",
    Unchanged = "unchanged"
}
export interface FullDocumentDiagnosticReport {
    kind: DocumentDiagnosticReportKind.Full;
    resultId?: string;
    items: Diagnostic[];
}
export interface UnchangedDocumentDiagnosticReport {
    kind: DocumentDiagnosticReportKind.Unchanged;
    resultId: string;
}
export type DocumentDiagnosticReport = RelatedFullDocumentDiagnosticReport | RelatedUnchangedDocumentDiagnosticReport;
export interface RelatedFullDocumentDiagnosticReport extends FullDocumentDiagnosticReport {
    relatedDocuments?: FullDocumentDiagnosticReport | UnchangedDocumentDiagnosticReport;
}
export interface RelatedUnchangedDocumentDiagnosticReport extends UnchangedDocumentDiagnosticReport {
    relatedDocuments?: FullDocumentDiagnosticReport | UnchangedDocumentDiagnosticReport;
}
export interface OcamlTypedHolesParams {
    uri: DocumentUri;
}
export interface OcamlHoverExtendedParams {
    textDocument: TextDocumentIdentifier;
    position: Position;
    verbosity?: number;
}
export type OcamlInferIntfParams = DocumentUri;
export interface OcamlInferIntfResponse {
    result: string;
}
export interface OcamlMerlinCallCompatibleParams {
    uri: DocumentUri;
    command: string;
    args: string[];
    resultAsSexp: boolean;
}
export interface OcamlMerlinCallCompatibleResponse {
    resultAsSexp: boolean;
    result: string;
}
export interface OcamlTypeEnclosingParams {
    uri: TextDocumentIdentifier;
    at: (Position | Range);
    index: number;
    verbosity?: number;
}
export interface OcamlTypeEnclosingResponse {
    enclosings: Range[];
    index: number;
    type: string;
}
export {};
