import XCTest
@testable import JarvisKit

final class APIClientTests: XCTestCase {
    func testSendsBearerTokenAndDecodes() async throws {
        let rec = Recorder()
        StubURLProtocol.handler = { req in
            rec.add(req)
            return (StubURLProtocol.response(for: req), Data(#"{"userId":"u1","email":"a@b.com"}"#.utf8))
        }
        let me = try await makeAPI().me()
        XCTAssertEqual(me.userId, "u1")
        let req = try XCTUnwrap(rec.requests.first)
        XCTAssertEqual(req.value(forHTTPHeaderField: "Authorization"), "Bearer tok123")
        XCTAssertEqual(req.url?.path, "/v1/me")
        XCTAssertEqual(req.httpMethod, "GET")
    }

    func testMissingTokenThrowsUnauthorizedWithoutNetwork() async {
        let rec = Recorder()
        StubURLProtocol.handler = { req in
            rec.add(req)
            return (StubURLProtocol.response(for: req), Data("{}".utf8))
        }
        do {
            _ = try await makeAPI(token: nil).me()
            XCTFail("Deveria falhar")
        } catch {
            XCTAssertEqual(error as? JarvisError, .unauthorized)
        }
        XCTAssertTrue(rec.requests.isEmpty)
    }

    func testMapsContractErrors() async {
        StubURLProtocol.handler = { req in
            (StubURLProtocol.response(for: req, status: 429),
             Data(#"{"error":{"code":"budget_exceeded","message":"limite"}}"#.utf8))
        }
        do {
            _ = try await makeAPI().usage(days: 1)
            XCTFail("Deveria falhar")
        } catch {
            XCTAssertEqual(error as? JarvisError, .budgetExceeded)
        }
    }

    func testProviderUnavailable503() async {
        StubURLProtocol.handler = { req in
            (StubURLProtocol.response(for: req, status: 503),
             Data(#"{"error":{"code":"provider_unavailable","message":"sem provedor"}}"#.utf8))
        }
        do {
            _ = try await makeAPI().chat(ChatRequest(message: "oi"))
            XCTFail("Deveria falhar")
        } catch {
            XCTAssertEqual(error as? JarvisError, .providerUnavailable)
        }
    }

    func testMemoriesQueryAndTaskBody() async throws {
        let rec = Recorder()
        StubURLProtocol.handler = { req in
            rec.add(req)
            if req.httpMethod == "POST" {
                let json = #"{"id":"t1","userId":"u","title":"Ligar","status":"open","createdAt":"2026-11-20T10:00:00Z"}"#
                return (StubURLProtocol.response(for: req, status: 200), Data(json.utf8))
            }
            return (StubURLProtocol.response(for: req), Data(#"{"items":[]}"#.utf8))
        }
        let api = makeAPI()
        _ = try await api.memories(query: "café", limit: 10)
        let task = try await api.addTask(title: "Ligar", notes: nil, dueAt: Date(timeIntervalSince1970: 1_800_000_000))
        XCTAssertEqual(task.title, "Ligar")

        let first = try XCTUnwrap(rec.requests.first)
        let items = URLComponents(url: try XCTUnwrap(first.url), resolvingAgainstBaseURL: false)?.queryItems ?? []
        XCTAssertEqual(items.first { $0.name == "q" }?.value, "café")
        XCTAssertEqual(items.first { $0.name == "limit" }?.value, "10")

        let body = jsonBody(try XCTUnwrap(rec.requests.last))
        XCTAssertEqual(body["title"] as? String, "Ligar")
        XCTAssertNil(body["notes"])
        XCTAssertTrue((body["dueAt"] as? String)?.hasSuffix("Z") ?? false)
    }

    func testGoogleStartReturnsURL() async throws {
        StubURLProtocol.handler = { req in
            (StubURLProtocol.response(for: req), Data(#"{"url":"https://accounts.google.com/o/oauth2/auth?x=1"}"#.utf8))
        }
        let url = try await makeAPI().googleAuthorizationURL()
        XCTAssertEqual(url.host, "accounts.google.com")
    }
}
