import CoreImage
import UIKit
import XCTest
@testable import ProShotAI

final class ExposureMathTests: XCTestCase {
    func testEV100() {
        // f/1.0, 1s, ISO 100 → EV 0 ; "Sunny 16": f/16, 1/100, ISO 100 ≈ EV 14.6
        XCTAssertEqual(ExposureMath.ev100(aperture: 1, shutter: 1, iso: 100), 0, accuracy: 1e-9)
        XCTAssertEqual(ExposureMath.ev100(aperture: 16, shutter: 0.01, iso: 100), 14.64, accuracy: 0.01)
        XCTAssertEqual(ExposureMath.ev100(aperture: 16, shutter: 0.01, iso: 200), 13.64, accuracy: 0.01)
    }

    func testEquivalentFocal() {
        // grande-angular típica de iPhone: FOV horizontal ~69.4°, sensor 4:3 → ~25mm
        let f = ExposureMath.equivalentFocalLength(horizontalFOVDegrees: 69.4, aspect: 4.0 / 3)
        XCTAssertEqual(f, 25, accuracy: 1.5)
        XCTAssertEqual(ExposureMath.equivalentFocalLength(horizontalFOVDegrees: 0, aspect: 1), 0)
    }

    func testLabels() {
        XCTAssertEqual(ExposureMath.shutterLabel(1.0 / 125), "1/125")
        XCTAssertEqual(ExposureMath.shutterLabel(1), "1\"")
        XCTAssertEqual(ExposureMath.shutterLabel(0.5), "0.5\"")
        XCTAssertEqual(ExposureMath.zoomLabel(0.5), ".5x")
        XCTAssertEqual(ExposureMath.zoomLabel(1.02), "1x")
        XCTAssertEqual(ExposureMath.zoomLabel(10.5), "10.5x")
        XCTAssertEqual(ExposureMath.evLabel(-0.33), "-0.3")
        XCTAssertEqual(ExposureMath.evLabel(0), "+0.0")
    }

    func testLogMappingRoundTrip() {
        for v in [50.0, 100, 800, 3200] {
            let t = ExposureMath.logNormalized(v, min: 50, max: 3200)
            XCTAssertEqual(ExposureMath.logValue(t, min: 50, max: 3200), v, accuracy: v * 1e-9)
        }
        XCTAssertEqual(ExposureMath.logNormalized(10, min: 50, max: 3200), 0)
        XCTAssertEqual(ExposureMath.logNormalized(1e6, min: 50, max: 3200), 1)
    }

    func testPriorityCorrectionDirection() {
        XCTAssertLessThan(ExposureMath.correctionFactor(errorEV: 1), 1)    // superexposto → menos luz
        XCTAssertGreaterThan(ExposureMath.correctionFactor(errorEV: -1), 1)
    }

    func testWhiteBalanceGainsNormalized() {
        let g = ExposureMath.normalizedGains(red: 0.8, green: 1.6, blue: 9, maxGain: 4)
        XCTAssertEqual(g.0, 1, accuracy: 1e-6)
        XCTAssertEqual(g.1, 2, accuracy: 1e-6)
        XCTAssertEqual(g.2, 4, accuracy: 1e-6)
    }

    func testLevelRotation() {
        XCTAssertEqual(MotionMonitor.rotationAngle(gx: 0, gy: -1), 90)   // retrato
        XCTAssertEqual(MotionMonitor.rotationAngle(gx: -1, gy: 0), 0)    // paisagem esquerda
        XCTAssertEqual(MotionMonitor.rotationAngle(gx: 1, gy: 0), 180)
        XCTAssertEqual(MotionMonitor.rotationAngle(gx: 0, gy: 1), 270)
        let m = MotionMonitor()
        m.update(gx: sin(2 * .pi / 180), gy: -cos(2 * .pi / 180), gz: 0)
        XCTAssertEqual(m.roll, 2, accuracy: 0.01)
    }
}

