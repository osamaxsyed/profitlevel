import Foundation

/// Configuration the app needs before it can talk to the backend.
/// nonisolated so the APIClient actor can read these off the main actor
/// (the project defaults all types to @MainActor under Swift 6).
nonisolated enum AppConfig {
    /// Base URL of your deployed Next.js app, e.g. "https://profitlevel.vercel.app"
    /// For local testing against `next dev`, use your Mac's LAN IP (not localhost)
    /// because the simulator/device can't reach 127.0.0.1 of your machine directly
    /// on a physical device. e.g. "http://192.168.1.50:3000"
    static let apiBaseURL = URL(string: "https://profitlevel.app")!

    /// Clerk publishable key (pk_test_... / pk_live_...). From the Clerk dashboard.
    static let clerkPublishableKey = "pk_live_Y2xlcmsucHJvZml0bGV2ZWwuYXBwJA"
}

enum APIError: Error, LocalizedError {
    case notAuthenticated
    case badStatus(Int, String)
    case decoding(Error)
    case transport(Error)

    var errorDescription: String? {
        switch self {
        case .notAuthenticated: return "You are not signed in."
        case .badStatus(let code, let body): return "Server error \(code): \(body)"
        case .decoding(let e): return "Could not read server response: \(e.localizedDescription)"
        case .transport(let e): return "Network error: \(e.localizedDescription)"
        }
    }
}

/// Talks to the Next.js API routes. Auth is a Clerk session JWT sent as a
/// Bearer token; Clerk's middleware on the backend reads it and populates userId,
/// so the existing routes work unchanged.
actor APIClient {
    static let shared = APIClient()

    private let session = URLSession.shared
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    /// Supplies a fresh Clerk session token. Set by the auth layer at launch.
    var tokenProvider: (() async -> String?)?

    func setTokenProvider(_ provider: @escaping () async -> String?) {
        self.tokenProvider = provider
    }

    private func makeRequest(_ path: String, method: String = "GET", body: Data? = nil) async throws -> URLRequest {
        let url = AppConfig.apiBaseURL.appendingPathComponent(path)
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        guard let provider = tokenProvider, let token = await provider() else {
            throw APIError.notAuthenticated
        }
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.httpBody = body
        return req
    }

    private func run<T: Decodable>(_ req: URLRequest, as type: T.Type) async throws -> T {
        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: req)
        } catch {
            throw APIError.transport(error)
        }
        guard let http = response as? HTTPURLResponse else {
            throw APIError.badStatus(-1, "No HTTP response")
        }
        guard (200..<300).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? ""
            throw APIError.badStatus(http.statusCode, body)
        }
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decoding(error)
        }
    }

    // MARK: - Jobs

    func fetchJobs(month: String? = nil) async throws -> [JobWithCosts] {
        var path = "api/jobs"
        if let month { path += "?month=\(month)" }
        let req = try await makeRequest(path)
        return try await run(req, as: [JobWithCosts].self)
    }

    nonisolated struct NewJob: Encodable {
        let name: String
        let client_name: String?
        let contract_price: Double
        let job_date: String
        let hours_spent: Double?
    }

    func createJob(_ job: NewJob) async throws -> Job {
        let body = try encoder.encode(job)
        let req = try await makeRequest("api/jobs", method: "POST", body: body)
        return try await run(req, as: Job.self)
    }

    func deleteJob(id: Int) async throws {
        let req = try await makeRequest("api/jobs/\(id)", method: "DELETE")
        _ = try await run(req, as: EmptyResponse.self)
    }

    // MARK: - Business health (used on the dashboard)

    func fetchBusinessHealth() async throws -> BusinessHealth {
        let req = try await makeRequest("api/business-health")
        return try await run(req, as: BusinessHealth.self)
    }
}

private nonisolated struct EmptyResponse: Decodable {
    init(from decoder: Decoder) throws {}
}
