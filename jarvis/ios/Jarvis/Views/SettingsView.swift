import SwiftUI
import UIKit
import AuthenticationServices
import UserNotifications
import JarvisKit

struct SettingsView: View {
    @ObservedObject var vm: SettingsViewModel
    @EnvironmentObject private var env: AppEnvironment
    @AppStorage(SpeechSynthesizerService.enabledKey) private var speakReplies = false
    @AppStorage("apnsEnabled") private var apnsEnabled = false
    @State private var oauth = OAuthWebSession()
    @State private var isConnecting = false
    @State private var notificationsAllowed: Bool?
    @State private var confirmSignOut = false

    var body: some View {
        NavigationStack {
            Form {
                accountSection
                usageSection
                googleSection
                voiceSection
                notificationsSection
                Section {
                    Button("Sair", role: .destructive) { confirmSignOut = true }
                }
                if let error = vm.errorMessage {
                    Section {
                        Label(error, systemImage: "exclamationmark.triangle.fill")
                            .font(.footnote)
                            .foregroundStyle(.orange)
                    }
                }
            }
            .navigationTitle("Ajustes")
            .refreshable { await vm.load() }
            .task {
                await vm.load()
                await refreshNotificationStatus()
            }
            .confirmationDialog("Sair da conta?", isPresented: $confirmSignOut, titleVisibility: .visible) {
                Button("Sair", role: .destructive) { Task { await env.signOut() } }
                Button("Cancelar", role: .cancel) {}
            }
        }
    }

    // MARK: - Seções

    private var accountSection: some View {
        Section("Conta") {
            LabeledContent("E-mail", value: vm.email ?? "—")
        }
    }

    private var usageSection: some View {
        Section {
            if let usage = vm.usage {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Hoje").foregroundStyle(.secondary)
                        Spacer()
                        Text("\(currency(usage.spentUsd)) de \(currency(usage.limitUsd))")
                            .monospacedDigit()
                    }
                    ProgressView(value: usage.fractionUsed)
                        .tint(usage.fractionUsed > 0.85 ? Color.red : Color.accentColor)
                }
                ForEach(Array(usage.items.enumerated()), id: \.offset) { _, item in
                    HStack {
                        VStack(alignment: .leading) {
                            Text(item.model.isEmpty ? item.provider : item.model).font(.subheadline)
                            Text("\(item.calls) chamadas · \(item.inputTokens + item.outputTokens) tokens")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text(currency(item.costUsd)).font(.subheadline).monospacedDigit()
                    }
                }
            } else if vm.isLoading {
                ProgressView()
            } else {
                Text("Uso indisponível").foregroundStyle(.secondary)
            }
        } header: {
            Text("Uso de IA (orçamento diário)")
        }
    }

    private var googleSection: some View {
        Section {
            if let google = vm.integrations?.google {
                if !google.configured {
                    Label("Integração não configurada no servidor", systemImage: "info.circle")
                        .foregroundStyle(.secondary)
                } else if google.connected {
                    Label("Conectado", systemImage: "checkmark.seal.fill")
                        .foregroundStyle(.green)
                    Button("Desconectar", role: .destructive) {
                        Task { await vm.disconnectGoogle() }
                    }
                } else {
                    Button {
                        Task { await connectGoogle() }
                    } label: {
                        HStack {
                            Text("Conectar conta Google")
                            Spacer()
                            if isConnecting { ProgressView() }
                        }
                    }
                    .disabled(isConnecting)
                }
            } else {
                Text("Carregando…").foregroundStyle(.secondary)
            }
        } header: {
            Text("Integrações")
        } footer: {
            Text("Permite ao Jarvis ler sua agenda e e-mails e, com sua confirmação, agir por você.")
        }
    }

    private var voiceSection: some View {
        Section("Voz") {
            Toggle("Ler respostas em voz alta", isOn: $speakReplies)
        }
    }

    private var notificationsSection: some View {
        Section {
            switch notificationsAllowed {
            case .some(true):
                Label("Notificações de tarefas ativas", systemImage: "bell.badge.fill")
                    .foregroundStyle(.green)
            case .some(false):
                Button("Permitir notificações") {
                    Task {
                        _ = await NotificationScheduler.shared.requestAuthorization()
                        await refreshNotificationStatus()
                        await NotificationScheduler.shared.sync(tasks: env.tasks.tasks)
                    }
                }
            case .none:
                ProgressView()
            }
            Toggle("Push remoto (APNs)", isOn: $apnsEnabled)
                .onChange(of: apnsEnabled) { _, enabled in
                    if enabled { UIApplication.shared.registerForRemoteNotifications() }
                }
        } header: {
            Text("Notificações")
        } footer: {
            Text("Push remoto exige conta de desenvolvedor paga e o entitlement aps-environment.")
        }
    }

    // MARK: - Ações

    private func connectGoogle() async {
        isConnecting = true
        defer { isConnecting = false }
        guard let url = await vm.googleAuthorizationURL() else { return }
        do {
            let callback = try await oauth.start(url: url, callbackScheme: "jarvis")
            env.handle(url: callback)
        } catch let error as ASWebAuthenticationSessionError where error.code == .canceledLogin {
            return
        } catch {
            vm.errorMessage = "Não foi possível concluir a conexão com o Google."
        }
        await vm.load()
    }

    private func refreshNotificationStatus() async {
        let status = await NotificationScheduler.shared.authorizationStatus()
        notificationsAllowed = (status == .authorized || status == .provisional || status == .ephemeral)
    }

    private func currency(_ value: Double) -> String {
        String(format: "US$ %.2f", value)
    }
}
