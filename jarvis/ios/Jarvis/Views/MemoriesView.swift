import SwiftUI
import JarvisKit

struct MemoriesView: View {
    @ObservedObject var vm: MemoriesViewModel
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
                if vm.items.isEmpty && !vm.isLoading {
                    ContentUnavailableView("Sem memórias", systemImage: "brain.head.profile",
                                           description: Text("O Jarvis guarda aqui fatos e preferências sobre você."))
                        .listRowBackground(Color.clear)
                }
                ForEach(vm.items) { memory in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(memory.kind.displayName.uppercased())
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(Color.accentColor)
                        Text(memory.content)
                        Text(memory.createdAt.formatted(date: .abbreviated, time: .omitted))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) {
                            Task { await vm.remove(memory) }
                        } label: {
                            Label("Apagar", systemImage: "trash")
                        }
                    }
                }
            }
            .animation(.snappy, value: vm.items)
            .overlay {
                if vm.isLoading && vm.items.isEmpty { ProgressView() }
            }
            .searchable(text: $vm.query, prompt: "Buscar memórias")
            .onSubmit(of: .search) { Task { await vm.load() } }
            .refreshable { await vm.load() }
            .navigationTitle("Memória")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showingAdd = true } label: { Image(systemName: "plus") }
                        .accessibilityLabel("Nova memória")
                }
            }
            .sheet(isPresented: $showingAdd) {
                AddMemorySheet { kind, content in
                    await vm.add(kind: kind, content: content)
                }
            }
            .task { await vm.load() }
        }
    }
}

private struct AddMemorySheet: View {
    let onSave: (MemoryKind, String) async -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var kind: MemoryKind = .fact
    @State private var content = ""
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            Form {
                Picker("Tipo", selection: $kind) {
                    ForEach(MemoryKind.allCases, id: \.self) { Text($0.displayName).tag($0) }
                }
                TextField("O que o Jarvis deve lembrar?", text: $content, axis: .vertical)
                    .lineLimit(2...6)
            }
            .navigationTitle("Nova memória")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Salvar") {
                        isSaving = true
                        Task {
                            await onSave(kind, content)
                            dismiss()
                        }
                    }
                    .disabled(content.trimmingCharacters(in: .whitespaces).isEmpty || isSaving)
                }
            }
        }
        .presentationDetents([.medium])
    }
}
