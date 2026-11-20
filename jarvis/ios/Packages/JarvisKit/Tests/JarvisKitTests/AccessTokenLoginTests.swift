import XCTest
@testable import JarvisKit

@MainActor
final class AccessTokenLoginTests: XCTestCase {
    private struct Denied: LocalizedError { var errorDescription: String? { "não autorizado" } }

    private func makeAuth() -> AuthService {
        AuthService(config: SupabaseConfig(url: URL(string: "https://example.supabase.co")!, anonKey: ""), store: InMemoryTokenStore())
    }

    func testValidTokenSignsInAndPersists() async {
        let store = InMemoryTokenStore()
        let vm = SessionViewModel(auth: makeAuth(), accessTokenStore: store, verifyAccess: {})
        await vm.signIn(accessToken: "  " + String(repeating: "a", count: 64) + "\n")
        XCTAssertTrue(vm.isSignedIn)
        XCTAssertEqual(store.load()?.accessToken, String(repeating: "a", count: 64))

        let restored = SessionViewModel(auth: makeAuth(), accessTokenStore: store)
        await restored.restore()
        XCTAssertTrue(restored.isSignedIn)

        await restored.signOut()
        XCTAssertNil(store.load())
    }

    func testRejectedTokenIsNotKept() async {
        let store = InMemoryTokenStore()
        let vm = SessionViewModel(auth: makeAuth(), accessTokenStore: store, verifyAccess: { throw Denied() })
        await vm.signIn(accessToken: String(repeating: "b", count: 64))
        XCTAssertFalse(vm.isSignedIn)
        XCTAssertNil(store.load())
        XCTAssertEqual(vm.errorMessage, "não autorizado")
    }

    func testShortTokenRejectedWithoutCallingAPI() async {
        let store = InMemoryTokenStore()
        let vm = SessionViewModel(auth: makeAuth(), accessTokenStore: store, verifyAccess: { XCTFail("não deveria chamar a API") })
        await vm.signIn(accessToken: "curto")
        XCTAssertFalse(vm.isSignedIn)
        XCTAssertNotNil(vm.errorMessage)
    }
}
