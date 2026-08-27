import Foundation

// Mirrors lib/types.ts on the web backend.
// The backend returns SQLite rows as JSON; numeric DB columns come back as numbers.

nonisolated struct Job: Identifiable, Codable, Hashable {
    let id: Int
    var name: String
    var clientName: String?
    var contractPrice: Double
    var jobDate: String        // "YYYY-MM-DD"
    var hoursSpent: Double?
    var createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, name
        case clientName = "client_name"
        case contractPrice = "contract_price"
        case jobDate = "job_date"
        case hoursSpent = "hours_spent"
        case createdAt = "created_at"
    }
}

/// The shape returned by GET /api/jobs (Job + computed cost rollups).
nonisolated struct JobWithCosts: Identifiable, Codable, Hashable {
    let id: Int
    var name: String
    var clientName: String?
    var contractPrice: Double
    var jobDate: String
    var hoursSpent: Double?
    var createdAt: String?

    var materialsTotal: Double
    var laborTotal: Double
    var mileageTotal: Double
    var grossProfit: Double
    var grossHourlyRate: Double?
    var hoursLogged: Double

    enum CodingKeys: String, CodingKey {
        case id, name
        case clientName = "client_name"
        case contractPrice = "contract_price"
        case jobDate = "job_date"
        case hoursSpent = "hours_spent"
        case createdAt = "created_at"
        case materialsTotal = "materials_total"
        case laborTotal = "labor_total"
        case mileageTotal = "mileage_total"
        case grossProfit = "gross_profit"
        case grossHourlyRate = "gross_hourly_rate"
        case hoursLogged = "hours_logged"
    }
}

nonisolated struct Material: Identifiable, Codable, Hashable {
    let id: Int
    let jobId: Int
    var itemName: String
    var cost: Double
    var tax: Double
    var createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case jobId = "job_id"
        case itemName = "item_name"
        case cost, tax
        case createdAt = "created_at"
    }
}

nonisolated struct Overhead: Identifiable, Codable, Hashable {
    let id: Int
    var description: String
    var amount: Double
    var category: String?
    var expenseDate: String
    var createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, description, amount, category
        case expenseDate = "expense_date"
        case createdAt = "created_at"
    }
}

/// Matches the actual GET /api/business-health response (see app/api/business-health/route.ts).
nonisolated struct BusinessHealth: Codable, Hashable {
    var revenue: Double
    var netProfit: Double
    var netHourlyRate: Double
    var billableHours: Double
    var jobCount: Int
    var overhead: Double

    enum CodingKeys: String, CodingKey {
        case revenue
        case netProfit = "net_profit"
        case netHourlyRate = "net_hourly_rate"
        case billableHours = "billable_hours"
        case jobCount = "job_count"
        case overhead
    }
}
