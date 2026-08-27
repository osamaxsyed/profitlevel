import SwiftUI
import ClerkKit

/// Bridges Clerk's session token into the APIClient.
///
/// Clerk owns auth state (Clerk.shared, an @Observable). This type just wires the
/// APIClient's token provider to Clerk's current session, so every API request
/// carries a fresh `Authorization: Bearer <jwt>` header.
enum AuthBridge {
    /// Call once at launch (after Clerk.configure) to connect the API client to Clerk.
    static func install() {
        Task {
            await APIClient.shared.setTokenProvider {
                // getToken() returns the JWT string directly (clerk-ios v1) and
                // refreshes automatically when the cached token is near expiry.
                try? await Clerk.shared.session?.getToken()
            }
        }
    }
}
