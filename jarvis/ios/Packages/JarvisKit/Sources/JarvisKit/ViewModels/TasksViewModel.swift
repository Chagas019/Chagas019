import Foundation
import Combine

@MainActor
public final class TasksViewModel: ObservableObject {
    @Published public private(set) var tasks: [JarvisTask] = []
    @Published public private(set) var isLoading = false
    @Published public var errorMessage: String?

    /// Chamado após cada mudança (agendar notificações, atualizar widget).
    public var onTasksChanged: (([JarvisTask]) -> Void)?

    private let api: JarvisAPI

    public init(api: JarvisAPI) {
        self.api = api
    }

    public var openTasks: [JarvisTask] { tasks.filter { $0.status == .open } }
    public var doneTasks: [JarvisTask] { tasks.filter { $0.status == .done } }

    public func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let result = try await api.tasks(status: nil)
            apply(result)
            errorMessage = nil
        } catch is CancellationError {
            return
        } catch {
            errorMessage = Self.message(error)
        }
    }

    public func add(title: String, notes: String? = nil, dueAt: Date? = nil) async {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let cleanNotes = notes?.trimmingCharacters(in: .whitespacesAndNewlines)
        do {
            let task = try await api.addTask(title: trimmed, notes: (cleanNotes?.isEmpty ?? true) ? nil : cleanNotes, dueAt: dueAt)
            apply(tasks + [task])
            errorMessage = nil
        } catch {
            errorMessage = Self.message(error)
        }
    }

    public func setDone(_ task: JarvisTask, done: Bool) async {
        do {
            let updated = try await api.updateTask(id: task.id, patch: TaskPatch(status: done ? .done : .open))
            apply(tasks.map { $0.id == updated.id ? updated : $0 })
            errorMessage = nil
        } catch {
            errorMessage = Self.message(error)
        }
    }

    public func reset() {
        tasks = []
        onTasksChanged?([])
    }

    private func apply(_ list: [JarvisTask]) {
        tasks = list.sorted { a, b in
            if a.status != b.status { return a.status == .open }
            switch (a.dueAt, b.dueAt) {
            case let (x?, y?): return x < y
            case (_?, nil): return true
            case (nil, _?): return false
            case (nil, nil): return a.createdAt < b.createdAt
            }
        }
        onTasksChanged?(tasks)
    }

    private static func message(_ error: Error) -> String {
        (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
    }
}
