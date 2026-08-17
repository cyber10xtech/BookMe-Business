import Foundation
import Capacitor
import LinkPresentation
import UIKit

/**
 * Native rich share for a BookMe provider profile "card" — iOS only.
 *
 * WHY THIS EXISTS
 * Capacitor's stock @capacitor/share plugin hands UIActivityViewController a
 * plain URL + text as separate activity items. Several share targets
 * (Messages in particular) will still render the raw link/path as visible
 * text alongside whatever caption you give it. To get a genuinely card-only
 * rendering — business name + image, no visible "/provider/{id}" path or
 * "here's a link" sentence — the shared item needs to conform to
 * UIActivityItemSource and supply LPLinkMetadata directly (iOS 13+, via
 * LinkPresentation.framework). That's what this file does.
 *
 * WHAT THIS DOES NOT DO
 * iOS still shows the link's HOST (e.g. "bookmebusiness.com") as a small trust
 * indicator on the resulting card in Messages/Mail — that's rendered by the
 * OS/receiving app itself and cannot be suppressed by any app, including
 * this one. What this DOES remove is the raw path and any visible sentence
 * containing the link.
 *
 * ANDROID HAS NO EQUIVALENT
 * There is no OS-level "rich share card" concept for a generic
 * Intent.ACTION_SEND on Android — whatever a receiving app shows is up to
 * that app. shareProfile.ts uses this plugin on iOS only; Android keeps
 * using @capacitor/share with an attached image file + short caption, which
 * is the closest achievable equivalent there.
 *
 * ⚠️ UNTESTED NATIVE CODE: written without the ability to run Xcode/build
 * in this environment. Build and test this on a real device/simulator
 * before shipping — in particular, confirm the LPLinkMetadata card renders
 * as expected in Messages, and that the plugin auto-registers correctly
 * (Capacitor auto-discovers any CAPBridgedPlugin compiled into the app
 * target — no manual registration file should be needed, but verify).
 */
@objc(NativeSharePlugin)
public class NativeSharePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeSharePlugin"
    public let jsName = "NativeShare"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "shareProviderCard", returnType: CAPPluginReturnPromise)
    ]

    @objc func shareProviderCard(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"), let url = URL(string: urlString) else {
            call.reject("A valid 'url' is required")
            return
        }
        let title = call.getString("title") ?? "BookMe"
        // Local file path (or file:// URI) for the business logo/cover image,
        // staged beforehand by the caller (see shareProfile.ts stageShareImage).
        // Optional — the card still works with just a title if this is nil.
        let imagePath = call.getString("imagePath")

        DispatchQueue.main.async {
            let itemSource = LinkMetadataItemSource(url: url, title: title, imagePath: imagePath)
            let activityVC = UIActivityViewController(activityItems: [itemSource], applicationActivities: nil)

            guard let topVC = NativeSharePlugin.topViewController() else {
                call.reject("No presenting view controller available")
                return
            }

            // Required on iPad — UIActivityViewController is a popover there,
            // and it crashes without a source rect/view.
            if let popover = activityVC.popoverPresentationController {
                popover.sourceView = topVC.view
                popover.sourceRect = CGRect(x: topVC.view.bounds.midX, y: topVC.view.bounds.midY, width: 0, height: 0)
                popover.permittedArrowDirections = []
            }

            activityVC.completionWithItemsHandler = { _, completed, _, error in
                if let error = error {
                    call.reject("Share failed: \(error.localizedDescription)")
                } else {
                    call.resolve(["completed": completed])
                }
            }

            topVC.present(activityVC, animated: true)
        }
    }

    private static func topViewController(
        _ base: UIViewController? = UIApplication.shared.connectedScenes
            .compactMap { ($0 as? UIWindowScene)?.keyWindow }
            .first?.rootViewController
    ) -> UIViewController? {
        if let nav = base as? UINavigationController {
            return topViewController(nav.visibleViewController)
        }
        if let tab = base as? UITabBarController, let selected = tab.selectedViewController {
            return topViewController(selected)
        }
        if let presented = base?.presentedViewController {
            return topViewController(presented)
        }
        return base
    }
}

/// Supplies LPLinkMetadata directly so share targets render a card
/// (title + image) instead of a raw link/path as text.
private class LinkMetadataItemSource: NSObject, UIActivityItemSource {
    let url: URL
    let title: String
    let imagePath: String?

    init(url: URL, title: String, imagePath: String?) {
        self.url = url
        self.title = title
        self.imagePath = imagePath
    }

    func activityViewControllerPlaceholderItem(_ activityViewController: UIActivityViewController) -> Any {
        return url
    }

    func activityViewController(_ activityViewController: UIActivityViewController, itemForActivityType activityType: UIActivity.ActivityType?) -> Any? {
        return url
    }

    func activityViewController(_ activityViewController: UIActivityViewController, subjectForActivityType activityType: UIActivity.ActivityType?) -> String {
        return title
    }

    @available(iOS 13.0, *)
    func activityViewControllerLinkMetadata(_ activityViewController: UIActivityViewController) -> LPLinkMetadata? {
        let metadata = LPLinkMetadata()
        metadata.originalURL = url
        metadata.url = url
        metadata.title = title

        if let imagePath = imagePath {
            let fileURL = imagePath.hasPrefix("file://") ? URL(string: imagePath) : URL(fileURLWithPath: imagePath)
            if let fileURL = fileURL, FileManager.default.fileExists(atPath: fileURL.path) {
                metadata.imageProvider = NSItemProvider(contentsOf: fileURL)
                metadata.iconProvider = NSItemProvider(contentsOf: fileURL)
            }
        }

        return metadata
    }
}
