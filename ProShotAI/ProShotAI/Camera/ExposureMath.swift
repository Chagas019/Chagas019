import Foundation

/// Funções puras de fotometria (testadas em ProShotAITests).
enum ExposureMath {
    /// EV100 = log2(N²/t) − log2(ISO/100)
    static func ev100(aperture: Double, shutter: Double, iso: Double) -> Double {
        guard aperture > 0, shutter > 0, iso > 0 else { return 0 }
        return log2(aperture * aperture / shutter) - log2(iso / 100)
    }

    /// EV da cena: se a medição indica +1 EV (superexposto), a exposição correta exige +1 EV.
    static func sceneEV(aperture: Double, shutter: Double, iso: Double, meterOffset: Double) -> Double {
        ev100(aperture: aperture, shutter: shutter, iso: iso) + meterOffset
    }

    /// Iluminância incidente aproximada (lux) para EV100, constante de calibração C = 250.
    static func lux(fromEV ev: Double) -> Double { 2.5 * pow(2, ev) }

    /// Focal equivalente 35mm pela diagonal, a partir do FOV horizontal (lado maior) e proporção do sensor.
    static func equivalentFocalLength(horizontalFOVDegrees fov: Double, aspect: Double) -> Double {
        guard fov > 0, fov < 180, aspect > 0 else { return 0 }
        let halfH = tan(fov * .pi / 360)
        let diagFactor = sqrt(1 + 1 / (aspect * aspect))   // diagonal / largura
        let halfDiag = halfH * diagFactor
        return 21.633 / halfDiag                             // meia diagonal do 35mm = 21,633mm
    }

    static func shutterLabel(_ seconds: Double) -> String {
        guard seconds > 0 else { return "--" }
        if seconds >= 0.4 {
            let s = (seconds * 10).rounded() / 10
            return s == s.rounded() ? "\(Int(s))\"" : String(format: "%.1f\"", s)
        }
        return "1/\(Int((1 / seconds).rounded()))"
    }

    static func zoomLabel(_ z: Double) -> String {
        if abs(z - z.rounded()) < 0.12 { return "\(Int(z.rounded()))x" }
        let s = String(format: "%.1fx", z)
        return s.hasPrefix("0.") ? String(s.dropFirst()) : s
    }

    static func evLabel(_ v: Double) -> String {
        let r = (v * 10).rounded() / 10
        return (r >= 0 ? "+" : "") + String(format: "%.1f", r)
    }

    /// Mapeia valor ↔ posição normalizada em escala logarítmica (ISO, obturador).
    static func logNormalized(_ v: Double, min lo: Double, max hi: Double) -> Double {
        guard lo > 0, hi > lo else { return 0 }
        return (log(Swift.min(Swift.max(v, lo), hi)) - log(lo)) / (log(hi) - log(lo))
    }

    static func logValue(_ t: Double, min lo: Double, max hi: Double) -> Double {
        guard lo > 0, hi > lo else { return lo }
        let c = Swift.min(Swift.max(t, 0), 1)
        return exp(log(lo) + c * (log(hi) - log(lo)))
    }

    /// Ajuste de semi-automático: mantém a exposição alvo variando o parâmetro livre.
    /// Retorna o fator multiplicativo a aplicar (ex.: na duração) para corrigir `errorEV`.
    static func correctionFactor(errorEV: Double, damping: Double = 0.6) -> Double {
        pow(2, -errorEV * damping)
    }

    /// Normaliza ganhos de balanço de branco para [1, maxGain] preservando proporções.
    static func normalizedGains(red: Float, green: Float, blue: Float, maxGain: Float) -> (Float, Float, Float) {
        let minG = Swift.min(red, green, blue)
        let scale: Float = minG > 0 ? 1 / minG : 1
        func clamp(_ g: Float) -> Float { Swift.min(Swift.max(g * scale, 1), maxGain) }
        return (clamp(red), clamp(green), clamp(blue))
    }
}
