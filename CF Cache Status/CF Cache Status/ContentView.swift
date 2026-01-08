//
//  ContentView.swift
//  CF Cache Status
//

import SwiftUI
import SafariServices

let extensionBundleIdentifier = "com.cfcachestatus.CF-Cache-Status.Extension"

struct ContentView: View {
    @State private var extensionEnabled: Bool?

    private var statusText: String {
        guard let enabled = extensionEnabled else {
            return "You can turn on Cache Status's extension in the Extensions section of Safari Settings."
        }
        if enabled {
            return "Cache Status's extension is currently on. You can turn it off in the Extensions section of Safari Settings."
        } else {
            return "Cache Status's extension is currently off. You can turn it on in the Extensions section of Safari Settings."
        }
    }

    var body: some View {
        VStack(spacing: 20) {
            Image("HeroIcon")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 72, height: 72)

            Text(statusText)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)

            Button("Quit and Open Safari Settings…") {
                openSafariPreferences()
            }
            .buttonStyle(.borderedProminent)
        }
        .padding(40)
        .frame(width: 400, height: 300)
        .onAppear {
            checkExtensionState()
        }
    }

    private func checkExtensionState() {
        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionBundleIdentifier) { state, error in
            DispatchQueue.main.async {
                if let state = state, error == nil {
                    extensionEnabled = state.isEnabled
                }
            }
        }
    }

    private func openSafariPreferences() {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { _ in
            DispatchQueue.main.async {
                NSApplication.shared.terminate(nil)
            }
        }
    }
}

#Preview {
    ContentView()
}
