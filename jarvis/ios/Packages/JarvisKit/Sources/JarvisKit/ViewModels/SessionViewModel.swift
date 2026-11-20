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

    /// `bypass`: usa token de desenvolvimento (sem login).
    public init(auth: AuthService, bypass: Bool = false) {
        self.auth = auth
        self.bypass = bypass
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
