import Foundation

/// A single quote from Yahoo Finance.
struct Quote: Identifiable, Hashable {
    let id: String
    let symbol: String
    let name: String
    let exchange: String
    let currency: String?
    let price: Double?
    let change: Double?
    let changePercent: Double?
    let previousClose: Double?
    let open: Double?
    let dayHigh: Double?
    let dayLow: Double?
    let volume: Double?
    let marketCap: Double?
    let trailingPE: Double?
    let dividendYield: Double?
    let week52High: Double?
    let week52Low: Double?
    let marketState: String
    let logoUrl: String?

    var isUp: Bool { (changePercent ?? 0) >= 0 }
    var direction: String {
        guard let change = changePercent else { return "flat" }
        return change > 0 ? "up" : change < 0 ? "down" : "flat"
    }
}

/// One point on the price line.
struct ChartPoint: Identifiable, Hashable {
    let id: Date
    let date: Date
    let price: Double
}

/// A search result.
struct SearchHit: Identifiable, Hashable {
    let id: String
    let symbol: String
    let name: String
    let exchange: String
}

/// The chart ranges the app offers.
enum ChartRange: String, CaseIterable, Identifiable {
    case day = "1D"
    case fiveDays = "5D"
    case month = "1M"
    case threeMonths = "3M"
    case sixMonths = "6M"
    case year = "1Y"
    case fiveYears = "5Y"
    case max = "MAX"

    var id: String { rawValue }

    /// The Yahoo range and interval to ask for.
    var query: (range: String, interval: String) {
        switch self {
        case .day: return ("1d", "5m")
        case .fiveDays: return ("5d", "30m")
        case .month: return ("1mo", "1d")
        case .threeMonths: return ("3mo", "1d")
        case .sixMonths: return ("6mo", "1d")
        case .year: return ("1y", "1wk")
        case .fiveYears: return ("5y", "1mo")
        case .max: return ("max", "1mo")
        }
    }
}

/// Favicon domains for the symbols people watch most.
enum Logos {
    static let domains: [String: String] = [
        "AAPL": "apple.com", "MSFT": "microsoft.com", "GOOGL": "google.com",
        "AMZN": "amazon.com", "META": "meta.com", "TSLA": "tesla.com",
        "NVDA": "nvidia.com", "INFY": "infosys.com", "TCS": "tcs.com",
        "RELIANCE": "ril.com", "HDFCBANK": "hdfcbank.com", "SBIN": "sbi.co.in",
        "ITC": "itcportal.com", "BHARTIARTL": "bhartiarthtel.com",
        "AXISBANK": "axisbank.com", "MARUTI": "marutisuzuki.com",
        "TATAMOTORS": "tatamotors.com", "ADANIENT": "adani.com",
        "WIPRO": "wipro.com", "HCLTECH": "hcltech.com",
        "BAJAJFINSV": "bajajfinserv.in", "KOTAKBANK": "kotak.com",
        "ONGC": "ongc.co.in", "NTPC": "ntpc.co.in", "POWERGRID": "powergrid.in",
        "TITAN": "titancompany.in", "SUNPHARMA": "sunpharma.com",
        "CIPLA": "cipla.com", "HINDUNILVR": "hindunilvr.com",
        "NESTLEIND": "nestleindia.in", "GRASIM": "grasim.com",
        "DRREDDY": "drreddys.com", "EICHERMOT": "eicher.in",
        "BRITANNIA": "britannia.co.in", "BPCL": "bpccindia.com",
        "IOC": "iocl.com", "HAL": "hal-india.co.in", "BEL": "bel.co.in",
        "VEDL": "vedl.com", "ZOMATO": "zomato.com", "PAYTM": "paytm.com",
        "NYKAA": "nykaa.com", "IRFC": "irfc.co.in", "DMART": "d-mart.com",
        "PIDILITIND": "pidilite.com", "SIEMENS": "siemens.com", "ABB": "abb.com",
        "SBILIFE": "sbilife.co.in", "HDFCLIFE": "hdfclife.com",
        "ICICIGI": "icicilomburgi.com", "M&M": "mahindra.com",
        "HEROMOTOCO": "heromotocorp.com", "DIVISLAB": "divislabs.com",
        "APOLLOHOSP": "apollohospitals.com", "TORNTPHARM": "torntpharma.com",
        "TECHM": "techmahindra.com", "LTIM": "ltimindtree.com",
        "POLYCAB": "polycabindia.com", "ASTRAL": "astralpipeline.com",
        "CUMMINSIND": "cumminsindia.com", "GAIL": "gailonline.com",
        "CANARA": "canarabank.com", "PNB": "pnbindia.in", "IDBI": "idbi.co.in",
        "FEDERALBK": "federalbank.co.in", "BANDHANBNK": "bandhanbank.in",
        "LICI": "licindia.in", "BTC-USD": "bitcoin.org", "ETH-USD": "ethereum.org",
        "SOL-USD": "solana.com", "XRP-USD": "ripple.com", "DOGE-USD": "dogecoin.com",
        "^NSEI": "nseindia.com", "^BSESN": "bseindia.com",
        "^NSEBANK": "nseindia.com", "^CNXIT": "nseindia.com",
    ]

