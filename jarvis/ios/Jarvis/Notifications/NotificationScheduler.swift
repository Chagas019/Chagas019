import Foundation
import UserNotifications
import JarvisKit

/// Notificações locais para tarefas com prazo (`dueAt`).
@MainActor
final class NotificationScheduler {
    static let shared = NotificationScheduler()

    private static let prefix = "jarvis.task."
    private static let maxPending = 60 // iOS permite no máximo 64 pendentes
    private let center = UNUserNotificationCenter.current()

    private init() {}

    func requestAuthorization() async -> Bool {
        (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
    }

    func authorizationStatus() async -> UNAuthorizationStatus {
        await center.notificationSettings().authorizationStatus
    }

    /// Sincroniza as notificações pendentes com a lista de tarefas (adiciona novas, remove concluídas/removidas).
    func sync(tasks: [JarvisTask]) async {
        let status = await authorizationStatus()
        guard status == .authorized || status == .provisional || status == .ephemeral else { return }

        let now = Date()
        let wanted = tasks
            .filter { $0.status == .open && ($0.dueAt ?? .distantPast) > now }
            .sorted { ($0.dueAt ?? .distantFuture) < ($1.dueAt ?? .distantFuture) }
            .prefix(Self.maxPending)
        let wantedIDs = Set(wanted.map { Self.identifier(for: $0.id) })

        let pending = await center.pendingNotificationRequests()
        let stale = pending.map(\.identifier).filter { $0.hasPrefix(Self.prefix) && !wantedIDs.contains($0) }
        if !stale.isEmpty {
            center.removePendingNotificationRequests(withIdentifiers: stale)
        }
        for task in wanted {
            await schedule(task)
        }
    }

    /// Agenda (ou reagenda) a notificação de uma tarefa com prazo futuro.
    func schedule(_ task: JarvisTask) async {
        guard task.status == .open, let due = task.dueAt, due > Date() else { return }
        let content = UNMutableNotificationContent()
        content.title = "Tarefa"
        content.body = task.title
        if let notes = task.notes, !notes.isEmpty {
            content.subtitle = notes
        }
        content.sound = .default
        let comps = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute, .second], from: due)
        let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
        let request = UNNotificationRequest(identifier: Self.identifier(for: task.id), content: content, trigger: trigger)
        try? await center.add(request)
    }

    func remove(taskID: String) {
        center.removePendingNotificationRequests(withIdentifiers: [Self.identifier(for: taskID)])
    }

    func removeAll() async {
        let pending = await center.pendingNotificationRequests()
        let ids = pending.map(\.identifier).filter { $0.hasPrefix(Self.prefix) }
        center.removePendingNotificationRequests(withIdentifiers: ids)
    }

    private static func identifier(for taskID: String) -> String {
        prefix + taskID
    }
}
