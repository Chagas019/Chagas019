import Foundation

/// Tarefa resumida compartilhada com o widget via App Group.
public struct WidgetTask: Codable, Hashable, Identifiable, Sendable {
    public let id: String
    public let title: String
    public let dueAt: Date?

    public init(id: String, title: String, dueAt: Date?) {
        self.id = id
        self.title = title
        self.dueAt = dueAt
    }
}

/// UserDefaults do App Group (app -> widget).
public final class SharedStore: @unchecked Sendable {
    public static let fallbackGroupID = "group.com.chagas019.jarvis"
    private static let upcomingKey = "upcomingTasks"

    private let defaults: UserDefaults

    public init(defaults: UserDefaults) {
        self.defaults = defaults
    }

    public convenience init(groupID: String) {
        self.init(defaults: UserDefaults(suiteName: groupID) ?? .standard)
    }

    /// App Group lido do Info.plist (`JarvisAppGroup`), com fallback para o padrão.
    public static func appGroupID(bundle: Bundle = .main) -> String {
        if let id = bundle.object(forInfoDictionaryKey: "JarvisAppGroup") as? String,
           !id.isEmpty, !id.contains("$(") {
            return id
        }
        return fallbackGroupID
    }

    public static var shared: SharedStore {
        SharedStore(groupID: appGroupID())
    }

    /// Salva as próximas tarefas abertas (ordenadas por vencimento, sem prazo por último).
    public func saveUpcoming(from tasks: [JarvisTask], limit: Int = 8) {
        let open = tasks.filter { $0.status == .open }
        let sorted = open.sorted { a, b in
            switch (a.dueAt, b.dueAt) {
            case let (x?, y?): return x < y
            case (_?, nil): return true
            case (nil, _?): return false
            case (nil, nil): return a.createdAt < b.createdAt
            }
        }
        let items = sorted.prefix(limit).map { WidgetTask(id: $0.id, title: $0.title, dueAt: $0.dueAt) }
        if let data = try? JarvisCoding.makeEncoder().encode(Array(items)) {
            defaults.set(data, forKey: Self.upcomingKey)
        }
    }

    public func loadUpcoming() -> [WidgetTask] {
        guard let data = defaults.data(forKey: Self.upcomingKey),
              let items = try? JarvisCoding.makeDecoder().decode([WidgetTask].self, from: data) else {
            return []
        }
        return items
    }

    public func clear() {
        defaults.removeObject(forKey: Self.upcomingKey)
    }
}
