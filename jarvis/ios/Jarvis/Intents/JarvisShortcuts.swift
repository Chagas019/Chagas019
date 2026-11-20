import AppIntents

struct JarvisShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: AskJarvisIntent(),
            phrases: [
                "Perguntar ao \(.applicationName)",
                "Pergunte ao \(.applicationName)",
                "Falar com o \(.applicationName)"
            ],
            shortTitle: "Perguntar",
            systemImageName: "waveform"
        )
        AppShortcut(
            intent: AddTaskIntent(),
            phrases: [
                "Adicionar tarefa no \(.applicationName)",
                "Nova tarefa no \(.applicationName)",
                "Criar tarefa no \(.applicationName)"
            ],
            shortTitle: "Nova tarefa",
            systemImageName: "checklist"
        )
    }
}
