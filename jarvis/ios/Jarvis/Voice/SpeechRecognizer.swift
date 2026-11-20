import Foundation
import Combine
import AVFoundation
import Speech

/// Reconhecimento de fala em pt-BR (SFSpeechRecognizer + AVAudioEngine), on-device quando disponível.
@MainActor
final class SpeechRecognizer: ObservableObject {
    @Published private(set) var transcript = ""
    @Published private(set) var isRecording = false
    @Published private(set) var errorMessage: String?

    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "pt-BR"))
    private let audioEngine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var generation = 0

    func clearError() {
        errorMessage = nil
    }

    func start() async {
        guard !isRecording else { return }
        errorMessage = nil
        transcript = ""

        guard await requestPermissions() else {
            errorMessage = "Permita o microfone e o reconhecimento de fala em Ajustes do iPhone."
            return
        }
        guard let recognizer, recognizer.isAvailable else {
            errorMessage = "Reconhecimento de fala indisponível no momento."
            return
        }

        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

            let request = SFSpeechAudioBufferRecognitionRequest()
            request.shouldReportPartialResults = true
            if recognizer.supportsOnDeviceRecognition {
                request.requiresOnDeviceRecognition = true
            }
            self.request = request

            Self.installTap(on: audioEngine.inputNode, request: request)
            audioEngine.prepare()
            try audioEngine.start()

            generation += 1
            let gen = generation
            task = Self.startTask(recognizer: recognizer, request: request) { [weak self] text, isFinal, failed in
                Task { @MainActor in
                    self?.handleResult(generation: gen, text: text, isFinal: isFinal, failed: failed)
                }
            }
            isRecording = true
        } catch {
            teardown()
            errorMessage = "Não foi possível iniciar o microfone."
        }
    }

    func stop() {
        guard isRecording else { return }
        request?.endAudio()
        teardown()
    }

    // MARK: - Internos

    private func handleResult(generation gen: Int, text: String?, isFinal: Bool, failed: Bool) {
        guard gen == generation else { return }
        if let text { transcript = text }
        if isFinal || failed {
            teardown()
        }
    }

    private func teardown() {
        generation += 1
        if audioEngine.isRunning {
            audioEngine.stop()
        }
        audioEngine.inputNode.removeTap(onBus: 0)
        request?.endAudio()
        task?.cancel()
        request = nil
        task = nil
        isRecording = false
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    private func requestPermissions() async -> Bool {
        guard await Self.requestSpeechAuthorization() else { return false }
        return await Self.requestMicrophonePermission()
    }

    private nonisolated static func requestSpeechAuthorization() async -> Bool {
        await withCheckedContinuation { (cont: CheckedContinuation<Bool, Never>) in
            SFSpeechRecognizer.requestAuthorization { status in
                cont.resume(returning: status == .authorized)
            }
        }
    }

    private nonisolated static func requestMicrophonePermission() async -> Bool {
        await withCheckedContinuation { (cont: CheckedContinuation<Bool, Never>) in
            AVAudioApplication.requestRecordPermission { granted in
                cont.resume(returning: granted)
            }
        }
    }

    // Os blocos abaixo rodam em threads de áudio/reconhecimento: ficam fora do MainActor.
    private nonisolated static func installTap(on input: AVAudioInputNode, request: SFSpeechAudioBufferRecognitionRequest) {
        let format = input.outputFormat(forBus: 0)
        input.removeTap(onBus: 0)
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            request.append(buffer)
        }
    }

    private nonisolated static func startTask(
        recognizer: SFSpeechRecognizer,
        request: SFSpeechAudioBufferRecognitionRequest,
        handler: @escaping @Sendable (String?, Bool, Bool) -> Void
    ) -> SFSpeechRecognitionTask {
        recognizer.recognitionTask(with: request) { result, error in
            handler(result?.bestTranscription.formattedString, result?.isFinal ?? false, error != nil)
        }
    }
}
