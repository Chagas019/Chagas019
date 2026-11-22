import AVFoundation
import Combine
import UIKit

/// Motor de câmera: sessão, lentes, controles manuais reais e captura (HEIF/JPEG/RAW/ProRAW).
/// Toda configuração de hardware roda em `sessionQueue`; estado publicado é atualizado na main.
final class CameraEngine: NSObject, ObservableObject {
    enum Status: Equatable { case idle, unauthorized, unavailable(String), running }

    // Hardware
    @Published private(set) var status: Status = .idle
    @Published private(set) var lenses: [LensOption] = []
    @Published private(set) var currentLens: LensOption?
    @Published private(set) var caps = DeviceCapabilities()

    // Valores atuais (vindos do sensor em automático, ou o alvo manual)
    @Published private(set) var iso: Float = 100
    @Published private(set) var shutter: Double = 1.0 / 60
    @Published private(set) var lensPosition: Float = 0.5
    @Published private(set) var temperature: Float = 5500
    @Published private(set) var tint: Float = 0
    @Published private(set) var bias: Float = 0
    @Published private(set) var meterOffset: Float = 0
    @Published private(set) var digitalZoom: CGFloat = 1

    @Published private(set) var isoAuto = true
    @Published private(set) var shutterAuto = true
    @Published private(set) var focusAuto = true
    @Published private(set) var wbAuto = true
    @Published private(set) var aeafLocked = false

    // Captura
    @Published var format: CaptureFormat = .heif
    @Published var flash: FlashSetting = .off { didSet { applyTorch() } }
    @Published var timerSeconds = 0
    @Published var burstCount = 1
    @Published private(set) var countdown = 0
    @Published private(set) var isCapturing = false
    @Published private(set) var shutterBlink = false
    @Published private(set) var lastThumbnail: UIImage?
    @Published private(set) var lastCaptureInfo: String?
    @Published var message: String?

    let session = AVCaptureSession()
    let analyzer = FrameAnalyzer()
    let motion = MotionMonitor()

    private let sessionQueue = DispatchQueue(label: "proshot.session")
    private let photoOutput = AVCapturePhotoOutput()
    private let videoOutput = AVCaptureVideoDataOutput()
    private var device: AVCaptureDevice?
    private var input: AVCaptureDeviceInput?
    private var observers: [NSKeyValueObservation] = []
    private var processors: [Int64: PhotoCaptureProcessor] = [:]
    private var configured = false
    private var countdownTimer: Timer?
    private var notificationTokens: [NSObjectProtocol] = []

    // Estado de exposição (sessionQueue)
    private var manualISO: Float = 100
    private var manualShutter: Double = 1.0 / 60
    private var lastPriorityAdjust: CFTimeInterval = 0
    private let semiAutoMaxShutter = 1.0 / 8

    // MARK: - Ciclo de vida

