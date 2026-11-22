import AVFoundation
import SwiftUI

final class PreviewUIView: UIView {
    override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
    var previewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
}

/// Visualização ao vivo (AVCaptureVideoPreviewLayer) com toque, toque longo e pinça.
struct CameraPreview: UIViewRepresentable {
    let session: AVCaptureSession
    var onTap: (_ viewPoint: CGPoint, _ devicePoint: CGPoint) -> Void
    var onLongPress: (_ viewPoint: CGPoint, _ devicePoint: CGPoint) -> Void
    var onPinch: (_ scale: CGFloat, _ began: Bool) -> Void

    func makeUIView(context: Context) -> PreviewUIView {
        let v = PreviewUIView()
        v.backgroundColor = .black
        v.previewLayer.session = session
        v.previewLayer.videoGravity = .resizeAspectFill
        let c = context.coordinator
        c.view = v
        v.addGestureRecognizer(UITapGestureRecognizer(target: c, action: #selector(Coordinator.tap(_:))))
        let lp = UILongPressGestureRecognizer(target: c, action: #selector(Coordinator.longPress(_:)))
        lp.minimumPressDuration = 0.6
        v.addGestureRecognizer(lp)
        v.addGestureRecognizer(UIPinchGestureRecognizer(target: c, action: #selector(Coordinator.pinch(_:))))
        return v
    }

    func updateUIView(_ uiView: PreviewUIView, context: Context) { context.coordinator.parent = self }

    func makeCoordinator() -> Coordinator { Coordinator(parent: self) }

    final class Coordinator: NSObject {
        var parent: CameraPreview
        weak var view: PreviewUIView?
        init(parent: CameraPreview) { self.parent = parent }

        private func points(_ g: UIGestureRecognizer) -> (CGPoint, CGPoint)? {
            guard let v = view else { return nil }
            let p = g.location(in: v)
            return (p, v.previewLayer.captureDevicePointConverted(fromLayerPoint: p))
        }

        @objc func tap(_ g: UITapGestureRecognizer) {
            if let (p, d) = points(g) { parent.onTap(p, d) }
        }

        @objc func longPress(_ g: UILongPressGestureRecognizer) {
            guard g.state == .began, let (p, d) = points(g) else { return }
            parent.onLongPress(p, d)
        }

        @objc func pinch(_ g: UIPinchGestureRecognizer) {
            switch g.state {
            case .began: parent.onPinch(g.scale, true)
            case .changed: parent.onPinch(g.scale, false)
            default: break
            }
        }
    }
}