final class HistogramTests: XCTestCase {
    func testHistogramOfUniformImage() {
        let w = 60, h = 60
        var px = [UInt8](repeating: 0, count: w * h * 4)
        for i in 0..<(w * h) { px[i * 4] = 255; px[i * 4 + 1] = 255; px[i * 4 + 2] = 255; px[i * 4 + 3] = 255 }
        let hist = px.withUnsafeBufferPointer {
            Histogram.compute(bgra: $0.baseAddress!, width: w, height: h, bytesPerRow: w * 4, step: 2)
        }
        XCTAssertEqual(hist.luma.count, Histogram.bins)
        XCTAssertEqual(hist.luma.last ?? 0, 1, accuracy: 1e-6)
        XCTAssertEqual(hist.clippedHighlights, 1, accuracy: 1e-6)
        XCTAssertGreaterThan(hist.meanLuma, 0.97)
    }
}

final class ImageProcessorTests: XCTestCase {
    private func gray(_ v: CGFloat) -> CIImage {
        CIImage(color: CIColor(red: v, green: v, blue: v)).cropped(to: CGRect(x: 0, y: 0, width: 32, height: 32))
    }

    private func average(_ img: CIImage) -> (Float, Float, Float) {
        var px = [Float](repeating: 0, count: 4)
        let avg = img.applyingFilter("CIAreaAverage", parameters: [kCIInputExtentKey: CIVector(cgRect: img.extent)])
        ImageProcessor.context.render(avg, toBitmap: &px, rowBytes: 16, bounds: CGRect(x: 0, y: 0, width: 1, height: 1),
                                      format: .RGBAf, colorSpace: CGColorSpace(name: CGColorSpace.sRGB))
        return (px[0], px[1], px[2])
    }

    func testIdentityKeepsImage() {
        let out = ImageProcessor.apply(.identity, to: gray(0.5), isRAW: false)
        XCTAssertEqual(out.extent, gray(0.5).extent)
        XCTAssertEqual(average(out).1, 0.5, accuracy: 0.02)
    }

    func testExposureBrightens() {
        var s = EditSettings(); s.exposure = 1
        XCTAssertGreaterThan(average(ImageProcessor.apply(s, to: gray(0.3), isRAW: false)).1, average(gray(0.3)).1 + 0.05)
    }

    func testWarmTemperatureRaisesRed() {
        var s = EditSettings(); s.temperature = 0.8
        let (r, _, b) = average(ImageProcessor.apply(s, to: gray(0.5), isRAW: false))
        XCTAssertGreaterThan(r, b)
    }

    func testMonochromeRemovesColor() {
        var s = EditSettings(); s.profile = .monochrome
        let color = CIImage(color: CIColor(red: 0.8, green: 0.2, blue: 0.1)).cropped(to: CGRect(x: 0, y: 0, width: 16, height: 16))
        let (r, g, b) = average(ImageProcessor.apply(s, to: color, isRAW: false))
        XCTAssertEqual(r, g, accuracy: 0.02)
        XCTAssertEqual(g, b, accuracy: 0.02)
    }

    func testAllPresetsRender() {
        for p in Preset.all {
            let out = ImageProcessor.apply(p.settings, to: gray(0.5), isRAW: false)
            XCTAssertNotNil(ImageProcessor.render(out), p.name)
        }
    }

    func testSettingsCodableRoundTrip() throws {
        var s = EditSettings(); s.curve.points = [0.1, 0.2, 0.5, 0.8, 0.9]; s.profile = .cinematic; s.sharpness = 0.4
        let back = try JSONDecoder().decode(EditSettings.self, from: JSONEncoder().encode(s))
        XCTAssertEqual(back, s)
    }

    func testExportWritesFile() throws {
        let data = UIImage(ciImage: gray(0.4)).jpegData(compressionQuality: 1)
            ?? ImageProcessor.context.jpegRepresentation(of: gray(0.4), colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)!
        let src = try XCTUnwrap(EditSource(data: data, preferRAW: false))
        for f in ExportFormat.allCases {
            let url = try ImageProcessor.export(src, settings: Preset.all[2].settings, format: f)
            XCTAssertGreaterThan((try? Data(contentsOf: url).count) ?? 0, 100, f.label)
        }
    }
}
