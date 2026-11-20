import WidgetKit
import SwiftUI
import JarvisKit

private enum WidgetPalette {
    static let accent = Color(red: 0.31, green: 0.38, blue: 0.94)
    static let overdue = Color(red: 0.90, green: 0.26, blue: 0.27)
}

struct TasksEntry: TimelineEntry {
    let date: Date
    let tasks: [WidgetTask]
}

struct TasksProvider: TimelineProvider {
    func placeholder(in context: Context) -> TasksEntry {
        TasksEntry(date: Date(), tasks: [
            WidgetTask(id: "1", title: "Ligar para o contador", dueAt: Date().addingTimeInterval(3600)),
            WidgetTask(id: "2", title: "Comprar café", dueAt: nil)
        ])
    }

    func getSnapshot(in context: Context, completion: @escaping (TasksEntry) -> Void) {
        if context.isPreview {
            completion(placeholder(in: context))
        } else {
            completion(TasksEntry(date: Date(), tasks: SharedStore.shared.loadUpcoming()))
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TasksEntry>) -> Void) {
        let now = Date()
        let entry = TasksEntry(date: now, tasks: SharedStore.shared.loadUpcoming())
        let next = Calendar.current.date(byAdding: .minute, value: 15, to: now) ?? now.addingTimeInterval(900)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

struct TasksWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: TasksEntry

    private var limit: Int { family == .systemSmall ? 3 : 4 }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: "checklist")
                Text("Próximas tarefas")
                    .lineLimit(1)
                Spacer(minLength: 0)
            }
            .font(.caption.weight(.semibold))
            .foregroundStyle(WidgetPalette.accent)

            if entry.tasks.isEmpty {
                Spacer(minLength: 0)
                Text("Nada pendente")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer(minLength: 0)
            } else {
                ForEach(entry.tasks.prefix(limit)) { task in
                    TaskLine(task: task, now: entry.date, showDate: family != .systemSmall)
                }
                Spacer(minLength: 0)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

private struct TaskLine: View {
    let task: WidgetTask
    let now: Date
    let showDate: Bool

    private var isOverdue: Bool {
        guard let due = task.dueAt else { return false }
        return due < now
    }

    var body: some View {
        HStack(spacing: 8) {
            RoundedRectangle(cornerRadius: 2, style: .continuous)
                .fill(isOverdue ? WidgetPalette.overdue : WidgetPalette.accent)
                .frame(width: 3, height: 26)
            VStack(alignment: .leading, spacing: 1) {
                Text(task.title)
                    .font(.footnote.weight(.medium))
                    .lineLimit(1)
                if let due = task.dueAt {
                    Text(due, format: .dateTime.day().month(.abbreviated).hour().minute())
                        .font(.caption2)
                        .foregroundStyle(isOverdue ? WidgetPalette.overdue : Color.secondary)
                } else if showDate {
                    Text("Sem prazo")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer(minLength: 0)
        }
    }
}

struct UpcomingTasksWidget: Widget {
    let kind = "JarvisUpcomingTasks"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TasksProvider()) { entry in
            TasksWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    Color(.systemBackground)
                }
        }
        .configurationDisplayName("Próximas tarefas")
        .description("Veja suas próximas tarefas do Jarvis.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct JarvisWidgetBundle: WidgetBundle {
    var body: some Widget {
        UpcomingTasksWidget()
    }
}
