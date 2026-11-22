import CoreMotion
import Combine
import Foundation

/// Nível eletrônico e orientação física (o app trava a UI em retrato, então a orientação vem da gravidade).
final class MotionMonitor: ObservableObject {
    @Published private(set) var roll: Double = 0      // inclinação do horizonte, graus (relativa à orientação mais próxima)
    @Published private(set) var pitch: Double = 0     // inclinação para frente/trás, graus
    @Published private(set) var isAvailable = false
    /// Ângulo de rotação do vídeo (AVCaptureConnection.videoRotationAngle) para a câmera traseira.
    private(set) var rotationAngle: CGFloat = 90

    private let manager = CMMotionManager()

    func start() {
        guard manager.isDeviceMotionAvailable else { isAvailable = false; return }
        isAvailable = true
        manager.deviceMotionUpdateInterval = 1.0 / 30
        manager.startDeviceMotionUpdates(to: .main) { [weak self] motion, _ in
            guard let self, let g = motion?.gravity else { return }
            self.update(gx: g.x, gy: g.y, gz: g.z)
        }
    }

    func stop() { manager.stopDeviceMotionUpdates() }

    func update(gx: Double, gy: Double, gz: Double) {
        let angle = atan2(gx, -gy) * 180 / .pi           // 0 = retrato em pé
        let nearest = (angle / 90).rounded() * 90
        roll = angle - nearest
        pitch = asin(max(-1, min(1, gz))) * 180 / .pi * -1
        rotationAngle = MotionMonitor.rotationAngle(gx: gx, gy: gy)
    }

    static func rotationAngle(gx: Double, gy: Double) -> CGFloat {
        if abs(gy) >= abs(gx) { return gy <= 0 ? 90 : 270 }
        return gx < 0 ? 0 : 180
    }
}
