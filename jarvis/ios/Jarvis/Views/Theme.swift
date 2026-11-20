import SwiftUI

enum Theme {
    static let corner: CGFloat = 18
    static let smallCorner: CGFloat = 12
}

extension View {
    /// Cartão flat com cantos arredondados.
    func flatCard() -> some View {
        self
            .padding(14)
            .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: Theme.corner, style: .continuous))
    }
}

struct ErrorBanner: View {
    let message: String
    var retry: (() -> Void)?
    var dismiss: (() -> Void)?

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.orange)
            Text(message)
                .font(.footnote)
                .frame(maxWidth: .infinity, alignment: .leading)
            if let retry {
                Button("Tentar de novo", action: retry)
                    .font(.footnote.weight(.semibold))
            }
            if let dismiss {
                Button(action: dismiss) {
                    Image(systemName: "xmark")
                }
                .font(.footnote)
                .accessibilityLabel("Fechar")
            }
        }
        .padding(12)
        .background(Color.orange.opacity(0.14), in: RoundedRectangle(cornerRadius: Theme.smallCorner, style: .continuous))
        .padding(.horizontal)
    }
}
