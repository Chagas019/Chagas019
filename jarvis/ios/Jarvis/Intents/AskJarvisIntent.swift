import AppIntents
import JarvisKit

struct AskJarvisIntent: AppIntent {
    static let title: LocalizedStringResource = "Perguntar ao Jarvis"
    static let description = IntentDescription("Envia uma pergunta ao Jarvis e devolve a resposta.")
    static let openAppWhenRun = false

    @Parameter(title: "Pergunta", requestValueDialog: "O que você quer perguntar ao Jarvis?")
    var pergunta: String

    func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
        let reply: String
        do {
            let response = try await JarvisServices.shared.api.chat(ChatRequest(message: pergunta))
            if let pending = response.pendingConfirmation {
                reply = "\(response.reply) Essa ação precisa de confirmação: abra o Jarvis para confirmar. \(pending.summary)"
            } else {
                reply = response.reply
            }
        } catch {
            reply = (error as? LocalizedError)?.errorDescription ?? "Não consegui falar com o Jarvis agora."
        }
        return .result(value: reply, dialog: "\(reply)")
    }
}
