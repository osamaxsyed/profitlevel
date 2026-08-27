import SwiftUI
import Combine

@MainActor
final class JobsViewModel: ObservableObject {
    @Published var jobs: [JobWithCosts] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            jobs = try await APIClient.shared.fetchJobs()
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
    }

    func delete(_ job: JobWithCosts) async {
        do {
            try await APIClient.shared.deleteJob(id: job.id)
            jobs.removeAll { $0.id == job.id }
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
    }
}

struct JobsView: View {
    @StateObject private var vm = JobsViewModel()
    @State private var showingAdd = false

    private var totalProfit: Double { vm.jobs.reduce(0) { $0 + $1.grossProfit } }

    var body: some View {
        NavigationStack {
            Group {
                if vm.isLoading && vm.jobs.isEmpty {
                    ProgressView("Loading jobs…")
                } else if let error = vm.errorMessage, vm.jobs.isEmpty {
                    ContentUnavailableView {
                        Label("Couldn’t load jobs", systemImage: "exclamationmark.triangle")
                    } description: {
                        Text(error)
                    } actions: {
                        Button("Retry") { Task { await vm.load() } }
                    }
                } else if vm.jobs.isEmpty {
                    ContentUnavailableView("No jobs yet",
                                           systemImage: "hammer",
                                           description: Text("Tap + to add your first job."))
                } else {
                    List {
                        Section {
                            HStack {
                                Text("Total gross profit")
                                Spacer()
                                Text(totalProfit, format: .currency(code: "USD"))
                                    .fontWeight(.semibold)
                                    .foregroundStyle(totalProfit >= 0 ? .green : .red)
                            }
                        }
                        ForEach(vm.jobs) { job in
                            JobRow(job: job)
                        }
                        .onDelete { indexSet in
                            let targets = indexSet.map { vm.jobs[$0] }
                            Task { for t in targets { await vm.delete(t) } }
                        }
                    }
                }
            }
            .navigationTitle("Jobs")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button { showingAdd = true } label: { Image(systemName: "plus") }
                }
            }
            .refreshable { await vm.load() }
            .task { await vm.load() }
            .sheet(isPresented: $showingAdd) {
                AddJobView { await vm.load() }
            }
        }
    }
}

struct JobRow: View {
    let job: JobWithCosts

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(job.name).font(.headline)
                Spacer()
                Text(job.grossProfit, format: .currency(code: "USD"))
                    .foregroundStyle(job.grossProfit >= 0 ? .green : .red)
            }
            HStack(spacing: 8) {
                if let client = job.clientName, !client.isEmpty {
                    Text(client)
                }
                Text(job.jobDate)
                if let rate = job.grossHourlyRate {
                    Text("· \(rate, format: .currency(code: "USD"))/hr")
                }
            }
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }
}
