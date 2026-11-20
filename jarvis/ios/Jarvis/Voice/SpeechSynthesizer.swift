import Foundation
import Combine
import AVFoundation

/// Leitura de respostas em voz alta (pt-BR).
@MainActor
final class SpeechSynthesizerService: ObservableObject {
    static let enabledKey = "speakReplies"

    private let synthesizer = AVSpeechSynthesizer()

    var isEnabled: Bool {
        UserDefaults.standard.bool(forKey: Self.enabledKey)
    }

    func speakIfEnabled(_ text: String) {
        guard isEnabled else { return }
        speak(text)
    }

    func speak(_ text: String) {
        stop()
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
        try? AVAudioSession.sharedInstance().setActive(true)
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "pt-BR")
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate
        synthesizer.speak(utterance)
    }

    func stop() {
        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }
    }
}
