import SwiftUI
import ClerkKit
import ClerkKitUI

@main
struct ProfitLevelApp: App {
    init() {
        Clerk.configure(publishableKey: AppConfig.clerkPublishableKey)
        AuthBridge.install()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(Clerk.shared)
        }
    }
}

struct RootView: View {
    @Environment(Clerk.self) private var clerk

    var body: some View {
        Group {
            if !clerk.isLoaded {
                ProgressView()
            } else if clerk.user != nil {
                MainTabView()
            } else {
                // Clerk's prebuilt sign-in / sign-up UI. Uses whatever methods you
                // enabled in the Clerk dashboard (email, Google, etc.). Sign in once;
                // the session persists in the Keychain and tokens refresh silently.
                AuthView()
            }
        }
    }
}

struct MainTabView: View {
    var body: some View {
        TabView {
            JobsView()
                .tabItem { Label("Jobs", systemImage: "hammer") }

            DashboardView()
                .tabItem { Label("Dashboard", systemImage: "chart.bar") }
        }
    }
}

/// Reads /api/business-health and offers sign-out. Will grow into the full Financials screen.
struct DashboardView: View {
    @State private var health: BusinessHealth?
    @State private var error: String?

    var body: some View {
        NavigationStack {
            List {
                if let health {
                    LabeledContent("Revenue", value: health.revenue, format: .currency(code: "USD"))
                    LabeledContent("Net profit", value: health.netProfit, format: .currency(code: "USD"))
                    LabeledContent("Net hourly rate", value: health.netHourlyRate, format: .currency(code: "USD"))
                    LabeledContent("Billable hours", value: health.billableHours, format: .number)
                    LabeledContent("Overhead", value: health.overhead, format: .currency(code: "USD"))
                    LabeledContent("Jobs this month", value: "\(health.jobCount)")
                } else if let error {
                    Text(error).foregroundStyle(.red)
                } else {
                    ProgressView()
                }
                Section {
                    Button("Sign out", role: .destructive) {
                        Task { try? await Clerk.shared.auth.signOut() }
                    }
                }
            }
            .navigationTitle("Dashboard")
            .task {
                do { health = try await APIClient.shared.fetchBusinessHealth() }
                catch { self.error = (error as? APIError)?.errorDescription ?? error.localizedDescription }
            }
        }
    }
}
