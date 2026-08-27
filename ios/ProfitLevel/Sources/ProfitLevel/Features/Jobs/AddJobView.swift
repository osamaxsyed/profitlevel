import SwiftUI

struct AddJobView: View {
    @Environment(\.dismiss) private var dismiss
    var onSaved: () async -> Void

    @State private var name = ""
    @State private var clientName = ""
    @State private var contractPrice = ""
    @State private var jobDate = Date()
    @State private var hoursSpent = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    private var canSave: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty && Double(contractPrice) != nil
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Job") {
                    TextField("Job name", text: $name)
                    TextField("Client (optional)", text: $clientName)
                    TextField("Contract price", text: $contractPrice)
                        .keyboardType(.decimalPad)
                    DatePicker("Date", selection: $jobDate, displayedComponents: .date)
                    TextField("Hours spent (optional)", text: $hoursSpent)
                        .keyboardType(.decimalPad)
                }
                if let errorMessage {
                    Section { Text(errorMessage).foregroundStyle(.red) }
                }
            }
            .navigationTitle("New Job")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { Task { await save() } }
                        .disabled(!canSave || isSaving)
                }
            }
            .interactiveDismissDisabled(isSaving)
        }
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let job = APIClient.NewJob(
            name: name.trimmingCharacters(in: .whitespaces),
            client_name: clientName.isEmpty ? nil : clientName,
            contract_price: Double(contractPrice) ?? 0,
            job_date: formatter.string(from: jobDate),
            hours_spent: Double(hoursSpent)
        )
        do {
            _ = try await APIClient.shared.createJob(job)
            await onSaved()
            dismiss()
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
        }
    }
}
