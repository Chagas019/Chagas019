import Foundation
import AppIntents
import JarvisKit

struct AddTaskIntent: AppIntent {
    static let title: LocalizedStringResource = "Adicionar tarefa no Jarvis"
    static let description = IntentDescription("Cria uma tarefa, com prazo opcional.")
    static let openAppWhenRun = false

    @Parameter(title: "Título", requestValueDialog: "Qual é a tarefa?")
    var titulo: String

    @Parameter(title: "Prazo")
    var prazo: Date?

    func perform() async throws -> some IntentResult & ProvidesDialog {
        do {
            let task = try await JarvisServices.shared.api.addTask(title: titulo, notes: nil, dueAt: prazo)
            await NotificationScheduler.shared.schedule(task)
            if task.dueAt != nil {
                return .result(dialog: "Tarefa adicionada: \(task.title), com lembrete.")
            }
            return .result(dialog: "Tarefa adicionada: \(task.title).")
        } catch {
            let message = (error as? LocalizedError)?.errorDescription ?? "Não consegui adicionar a tarefa agora."
            return .result(dialog: "\(message)")
        }
    }
}
