import Foundation
import Combine

@MainActor
public final class MemoriesViewModel: ObservableObject {
    @Published public private(set) var items: [Memory] = []
    @Published public private(set) var isLoading = false
    @Published public var errorMessage: String?
    @Published public var query: String = ""

    private let api: JarvisAPI

    public init(api: JarvisAPI) {
        self.api = api
    }

    public func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
            items = try await api.memories(query: q.isEmpty ? nil : q, limit: 100)
            errorMessage = nil
        } catch is CancellationError {
            return
        } catch {
            errorMessage = Self.message(error)
        }
    }

    public func add(kind: MemoryKind, content: String) async {
        let trimmed = content.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        do {
            let memory = try await api.addMemory(kind: kind, content: trimmed)
            items.insert(memory, at: 0)
            errorMessage = nil
        } catch {
            errorMessage = Self.message(error)
        }
    }

    public func remove(_ memory: Memory) async {
        do {
            try await api.deleteMemory(id: memory.id)
            items.removeAll { $0.id == memory.id }
            errorMessage = nil
        } catch {
            errorMessage = Self.message(error)
        }
    }

    public func reset() {
        items = []
        query = ""
    }

    private static func message(_ error: Error) -> String {
        (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
    }
}
