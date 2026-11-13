import SwiftUI
import Charts

/// The detail screen: price, chart, range picker and the key statistics.
struct DetailView: View {
    let quote: Quote

    @State private var points: [ChartPoint] = []
    @State private var range: ChartRange = .day
    @State private var loading: Bool = true
    @State private var message: String?

    private var rising: Bool {
        guard let first = points.first, let last = points.last else { return true }
        return last.price >= first.price
    }

    private var stroke: Color { rising ? Theme.up : Theme.down }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header
                picker
                chart
                statistics
            }
            .padding(16)
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationTitle(quote.symbol)
        .navigationBarTitleDisplayMode(.inline)
        .task(id: range) { await load() }
    }

    // MARK: - Pieces

    private var header: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 10) {
                    LogoView(symbol: quote.symbol, url: quote.logoUrl)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(quote.name)
                            .font(.headline)
                            .foregroundStyle(Theme.text)
                            .lineLimit(1)
                        Text("\(quote.symbol) · \(quote.exchange)")
                            .font(.caption)
                            .foregroundStyle(Theme.muted)
                    }
                    Spacer()
                }

                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    Text(Format.price(quote.price, currency: quote.currency))
                        .font(.system(size: 32, weight: .semibold, design: .rounded))
                        .foregroundStyle(Theme.text)
                        .monospacedDigit()
                    Text(Format.percent(quote.changePercent))
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(quote.isUp ? Theme.up : Theme.down)
                        .monospacedDigit()
                }
            }
        }
    }

    private var picker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(ChartRange.allCases) { item in
                    Button {
                        range = item
                    } label: {
                        Text(item.rawValue)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(range == item ? Theme.accent : Theme.muted)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(
                                Capsule().fill(range == item ? Theme.up.opacity(0.16) : Color.clear)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 2)
        }
    }

    private var chart: some View {
        GlassCard {
            Group {
                if loading && points.isEmpty {
                    ProgressView().frame(maxWidth: .infinity, minHeight: 200)
                } else if points.isEmpty {
                    Text(message ?? "No chart data")
                        .font(.footnote)
                        .foregroundStyle(Theme.muted)
                        .frame(maxWidth: .infinity, minHeight: 200)
                } else {
                    Chart {
                        ForEach(points) { point in
                            LineMark(
                                x: .value("Date", point.date),
                                y: .value("Price", point.price)
                            )
                            .interpolationMethod(.catmullRom)
                            .foregroundStyle(stroke)
                            .lineStyle(StrokeStyle(lineWidth: 2))
                        }
                        if let first = points.first, let last = points.last {
                            AreaMark(
                                x: .value("Date", first.date),
                                y: .value("Price", first.price),
                                width: .fixed(0)
                            )
                            .foregroundStyle(stroke.opacity(0.12))
                            AreaMark(
                                x: .value("Date", last.date),
                                y: .value("Price", last.price),
                                width: .fixed(0)
                            )
                            .foregroundStyle(stroke.opacity(0.12))
                        }
                    }
                    .chartYAxis {
                        AxisMarks(position: .trailing) { value in
                            AxisGridLine().foregroundStyle(Theme.line)
                            AxisValueLabel {
                                if let price = value.as(Double.self) {
                                    Text(Format.decimal(price))
                                        .font(.system(size: 9))
                                        .foregroundStyle(Theme.dim)
                                }
                            }
                        }
                    }
                    .chartXAxis {
                        AxisMarks(values: .automatic(desiredCount: 4)) { value in
                            AxisGridLine().foregroundStyle(Theme.line)
                            AxisValueLabel(format: .dateTime.hour().minute())
                        }
                    }
                    .frame(height: 220)
                }
            }
        }
    }

    private var statistics: some View {
        GlassCard {
            let rows: [(String, String)] = [
                ("Open", Format.price(quote.open, currency: quote.currency)),
                ("Day high", Format.price(quote.dayHigh, currency: quote.currency)),
                ("Day low", Format.price(quote.dayLow, currency: quote.currency)),
                ("Prev close", Format.price(quote.previousClose, currency: quote.currency)),
                ("52W high", Format.price(quote.week52High, currency: quote.currency)),
                ("52W low", Format.price(quote.week52Low, currency: quote.currency)),
                ("Volume", Format.volume(quote.volume)),
                ("Mkt cap", Format.large(quote.marketCap)),
                ("P/E", Format.decimal(quote.trailingPE)),
                ("State", quote.marketState),
            ]
            VStack(spacing: 0) {
                ForEach(rows, id: \.0) { row in
                    HStack {
                        Text(row.0)
                            .font(.caption)
                            .foregroundStyle(Theme.muted)
                        Spacer()
                        Text(row.1)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Theme.text)
                            .monospacedDigit()
                    }
                    .padding(.vertical, 7)
                    Divider().overlay(Theme.line)
                }
            }
        }
    }

    // MARK: - Work

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            points = try await YahooAPI.shared.chart(symbol: quote.symbol, range: range)
            message = nil
        } catch {
            points = []
            message = error.localizedDescription
        }
    }
}

#Preview {
    NavigationStack {
        DetailView(
            quote: Quote(
                id: "NVDA",
                symbol: "NVDA",
                name: "NVIDIA Corporation",
                exchange: "NasdaqGS",
                currency: "USD",
                price: 166.19,
                change: -7.54,
                changePercent: -4.34,
                previousClose: 173.73,
                open: 170.99,
                dayHigh: 174.0,
                dayLow: 164.0,
                volume: 320_000_000,
                marketCap: 4_010_000_000_000,
                trailingPE: 21.0,
                dividendYield: 0.0058,
                week52High: 243.37,
                week52Low: 148.8,
                marketState: "REGULAR",
                logoUrl: Logos.url(for: "NVDA")
            )
        )
        .preferredColorScheme(.dark)
    }
}
