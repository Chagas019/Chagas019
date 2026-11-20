import Foundation

public struct SupabaseConfig: Sendable, Equatable {
    public let url: URL
    public let anonKey: String

    public init(url: URL, anonKey: String) {
        self.url = url
        self.anonKey = anonKey
    }
}

/// Autenticação via Supabase Auth (REST).
public actor AuthService {
    private let config: SupabaseConfig
    private let store: TokenStore
    private let transport: HTTPTransport
    private let now: @Sendable () -> Date
    private var refreshTask: Task<AuthSession, Error>?

    public init(
        config: SupabaseConfig,
        store: TokenStore,
        transport: HTTPTransport = URLSessionTransport(),
        now: @escaping @Sendable () -> Date = { Date() }
    ) {
        self.config = config
        self.store = store
        self.transport = transport
        self.now = now
    }

    // MARK: - API pública

    public func currentSession() -> AuthSession? {
        store.load()
    }

    public func signIn(email: String, password: String) async throws -> AuthSession {
        let data = try await post(path: "/auth/v1/token", query: [URLQueryItem(name: "grant_type", value: "password")],
                                  body: ["email": email, "password": password])
        let session = try parseSession(data)
        try store.save(session)
        return session
    }

    /// Retorna `nil` quando o projeto exige confirmação por e-mail (sem sessão imediata).
    public func signUp(email: String, password: String) async throws -> AuthSession? {
        let data = try await post(path: "/auth/v1/signup", query: [], body: ["email": email, "password": password])
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              json["access_token"] != nil else {
            return nil
        }
        let session = try parseSession(data)
        try store.save(session)
        return session
    }

    public func refresh() async throws -> AuthSession {
        if let task = refreshTask { return try await task.value }
        guard let current = store.load() else { throw JarvisError.unauthorized }
        let token = current.refreshToken
        let task = Task { try await self.performRefresh(refreshToken: token, previous: current) }
        refreshTask = task
        defer { refreshTask = nil }
        return try await task.value
    }

    /// Access token válido (renova se estiver perto de expirar). `nil` se não houver sessão.
    public func validAccessToken() async -> String? {
        guard let session = store.load() else { return nil }
        guard session.isExpired(at: now()) else { return session.accessToken }
        do {
            return try await refresh().accessToken
        } catch let error as JarvisError {
            switch error {
            case .auth, .unauthorized:
                store.clear()
                return nil
            default:
                return session.accessToken
            }
        } catch {
            // Falha de rede: tenta com o token atual; o servidor decide.
            return session.accessToken
        }
    }

    public func signOut() {
        refreshTask?.cancel()
        refreshTask = nil
        store.clear()
    }

    // MARK: - Internos

    private func performRefresh(refreshToken: String, previous: AuthSession) async throws -> AuthSession {
        let data = try await post(path: "/auth/v1/token", query: [URLQueryItem(name: "grant_type", value: "refresh_token")],
                                  body: ["refresh_token": refreshToken])
        var session = try parseSession(data)
        if session.email == nil || session.userId == nil {
            session = AuthSession(accessToken: session.accessToken, refreshToken: session.refreshToken,
                                  expiresAt: session.expiresAt, userId: session.userId ?? previous.userId,
                                  email: session.email ?? previous.email)
        }
        try store.save(session)
        return session
    }

    private func post(path: String, query: [URLQueryItem], body: [String: String]) async throws -> Data {
        guard var comps = URLComponents(url: config.url, resolvingAgainstBaseURL: false) else {
            throw JarvisError.notConfigured("SUPABASE_URL inválida.")
        }
        var basePath = comps.path
        while basePath.hasSuffix("/") { basePath.removeLast() }
        comps.path = basePath + path
        comps.queryItems = query.isEmpty ? nil : query
        guard let url = comps.url else { throw JarvisError.notConfigured("SUPABASE_URL inválida.") }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 30
        request.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let data: Data
        let response: HTTPURLResponse
        do {
            (data, response) = try await transport.send(request)
        } catch let error as JarvisError {
            throw error
        } catch is CancellationError {
            throw CancellationError()
        } catch {
            throw JarvisError.network(error.localizedDescription)
        }
        guard (200..<300).contains(response.statusCode) else {
            throw mapError(data: data, status: response.statusCode)
        }
        return data
    }

    private struct TokenResponse: Decodable {
        struct User: Decodable {
            let id: String?
            let email: String?
        }
        let accessToken: String
        let refreshToken: String
        let expiresIn: Int?
        let expiresAt: Double?
        let user: User?
    }

    private func parseSession(_ data: Data) throws -> AuthSession {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        do {
            let r = try decoder.decode(TokenResponse.self, from: data)
            let expires: Date
            if let at = r.expiresAt {
                expires = Date(timeIntervalSince1970: at)
            } else {
                expires = now().addingTimeInterval(TimeInterval(r.expiresIn ?? 3600))
            }
            return AuthSession(accessToken: r.accessToken, refreshToken: r.refreshToken, expiresAt: expires,
                               userId: r.user?.id, email: r.user?.email)
        } catch {
            throw JarvisError.decoding("Resposta de autenticação inválida.")
        }
    }

    private func mapError(data: Data, status: Int) -> JarvisError {
        let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
        let raw = (json?["error_description"] as? String)
            ?? (json?["msg"] as? String)
            ?? (json?["message"] as? String)
            ?? (json?["error"] as? String)
            ?? ""
        let lower = raw.lowercased()
        if lower.contains("invalid login credentials") { return .auth("E-mail ou senha incorretos.") }
        if lower.contains("already registered") { return .auth("Este e-mail já está cadastrado.") }
        if lower.contains("email not confirmed") { return .auth("Confirme seu e-mail antes de entrar.") }
        if lower.contains("password should be") { return .auth("A senha é muito curta ou fraca.") }
        if lower.contains("invalid refresh token") || lower.contains("refresh_token_not_found") { return .auth("Sessão expirada. Entre novamente.") }
        if status == 429 { return .rateLimited }
        if status >= 500 { return .server(raw) }
        return .auth(raw.isEmpty ? "Não foi possível autenticar (\(status))." : raw)
    }
}