    /// The favicon URL for a symbol, if it is known.
    static func url(for symbol: String) -> String? {
        var base = symbol
        if let dot = symbol.lastIndex(of: ".") {
            let suffix = String(symbol[symbol.index(after: dot)...]).uppercased()
            if suffix == "NS" || suffix == "BO" {
                base = String(symbol[symbol.startIndex..<dot])
            }
        }
        guard let domain = domains[symbol] ?? domains[base] else { return nil }
        return "https://www.google.com/s2/favicons?domain=\(domain)&sz=128"
    }
}

/// Formats numbers the way the desktop app does.
enum Format {
    static func price(_ value: Double?, currency: String?) -> String {
        guard let value = value else { return "--" }
        let symbol = currencySymbol(currency)
        return symbol + decimal(value, places: 2)
    }

    static func decimal(_ value: Double?, places: Int = 2) -> String {
        guard let value = value else { return "--" }
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = places
        formatter.maximumFractionDigits = places
        formatter.groupingSeparator = ","
        return formatter.string(from: NSNumber(value: value)) ?? String(format: "%.\(places)f", value)
    }

    static func percent(_ value: Double?, places: Int = 2) -> String {
        guard let value = value else { return "--" }
        let sign = value >= 0 ? "+" : "-"
        return "\(sign)\(decimal(abs(value), places: places))%"
    }

    static func volume(_ value: Double?) -> String {
        guard let value = value else { return "--" }
        if value >= 1_000_000_000 { return "\(decimal(value / 1_000_000_000, places: 2))B" }
        if value >= 1_000_000 { return "\(decimal(value / 1_000_000, places: 2))M" }
        return decimal(value, places: 0)
    }

    static func large(_ value: Double?) -> String {
        guard let value = value else { return "--" }
        let sign = value < 0 ? "-" : ""
        let amount = abs(value)
        if amount >= 1_000_000_000_000 { return "\(sign)\(decimal(amount / 1_000_000_000_000))L Cr" }
        if amount >= 1_000_000_000 { return "\(sign)\(decimal(amount / 1_000_000_000, places: 1))K Cr" }
        if amount >= 10_000_000 { return "\(sign)\(decimal(amount / 10_000_000))Cr" }
        if amount >= 100_000 { return "\(sign)\(decimal(amount / 100_000))L" }
        return sign + decimal(amount, places: 0)
    }

    private static func currencySymbol(_ currency: String?) -> String {
        switch currency?.uppercased() {
        case "USD": return "$"
        case "INR": return "₹"
        case "EUR": return "€"
        case "GBP": return "£"
        case "JPY": return "¥"
        case "CNY": return "¥"
        case "KRW": return "₩"
        case "CAD": return "C$"
        case "AUD": return "A$"
        case "BTC": return "₿"
        default: return ""
        }
    }
}
