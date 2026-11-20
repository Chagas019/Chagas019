import SwiftUI
import JarvisKit

struct TasksView: View {
    @ObservedObject var vm: TasksViewModel
    @State private var showingAdd = false

    var body: some View {
        NavigationStack {
            List {
                if let error = vm.errorMessage {
                    Section {
                        Label(error, systemImage: "exclamationmark.triangle.fill")
                            .font(.footnote)
                            .foregroundStyle(.orange)
                    }
                }
                if vm.tasks.isEmpty && !vm.isLoading {
                    ContentUnavailableView("Sem tarefas", systemImage: "checklist",
                                           description: Text("Toque em + ou peça ao Jarvis para criar uma."))
                        .listRowBackground(Color.clear)
                }
                if !vm.openTasks.isEmpty {
                    Section("Abertas") {
                        ForEach(vm.openTasks) { task in
                            TaskRow(task: task) { Task { await vm.setDone(task, done: true) } }
                                .swipeActions(edge: .trailing) {
                                    Button { Task { await vm.setDone(task, done: true) } } label: {
                                        Label("Concluir", systemImage: "checkmark")
                                    }
                                    .tint(.green)
                                }
                        }
                    }
                }
                if !vm.doneTasks.isEmpty {
                    Section("Concluídas") {
                        ForEach(vm.doneTasks) { task in
                            TaskRow(task: task) { Task { await vm.setDone(task, done: false) } }
                        }
                    }
                }
            }
            .animation(.snappy, value: vm.tasks)
            .overlay {
                if vm.isLoading && vm.tasks.isEmpty { ProgressView() }
            }
            .refreshable { await vm.load() }
            .navigationTitle("Tarefas")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showingAdd = true } label: { Image(systemName: "plus") }
                        .accessibilityLabel("Nova tarefa")
                }
            }
            .sheet(isPresented: $showingAdd) {
                AddTaskSheet { title, notes, due in
                    await vm.add(title: title, notes: notes, dueAt: due)
                }
            }
            .task { await vm.load() }
        }
    }
}

private struct TaskRow: View {
    let task: JarvisTask
    let toggle: () -> Void

    private var isDone: Bool { task.status == .done }
    private var isOverdue: Bool {
        guard !isDone, let due = task.dueAt else { return false }
        return due < Date()
    }

    var body: some View {
        HStack(spacing: 12) {
            Button(action: toggle) {
                Image(systemName: isDone ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundStyle(isDone ? Color.green : Color.accentColor)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(isDone ? "Reabrir tarefa" : "Concluir tarefa")

            VStack(alignment: .leading, spacing: 2) {
                Text(task.title)
                    .strikethrough(isDone)
                    .foregroundStyle(isDone ? Color.secondary : Color.primary)
                if let notes = task.notes, !notes.isEmpty {
                    Text(notes).font(.footnote).foregroundStyle(.secondary).lineLimit(2)
                }
                if let due = task.dueAt {
                    Label(due.formatted(date: .abbreviated, time: .shortened), systemImage: "clock")
                        .font(.caption)
                        .foregroundStyle(isOverdue ? Color.red : Color.secondary)
                }
            }
        }
    }
}

private struct AddTaskSheet: View {
    let onSave: (String, String?, Date?) async -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var notes = ""
    @State private var hasDue = false
    @State private var due = Date().addingTimeInterval(3600)
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Título", text: $title)
                    TextField("Notas (opcional)", text: $notes, axis: .vertical)
                        .lineLimit(1...4)
                }
                Section {
                    Toggle("Definir prazo", isOn: $hasDue.animation())
                    if hasDue {
                        DatePicker("Prazo", selection: $due, in: Date()...)
                    }
                } footer: {
                    if hasDue { Text("O Jarvis avisa com uma notificação neste horário.") }
                }
            }
            .navigationTitle("Nova tarefa")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Salvar") {
                        isSaving = true
                        Task {
                            await onSave(title, notes, hasDue ? due : nil)
                            dismiss()
                        }
                    }
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty || isSaving)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
}
