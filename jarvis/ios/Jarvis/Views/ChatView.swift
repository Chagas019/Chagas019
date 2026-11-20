import SwiftUI
import JarvisKit

struct ChatView: View {
    @ObservedObject var vm: ChatViewModel
    @EnvironmentObject private var env: AppEnvironment
    @StateObject private var recognizer = SpeechRecognizer()
    @FocusState private var inputFocused: Bool

    private let suggestions = [
        "O que tenho para hoje?",
        "Crie uma tarefa: comprar café",
        "Resuma minhas tarefas abertas"
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                messages
                if let error = vm.errorMessage {
                    ErrorBanner(
                        message: error,
                        retry: vm.canRetry ? retryTapped : nil,
                        dismiss: { vm.dismissError() }
                    )
                    .padding(.bottom, 6)
                }
                if let speechError = recognizer.errorMessage {
                    ErrorBanner(message: speechError, retry: nil, dismiss: { recognizer.clearError() })
                        .padding(.bottom, 6)
                }
                inputBar
            }
            .navigationTitle("Jarvis")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        env.speaker.stop()
                        vm.newConversation()
                    } label: {
                        Image(systemName: "square.and.pencil")
                    }
                    .accessibilityLabel("Nova conversa")
                    .disabled(vm.items.isEmpty)
                }
            }
        }
    }

    private var messages: some View {
        ScrollViewReader { proxy in
            ScrollView {
                if vm.items.isEmpty && !vm.isSending {
                    emptyState
                } else {
                    LazyVStack(spacing: 10) {
                        ForEach(vm.items) { item in
                            MessageBubble(item: item)
                                .id(item.id)
                        }
                        if vm.isSending {
                            TypingBubble().id("typing")
                        }
                        if let pending = vm.pending {
                            ConfirmationCard(
                                summary: pending.summary,
                                onConfirm: { Task { await vm.confirm() } },
                                onCancel: { vm.cancelPending() }
                            )
                            .id("pending")
                            .transition(.scale(scale: 0.95).combined(with: .opacity))
                        }
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 12)
                }
            }
            .scrollDismissesKeyboard(.interactively)
            .animation(.snappy, value: vm.items.count)
            .animation(.snappy, value: vm.pending)
            .onChange(of: vm.items.count) { _, _ in scrollToEnd(proxy) }
            .onChange(of: vm.isSending) { _, _ in scrollToEnd(proxy) }
            .onChange(of: vm.pending) { _, _ in scrollToEnd(proxy) }
        }
    }

    private func retryTapped() {
        Task { await vm.retry() }
    }

    private func scrollToEnd(_ proxy: ScrollViewProxy) {
        withAnimation(.snappy) {
            if vm.pending != nil {
                proxy.scrollTo("pending", anchor: .bottom)
            } else if vm.isSending {
                proxy.scrollTo("typing", anchor: .bottom)
            } else if let last = vm.items.last {
                proxy.scrollTo(last.id, anchor: .bottom)
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "waveform.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(Color.accentColor)
            Text("Como posso ajudar?")
                .font(.title2.weight(.semibold))
            VStack(spacing: 8) {
                ForEach(suggestions, id: \.self) { text in
                    Button {
                        Task { await vm.send(text) }
                    } label: {
                        Text(text)
                            .font(.subheadline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                            .background(Color(.secondarySystemBackground), in: Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 24)
        }
        .padding(.top, 80)
        .frame(maxWidth: .infinity)
    }

    private var inputBar: some View {
        HStack(alignment: .bottom, spacing: 8) {
            TextField("Mensagem", text: $vm.input, axis: .vertical)
                .lineLimit(1...5)
                .focused($inputFocused)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 20, style: .continuous))

            Button {
                Task { await toggleMic() }
            } label: {
                Image(systemName: recognizer.isRecording ? "stop.circle.fill" : "mic.circle.fill")
                    .font(.system(size: 34))
                    .foregroundStyle(recognizer.isRecording ? Color.red : Color.accentColor)
                    .symbolEffect(.pulse, isActive: recognizer.isRecording)
            }
            .accessibilityLabel(recognizer.isRecording ? "Parar gravação" : "Falar")

            Button {
                inputFocused = false
                Task { await vm.send() }
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 34))
            }
            .disabled(vm.input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || vm.isSending)
            .accessibilityLabel("Enviar")
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(.bar)
        .onChange(of: recognizer.transcript) { _, text in
            if recognizer.isRecording || !text.isEmpty { vm.input = text }
        }
    }

    private func toggleMic() async {
        if recognizer.isRecording {
            recognizer.stop()
        } else {
            env.speaker.stop()
            await recognizer.start()
        }
    }
}

struct MessageBubble: View {
    let item: ChatViewModel.ChatItem

    private var isUser: Bool { item.role == .user }

    var body: some View {
        if item.role == .system {
            Text(item.text)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity)
        } else {
            HStack(spacing: 0) {
                if isUser { Spacer(minLength: 48) }
                VStack(alignment: isUser ? .trailing : .leading, spacing: 6) {
                    Text(item.text)
                        .textSelection(.enabled)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .foregroundStyle(isUser ? Color.white : Color.primary)
                        .background(
                            isUser ? Color.accentColor : Color(.secondarySystemBackground),
                            in: RoundedRectangle(cornerRadius: Theme.corner, style: .continuous)
                        )
                    if !item.toolCalls.isEmpty {
                        ToolChips(calls: item.toolCalls)
                    }
                }
                if !isUser { Spacer(minLength: 48) }
            }
            .transition(.move(edge: .bottom).combined(with: .opacity))
        }
    }
}

struct ToolChips: View {
    let calls: [ToolCallSummary]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(Array(calls.enumerated()), id: \.offset) { _, call in
                    HStack(spacing: 4) {
                        Image(systemName: icon(for: call.status))
                        Text(call.name.replacingOccurrences(of: "_", with: " "))
                    }
                    .font(.caption2.weight(.medium))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .foregroundStyle(color(for: call.status))
                    .background(color(for: call.status).opacity(0.14), in: Capsule())
                }
            }
        }
    }

    private func icon(for status: ToolStatus) -> String {
        switch status {
        case .ok: return "checkmark.circle.fill"
        case .error: return "xmark.octagon.fill"
        case .denied: return "hand.raised.fill"
        case .pendingConfirmation: return "clock.fill"
        }
    }

    private func color(for status: ToolStatus) -> Color {
        switch status {
        case .ok: return .green
        case .error: return .red
        case .denied: return .orange
        case .pendingConfirmation: return .yellow
        }
    }
}

struct TypingBubble: View {
    var body: some View {
        HStack {
            HStack(spacing: 8) {
                ProgressView()
                Text("Pensando…")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: Theme.corner, style: .continuous))
            Spacer()
        }
        .transition(.opacity)
    }
}

struct ConfirmationCard: View {
    let summary: String
    let onConfirm: () -> Void
    let onCancel: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Confirmar ação", systemImage: "exclamationmark.shield.fill")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.orange)
            Text(summary)
                .font(.body)
            HStack(spacing: 10) {
                Button(role: .cancel, action: onCancel) {
                    Text("Cancelar").frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                Button(action: onConfirm) {
                    Text("Confirmar").frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
            }
            .controlSize(.large)
        }
        .padding(14)
        .background(Color.orange.opacity(0.12), in: RoundedRectangle(cornerRadius: Theme.corner, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.corner, style: .continuous)
                .strokeBorder(Color.orange.opacity(0.35), lineWidth: 1)
        )
    }
}