    func start() {
        motion.start()
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            startSession()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { ok in
                DispatchQueue.main.async { ok ? self.startSession() : (self.status = .unauthorized) }
            }
        default:
            status = .unauthorized
        }
    }

    func stop() {
        motion.stop()
        cancelCountdown()
        sessionQueue.async { if self.session.isRunning { self.session.stopRunning() } }
    }

    private func startSession() {
        sessionQueue.async {
            if !self.configured { self.configureSession() }
            guard self.configured else { return }
            if !self.session.isRunning { self.session.startRunning() }
            DispatchQueue.main.async { self.status = .running }
        }
    }

    // MARK: - Configuração

    private func configureSession() {
        let found = Self.discoverLenses()
        guard let initial = found.first(where: { !$0.isFront && abs($0.opticalZoom - 1) < 0.05 }) ?? found.first,
              let dev = AVCaptureDevice(uniqueID: initial.id) else {
            DispatchQueue.main.async { self.status = .unavailable("Nenhuma câmera disponível neste dispositivo.") }
            return
        }
        session.beginConfiguration()
        session.sessionPreset = .photo
        guard attach(dev) else {
            session.commitConfiguration()
            DispatchQueue.main.async { self.status = .unavailable("Não foi possível abrir a câmera.") }
            return
        }
        if session.canAddOutput(photoOutput) { session.addOutput(photoOutput) }
        if session.canAddOutput(videoOutput) {
            videoOutput.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
            videoOutput.alwaysDiscardsLateVideoFrames = true
            videoOutput.deliversPreviewSizedOutputBuffers = true   // análise leve: quadros do tamanho da prévia
            videoOutput.setSampleBufferDelegate(analyzer, queue: analyzer.queue)
            session.addOutput(videoOutput)
        }
        configureOutputs(for: dev)
        session.commitConfiguration()
        configured = true
        didActivate(dev, lens: initial)
        DispatchQueue.main.async { self.lenses = found }
        observeSessionNotifications()
    }

    static func discoverLenses() -> [LensOption] {
        let backTypes: [AVCaptureDevice.DeviceType] = [.builtInUltraWideCamera, .builtInWideAngleCamera, .builtInTelephotoCamera]
        let back = AVCaptureDevice.DiscoverySession(deviceTypes: backTypes, mediaType: .video, position: .back).devices
        let front = AVCaptureDevice.DiscoverySession(deviceTypes: [.builtInWideAngleCamera], mediaType: .video, position: .front).devices
        let wideFocal = back.first(where: { $0.deviceType == .builtInWideAngleCamera }).map(focal35) ?? 26
        func name(_ d: AVCaptureDevice) -> String {
            if d.position == .front { return "Frontal" }
            switch d.deviceType {
            case .builtInUltraWideCamera: return "Ultra-grande-angular"
            case .builtInTelephotoCamera: return "Teleobjetiva"
            default: return "Grande-angular"
            }
        }
        let backLenses = back.map { d -> LensOption in
            let f = focal35(d)
            return LensOption(id: d.uniqueID, name: name(d), position: .back, focal35: f, opticalZoom: wideFocal > 0 ? f / wideFocal : 1)
        }.sorted { $0.opticalZoom < $1.opticalZoom }
        let frontLenses = front.map { LensOption(id: $0.uniqueID, name: name($0), position: .front, focal35: focal35($0), opticalZoom: 1) }
        return backLenses + frontLenses
    }

    static func focal35(_ d: AVCaptureDevice) -> Double {
        let dims = CMVideoFormatDescriptionGetDimensions(d.activeFormat.formatDescription)
        let aspect = dims.height > 0 ? Double(dims.width) / Double(dims.height) : 4.0 / 3
        return ExposureMath.equivalentFocalLength(horizontalFOVDegrees: Double(d.activeFormat.videoFieldOfView), aspect: aspect)
    }

    @discardableResult
    private func attach(_ dev: AVCaptureDevice) -> Bool {
        guard let newInput = try? AVCaptureDeviceInput(device: dev) else { return false }
        if let input { session.removeInput(input) }
        if session.canAddInput(newInput) {
            session.addInput(newInput)
            input = newInput
            device = dev
            return true
        }
        if let input { session.addInput(input) }
        return false
    }

    private func configureOutputs(for dev: AVCaptureDevice) {
        photoOutput.maxPhotoQualityPrioritization = .quality
        let dims = dev.activeFormat.supportedMaxPhotoDimensions
        if let best = dims.max(by: { Int($0.width) * Int($0.height) < Int($1.width) * Int($1.height) }) {
            photoOutput.maxPhotoDimensions = best
        }
        photoOutput.isAppleProRAWEnabled = photoOutput.isAppleProRAWSupported
        if let c = videoOutput.connection(with: .video) {
            if c.isVideoRotationAngleSupported(90) { c.videoRotationAngle = 90 }
            if c.isVideoMirroringSupported {
                c.automaticallyAdjustsVideoMirroring = false
                c.isVideoMirrored = dev.position == .front
            }
        }
    }

    private func didActivate(_ d: AVCaptureDevice, lens: LensOption) {
        configure(d) {
            if d.isFocusModeSupported(.continuousAutoFocus) { d.focusMode = .continuousAutoFocus }
            if d.isExposureModeSupported(.continuousAutoExposure) { d.exposureMode = .continuousAutoExposure }
            if d.isWhiteBalanceModeSupported(.continuousAutoWhiteBalance) { d.whiteBalanceMode = .continuousAutoWhiteBalance }
            d.isSubjectAreaChangeMonitoringEnabled = true
            d.videoZoomFactor = 1
        }
        let c = capabilities(of: d)
        observe(d)
        DispatchQueue.main.async {
            self.caps = c
            self.currentLens = lens
            self.digitalZoom = 1
            self.isoAuto = true; self.shutterAuto = true; self.focusAuto = true; self.wbAuto = true
            self.aeafLocked = false
            self.bias = 0
            if !c.supports(self.format) {
                let fallback: CaptureFormat = c.hevc ? .heif : .jpeg
                self.message = "\(self.format.label) não suportado nesta lente. Usando \(fallback.label)."
                self.format = fallback
            }
            if !c.torch && self.flash == .torch { self.flash = .off }
            if !c.flash && (self.flash == .on || self.flash == .auto) { self.flash = .off }
        }
    }

    private func capabilities(of d: AVCaptureDevice) -> DeviceCapabilities {
        var c = DeviceCapabilities()
        let rawTypes = photoOutput.availableRawPhotoPixelFormatTypes
        c.bayerRAW = rawTypes.contains { !AVCapturePhotoOutput.isAppleProRAWPixelFormat($0) }
        c.proRAW = photoOutput.isAppleProRAWSupported && rawTypes.contains { AVCapturePhotoOutput.isAppleProRAWPixelFormat($0) }
        c.hevc = photoOutput.availablePhotoCodecTypes.contains(.hevc)
        c.flash = d.hasFlash && photoOutput.supportedFlashModes.contains(.on)
        c.torch = d.hasTorch && d.isTorchModeSupported(.on)
        c.manualFocus = d.isLockingFocusWithCustomLensPositionSupported
        c.manualWhiteBalance = d.isLockingWhiteBalanceWithCustomDeviceGainsSupported
        c.customExposure = d.isExposureModeSupported(.custom)
        c.minISO = d.activeFormat.minISO
        c.maxISO = d.activeFormat.maxISO
        c.minShutter = max(d.activeFormat.minExposureDuration.seconds, 1.0 / 32000)
        c.maxShutter = min(d.activeFormat.maxExposureDuration.seconds, 30)
        c.minBias = max(d.minExposureTargetBias, -3)
        c.maxBias = min(d.maxExposureTargetBias, 3)
        c.maxWBGain = d.maxWhiteBalanceGain
        c.maxDigitalZoom = min(d.activeFormat.videoMaxZoomFactor, 10)
        c.aperture = d.lensAperture
        c.maxPhotoWidth = photoOutput.maxPhotoDimensions.width
        c.maxPhotoHeight = photoOutput.maxPhotoDimensions.height
        return c
    }

    private func observe(_ d: AVCaptureDevice) {
        observers = [
            d.observe(\.iso, options: [.new]) { [weak self] d, _ in
                let v = d.iso
                DispatchQueue.main.async { if self?.isoAuto == true { self?.iso = v } }
            },
            d.observe(\.exposureDuration, options: [.new]) { [weak self] d, _ in
                let v = d.exposureDuration.seconds
                DispatchQueue.main.async { if self?.shutterAuto == true { self?.shutter = v } }
            },
            d.observe(\.lensPosition, options: [.new]) { [weak self] d, _ in
                let v = d.lensPosition
                DispatchQueue.main.async { if self?.focusAuto == true { self?.lensPosition = v } }
            },
            d.observe(\.deviceWhiteBalanceGains, options: [.new]) { [weak self] d, _ in
                let tt = d.temperatureAndTintValues(for: d.deviceWhiteBalanceGains)
                DispatchQueue.main.async {
                    guard let self, self.wbAuto else { return }
                    self.temperature = tt.temperature
                    self.tint = tt.tint
                }
            },
            d.observe(\.exposureTargetOffset, options: [.new]) { [weak self] d, _ in
                let off = d.exposureTargetOffset
                DispatchQueue.main.async { self?.meterOffset = off }
                self?.sessionQueue.async { self?.priorityFeedback(offset: off) }
            },
        ]
    }

    private func observeSessionNotifications() {
        let nc = NotificationCenter.default
        notificationTokens.forEach { nc.removeObserver($0) }
        notificationTokens = [
            nc.addObserver(forName: AVCaptureSession.runtimeErrorNotification, object: session, queue: nil) { [weak self] _ in
                self?.sessionQueue.async { self?.session.startRunning() }
            },
            nc.addObserver(forName: AVCaptureDevice.subjectAreaDidChangeNotification, object: nil, queue: nil) { [weak self] _ in
                self?.sessionQueue.async { self?.resetPointOfInterest() }
            },
        ]
    }

    private func configure(_ d: AVCaptureDevice, _ body: () -> Void) {
        do {
            try d.lockForConfiguration()
            body()
            d.unlockForConfiguration()
        } catch {
            DispatchQueue.main.async { self.message = "Câmera ocupada: \(error.localizedDescription)" }
        }
    }

    // MARK: - Lentes e zoom

    func select(_ lens: LensOption) {
        guard lens.id != currentLens?.id, !isCapturing else { return }
        sessionQueue.async {
            guard let dev = AVCaptureDevice(uniqueID: lens.id) else { return }
            self.session.beginConfiguration()
            let ok = self.attach(dev)
            if ok { self.configureOutputs(for: dev) }
            self.session.commitConfiguration()
            if ok { self.didActivate(dev, lens: lens); self.applyTorch() }
        }
    }

    /// Zoom digital (recorte) sobre a lente óptica atual.
    func setDigitalZoom(_ z: CGFloat) {
        let v = min(max(z, 1), caps.maxDigitalZoom)
        digitalZoom = v
        sessionQueue.async {
            guard let d = self.device else { return }
            self.configure(d) { d.videoZoomFactor = v }
        }
    }

    // MARK: - Exposição

    func setISO(_ v: Float) {
        guard caps.customExposure else { return }
        let value = min(max(v, caps.minISO), caps.maxISO)
        iso = value; isoAuto = false; aeafLocked = false
        let shutterIsAuto = shutterAuto
        sessionQueue.async {
            self.manualISO = value
            if shutterIsAuto, let d = self.device {   // prioridade de ISO: compensa no obturador
                let target = d.exposureDuration.seconds * Double(d.iso / value)
                self.manualShutter = self.clampShutter(target, semi: true)
            }
            self.applyExposure()
        }
    }

    func setShutter(_ s: Double) {
        guard caps.customExposure else { return }
        let value = min(max(s, caps.minShutter), caps.maxShutter)
        shutter = value; shutterAuto = false; aeafLocked = false
        let isoIsAuto = isoAuto
        sessionQueue.async {
            self.manualShutter = value
            if isoIsAuto, let d = self.device {      // prioridade de obturador: compensa no ISO
                let target = d.iso * Float(d.exposureDuration.seconds / value)
                self.manualISO = min(max(target, d.activeFormat.minISO), d.activeFormat.maxISO)
            }
            self.applyExposure()
        }
    }

    func setAutoISO() { isoAuto = true; sessionQueue.async { self.applyExposure() } }
    func setAutoShutter() { shutterAuto = true; sessionQueue.async { self.applyExposure() } }

    func setBias(_ v: Float) {
        let value = min(max(v, caps.minBias), caps.maxBias)
        bias = value
        sessionQueue.async {
            guard let d = self.device else { return }
            if self.isoAuto && self.shutterAuto { self.configure(d) { d.setExposureTargetBias(value) } }
        }
    }

    private func clampShutter(_ s: Double, semi: Bool) -> Double {
        guard let d = device else { return s }
        let hi = semi ? min(d.activeFormat.maxExposureDuration.seconds, semiAutoMaxShutter) : d.activeFormat.maxExposureDuration.seconds
        return min(max(s, d.activeFormat.minExposureDuration.seconds), hi)
    }

    /// sessionQueue
    private func applyExposure() {
        guard let d = device else { return }
        let fullAuto = isoAuto && shutterAuto
        configure(d) {
            if fullAuto {
                if d.isExposureModeSupported(.continuousAutoExposure) { d.exposureMode = .continuousAutoExposure }
                d.setExposureTargetBias(min(max(bias, d.minExposureTargetBias), d.maxExposureTargetBias))
            } else if d.isExposureModeSupported(.custom) {
                d.setExposureTargetBias(0)
                let iso = min(max(manualISO, d.activeFormat.minISO), d.activeFormat.maxISO)
                let dur = CMTime(seconds: clampShutter(manualShutter, semi: false), preferredTimescale: 1_000_000_000)
                d.setExposureModeCustom(duration: dur, iso: iso)
            }
        }
        if !fullAuto {
            let isoV = manualISO, shV = manualShutter
            DispatchQueue.main.async {
                if self.isoAuto { self.iso = isoV }
                if self.shutterAuto { self.shutter = shV }
            }
        }
    }

    /// Semi-automático real: com um parâmetro fixo, o outro é corrigido pelo fotômetro do sensor.
    private func priorityFeedback(offset: Float) {
        let semi = isoAuto != shutterAuto
        guard semi, device != nil else { return }
        let now = CACurrentMediaTime()
        guard now - lastPriorityAdjust > 0.12 else { return }
        let error = Double(offset - bias)
        guard abs(error) > 0.12 else { return }
        lastPriorityAdjust = now
        let f = ExposureMath.correctionFactor(errorEV: error)
        if shutterAuto {
            manualShutter = clampShutter(manualShutter * f, semi: true)
        } else if let d = device {
            manualISO = min(max(manualISO * Float(f), d.activeFormat.minISO), d.activeFormat.maxISO)
        }
        applyExposure()
    }

    // MARK: - Foco e balanço de branco

    func setLensPosition(_ v: Float) {
        guard caps.manualFocus else { return }
        let value = min(max(v, 0), 1)
        lensPosition = value; focusAuto = false; aeafLocked = false
        sessionQueue.async {
            guard let d = self.device else { return }
            self.configure(d) { d.setFocusModeLocked(lensPosition: value) }
        }
    }

    func setAutoFocus() {
        focusAuto = true
        sessionQueue.async {
            guard let d = self.device else { return }
            self.configure(d) { if d.isFocusModeSupported(.continuousAutoFocus) { d.focusMode = .continuousAutoFocus } }
        }
    }

    func setWhiteBalance(temperature t: Float, tint ti: Float) {
        guard caps.manualWhiteBalance else { return }
        let temp = min(max(t, 2000), 10000), tn = min(max(ti, -150), 150)
        temperature = temp; tint = tn; wbAuto = false
        sessionQueue.async {
            guard let d = self.device else { return }
            let tt = AVCaptureDevice.WhiteBalanceTemperatureAndTintValues(temperature: temp, tint: tn)
            let g = d.deviceWhiteBalanceGains(for: tt)
            let n = ExposureMath.normalizedGains(red: g.redGain, green: g.greenGain, blue: g.blueGain, maxGain: d.maxWhiteBalanceGain)
            let gains = AVCaptureDevice.WhiteBalanceGains(redGain: n.0, greenGain: n.1, blueGain: n.2)
            self.configure(d) { d.setWhiteBalanceModeLocked(with: gains) }
        }
    }

    func setAutoWhiteBalance() {
        wbAuto = true
        sessionQueue.async {
            guard let d = self.device else { return }
            self.configure(d) {
                if d.isWhiteBalanceModeSupported(.continuousAutoWhiteBalance) { d.whiteBalanceMode = .continuousAutoWhiteBalance }
            }
        }
    }

    /// Toque: foco/exposição no ponto. Toque longo: trava AE/AF (AE/AF LOCK).
    func focusAndExpose(at devicePoint: CGPoint, lock: Bool) {
        aeafLocked = lock && (focusAuto || (isoAuto && shutterAuto))
        let afAuto = focusAuto, aeAuto = isoAuto && shutterAuto
        sessionQueue.async {
            guard let d = self.device else { return }
            self.configure(d) {
                if afAuto, d.isFocusPointOfInterestSupported, d.isFocusModeSupported(.autoFocus) {
                    d.focusPointOfInterest = devicePoint
                    d.focusMode = .autoFocus
                }
                if aeAuto, d.isExposurePointOfInterestSupported {
                    d.exposurePointOfInterest = devicePoint
                    if lock, d.isExposureModeSupported(.autoExpose) {
                        d.exposureMode = .autoExpose
                    } else if d.isExposureModeSupported(.continuousAutoExposure) {
                        d.exposureMode = .continuousAutoExposure
                    }
                }
            }
        }
    }

    func unlockAEAF() {
        aeafLocked = false
        sessionQueue.async { self.resetPointOfInterest(force: true) }
    }

    /// sessionQueue — volta ao modo contínuo central quando a cena muda (se não travado).
    private func resetPointOfInterest(force: Bool = false) {
        guard let d = device, force || !aeafLocked else { return }
        let center = CGPoint(x: 0.5, y: 0.5)
        configure(d) {
            if focusAuto, d.isFocusPointOfInterestSupported, d.isFocusModeSupported(.continuousAutoFocus) {
                d.focusPointOfInterest = center
                d.focusMode = .continuousAutoFocus
            }
            if isoAuto && shutterAuto, d.isExposurePointOfInterestSupported, d.isExposureModeSupported(.continuousAutoExposure) {
                d.exposurePointOfInterest = center
                d.exposureMode = .continuousAutoExposure
            }
        }
    }

    // MARK: - Lanterna

    private func applyTorch() {
        let on = flash == .torch
        sessionQueue.async {
            guard let d = self.device, d.hasTorch else { return }
            let mode: AVCaptureDevice.TorchMode = on ? .on : .off
            if d.isTorchModeSupported(mode) { self.configure(d) { d.torchMode = mode } }
        }
    }

    // MARK: - Captura

    private struct CaptureRequest {
        let format: CaptureFormat
        let flash: FlashSetting
        let count: Int
        let rotation: CGFloat
    }

    func shutterPressed() {
        guard status == .running, !isCapturing else { return }
        if countdown > 0 { cancelCountdown(); return }
        guard timerSeconds > 0 else { capture(); return }
        countdown = timerSeconds
        countdownTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] t in
            guard let self else { t.invalidate(); return }
            self.countdown -= 1
            if self.countdown <= 0 {
                t.invalidate()
                self.countdownTimer = nil
                self.capture()
            }
        }
    }

    func cancelCountdown() {
        countdownTimer?.invalidate()
        countdownTimer = nil
        countdown = 0
    }

    private func capture() {
        isCapturing = true
        let req = CaptureRequest(format: format, flash: flash, count: max(1, burstCount), rotation: motion.rotationAngle)
        sessionQueue.async { self.captureNext(req, remaining: req.count) }
    }

    /// sessionQueue
    private func captureNext(_ req: CaptureRequest, remaining: Int) {
        guard let d = device, session.isRunning else {
            DispatchQueue.main.async { self.isCapturing = false }
            return
        }
        if let c = photoOutput.connection(with: .video) {
            var angle = req.rotation
            if d.position == .front, angle == 0 || angle == 180 { angle = 180 - angle }
            if c.isVideoRotationAngleSupported(angle) { c.videoRotationAngle = angle }
        }
        let settings = makeSettings(req)
        let id = settings.uniqueID
        let processor = PhotoCaptureProcessor(onShutter: { [weak self] in
            DispatchQueue.main.async { self?.blink() }
            if remaining > 1 { self?.sessionQueue.async { self?.captureNext(req, remaining: remaining - 1) } }
        }, completion: { [weak self] result in
            guard let self else { return }
            self.sessionQueue.async { self.processors[id] = nil }
            var failed = false
            if case .failure = result { failed = true }
            self.handle(result)
            if remaining <= 1 || failed { DispatchQueue.main.async { self.isCapturing = false } }
        })
        processors[id] = processor
        photoOutput.capturePhoto(with: settings, delegate: processor)
    }

    private func makeSettings(_ req: CaptureRequest) -> AVCapturePhotoSettings {
        let codec: AVVideoCodecType = photoOutput.availablePhotoCodecTypes.contains(.hevc) ? .hevc : .jpeg
        let rawTypes = photoOutput.availableRawPhotoPixelFormatTypes
        let bayer = rawTypes.first { !AVCapturePhotoOutput.isAppleProRAWPixelFormat($0) }
        let pro = rawTypes.first { AVCapturePhotoOutput.isAppleProRAWPixelFormat($0) }
        var isBayer = false
        let settings: AVCapturePhotoSettings
        switch req.format {
        case .jpeg:
            settings = AVCapturePhotoSettings(format: [AVVideoCodecKey: AVVideoCodecType.jpeg])
        case .raw where bayer != nil:
            settings = AVCapturePhotoSettings(rawPixelFormatType: bayer!)
            isBayer = true
        case .rawPlusHEIF where bayer != nil:
            settings = AVCapturePhotoSettings(rawPixelFormatType: bayer!, processedFormat: [AVVideoCodecKey: codec])
            isBayer = true
        case .proRAW where pro != nil:
            settings = AVCapturePhotoSettings(rawPixelFormatType: pro!)
        default:
            settings = AVCapturePhotoSettings(format: [AVVideoCodecKey: codec])
        }
        if !isBayer {
            settings.maxPhotoDimensions = photoOutput.maxPhotoDimensions
            settings.photoQualityPrioritization = req.count > 1 ? .speed : .quality
        }
        var mode: AVCaptureDevice.FlashMode = .off
        if req.flash == .on { mode = .on } else if req.flash == .auto { mode = isBayer ? .off : .auto }
        if photoOutput.supportedFlashModes.contains(mode) { settings.flashMode = mode }
        if let pf = settings.availablePreviewPhotoPixelFormatTypes.first {
            settings.previewPhotoFormat = [
                kCVPixelBufferPixelFormatTypeKey as String: pf,
                kCVPixelBufferWidthKey as String: 320,
                kCVPixelBufferHeightKey as String: 320,
            ]
        }
        return settings
    }

    private func blink() {
        shutterBlink = true
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) { self.shutterBlink = false }
    }

    private func handle(_ result: Result<CapturedPhoto, Error>) {
        switch result {
        case .failure(let e):
            DispatchQueue.main.async { self.message = "Falha na captura: \(e.localizedDescription)" }
        case .success(let photo):
            let info = Self.exifSummary(photo.metadata)
            DispatchQueue.main.async {
                if let t = photo.thumbnail { self.lastThumbnail = t }
                self.lastCaptureInfo = info
                PhotoLibrary.save(photo) { res in
                    if case .failure(let e) = res { self.message = e.localizedDescription }
                }
            }
        }
    }

    static func exifSummary(_ meta: [String: Any]) -> String {
        let exif = meta[kCGImagePropertyExifDictionary as String] as? [String: Any] ?? [:]
        var parts: [String] = []
        if let iso = (exif[kCGImagePropertyExifISOSpeedRatings as String] as? [NSNumber])?.first { parts.append("ISO \(iso.intValue)") }
        if let t = exif[kCGImagePropertyExifExposureTime as String] as? Double { parts.append(ExposureMath.shutterLabel(t)) }
        if let f = exif[kCGImagePropertyExifFNumber as String] as? Double { parts.append(String(format: "f/%.1f", f)) }
        if let fl = exif[kCGImagePropertyExifFocalLenIn35mmFilm as String] as? Int { parts.append("\(fl)mm") }
        return parts.joined(separator: " · ")
    }
}
