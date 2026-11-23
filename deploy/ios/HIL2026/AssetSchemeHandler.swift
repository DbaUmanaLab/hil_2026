import Foundation
import WebKit

/// Serve i file della cartella web/ dell'app all'indirizzo hil://app/<percorso>.
/// Supporta le richieste parziali (Range), che WebKit usa per audio e video.
final class AssetSchemeHandler: NSObject, WKURLSchemeHandler {

    static let scheme = "hil"
    static let host = "app"

    private let root: URL

    init(root: URL) {
        self.root = root.standardizedFileURL
    }

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else {
            task.didFailWithError(URLError(.badURL))
            return
        }
        // url.path è già decodificato ("assets/audio effects/crowd goal.mp3")
        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        let file = root.appendingPathComponent(String(path.dropFirst())).standardizedFileURL
        // niente uscite dalla cartella web/ (../)
        guard file.path.hasPrefix(root.path + "/"),
              let data = try? Data(contentsOf: file, options: .mappedIfSafe) else {
            respond(task, url: url, status: 404, headers: ["Content-Type": "text/plain"], body: Data("Not found".utf8))
            return
        }

        var headers = [
            "Content-Type": Self.mimeType(for: file.pathExtension),
            "Accept-Ranges": "bytes",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache"
        ]
        var status = 200
        var body = data
        if let rangeHeader = task.request.value(forHTTPHeaderField: "Range"),
           let range = Self.parseRange(rangeHeader, length: data.count) {
            status = 206
            body = data.subdata(in: range)
            headers["Content-Range"] = "bytes \(range.lowerBound)-\(range.upperBound - 1)/\(data.count)"
        }
        respond(task, url: url, status: status, headers: headers, body: body)
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {
        // le risposte partono subito in start(): niente da interrompere
    }

    private func respond(_ task: WKURLSchemeTask, url: URL, status: Int, headers: [String: String], body: Data) {
        var h = headers
        h["Content-Length"] = String(body.count)
        guard let response = HTTPURLResponse(url: url, statusCode: status, httpVersion: "HTTP/1.1", headerFields: h) else {
            task.didFailWithError(URLError(.cannotParseResponse))
            return
        }
        task.didReceive(response)
        task.didReceive(body)
        task.didFinish()
    }

    /// "bytes=inizio-fine", "bytes=inizio-" oppure "bytes=-ultimi"; nil se non valida (risposta intera).
    static func parseRange(_ header: String, length: Int) -> Range<Int>? {
        guard length > 0, header.hasPrefix("bytes=") else { return nil }
        let spec = header.dropFirst(6).split(separator: ",").first.map(String.init) ?? ""
        let parts = spec.split(separator: "-", omittingEmptySubsequences: false).map { $0.trimmingCharacters(in: .whitespaces) }
        guard parts.count == 2 else { return nil }
        var start: Int, end: Int
        if parts[0].isEmpty {
            guard let suffix = Int(parts[1]), suffix > 0 else { return nil }
            start = max(0, length - suffix)
            end = length - 1
        } else {
            guard let s = Int(parts[0]) else { return nil }
            start = s
            end = parts[1].isEmpty ? length - 1 : (Int(parts[1]) ?? length - 1)
        }
        end = min(end, length - 1)
        guard start >= 0, start <= end else { return nil }
        return start..<(end + 1)
    }

    static func mimeType(for ext: String) -> String {
        switch ext.lowercased() {
        case "html", "htm": return "text/html; charset=utf-8"
        case "js", "mjs": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json": return "application/json; charset=utf-8"
        case "md", "txt": return "text/plain; charset=utf-8"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "webp": return "image/webp"
        case "gif": return "image/gif"
        case "svg": return "image/svg+xml"
        case "ico": return "image/x-icon"
        case "mp3": return "audio/mpeg"
        case "m4a", "aac": return "audio/mp4"
        case "ogg": return "audio/ogg"
        case "wav": return "audio/wav"
        case "mp4": return "video/mp4"
        case "woff2": return "font/woff2"
        case "woff": return "font/woff"
        case "ttf": return "font/ttf"
        case "glb": return "model/gltf-binary"
        case "gltf": return "model/gltf+json"
        default: return "application/octet-stream"
        }
    }
}
