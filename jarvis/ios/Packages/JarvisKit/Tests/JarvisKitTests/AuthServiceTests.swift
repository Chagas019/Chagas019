import XCTest
@testable import JarvisKit

final class AuthServiceTests: XCTestCase {
    private let config = SupabaseConfig(url: URL(string: "https://proj.supabase.co")!, anonKey: "anon-key")
    private let fixedNow = Date(timeIntervalSince1970: 1_800_000_000)

    private func makeService(store: TokenStore) -> AuthService {
        let now = fixedNow
        return AuthService(config: config, store: store, transport: StubURLProtocol.transport(), now: { now })
    }

    func testSignInParsesSessionAndPersists() async throws {
        let rec = Recorder()
        let json = #"{"access_token":"A1","token_type":"bearer","expires_in":3600,"expires_at":1800003600,"refresh_token":"R1","user":{"id":"u1","email":"a@b.com"}}"#
        StubURLProtocol.handler = { req in
            rec.add(req)
            return (StubURLProtocol.response(for: req), Data(json.utf8))
        }
        let store = InMemoryTokenStore()
        let session = try await makeService(store: store).signIn(email: "a@b.com", password: "segredo")

        XCTAssertEqual(session.accessToken, "A1")
        XCTAssertEqual(session.refreshToken, "R1")
        XCTAssertEqual(session.userId, "u1")
        XCTAssertEqual(session.email, "a@b.com")
        XCTAssertEqual(session.expiresAt.timeIntervalSince1970, 1_800_003_600, accuracy: 0.5)
        XCTAssertEqual(store.load(), session)

        let req = try XCTUnwrap(rec.requests.first)
        XCTAssertEqual(req.url?.path, "/auth/v1/token")
        XCTAssertEqual(req.url?.query, "grant_type=password")
        XCTAssertEqual(req.value(forHTTPHeaderField: "apikey"), "anon-key")
        XCTAssertEqual(jsonBody(req)["email"] as? String, "a@b.com")
    }

    func testExpiresInUsedWhenNoExpiresAt() async throws {
        let json = #"{"access_token":"A","refresh_token":"R","expires_in":100}"#
        StubURLProtocol.handler = { req in (StubURLProtocol.response(for: req), Data(json.utf8)) }
        let session = try await makeService(store: InMemoryTokenStore()).signIn(email: "a@b.com", password: "x")
        XCTAssertEqual(session.expiresAt.timeIntervalSince1970, 1_800_000_100, accuracy: 0.5)
    }

    func testInvalidCredentialsMessageInPortuguese() async {
        StubURLProtocol.handler = { req in
            (StubURLProtocol.response(for: req, status: 400),
             Data(#"{"error":"invalid_grant","error_description":"Invalid login credentials"}"#.utf8))
        }
        do {
            _ = try await makeService(store: InMemoryTokenStore()).signIn(email: "a@b.com", password: "x")
            XCTFail("Deveria falhar")
        } catch {
            XCTAssertEqual(error as? JarvisError, .auth("E-mail ou senha incorretos."))
        }
    }

    func testSignUpWithEmailConfirmationReturnsNil() async throws {
        let rec = Recorder()
        StubURLProtocol.handler = { req in
            rec.add(req)
            return (StubURLProtocol.response(for: req), Data(#"{"id":"u2","email":"x@y.com","confirmation_sent_at":"2026-11-20T10:00:00Z"}"#.utf8))
        }
        let store = InMemoryTokenStore()
        let result = try await makeService(store: store).signUp(email: "x@y.com", password: "12345678")
        XCTAssertNil(result)
        XCTAssertNil(store.load())
        XCTAssertEqual(rec.requests.first?.url?.path, "/auth/v1/signup")
    }

    func testValidAccessTokenRefreshesWhenExpired() async throws {
        let rec = Recorder()
        let json = #"{"access_token":"A2","refresh_token":"R2","expires_in":3600}"#
        StubURLProtocol.handler = { req in
            rec.add(req)
            return (StubURLProtocol.response(for: req), Data(json.utf8))
        }
        let expired = AuthSession(accessToken: "A1", refreshToken: "R1",
                                  expiresAt: Date(timeIntervalSince1970: 1_799_999_999), userId: "u1", email: "a@b.com")
        let store = InMemoryTokenStore(session: expired)
        let token = await makeService(store: store).validAccessToken()

        XCTAssertEqual(token, "A2")
        let req = try XCTUnwrap(rec.requests.first)
        XCTAssertEqual(req.url?.query, "grant_type=refresh_token")
        XCTAssertEqual(jsonBody(req)["refresh_token"] as? String, "R1")
        XCTAssertEqual(store.load()?.refreshToken, "R2")
        XCTAssertEqual(store.load()?.email, "a@b.com")
    }

    func testValidTokenDoesNotHitNetwork() async {
        StubURLProtocol.handler = { req in
            XCTFail("Não deveria renovar")
            return (StubURLProtocol.response(for: req), Data())
        }
        let fresh = AuthSession(accessToken: "A1", refreshToken: "R1", expiresAt: Date(timeIntervalSince1970: 1_800_003_600))
        let token = await makeService(store: InMemoryTokenStore(session: fresh)).validAccessToken()
        XCTAssertEqual(token, "A1")
    }

    func testSignOutClearsStore() async {
        let store = InMemoryTokenStore(session: AuthSession(accessToken: "A", refreshToken: "R", expiresAt: fixedNow))
        let service = makeService(store: store)
        await service.signOut()
        XCTAssertNil(store.load())
    }
}
