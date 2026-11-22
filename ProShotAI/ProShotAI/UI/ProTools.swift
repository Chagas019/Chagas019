import SwiftUI

/// Histograma RGB + luminância.
struct HistogramView: View {
    let histogram: Histogram
    var body: some View {
        Canvas { ctx, size in
            func path(_ bins: [Float], closed: Bool) -> Path {
                var p = Path()
                guard bins.count > 1 else { return p }
                let dx = size.width / CGFloat(bins.count - 1)
                p.move(to: CGPoint(x: 0, y: size.height))
                for (i, v) in bins.enumerated() {
                    p.addLine(to: CGPoint(x: CGFloat(i) * dx, y: size.height * (1 - CGFloat(v))))
                }
                if closed { p.addLine(to: CGPoint(x: size.width, y: size.height)); p.closeSubpath() }
                return p
            }
            ctx.fill(path(histogram.luma, closed: true), with: .color(.white.opacity(0.35)))
            ctx.stroke(path(histogram.red, closed: false), with: .color(.red.opacity(0.85)), lineWidth: 1)
            ctx.stroke(path(histogram.green, closed: false), with: .color(.green.opacity(0.85)), lineWidth: 1)
            ctx.stroke(path(histogram.blue, closed: false), with: .color(.blue.opacity(0.9)), lineWidth: 1)
        }
        .frame(width: 128, height: 58)
        .padding(5)
        .background(.black.opacity(0.55), in: RoundedRectangle(cornerRadius: 6))
        .overlay(alignment: .topTrailing) {
            if histogram.clippedHighlights > 0.01 {
                Circle().fill(Theme.rec).frame(width: 6, height: 6).padding(4)
            }
        }
        .overlay(alignment: .topLeading) {
            if histogram.clippedShadows > 0.03 {
                Circle().fill(Color.blue).frame(width: 6, height: 6).padding(4)
            }
        }
        .allowsHitTesting(false)
    }
}

struct GridOverlay: View {
    let style: GridStyle
    var body: some View {
        Canvas { ctx, size in
            var p = Path()
            let w = size.width, h = size.height
            func v(_ x: CGFloat) { p.move(to: CGPoint(x: x, y: 0)); p.addLine(to: CGPoint(x: x, y: h)) }
            func hz(_ y: CGFloat) { p.move(to: CGPoint(x: 0, y: y)); p.addLine(to: CGPoint(x: w, y: y)) }
            switch style {
            case .off: return
            case .thirds:
                v(w / 3); v(2 * w / 3); hz(h / 3); hz(2 * h / 3)
            case .golden:
                let g: CGFloat = 0.382
                v(w * g); v(w * (1 - g)); hz(h * g); hz(h * (1 - g))
            case .square:
                let side = min(w, h), y0 = (h - side) / 2
                hz(y0); hz(y0 + side)
                v(w / 3); v(2 * w / 3); hz(y0 + side / 3); hz(y0 + 2 * side / 3)
            }
            ctx.stroke(p, with: .color(.white.opacity(0.35)), lineWidth: 0.7)
        }
        .allowsHitTesting(false)
    }
}

/// Nível eletrônico: linha de horizonte que fica verde quando nivelado.
struct LevelIndicator: View {
    @ObservedObject var motion: MotionMonitor
    var body: some View {
        let level = abs(motion.roll) < 1
        let color = level ? Theme.ok : Color.white.opacity(0.8)
        ZStack {
            HStack(spacing: 46) {
                Rectangle().frame(width: 34, height: 1)
                Rectangle().frame(width: 34, height: 1)
            }
            .foregroundStyle(Color.white.opacity(0.4))
            Rectangle()
                .fill(color)
                .frame(width: 110, height: level ? 2 : 1.2)
                .rotationEffect(.degrees(-motion.roll))
            Circle().stroke(color, lineWidth: 1).frame(width: 10, height: 10)
                .offset(y: CGFloat(max(-30, min(30, motion.pitch))))
            Text(String(format: "%.1f°", motion.roll))
                .font(Theme.mono(9))
                .foregroundStyle(color)
                .offset(y: 16)
        }
        .animation(.easeOut(duration: 0.1), value: level)
        .allowsHitTesting(false)
    }
}

/// Indicador de exposição estilo fotômetro (-3…+3 EV).
struct ExposureMeter: View {
    let offset: Float
    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let clamped = CGFloat(max(-3, min(3, offset)))
            ZStack(alignment: .leading) {
                ForEach(-6...6, id: \.self) { i in
                    Rectangle()
                        .fill(Color.white.opacity(i % 2 == 0 ? 0.8 : 0.35))
                        .frame(width: 1, height: i == 0 ? 10 : (i % 2 == 0 ? 7 : 4))
                        .position(x: w / 2 + CGFloat(i) * w / 12.5, y: 7)
                }
                Triangle()
                    .fill(abs(offset) < 0.34 ? Theme.ok : Theme.accent)
                    .frame(width: 8, height: 6)
                    .position(x: w / 2 + clamped * w / 6.25, y: 17)
            }
        }
        .frame(width: 150, height: 22)
        .allowsHitTesting(false)
    }
}

struct Triangle: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: r.midX, y: r.minY))
        p.addLine(to: CGPoint(x: r.maxX, y: r.maxY))
        p.addLine(to: CGPoint(x: r.minX, y: r.maxY))
        p.closeSubpath()
        return p
    }
}

struct FocusReticle: View {
    let locked: Bool
    @State private var appear = false
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 2)
                .stroke(Theme.accent, lineWidth: 1.2)
                .frame(width: 72, height: 72)
            if locked {
                Text("AE/AF LOCK")
                    .font(Theme.mono(10, .bold))
                    .foregroundStyle(.black)
                    .padding(.horizontal, 4)
                    .background(Theme.accent)
                    .offset(y: -48)
            }
        }
        .scaleEffect(appear ? 1 : 1.35)
        .opacity(appear ? 1 : 0)
        .onAppear { withAnimation(.spring(response: 0.25, dampingFraction: 0.7)) { appear = true } }
        .allowsHitTesting(false)
    }
}

/// Lupa do assistente de foco (recorte central ampliado + peaking aplicado na visualização principal).
struct FocusLoupe: View {
    let image: CGImage
    var body: some View {
        Image(decorative: image, scale: 1)
            .resizable()
            .interpolation(.medium)
            .aspectRatio(1, contentMode: .fit)
            .frame(width: 120, height: 120)
            .clipShape(RoundedRectangle(cornerRadius: 6))
            .overlay(RoundedRectangle(cornerRadius: 6).stroke(Theme.accent, lineWidth: 1))
            .overlay(alignment: .bottomLeading) {
                Text("LUPA").font(Theme.mono(9, .bold)).foregroundStyle(Theme.accent).padding(4)
            }
            .allowsHitTesting(false)
    }
}
