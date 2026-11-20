import Foundation
import Combine

@MainActor
public final class SessionViewModel: ObservableObject {
    public enum State: Equatable {
        case loading
        case signedOut
        case signedIn(email: String?)
    }

    @Published public private(set) var state: State = .loading
    @Published public private(set) var isBusy = false
    @Published public var errorMessage: String?
    @Published public var infoMessage: String?

    private let auth: AuthService
    private let bypass: Bool
    private let accessTokenStore: TokenStore?
    private let verifyAccess: (@Sendable () async throws -> Void)?

    /// `bypass`: usa token de desenvolvimento (sem login).
    /// `accessTokenStore`: guarda o token de acesso pessoal (JARVIS_OWNER_TOKEN) colado no app.
    /// `verifyAccess`: chamada à API (ex.: /v1/me) que confirma o token recém-salvo.
    public init(auth: AuthService, bypass: Bool = false, accessTokenStore: TokenStore? = nil, verifyAccess: (@Sendable () async throws -> Void)? = nil) {
        self.auth = auth
        self.bypass = bypass
        self.accessTokenStore = accessTokenStore
        self.verifyAccess = verifyAccess
    }

    /// Entra com o token de acesso pessoal: salva no Keychain, valida na API e desfaz se falhar.
    public func signIn(accessToken: String) async {
        let token = accessToken.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let store = accessTokenStore else { return }
        guard token.count >= 32 else {
            errorMessage = "Token inválido: deve ter pelo menos 32 caracteres."
            return
        }
        await run {
            try store.save(AuthSession(accessToken: token, refreshToken: "", expiresAt: .distantFuture))
            do {
                try await self.verifyAccess?()
            } catch {
                store.clear()
                throw error
            }
            self.state = .signedIn(email: nil)
        }
    }

    public var isSignedIn: Bool {
        if case .signedIn = state { return true }
        return false
    }

    public func restore() async {
        if bypass {
            state = .signedIn(email: "dev-user")
            return
        }
        if accessTokenStore?.load() != nil {
            state = .signedIn(email: nil)
            return
        }
        if let session = await auth.currentSession() {
            state = .signedIn(email: session.email)
        } else {
            state = .signedOut
        }
    }

    public func signIn(email: String, password: String) async {
        await run {
            let session = try await self.auth.signIn(email: email.trimmingCharacters(in: .whitespaces), password: password)
            self.state = .signedIn(email: session.email ?? email)
        }
    }

    public func signUp(email: String, password: String) async {
        await run {
            let session = try await self.auth.signUp(email: email.trimmingCharacters(in: .whitespaces), password: password)
            if let session {
                self.state = .signedIn(email: session.email ?? email)
            } else {
                self.infoMessage = "Conta criada. Confirme seu e-mail e depois entre."
            }
        }
    }

    public func signOut() async {
        accessTokenStore?.clear()
        await auth.signOut()
        state = .signedOut
    }

    private func run(_ work: @MainActor () async throws -> Void) async {
        guard !isBusy else { return }
        isBusy = true
        errorMessage = nil
        infoMessage = nil
        defer { isBusy = false }
        do {
            try await work()
        } catch is CancellationError {
            return
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }
}
