import Foundation
import Security

public struct AuthSession: Codable, Equatable, Sendable {
    public let accessToken: String
    public let refreshToken: String
    public let expiresAt: Date
    public let userId: String?
    public let email: String?

    public init(accessToken: String, refreshToken: String, expiresAt: Date, userId: String? = nil, email: String? = nil) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.expiresAt = expiresAt
        self.userId = userId
        self.email = email
    }

    public func isExpired(at date: Date, leeway: TimeInterval = 60) -> Bool {
        expiresAt.timeIntervalSince(date) <= leeway
    }
}

public protocol TokenStore: Sendable {
    func load() -> AuthSession?
    func save(_ session: AuthSession) throws
    func clear()
}

/// Armazenamento em memória (testes e previews).
public final class InMemoryTokenStore: TokenStore, @unchecked Sendable {
    private let lock = NSLock()
    private var session: AuthSession?

    public init(session: AuthSession? = nil) {
        self.session = session
    }

    public func load() -> AuthSession? {
        lock.lock(); defer { lock.unlock() }
        return session
    }

    public func save(_ session: AuthSession) throws {
        lock.lock(); defer { lock.unlock() }
        self.session = session
    }

    public func clear() {
        lock.lock(); defer { lock.unlock() }
        session = nil
    }
}

/// Armazenamento seguro no Keychain (item genérico por serviço/conta).
public final class KeychainTokenStore: TokenStore {
    private let service: String
    private let account: String

    public init(service: String = "com.chagas019.jarvis.session", account: String = "default") {
        self.service = service
        self.account = account
    }

    private func baseQuery() -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
    }

    public func load() -> AuthSession? {
        var query = baseQuery()
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return try? JarvisCoding.makeDecoder().decode(AuthSession.self, from: data)
    }

    public func save(_ session: AuthSession) throws {
        let data = try JarvisCoding.makeEncoder().encode(session)
        SecItemDelete(baseQuery() as CFDictionary)
        var attributes = baseQuery()
        attributes[kSecValueData as String] = data
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        let status = SecItemAdd(attributes as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw JarvisError.auth("Não foi possível salvar a sessão no Keychain (código \(status)).")
        }
    }

    public func clear() {
        SecItemDelete(baseQuery() as CFDictionary)
    }
}
