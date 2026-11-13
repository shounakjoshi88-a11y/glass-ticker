import SwiftUI

/// The main screen: the watchlist, plus a search that swaps in results.
struct ContentView: View {
    @State private var symbols: [String] = [
        "^NSEI", "^BSESN", "RELIANCE.NS", "TCS.NS", "INFY.NS",
        "HDFCBANK.NS", "AAPL", "NVDA", "BTC-USD",
    ]
    @State private var quotes: [Quote] = []
    @State private var searchText: String = ""
    @State private var results: [SearchHit] = []
    @State private var loading: Bool = false
    @State private var message: String?

    private var searching: Bool { !searchText.trimmingCharacters(in: .whitespaces).isEmpty }

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()

                if searching {
                    searchResults
                } else {
                    watchlist
                }
            }
            .navigationTitle(searching ? "Search" : "Glass Ticker")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $searchText, prompt: "Symbol or company")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await refresh() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .disabled(loading)
                }
            }
            .task { await refresh() }
            .task(id: searchText) { await runSearch() }
        }
        .tint(Theme.accent)
        .preferredColorScheme(.dark)
    }

    // MARK: - Watchlist

    private var watchlist: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                if let message = message {
                    Text(message)
                        .font(.footnote)
                        .foregroundStyle(Theme.muted)
                        .padding(.vertical, 8)
                }
                ForEach(quotes) { quote in
                    NavigationLink {
                        DetailView(quote: quote)
                    } label: {
                        QuoteRow(quote: quote)
                    }
                    .buttonStyle(.plain)
                    Divider().overlay(Theme.line)
                }
                if quotes.isEmpty && !loading {
                    Text("No quotes yet")
                        .font(.footnote)
                        .foregroundStyle(Theme.muted)
                        .padding(.vertical, 20)
                }
            }
            .padding(.horizontal, 14)
        }
        .refreshable { await refresh() }
    }

    // MARK: - Search

    private var searchResults: some View {
        List(results) { hit in
            Button {
                add(hit.symbol)
            } label: {
                HStack(spacing: 12) {
                    LogoView(symbol: hit.symbol, url: Logos.url(for: hit.symbol))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(hit.symbol)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Theme.text)
                        Text(hit.name)
                            .font(.caption)
                            .foregroundStyle(Theme.muted)
                            .lineLimit(1)
                    }
                    Spacer()
                    Text(hit.exchange)
                        .font(.caption2)
                        .foregroundStyle(Theme.dim)
                }
            }
            .listRowBackground(Theme.background)
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
    }

    // MARK: - Work

    private func refresh() async {
        loading = true
        defer { loading = false }
        do {
            quotes = try await YahooAPI.shared.quotes(for: symbols)
            message = nil
        } catch {
            message = error.localizedDescription
        }
    }

    private func runSearch() async {
        let text = searchText.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else {
            results = []
            return
        }
        // Give the keyboard a moment before hitting the network.
        try? await Task.sleep(nanoseconds: 350_000_000)
        guard !Task.isCancelled else { return }
        results = (try? await YahooAPI.shared.search(text)) ?? []
    }

    private func add(_ symbol: String) {
        if !symbols.contains(symbol) {
            symbols.insert(symbol, at: 0)
        }
        searchText = ""
        Task { await refresh() }
    }
}

/// One row of the watchlist.
struct QuoteRow: View {
    let quote: Quote

    var body: some View {
        HStack(spacing: 12) {
            LogoView(symbol: quote.symbol, url: quote.logoUrl)

            VStack(alignment: .leading, spacing: 2) {
                Text(quote.symbol)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.text)
                Text(quote.name)
                    .font(.caption)
                    .foregroundStyle(Theme.muted)
                    .lineLimit(1)
            }

            Spacer(minLength: 8)

            VStack(alignment: .trailing, spacing: 2) {
                Text(Format.price(quote.price, currency: quote.currency))
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.text)
                    .monospacedDigit()
                Text(Format.percent(quote.changePercent))
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(quote.isUp ? Theme.up : Theme.down)
                    .monospacedDigit()
            }

            Image(systemName: "chevron.right")
                .font(.caption2.weight(.bold))
                .foregroundStyle(Theme.dim)
        }
        .padding(.vertical, 10)
        .contentShape(Rectangle())
    }
}

#Preview {
    ContentView()
        .preferredColorScheme(.dark)
}
