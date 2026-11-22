import Photos
import UIKit
import UniformTypeIdentifiers

enum LibraryError: LocalizedError {
    case denied, saveFailed
    var errorDescription: String? {
        switch self {
        case .denied: return "Sem permissão para a biblioteca de fotos. Ative em Ajustes > ProShot AI > Fotos."
        case .saveFailed: return "Não foi possível salvar a foto."
        }
    }
}

/// Salvamento e leitura das fotos do app na biblioteca do iOS.
enum PhotoLibrary {
    private static let key = "proshot.assetIdentifiers"

    static var isAuthorized: Bool {
        let s = PHPhotoLibrary.authorizationStatus(for: .readWrite)
        return s == .authorized || s == .limited
    }

    static func requestAccess(_ done: @escaping (Bool) -> Void) {
        PHPhotoLibrary.requestAuthorization(for: .readWrite) { status in
            DispatchQueue.main.async { done(status == .authorized || status == .limited) }
        }
    }

    /// Salva processado como recurso principal e RAW como alternativo (par RAW+HEIF) ou RAW sozinho.
    static func save(_ photo: CapturedPhoto, completion: @escaping (Result<String, Error>) -> Void) {
        requestAccess { ok in
            guard ok else { completion(.failure(LibraryError.denied)); return }
            var identifier: String?
            PHPhotoLibrary.shared().performChanges({
                let request = PHAssetCreationRequest.forAsset()
                if let processed = photo.processedData {
                    request.addResource(with: .photo, data: processed, options: nil)
                    if let raw = photo.rawData {
                        request.addResource(with: .alternatePhoto, data: raw, options: nil)
                    }
                } else if let raw = photo.rawData {
                    let options = PHAssetResourceCreationOptions()
                    options.uniformTypeIdentifier = UTType("com.adobe.raw-image")?.identifier
                    request.addResource(with: .photo, data: raw, options: options)
                }
                identifier = request.placeholderForCreatedAsset?.localIdentifier
            }) { success, error in
                DispatchQueue.main.async {
                    if success, let id = identifier {
                        remember(id)
                        completion(.success(id))
                    } else {
                        completion(.failure(error ?? LibraryError.saveFailed))
                    }
                }
            }
        }
    }

    static func remember(_ id: String) {
        var ids = UserDefaults.standard.stringArray(forKey: key) ?? []
        ids.append(id)
        UserDefaults.standard.set(ids, forKey: key)
    }

    /// Fotos capturadas pelo app, mais recentes primeiro (ignora as que foram apagadas).
    static func capturedAssets() -> [PHAsset] {
        let ids = UserDefaults.standard.stringArray(forKey: key) ?? []
        guard !ids.isEmpty, isAuthorized else { return [] }
        let options = PHFetchOptions()
        options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
        let result = PHAsset.fetchAssets(withLocalIdentifiers: ids, options: options)
        var assets: [PHAsset] = []
        result.enumerateObjects { a, _, _ in assets.append(a) }
        if assets.count != ids.count {   // limpa identificadores órfãos
            UserDefaults.standard.set(assets.map(\.localIdentifier), forKey: key)
        }
        return assets
    }

    static func isRAW(_ asset: PHAsset) -> Bool { rawResource(asset) != nil }

    static func rawResource(_ asset: PHAsset) -> PHAssetResource? {
        PHAssetResource.assetResources(for: asset).first { r in
            guard let t = UTType(r.uniformTypeIdentifier) else { return false }
            return t.conforms(to: .rawImage)
        }
    }

    static func thumbnail(for asset: PHAsset, size: CGSize, _ done: @escaping (UIImage?) -> Void) {
        let o = PHImageRequestOptions()
        o.deliveryMode = .opportunistic
        o.isNetworkAccessAllowed = true
        o.resizeMode = .fast
        PHImageManager.default().requestImage(for: asset, targetSize: size, contentMode: .aspectFill, options: o) { img, _ in
            done(img)
        }
    }

    static func imageData(for asset: PHAsset, _ done: @escaping (Data?) -> Void) {
        let o = PHImageRequestOptions()
        o.isNetworkAccessAllowed = true
        o.version = .current
        o.deliveryMode = .highQualityFormat
        PHImageManager.default().requestImageDataAndOrientation(for: asset, options: o) { data, _, _, _ in
            DispatchQueue.main.async { done(data) }
        }
    }

    static func rawData(for asset: PHAsset, _ done: @escaping (Data?) -> Void) {
        guard let res = rawResource(asset) else { done(nil); return }
        var buffer = Data()
        let o = PHAssetResourceRequestOptions()
        o.isNetworkAccessAllowed = true
        PHAssetResourceManager.default().requestData(for: res, options: o, dataReceivedHandler: { buffer.append($0) }) { error in
            DispatchQueue.main.async { done(error == nil ? buffer : nil) }
        }
    }

    static func delete(_ asset: PHAsset, _ done: @escaping (Bool) -> Void) {
        PHPhotoLibrary.shared().performChanges({
            PHAssetChangeRequest.deleteAssets([asset] as NSArray)
        }) { ok, _ in DispatchQueue.main.async { done(ok) } }
    }
}
