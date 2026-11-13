import Foundation

/// Yahoo Finance client.
///
/// A native app is not a browser, so there is no CORS to work around - the
/// requests go straight out. The only wrinkle is that the batch quote
/// endpoint wants a crumb tied to a cookie, which URLSession keeps for us.
actor YahooAPI {
    static let shared = YahooAPI()

    private var crumb: String?
    private var crumbAt: Date = .distantPast
    private let session: URLSession

    init() {
        let configuration = URLSessionConfiguration.default
        configuration.httpCookieStorage = .shared
        configuration.httpCookieAcceptPolicy = .always
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        configuration.timeoutIntervalForRequest = 20
        session = URLSession(configuration: configuration)
    }

    // MARK: - Quotes

    func quotes(for symbols: [String]) async throws -> [Quote] {
        let clean = symbols.map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
        guard !clean.isEmpty else { return [] }
        do {
            return try await batchQuotes(clean)
        } catch {
            // The batch endpoint refuses requests now and then. The chart
            // endpoint does not, so rebuild the quote from it.
            var quotes: [Quote] = []
            for symbol in clean {
                if let quote = try? await quoteFromChart(symbol) {
                    quotes.append(quote)
                }
            }
            if quotes.isEmpty { throw error }
            return quotes
        }
    }

    private func batchQuotes(_ symbols: [String]) async throws -> [Quote] {
        let crumb = try await currentCrumb()
        var components = URLComponents(string: "https://query1.finance.yahoo.com/v7/finance/quote")!
        components.queryItems = [
            URLQueryItem(name: "symbols", value: symbols.joined(separator: ",")),
            URLQueryItem(name: "crumb", value: crumb),
        ]
        let payload = try await get(components.url!)
        guard let quoteResponse = payload["quoteResponse"] as? [String: Any] else {
            throw APIClientError.emptyResponse
        }
        let results = quoteResponse["result"] as? [[String: Any]] ?? []
        guard !results.isEmpty else { throw APIClientError.emptyResponse }
        return results.compactMap(normalise)
    }

    private func normalise(_ item: [String: Any]) -> Quote? {
        guard let symbol = item["symbol"] as? String else { return nil }
        return Quote(
            id: symbol,
            symbol: symbol,
            name: (item["longName"] as? String) ?? (item["shortName"] as? String) ?? symbol,
            exchange: (item["fullExchangeName"] as? String) ?? (item["exchange"] as? String) ?? "",
            currency: item["currency"] as? String,
            price: number(item["regularMarketPrice"]),
            change: number(item["regularMarketChange"]),
            changePercent: number(item["regularMarketChangePercent"]),
            previousClose: number(item["regularMarketPreviousClose"] ?? item["previousClose"]),
            open: number(item["regularMarketOpen"]),
            dayHigh: number(item["regularMarketDayHigh"]),
            dayLow: number(item["regularMarketDayLow"]),
            volume: number(item["regularMarketVolume"]),
            marketCap: number(item["marketCap"]),
            trailingPE: number(item["trailingPE"]),
            dividendYield: number(item["dividendYield"]),
            week52High: number(item["fiftyTwoWeekHigh"]),
            week52Low: number(item["fiftyTwoWeekLow"]),
            marketState: (item["marketState"] as? String) ?? "CLOSED",
            logoUrl: Logos.url(for: symbol)
        )
    }

    private func quoteFromChart(_ symbol: String) async throws -> Quote {
        var components = URLComponents(string: "https://query1.finance.yahoo.com/v8/finance/chart/\(symbol)")!
        components.queryItems = [
            URLQueryItem(name: "range", value: "1d"),
            URLQueryItem(name: "interval", value: "1m"),
            URLQueryItem(name: "includePrePost", value: "true"),
        ]
        let payload = try await get(components.url!)
        guard let chart = payload["chart"] as? [String: Any],
              let result = chart["result"] as? [[String: Any]],
              let first = result.first,
              let meta = first["meta"] as? [String: Any]
        else { throw APIClientError.emptyResponse }

        let price = number(meta["regularMarketPrice"])
        let previousClose = number(meta["previousClose"] ?? meta["chartPreviousClose"])
        var change: Double?
        var changePercent: Double?
        if let price = price, let previousClose = previousClose, previousClose != 0 {
            change = price - previousClose
            changePercent = (change ?? 0) / previousClose * 100
        }
        let resolved = (meta["symbol"] as? String) ?? symbol
        return Quote(
            id: resolved,
            symbol: resolved,
            name: (meta["longName"] as? String) ?? (meta["shortName"] as? String) ?? resolved,
            exchange: (meta["fullExchangeName"] as? String) ?? (meta["exchangeName"] as? String) ?? "",
            currency: meta["currency"] as? String,
            price: price,
            change: change,
            changePercent: changePercent,
            previousClose: previousClose,
            open: number(meta["regularMarketOpen"]),
            dayHigh: number(meta["regularMarketDayHigh"]),
            dayLow: number(meta["regularMarketDayLow"]),
            volume: number(meta["regularMarketVolume"]),
            marketCap: nil,
            trailingPE: nil,
            dividendYield: nil,
            week52High: number(meta["fiftyTwoWeekHigh"]),
            week52Low: number(meta["fiftyTwoWeekLow"]),
            marketState: (meta["marketState"] as? String) ?? "CLOSED",
            logoUrl: Logos.url(for: resolved)
        )
    }

    // MARK: - Chart

    func chart(symbol: String, range: ChartRange) async throws -> [ChartPoint] {
        let query = range.query
        var components = URLComponents(string: "https://query1.finance.yahoo.com/v8/finance/chart/\(symbol)")!
        components.queryItems = [
            URLQueryItem(name: "range", value: query.range),
            URLQueryItem(name: "interval", value: query.interval),
            URLQueryItem(name: "includePrePost", value: "true"),
        ]
        let payload = try await get(components.url!)
        guard let chart = payload["chart"] as? [String: Any],
              let result = chart["result"] as? [[String: Any]],
              let first = result.first
        else { throw APIClientError.emptyResponse }

        let stamps = first["timestamp"] as? [Double] ?? []
        var closes: [Double] = []
        if let indicators = first["indicators"] as? [String: Any],
           let quoteBlock = indicators["quote"] as? [[String: Any]],
           let block = quoteBlock.first,
           let values = block["close"] as? [Double] {
            closes = values
        }
        var points: [ChartPoint] = []
        for (index, stamp) in stamps.enumerated() {
            guard index < closes.count else { continue }
            let date = Date(timeIntervalSince1970: stamp)
            points.append(ChartPoint(id: date, date: date, price: closes[index]))
        }
        return points
    }

    // MARK: - Search

    func search(_ text: String) async throws -> [SearchHit] {
        var components = URLComponents(string: "https://query1.finance.yahoo.com/v1/finance/search")!
        components.queryItems = [
            URLQueryItem(name: "q", value: text),
            URLQueryItem(name: "quotesCount", value: "12"),
            URLQueryItem(name: "newsCount", value: "0"),
        ]
        let payload = try await get(components.url!)
        let quotes = payload["quotes"] as? [[String: Any]] ?? []
        var hits: [SearchHit] = []
        for item in quotes {
            guard let symbol = item["symbol"] as? String else { continue }
            hits.append(
                SearchHit(
                    id: symbol,
                    symbol: symbol,
                    name: (item["longname"] as? String) ?? (item["shortname"] as? String) ?? symbol,
                    exchange: (item["exchDisp"] as? String) ?? (item["exchange"] as? String) ?? ""
                )
            )
        }
        return hits
    }

    // MARK: - Plumbing

    private func currentCrumb() async throws -> String {
        if let crumb = crumb, Date().timeIntervalSince(crumbAt) < 1800 {
            return crumb
        }
        // This endpoint errors on purpose - it only sets the cookie.
        let seed = URL(string: "https://fc.yahoo.com")!
        _ = try? await session.data(from: seed)
        let url = URL(string: "https://query1.finance.yahoo.com/v1/test/getcrumb")!
        var request = URLRequest(url: url)
        request.setValue(agent, forHTTPHeaderField: "User-Agent")
        let (data, _) = try await session.data(for: request)
        let value = String(decoding: data, as: UTF8.self).trimmingCharacters(in: .whitespacesAndNewlines)
        guard !value.isEmpty, !value.hasPrefix("{"), !value.hasPrefix("<") else {
            throw APIClientError.noCrumb
        }
        crumb = value
        crumbAt = Date()
        return value
    }

    private var agent: String {
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
            + "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    }

    private func get(_ url: URL) async throws -> [String: Any] {
        var request = URLRequest(url: url)
        request.setValue(agent, forHTTPHeaderField: "User-Agent")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        let (data, response) = try await session.data(for: request)
        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            throw APIClientError.http(http.statusCode)
        }
        let payload = try JSONSerialization.jsonObject(with: data)
        guard let object = payload as? [String: Any] else { throw APIClientError.emptyResponse }
        return object
    }

    private func number(_ value: Any?) -> Double? {
        if let number = value as? Double { return number }
        if let number = value as? Int { return Double(number) }
        if let text = value as? String, let number = Double(text) { return number }
        return nil
    }
}

enum APIClientError: LocalizedError {
    case http(Int)
    case emptyResponse
    case noCrumb

    var errorDescription: String? {
        switch self {
        case .http(let code): return "Yahoo returned HTTP \(code)"
        case .emptyResponse: return "Yahoo returned no data"
        case .noCrumb: return "could not obtain a crumb"
        }
    }
}
