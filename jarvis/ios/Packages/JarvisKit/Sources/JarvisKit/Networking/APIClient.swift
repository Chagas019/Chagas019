import Foundation

public final class APIClient: JarvisAPI {
    private let baseURL: URL
    private let transport: HTTPTransport
    private let tokenProvider: @Sendable () async -> String?

    public init(
        baseURL: URL,
        transport: HTTPTransport = URLSessionTransport(),
        tokenProvider: @escaping @Sendable () async -> String?
    ) {
        self.baseURL = baseURL
        self.transport = transport
        self.tokenProvider = tokenProvider
    }

    // MARK: - JarvisAPI

    public func chat(_ request: ChatRequest) async throws -> ChatResponse {
        try await perform("POST", "/v1/chat", body: try encode(request))
    }

    public func conversations(limit: Int?) async throws -> [Conversation] {
        let r: ListResponse<Conversation> = try await perform("GET", "/v1/conversations", query: limitQuery(limit))
        return r.items
    }

    public func messages(conversationId: String, limit: Int?) async throws -> [Message] {
        let r: ListResponse<Message> = try await perform("GET", "/v1/conversations/\(conversationId)/messages", query: limitQuery(limit))
        return r.items
    }

    public func memories(query: String?, limit: Int?) async throws -> [Memory] {
        var items = limitQuery(limit)
        if let query, !query.isEmpty { items.append(URLQueryItem(name: "q", value: query)) }
        let r: ListResponse<Memory> = try await perform("GET", "/v1/memories", query: items)
        return r.items
    }

    public func addMemory(kind: MemoryKind, content: String) async throws -> Memory {
        struct Body: Encodable { let kind: MemoryKind; let content: String }
        return try await perform("POST", "/v1/memories", body: try encode(Body(kind: kind, content: content)))
    }

    public func deleteMemory(id: String) async throws {
        let _: OkResponse = try await perform("DELETE", "/v1/memories/\(id)")
    }

    public func tasks(status: TaskStatus?) async throws -> [JarvisTask] {
        var items: [URLQueryItem] = []
        if let status { items.append(URLQueryItem(name: "status", value: status.rawValue)) }
        let r: ListResponse<JarvisTask> = try await perform("GET", "/v1/tasks", query: items)
        return r.items
    }

    public func addTask(title: String, notes: String?, dueAt: Date?) async throws -> JarvisTask {
        struct Body: Encodable { let title: String; let notes: String?; let dueAt: Date? }
        return try await perform("POST", "/v1/tasks", body: try encode(Body(title: title, notes: notes, dueAt: dueAt)))
    }

    public func updateTask(id: String, patch: TaskPatch) async throws -> JarvisTask {
        try await perform("PATCH", "/v1/tasks/\(id)", body: try encode(patch))
    }

    public func me() async throws -> MeResponse {
        try await perform("GET", "/v1/me")
    }

    public func usage(days: Int) async throws -> UsageResponse {
        try await perform("GET", "/v1/usage", query: [URLQueryItem(name: "days", value: String(days))])
    }

    public func integrations() async throws -> IntegrationsResponse {
        try await perform("GET", "/v1/integrations")
    }

    public func googleAuthorizationURL() async throws -> URL {
        let body: URLResponseBody = try await perform("GET", "/v1/integrations/google/start")
        guard let url = URL(string: body.url) else {
            throw JarvisError.decoding("URL de autorização inválida.")
        }
        return url
    }

    public func disconnectGoogle() async throws {
        let _: OkResponse = try await perform("DELETE", "/v1/integrations/google")
    }

    public func registerDevice(apnsToken: String) async throws {
        struct Body: Encodable { let apnsToken: String }
        let _: OkResponse = try await perform("POST", "/v1/devices", body: try encode(Body(apnsToken: apnsToken)))
    }

    /// Rota pública, sem autenticação.
    public func health() async throws -> HealthResponse {
        try await perform("GET", "/health", authenticated: false)
    }

    // MARK: - Núcleo

    private func limitQuery(_ limit: Int?) -> [URLQueryItem] {
        guard let limit else { return [] }
        return [URLQueryItem(name: "limit", value: String(limit))]
    }

    private func encode<B: Encodable>(_ value: B) throws -> Data {
        do {
            return try JarvisCoding.makeEncoder().encode(value)
        } catch {
            throw JarvisError.decoding("Falha ao codificar a requisição.")
        }
    }

    private func makeRequest(method: String, path: String, query: [URLQueryItem], body: Data?, authenticated: Bool) async throws -> URLRequest {
        guard var comps = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else {
            throw JarvisError.notConfigured("URL da API inválida.")
        }
        var basePath = comps.path
        while basePath.hasSuffix("/") { basePath.removeLast() }
        comps.path = basePath + path
        comps.queryItems = query.isEmpty ? nil : query
        guard let url = comps.url else {
            throw JarvisError.notConfigured("URL da API inválida.")
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 90
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        if authenticated {
            guard let token = await tokenProvider(), !token.isEmpty else {
                throw JarvisError.unauthorized
            }
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        return request
    }

    private func perform<T: Decodable>(
        _ method: String,
        _ path: String,
        query: [URLQueryItem] = [],
        body: Data? = nil,
        authenticated: Bool = true
    ) async throws -> T {
        let request = try await makeRequest(method: method, path: path, query: query, body: body, authenticated: authenticated)
        let data: Data
        let response: HTTPURLResponse
        do {
            (data, response) = try await transport.send(request)
        } catch let error as JarvisError {
            throw error
        } catch is CancellationError {
            throw CancellationError()
        } catch let error as URLError {
            if error.code == .cancelled { throw CancellationError() }
            throw JarvisError.network(error.localizedDescription)
        } catch {
            throw JarvisError.network(error.localizedDescription)
        }

        guard (200..<300).contains(response.statusCode) else {
            let envelope = try? JarvisCoding.makeDecoder().decode(ErrorEnvelope.self, from: data)
            throw JarvisError.from(code: envelope?.error.code, message: envelope?.error.message, status: response.statusCode)
        }
        do {
            return try JarvisCoding.makeDecoder().decode(T.self, from: data)
        } catch {
            throw JarvisError.decoding(String(describing: error))
        }
    }
}
