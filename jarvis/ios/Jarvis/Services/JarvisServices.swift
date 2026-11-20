import Foundation
import JarvisKit

/// Serviços compartilhados (app e App Intents). Configuração vem do Info.plist (xcconfig).
final class JarvisServices: Sendable {
    static let shared = JarvisServices()

    let auth: AuthService
    let api: APIClient
    /// Token de desenvolvimento (JARVIS_DEV_TOKEN); quando presente, o login é ignorado.
    let devToken: String?
    /// Token de acesso pessoal colado no app (Keychain).
    let accessTokenStore: KeychainTokenStore

    private init() {
        let apiURL = URL(string: Self.plistString("JarvisAPIURL")) ?? URL(string: "http://localhost:8787")!
        let supabaseURL = URL(string: Self.plistString("SupabaseURL")) ?? URL(string: "https://example.supabase.co")!
        let anonKey = Self.plistString("SupabaseAnonKey")
        let dev = Self.plistString("JarvisDevToken")
        let devToken: String? = dev.isEmpty ? nil : dev

        let auth = AuthService(
            config: SupabaseConfig(url: supabaseURL, anonKey: anonKey),
            store: KeychainTokenStore()
        )
        let accessTokenStore = KeychainTokenStore(account: "owner-token")
        self.auth = auth
        self.devToken = devToken
        self.accessTokenStore = accessTokenStore
        self.api = APIClient(baseURL: apiURL, tokenProvider: {
            if let devToken { return devToken }
            if let owner = accessTokenStore.load()?.accessToken { return owner }
            return await auth.validAccessToken()
        })
    }

    private static func plistString(_ key: String) -> String {
        let value = (Bundle.main.object(forInfoDictionaryKey: key) as? String) ?? ""
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.contains("$(") ? "" : trimmed
    }
}
