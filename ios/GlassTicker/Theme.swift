import SwiftUI

/// The carbon palette, matching the desktop app.
enum Theme {
    static let background = Color(red: 0.043, green: 0.047, blue: 0.055)
    static let card = Color(red: 0.075, green: 0.079, blue: 0.094)
    static let cardRaised = Color(red: 0.10, green: 0.105, blue: 0.12)
    static let text = Color(red: 0.95, green: 0.95, blue: 0.96)
    static let muted = Color(red: 0.53, green: 0.54, blue: 0.58)
    static let dim = Color(red: 0.36, green: 0.37, blue: 0.40)
    static let up = Color(red: 0.37, green: 0.92, blue: 0.66)
    static let down = Color(red: 1.0, green: 0.47, blue: 0.42)
    static let accent = Color(red: 0.37, green: 0.92, blue: 0.66)
    static let line = Color.white.opacity(0.08)
}

/// A frosted card.
struct GlassCard<Content: View>: View {
    private let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .padding(14)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(Theme.card)
                    .overlay(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .strokeBorder(Theme.line, lineWidth: 1)
                    )
            )
    }
}

/// The company logo, with a monogram fallback.
struct LogoView: View {
    let symbol: String
    let url: String?

    var body: some View {
        Group {
            if let value = url, let target = URL(string: value) {
                AsyncImage(url: target) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFit().padding(4)
                    default:
                        fallback
                    }
                }
            } else {
                fallback
            }
        }
        .frame(width: 30, height: 30)
        .background(Theme.cardRaised)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }

    private var fallback: some View {
        Text(String(symbol.prefix(2)).uppercased())
            .font(.system(size: 10, weight: .bold, design: .rounded))
            .foregroundStyle(Theme.muted)
    }
}
