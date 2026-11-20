import Foundation

/// Contrato da API do Jarvis consumido pelos view models.
public protocol JarvisAPI: Sendable {
    func chat(_ request: ChatRequest) async throws -> ChatResponse
    func conversations(limit: Int?) async throws -> [Conversation]
    func messages(conversationId: String, limit: Int?) async throws -> [Message]
    func memories(query: String?, limit: Int?) async throws -> [Memory]
    func addMemory(kind: MemoryKind, content: String) async throws -> Memory
    func deleteMemory(id: String) async throws
    func tasks(status: TaskStatus?) async throws -> [JarvisTask]
    func addTask(title: String, notes: String?, dueAt: Date?) async throws -> JarvisTask
    func updateTask(id: String, patch: TaskPatch) async throws -> JarvisTask
    func me() async throws -> MeResponse
    func usage(days: Int) async throws -> UsageResponse
    func integrations() async throws -> IntegrationsResponse
    func googleAuthorizationURL() async throws -> URL
    func disconnectGoogle() async throws
    func registerDevice(apnsToken: String) async throws
}
