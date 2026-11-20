import SwiftUI
import WidgetKit
import JarvisKit

/// Raiz de injeção de dependências da UI.
@MainActor
final class AppEnvironment: ObservableObject {
    let session: SessionViewModel
    let chat: ChatViewModel
    let tasks: TasksViewModel
    let memories: MemoriesViewModel
    let settings: SettingsViewModel
    let speaker: SpeechSynthesizerService

    init() {
        let services = JarvisServices.shared
        let speaker = SpeechSynthesizerService()
        let api = services.api
        let session = SessionViewModel(
            auth: services.auth,
            bypass: services.devToken != nil,
            accessTokenStore: services.accessTokenStore,
            verifyAccess: { _ = try await api.me() }
        )
        let chat = ChatViewModel(api: services.api)
        let tasks = TasksViewModel(api: services.api)

        chat.onReply = { text in speaker.speakIfEnabled(text) }
        tasks.onTasksChanged = { list in
            SharedStore.shared.saveUpcoming(from: list)
            WidgetCenter.shared.reloadAllTimelines()
            Task { await NotificationScheduler.shared.sync(tasks: list) }
        }

        self.speaker = speaker
        self.session = session
        self.chat = chat
        self.tasks = tasks
        self.memories = MemoriesViewModel(api: services.api)
        self.settings = SettingsViewModel(api: services.api)
    }

    func start() async {
        await session.restore()
    }

    func signOut() async {
        speaker.stop()
        await session.signOut()
        chat.newConversation()
        tasks.reset()
        memories.reset()
        settings.reset()
        SharedStore.shared.clear()
        WidgetCenter.shared.reloadAllTimelines()
        await NotificationScheduler.shared.removeAll()
    }

    /// Trata `jarvis://oauth/done?ok=1` (retorno da integração Google).
    func handle(url: URL) {
        guard url.scheme == "jarvis", url.host == "oauth" else { return }
        Task { await settings.load() }
    }
}
