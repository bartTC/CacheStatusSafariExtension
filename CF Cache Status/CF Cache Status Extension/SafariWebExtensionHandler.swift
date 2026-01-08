//
//  SafariWebExtensionHandler.swift
//  CF Cache Status Extension
//
//  Created by Martin Mahner on 02.01.26.
//

import SafariServices
import os.log
#if os(macOS)
import AppKit
#else
import UIKit
#endif

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {

    func beginRequest(with context: NSExtensionContext) {
        let request = context.inputItems.first as? NSExtensionItem

        let profile: UUID?
        if #available(iOS 17.0, macOS 14.0, *) {
            profile = request?.userInfo?[SFExtensionProfileKey] as? UUID
        } else {
            profile = request?.userInfo?["profile"] as? UUID
        }

        let message: Any?
        if #available(iOS 15.0, macOS 11.0, *) {
            message = request?.userInfo?[SFExtensionMessageKey]
        } else {
            message = request?.userInfo?["message"]
        }

        os_log(.default, "Received message from browser.runtime.sendNativeMessage: %@ (profile: %@)", String(describing: message), profile?.uuidString ?? "none")

        // Handle appearance request
        var responseData: [String: Any] = [:]

        if let msg = message as? [String: Any], let type = msg["type"] as? String {
            if type == "getAppearance" {
                let isDark = Self.isDarkMode()
                responseData = ["isDark": isDark]
                os_log(.default, "Returning appearance: isDark = %{public}@", isDark ? "true" : "false")
            } else {
                responseData = ["echo": message as Any]
            }
        } else {
            responseData = ["echo": message as Any]
        }

        let response = NSExtensionItem()
        if #available(iOS 15.0, macOS 11.0, *) {
            response.userInfo = [SFExtensionMessageKey: responseData]
        } else {
            response.userInfo = ["message": responseData]
        }

        context.completeRequest(returningItems: [response], completionHandler: nil)
    }

    /// Detect current system appearance (dark or light mode)
    private static func isDarkMode() -> Bool {
        #if os(macOS)
        let appearance = NSApp?.effectiveAppearance ?? NSAppearance.currentDrawing()
        return appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
        #else
        return UITraitCollection.current.userInterfaceStyle == .dark
        #endif
    }

}
