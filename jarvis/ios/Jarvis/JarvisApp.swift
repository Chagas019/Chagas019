import SwiftUI
import UIKit
import UserNotifications
import JarvisKit

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        Task { try? await JarvisServices.shared.api.registerDevice(apnsToken: token) }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        // APNs é opcional (exige conta paga e entitlement aps-environment).
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound]
    }
}

@main
struct JarvisApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var env = AppEnvironment()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(env)
                .onOpenURL { env.handle(url: $0) }
        }
    }
}

struct RootView: View {
    @EnvironmentObject private var env: AppEnvironment

    var body: some View {
        RootContent(session: env.session)
            .task { await env.start() }
    }
}

private struct RootContent: View {
    @ObservedObject var session: SessionViewModel

    var body: some View {
        Group {
            switch session.state {
            case .loading:
                ProgressView().controlSize(.large)
            case .signedOut:
                LoginView(session: session)
                    .transition(.opacity)
            case .signedIn:
                MainTabView()
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: session.state)
    }
}

struct MainTabView: View {
    @EnvironmentObject private var env: AppEnvironment

    var body: some View {
        TabView {
            ChatView(vm: env.chat)
                .tabItem { Label("Conversa", systemImage: "bubble.left.and.bubble.right.fill") }
            TasksView(vm: env.tasks)
                .tabItem { Label("Tarefas", systemImage: "checklist") }
            MemoriesView(vm: env.memories)
                .tabItem { Label("Memória", systemImage: "brain.head.profile") }
            SettingsView(vm: env.settings)
                .tabItem { Label("Ajustes", systemImage: "gearshape.fill") }
        }
        .task { await env.tasks.load() }
    }
}
