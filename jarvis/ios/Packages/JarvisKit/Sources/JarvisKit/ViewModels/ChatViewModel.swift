import Foundation
import Combine

@MainActor
public final class ChatViewModel: ObservableObject {
    public struct ChatItem: Identifiable, Equatable {
        public let id: UUID
        public let role: Role
        public let text: String
        public let toolCalls: [ToolCallSummary]
        public let date: Date

        public init(id: UUID = UUID(), role: Role, text: String, toolCalls: [ToolCallSummary] = [], date: Date = Date()) {
            self.id = id
            self.role = role
            self.text = text
            self.toolCalls = toolCalls
            self.date = date
        }
    }

    @Published public private(set) var items: [ChatItem] = []
    @Published public var input: String = ""
    @Published public private(set) var isSending = false
    @Published public private(set) var errorMessage: String?
    @Published public private(set) var pending: PendingConfirmation?
    @Published public private(set) var conversationId: String?

    /// Chamado a cada resposta do assistente (ex.: leitura em voz alta).
    public var onReply: ((String) -> Void)?

    private let api: JarvisAPI
    private var lastRequest: ChatRequest?

    public init(api: JarvisAPI) {
        self.api = api
    }

    public var canRetry: Bool { errorMessage != nil && lastRequest != nil }

    /// Envia a mensagem digitada (ou `override`).
    public func send(_ override: String? = nil) async {
        let text = (override ?? input).trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !isSending else { return }
        if override == nil { input = "" }
        errorMessage = nil
        pending = nil
        items.append(ChatItem(role: .user, text: text))
        await perform(ChatRequest(conversationId: conversationId, message: text))
    }

    /// Confirma a ação pendente da última resposta.
    public func confirm() async {
        guard pending != nil, !isSending else { return }
        pending = nil
        errorMessage = nil
        await perform(ChatRequest(conversationId: conversationId, message: "confirmo", confirm: true))
    }

    /// Descarta a ação pendente sem executar.
    public func cancelPending() {
        guard pending != nil else { return }
        pending = nil
        items.append(ChatItem(role: .system, text: "Ação cancelada."))
    }

    public func retry() async {
        guard let request = lastRequest, !isSending else { return }
        errorMessage = nil
        await perform(request)
    }

    public func newConversation() {
        items = []
        conversationId = nil
        pending = nil
        errorMessage = nil
        lastRequest = nil
    }

    public func dismissError() {
        errorMessage = nil
    }

    private func perform(_ request: ChatRequest) async {
        isSending = true
        lastRequest = request
        defer { isSending = false }
        do {
            let response = try await api.chat(request)
            conversationId = response.conversationId
            items.append(ChatItem(role: .assistant, text: response.reply, toolCalls: response.toolCalls))
            pending = response.pendingConfirmation
            lastRequest = nil
            onReply?(response.reply)
        } catch is CancellationError {
            return
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
