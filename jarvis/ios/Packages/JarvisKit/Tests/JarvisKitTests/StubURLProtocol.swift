import Foundation
@testable import JarvisKit

/// URLProtocol que intercepta requisições e responde com um handler configurável.
final class StubURLProtocol: URLProtocol {
    typealias Handler = @Sendable (URLRequest) throws -> (HTTPURLResponse, Data)

    private static let lock = NSLock()
    private static var storedHandler: Handler?

    static var handler: Handler? {
        get { lock.lock(); defer { lock.unlock() }; return storedHandler }
        set { lock.lock(); defer { lock.unlock() }; storedHandler = newValue }
    }

    static func makeSession() -> URLSession {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubURLProtocol.self]
        return URLSession(configuration: config)
    }

    static func transport() -> URLSessionTransport {
        URLSessionTransport(session: makeSession())
    }

    static func response(for request: URLRequest, status: Int = 200) -> HTTPURLResponse {
        HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: "HTTP/1.1",
                        headerFields: ["Content-Type": "application/json"])!
    }

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        guard let handler = StubURLProtocol.handler else {
            client?.urlProtocol(self, didFailWithError: URLError(.badServerResponse))
            return
        }
        var req = request
        if req.httpBody == nil, let stream = request.httpBodyStream {
            req.httpBody = Self.read(stream)
        }
        do {
            let (response, data) = try handler(req)
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}

    private static func read(_ stream: InputStream) -> Data {
        stream.open()
        defer { stream.close() }
        var data = Data()
        var buffer = [UInt8](repeating: 0, count: 4096)
        while stream.hasBytesAvailable {
            let n = stream.read(&buffer, maxLength: buffer.count)
            if n <= 0 { break }
            data.append(buffer, count: n)
        }
        return data
    }
}

/// Registra requisições recebidas pelo stub (thread-safe).
final class Recorder: @unchecked Sendable {
    private let lock = NSLock()
    private var items: [URLRequest] = []

    @discardableResult
    func add(_ request: URLRequest) -> Int {
        lock.lock(); defer { lock.unlock() }
        items.append(request)
        return items.count
    }

    var requests: [URLRequest] {
        lock.lock(); defer { lock.unlock() }
        return items
    }
}

func jsonBody(_ request: URLRequest) -> [String: Any] {
    guard let data = request.httpBody,
          let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return [:] }
    return obj
}

func makeAPI(token: String? = "tok123") -> APIClient {
    APIClient(baseURL: URL(string: "https://api.test")!, transport: StubURLProtocol.transport(),
              tokenProvider: { token })
}
