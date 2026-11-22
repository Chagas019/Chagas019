import SwiftUI

@main
struct ProShotAIApp: App {
    var body: some Scene {
        WindowGroup {
            CameraView()
                .persistentSystemOverlays(.hidden)
        }
    }
}
