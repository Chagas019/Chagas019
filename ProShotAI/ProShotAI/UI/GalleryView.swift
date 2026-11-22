import Photos
import SwiftUI

struct GalleryView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var assets: [PHAsset] = []
    @State private var authorized = PhotoLibrary.isAuthorized
    @State private var loaded = false

    private let columns = [GridItem(.adaptive(minimum: 110), spacing: 2)]

    var body: some View {
        NavigationStack {
            Group {
                if !authorized && loaded {
                    ContentUnavailableView("Sem acesso às fotos", systemImage: "lock",
                                           description: Text("Permita o acesso em Ajustes > ProShot AI > Fotos."))
                } else if assets.isEmpty && loaded {
                    ContentUnavailableView("Nenhuma foto ainda", systemImage: "camera.aperture",
                                           description: Text("As fotos capturadas no ProShot AI aparecem aqui."))
                } else {
                    ScrollView {
                        LazyVGrid(columns: columns, spacing: 2) {
                            ForEach(assets, id: \.localIdentifier) { a in
                                NavigationLink(value: a.localIdentifier) { Thumbnail(asset: a) }
                            }
                        }
                    }
                }
            }
            .background(Theme.black)
            .navigationTitle("Galeria")
            .navigationBarTitleDisplayMode(.inline)
            .navigationDestination(for: String.self) { id in
                if let a = assets.first(where: { $0.localIdentifier == id }) {
                    PhotoDetailView(asset: a, onDelete: reload)
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Câmera") { dismiss() }
                }
            }
        }
        .tint(Theme.accent)
        .preferredColorScheme(.dark)
        .onAppear {
            PhotoLibrary.requestAccess { ok in
                authorized = ok
                reload()
            }
        }
    }

    private func reload() {
        assets = PhotoLibrary.capturedAssets()
        loaded = true
    }
}

private struct Thumbnail: View {
    let asset: PHAsset
    @State private var image: UIImage?

    var body: some View {
        Theme.graphite
            .aspectRatio(1, contentMode: .fit)
            .overlay {
                if let image {
                    Image(uiImage: image).resizable().aspectRatio(contentMode: .fill)
                }
            }
            .clipped()
            .overlay(alignment: .topTrailing) {
                if PhotoLibrary.isRAW(asset) {
                    Text("RAW").font(Theme.mono(9, .bold)).foregroundStyle(.black)
                        .padding(.horizontal, 4).background(Theme.accent).padding(4)
                }
            }
            .onAppear {
                PhotoLibrary.thumbnail(for: asset, size: CGSize(width: 300, height: 300)) { image = $0 }
            }
    }
}

struct PhotoDetailView: View {
    let asset: PHAsset
    let onDelete: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var image: UIImage?
    @State private var exif: [(String, String)] = []
    @State private var showEditor = false
    @State private var shareURL: URL?
    @State private var showInfo = true
    @State private var confirmDelete = false

    var body: some View {
        VStack(spacing: 0) {
            ZStack {
                Theme.black
                if let image {
                    Image(uiImage: image).resizable().aspectRatio(contentMode: .fit)
                } else {
                    ProgressView()
                }
            }
            if showInfo && !exif.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 14) {
                        ForEach(exif.indices, id: \.self) { i in
                            VStack(alignment: .leading, spacing: 2) {
                                Text(exif[i].0.uppercased()).font(Theme.mono(9, .bold)).foregroundStyle(Theme.dim)
                                Text(exif[i].1).font(Theme.mono(12, .semibold)).foregroundStyle(Theme.text)
                            }
                        }
                    }
                    .padding(12)
                }
                .background(Theme.panel)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .bottomBar) {
                Button { showInfo.toggle() } label: { Image(systemName: "info.circle") }
                Spacer()
                if let shareURL {
                    ShareLink(item: shareURL) { Image(systemName: "square.and.arrow.up") }
                }
                Spacer()
                Button("Editar") { showEditor = true }.bold()
                Spacer()
                Button(role: .destructive) { confirmDelete = true } label: { Image(systemName: "trash") }
            }
        }
        .confirmationDialog("Apagar esta foto da biblioteca?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Apagar", role: .destructive) {
                PhotoLibrary.delete(asset) { ok in if ok { onDelete(); dismiss() } }
            }
        }
        .fullScreenCover(isPresented: $showEditor, onDismiss: load) {
            EditorView(asset: asset)
        }
        .onAppear(perform: load)
    }

    private func load() {
        PhotoLibrary.imageData(for: asset) { data in
            guard let data else { return }
            image = UIImage(data: data)
            if let src = CGImageSourceCreateWithData(data as CFData, nil),
               let props = CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [String: Any] {
                exif = ImageProcessor.exifRows(props)
            }
            let ext = PhotoLibrary.isRAW(asset) ? "dng" : "heic"
            writeShareFile(ext: ext)
        }
    }

    /// Compartilha o arquivo original (RAW se existir).
    private func writeShareFile(ext: String) {
        let finish: (Data?) -> Void = { data in
            guard let data else { return }
            let url = FileManager.default.temporaryDirectory.appendingPathComponent("ProShot-\(asset.localIdentifier.prefix(8)).\(ext)")
            try? data.write(to: url)
            shareURL = url
        }
        if ext == "dng" {
            PhotoLibrary.rawData(for: asset, finish)
        } else {
            let resource = PHAssetResource.assetResources(for: asset).first { $0.type == .photo || $0.type == .fullSizePhoto }
            guard let resource else { return }
            var buffer = Data()
            PHAssetResourceManager.default().requestData(for: resource, options: nil, dataReceivedHandler: { buffer.append($0) }) { error in
                DispatchQueue.main.async {
                    let realExt = (resource.originalFilename as NSString).pathExtension.lowercased()
                    let url = FileManager.default.temporaryDirectory.appendingPathComponent("ProShot-\(asset.localIdentifier.prefix(8)).\(realExt.isEmpty ? ext : realExt)")
                    if error == nil { try? buffer.write(to: url); shareURL = url }
                }
            }
        }
    }
}
