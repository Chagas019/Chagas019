import XCTest
@testable import JarvisKit

@MainActor
final class ChatViewModelTests: XCTestCase {
    private func chatJSON(reply: String, pending: String? = nil, tools: String = "[]") -> Data {
        let p = pending.map { #","pendingConfirmation":{"summary":"\#($0)"}"# } ?? ""
        let json = #"{"conversationId":"c1","reply":"\#(reply)","provider":"p","model":"m","toolCalls":\#(tools)\#(p),"usage":{"inputTokens":1,"outputTokens":2,"costUsd":0.001}}"#
        return Data(json.utf8)
    }

    func testHappyPath() async throws {
        let rec = Recorder()
        let data = chatJSON(reply: "Olá!", tools: #"[{"name":"list_tasks","status":"ok"}]"#)
        StubURLProtocol.handler = { req in
            rec.add(req)
            return (StubURLProtocol.response(for: req), data)
        }
        let vm = ChatViewModel(api: makeAPI())
        var spoken: String?
        vm.onReply = { spoken = $0 }
        vm.input = "  Oi Jarvis  "
        await vm.send()

        XCTAssertEqual(vm.items.count, 2)
        XCTAssertEqual(vm.items[0].role, .user)
        XCTAssertEqual(vm.items[0].text, "Oi Jarvis")
        XCTAssertEqual(vm.items[1].role, .assistant)
        XCTAssertEqual(vm.items[1].toolCalls.first?.name, "list_tasks")
        XCTAssertEqual(vm.conversationId, "c1")
        XCTAssertNil(vm.pending)
        XCTAssertNil(vm.errorMessage)
        XCTAssertFalse(vm.isSending)
        XCTAssertEqual(vm.input, "")
        XCTAssertEqual(spoken, "Olá!")

        let body = jsonBody(try XCTUnwrap(rec.requests.first))
        XCTAssertEqual(body["message"] as? String, "Oi Jarvis")
        XCTAssertNil(body["conversationId"])
    }

    func testPendingConfirmationFlow() async throws {
        let rec = Recorder()
        let first = chatJSON(reply: "Posso enviar?", pending: "Enviar e-mail", tools: #"[{"name":"send_email","status":"pending_confirmation"}]"#)
        let second = chatJSON(reply: "Enviado.")
        StubURLProtocol.handler = { req in
            let n = rec.add(req)
            return (StubURLProtocol.response(for: req), n == 1 ? first : second)
        }
        let vm = ChatViewModel(api: makeAPI())
        await vm.send("Envie um e-mail")
        XCTAssertEqual(vm.pending?.summary, "Enviar e-mail")

        await vm.confirm()
        XCTAssertNil(vm.pending)
        XCTAssertEqual(vm.items.last?.text, "Enviado.")

        let body = jsonBody(try XCTUnwrap(rec.requests.last))
        XCTAssertEqual(body["confirm"] as? Bool, true)
        XCTAssertEqual(body["message"] as? String, "confirmo")
        XCTAssertEqual(body["conversationId"] as? String, "c1")
    }

    func testErrorSetsMessageAndRetryWorks() async {
        let rec = Recorder()
        let ok = chatJSON(reply: "Agora foi")
        StubURLProtocol.handler = { req in
            let n = rec.add(req)
            if n == 1 {
                return (StubURLProtocol.response(for: req, status: 503),
                        Data(#"{"error":{"code":"provider_unavailable","message":"x"}}"#.utf8))
            }
            return (StubURLProtocol.response(for: req), ok)
        }
        let vm = ChatViewModel(api: makeAPI())
        await vm.send("Oi")
        XCTAssertEqual(vm.errorMessage, "Nenhum provedor de IA está disponível no momento.")
        XCTAssertTrue(vm.canRetry)
        await vm.retry()
        XCTAssertNil(vm.errorMessage)
        XCTAssertEqual(vm.items.last?.text, "Agora foi")
    }

    func testEmptyInputIsIgnored() async {
        StubURLProtocol.handler = { req in
            XCTFail("Não deveria chamar a API")
            return (StubURLProtocol.response(for: req), Data())
        }
        let vm = ChatViewModel(api: makeAPI())
        vm.input = "   "
        await vm.send()
        XCTAssertTrue(vm.items.isEmpty)
    }
}
