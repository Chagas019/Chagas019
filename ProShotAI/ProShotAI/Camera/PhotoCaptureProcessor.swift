import AVFoundation
import UIKit

struct CapturedPhoto {
    var processedData: Data?
    var rawData: Data?
    var thumbnail: UIImage?
    var metadata: [String: Any]
}

enum CaptureError: LocalizedError {
    case noData
    var errorDescription: String? { "A câmera não retornou dados da foto." }
}

/// Delegate de uma única captura (pode receber RAW e processado na mesma solicitação).
final class PhotoCaptureProcessor: NSObject, AVCapturePhotoCaptureDelegate {
    private var photo = CapturedPhoto(metadata: [:])
    private var processingError: Error?
    private let onShutter: () -> Void
    private let completion: (Result<CapturedPhoto, Error>) -> Void

    init(onShutter: @escaping () -> Void, completion: @escaping (Result<CapturedPhoto, Error>) -> Void) {
        self.onShutter = onShutter
        self.completion = completion
    }

    func photoOutput(_ output: AVCapturePhotoOutput, didCapturePhotoFor resolvedSettings: AVCaptureResolvedPhotoSettings) {
        onShutter()
    }

    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        if let error { processingError = error; return }
        let data = photo.fileDataRepresentation()
        if photo.isRawPhoto { self.photo.rawData = data } else { self.photo.processedData = data }
        if self.photo.metadata.isEmpty { self.photo.metadata = photo.metadata }
        if self.photo.thumbnail == nil, let cg = photo.previewCGImageRepresentation() {
            let raw = (photo.metadata[kCGImagePropertyOrientation as String] as? UInt32) ?? 1
            self.photo.thumbnail = UIImage(cgImage: cg, scale: 1, orientation: UIImage.Orientation(exif: raw))
        }
    }

    func photoOutput(_ output: AVCapturePhotoOutput, didFinishCaptureFor resolvedSettings: AVCaptureResolvedPhotoSettings, error: Error?) {
        if let e = error ?? processingError {
            completion(.failure(e))
        } else if photo.processedData == nil && photo.rawData == nil {
            completion(.failure(CaptureError.noData))
        } else {
            completion(.success(photo))
        }
    }
}

extension UIImage.Orientation {
    init(exif: UInt32) {
        switch exif {
        case 2: self = .upMirrored
        case 3: self = .down
        case 4: self = .downMirrored
        case 5: self = .leftMirrored
        case 6: self = .right
        case 7: self = .rightMirrored
        case 8: self = .left
        default: self = .up
        }
    }
}
