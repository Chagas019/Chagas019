import XCTest
@testable import JarvisKit

final class ModelsTests: XCTestCase {
    func testDecodeChatResponseWithPendingConfirmation() throws {
        let json = """
        {"conversationId":"c1","reply":"Posso enviar?","provider":"anthropic","model":"m1",
         "toolCalls":[{"name":"send_email","status":"pending_confirmation"}],
         "pendingConfirmation":{"summary":"Enviar e-mail para Ana"},
         "usage":{"inputTokens":10,"outputTokens":5,"costUsd":0.0012}}
        """
        let r = try JarvisCoding.makeDecoder().decode(ChatResponse.self, from: Data(json.utf8))
        XCTAssertEqual(r.conversationId, "c1")
        XCTAssertEqual(r.toolCalls.first?.status, .pendingConfirmation)
        XCTAssertEqual(r.pendingConfirmation?.summary, "Enviar e-mail para Ana")
        XCTAssertEqual(r.usage.outputTokens, 5)
    }

    func testDecodeChatResponseWithoutPending() throws {
        let json = """
        {"conversationId":"c1","reply":"Oi","provider":"none","model":"none","toolCalls":[],
         "usage":{"inputTokens":0,"outputTokens":0,"costUsd":0}}
        """
        let r = try JarvisCoding.makeDecoder().decode(ChatResponse.self, from: Data(json.utf8))
        XCTAssertNil(r.pendingConfirmation)
        XCTAssertTrue(r.toolCalls.isEmpty)
    }

    func testDatesWithAndWithoutFractionalSeconds() throws {
        let json = """
        {"id":"t1","userId":"u","title":"Pagar conta","dueAt":"2026-11-20T15:30:00.123Z",
         "status":"open","createdAt":"2026-11-20T15:30:00Z"}
        """
        let t = try JarvisCoding.makeDecoder().decode(JarvisTask.self, from: Data(json.utf8))
        let due = try XCTUnwrap(t.dueAt)
        XCTAssertEqual(due.timeIntervalSince(t.createdAt), 0.123, accuracy: 0.001)
        XCTAssertNil(t.notes)
    }

    func testMicrosecondsAreAccepted() {
        XCTAssertNotNil(JarvisDate.parse("2026-11-20T15:30:00.123456+00:00"))
    }

    func testEncodeDateRoundTrip() throws {
        let date = Date(timeIntervalSince1970: 1_800_000_000.5)
        let string = JarvisDate.string(from: date)
        XCTAssertTrue(string.hasSuffix("Z"))
        let back = try XCTUnwrap(JarvisDate.parse(string))
        XCTAssertEqual(back.timeIntervalSince1970, date.timeIntervalSince1970, accuracy: 0.001)
    }

    func testErrorEnvelopeMapsToJarvisError() throws {
        let json = #"{"error":{"code":"budget_exceeded","message":"limite"}}"#
        let env = try JSONDecoder().decode(ErrorEnvelope.self, from: Data(json.utf8))
        XCTAssertEqual(JarvisError.from(code: env.error.code, message: env.error.message, status: 429), .budgetExceeded)
        XCTAssertEqual(JarvisError.budgetExceeded.errorDescription, "O orçamento diário de IA foi atingido. Tente novamente amanhã.")
        XCTAssertEqual(JarvisError.from(code: nil, message: nil, status: 503), .providerUnavailable)
    }

    func testUnknownEnumValuesFallBack() throws {
        let json = """
        {"id":"m1","conversationId":"c","role":"banana","content":"x","createdAt":"2026-11-20T15:30:00Z","meta":{"a":1,"b":[true,null]}}
        """
        let m = try JarvisCoding.makeDecoder().decode(Message.self, from: Data(json.utf8))
        XCTAssertEqual(m.role, .system)
        XCTAssertEqual(m.meta?["a"], .number(1))
    }

    func testSharedStoreRoundTripSortsByDueDate() throws {
        let defaults = try XCTUnwrap(UserDefaults(suiteName: "jarvis.tests.\(UUID().uuidString)"))
        let store = SharedStore(defaults: defaults)
        func task(_ id: String, due: String?, status: String = "open") throws -> JarvisTask {
            let d = due.map { "\"\($0)\"" } ?? "null"
            let json = #"{"id":"\#(id)","userId":"u","title":"T\#(id)","dueAt":\#(d),"status":"\#(status)","createdAt":"2026-11-01T00:00:00Z"}"#
            return try JarvisCoding.makeDecoder().decode(JarvisTask.self, from: Data(json.utf8))
        }
        let tasks = [
            try task("1", due: nil),
            try task("2", due: "2026-12-02T10:00:00Z"),
            try task("3", due: "2026-12-01T10:00:00Z"),
            try task("4", due: "2026-11-30T10:00:00Z", status: "done")
        ]
        store.saveUpcoming(from: tasks)
        XCTAssertEqual(store.loadUpcoming().map(\.id), ["3", "2", "1"])
    }
}
