import UIKit
import WebKit

/// WKWebView a tutto schermo che serve il gioco dagli asset dell'app (cartella web/ copiata da
/// scripts/sync-web.py) tramite AssetSchemeHandler, cioè da un'origine vera (hil://app/) e non da
/// file://: così fetch, moduli ES, localStorage, WebGL 2 e audio funzionano come nel browser.
///
/// Comandi: touch (comandi a schermo del gioco), tastiera fisica e controller (Gamepad API di WebKit,
/// letta da src/input/Gamepad.js). La telecronaca usa la speechSynthesis di WebKit.
final class GameViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {

    static let background = UIColor(red: 5 / 255, green: 9 / 255, blue: 19 / 255, alpha: 1)   // #050913
    private static let startURL = URL(string: "\(AssetSchemeHandler.scheme)://\(AssetSchemeHandler.host)/index.html")!

    private var webView: WKWebView!
    private let webRoot = Bundle.main.resourceURL!.appendingPathComponent("web", isDirectory: true)

    override func loadView() {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(AssetSchemeHandler(root: webRoot), forURLScheme: AssetSchemeHandler.scheme)
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []      // musica e cori partono senza un tocco dedicato
        config.websiteDataStore = .default()                       // localStorage persistente (impostazioni, salvataggi)
        config.userContentController.addUserScript(teamsDataScript())

        let web = WKWebView(frame: .zero, configuration: config)
        web.isOpaque = false
        web.backgroundColor = Self.background
        web.scrollView.backgroundColor = Self.background
        web.scrollView.isScrollEnabled = false
        web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never       // il gioco gestisce le aree sicure (env(safe-area-inset-*))
        web.allowsLinkPreview = false
        web.allowsBackForwardNavigationGestures = false
        web.navigationDelegate = self
        web.uiDelegate = self
        #if DEBUG
        if #available(iOS 16.4, *) { web.isInspectable = true }      // Safari › Sviluppo sul Mac
        #endif
        webView = web
        view = web
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        webView.load(URLRequest(url: Self.startURL))
    }

    /// src/data/teams.json già nella pagina (window.HIL_TEAMS_DATA): teams-loader.js lo legge con un
    /// XMLHttpRequest sincrono, che non passa dai gestori di schema personalizzati di WKWebView.
    private func teamsDataScript() -> WKUserScript {
        let url = webRoot.appendingPathComponent("src/data/teams.json")
        var source = ""
        if let data = try? Data(contentsOf: url), let json = String(data: data, encoding: .utf8),
           (try? JSONSerialization.jsonObject(with: data)) != nil {
            source = "window.HIL_TEAMS_DATA = \(json);"
        }
        return WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true)
    }

    // ---------------------------------------------------------------- tutto schermo
    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    // i gesti di sistema dai bordi chiedono una seconda strisciata: niente uscite involontarie in partita
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .all }

    // ---------------------------------------------------------------- navigazione
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        let scheme = url.scheme?.lowercased() ?? ""
        if scheme == AssetSchemeHandler.scheme || scheme == "about" || scheme == "blob" || scheme == "data" {
            decisionHandler(.allow)
            return
        }
        // link esterni (siti dei club, ecc.) in Safari
        if navigationAction.targetFrame?.isMainFrame ?? true {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    // window.open / target="_blank": in Safari
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url { UIApplication.shared.open(url) }
        return nil
    }

    // il sistema ha chiuso il processo della pagina (memoria): si ricarica invece di restare su schermo nero
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.load(URLRequest(url: Self.startURL))
    }
}
