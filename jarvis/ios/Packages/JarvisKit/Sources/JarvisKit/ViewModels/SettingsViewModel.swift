import Foundation
import Combine

@MainActor
public final class SettingsViewModel: ObservableObject {
    @Published public private(set) var email: String?
    @Published public private(set) var usage: UsageResponse?
    @Published public private(set) var integrations: IntegrationsResponse?
    @Published public private(set) var isLoading = false
    @Published public var errorMessage: String?

    private let api: JarvisAPI

    public init(api: JarvisAPI) {
        self.api = api
    }

    public func load() async {
        isLoading = true
        defer { isLoading = false }
        var firstError: String?
        do { email = try await api.me().email } catch { firstError = firstError ?? Self.message(error) }
        do { usage = try await api.usage(days: 1) } catch { firstError = firstError ?? Self.message(error) }
        do { integrations = try await api.integrations() } catch { firstError = firstError ?? Self.message(error) }
        errorMessage = firstError
    }

    public func googleAuthorizationURL() async -> URL? {
        do {
            return try await api.googleAuthorizationURL()
        } catch {
            errorMessage = Self.message(error)
            return nil
        }
    }

    public func disconnectGoogle() async {
        do {
            try await api.disconnectGoogle()
            integrations = try await api.integrations()
            errorMessage = nil
        } catch {
            errorMessage = Self.message(error)
        }
    }

    public func reset() {
        email = nil
        usage = nil
        integrations = nil
        errorMessage = nil
    }

    private static func message(_ error: Error) -> String {
        (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
    }
}
