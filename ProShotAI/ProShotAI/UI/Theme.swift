import SwiftUI
import UIKit

enum Theme {
    static let black = Color(red: 0.03, green: 0.03, blue: 0.035)
    static let panel = Color(red: 0.08, green: 0.08, blue: 0.09)
    static let graphite = Color(red: 0.15, green: 0.15, blue: 0.165)
    static let line = Color.white.opacity(0.12)
    static let accent = Color(red: 1.0, green: 0.62, blue: 0.0)     // âmbar
    static let rec = Color(red: 0.92, green: 0.16, blue: 0.14)      // vermelho
    static let ok = Color(red: 0.3, green: 0.85, blue: 0.45)
    static let text = Color.white.opacity(0.94)
    static let dim = Color.white.opacity(0.55)

    static func mono(_ size: CGFloat, _ weight: Font.Weight = .medium) -> Font {
        .system(size: size, weight: weight, design: .monospaced)
    }
    static func label(_ size: CGFloat, _ weight: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: weight, design: .default)
    }
}

enum Haptics {
    static let selection = UISelectionFeedbackGenerator()
    static func tick() { selection.selectionChanged() }
    static func tap() { UIImpactFeedbackGenerator(style: .soft).impactOccurred() }
}

/// Botão de ícone da barra superior (área de toque 44pt).
struct IconButton: View {
    let symbol: String
    var active = false
    var badge: String? = nil
    let action: () -> Void

    var body: some View {
        Button(action: { Haptics.tap(); action() }) {
            ZStack(alignment: .bottomTrailing) {
                Image(systemName: symbol)
                    .font(.system(size: 17, weight: .medium))
                    .foregroundStyle(active ? Theme.accent : Theme.text)
                    .frame(width: 44, height: 44)
                if let badge {
                    Text(badge)
                        .font(Theme.mono(9, .bold))
                        .foregroundStyle(.black)
                        .padding(.horizontal, 3)
                        .background(Theme.accent, in: RoundedRectangle(cornerRadius: 3))
                        .offset(x: -4, y: -6)
                }
            }
        }
        .buttonStyle(.plain)
    }
}

/// Pílula de texto (formato, parâmetros).
struct Pill: View {
    let text: String
    var active = false
    var body: some View {
        Text(text)
            .font(Theme.mono(12, .bold))
            .foregroundStyle(active ? .black : Theme.text)
            .padding(.horizontal, 9)
            .padding(.vertical, 5)
            .background(active ? Theme.accent : Theme.graphite, in: RoundedRectangle(cornerRadius: 6))
            .overlay(RoundedRectangle(cornerRadius: 6).stroke(Theme.line))
    }
}
