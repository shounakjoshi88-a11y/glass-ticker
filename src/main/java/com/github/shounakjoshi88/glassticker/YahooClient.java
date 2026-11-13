package com.github.shounakjoshi88.glassticker;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Yahoo Finance client used by the Glass Ticker server.
 *
 * <p>The browser cannot call Yahoo directly (CORS), so every language binding
 * ships a small server that does the fetching. This is the Java one, and it
 * has no third party dependencies.
 */
public final class YahooClient {

    private static final String USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    + "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    private static final Map<String, String> RANGES = Map.of(
            "1D", "1d,1m,2m,5m",
            "5D", "5d,15m,30m,1h",
            "1M", "1mo,1h,30m,1d",
            "3M", "3mo,1d,1wk",
            "6M", "6mo,1d,1wk",
            "YTD", "ytd,1d,1wk",
            "1Y", "1y,1d,1wk",
            "5Y", "5y,1wk,1mo",
            "MAX", "max,1mo,3mo");

    private static final Map<String, String> LOGO_DOMAINS = Map.ofEntries(
            Map.entry("AAPL", "apple.com"),
            Map.entry("MSFT", "microsoft.com"),
            Map.entry("GOOGL", "google.com"),
            Map.entry("AMZN", "amazon.com"),
            Map.entry("META", "meta.com"),
            Map.entry("TSLA", "tesla.com"),
            Map.entry("NVDA", "nvidia.com"),
            Map.entry("INFY", "infosys.com"),
            Map.entry("TCS", "tcs.com"),
            Map.entry("RELIANCE", "ril.com"),
            Map.entry("HDFCBANK", "hdfcbank.com"),
            Map.entry("SBIN", "sbi.co.in"),
            Map.entry("ITC", "itcportal.com"),
            Map.entry("BHARTIARTL", "bhartiarthtel.com"),
            Map.entry("LT", "larsentoubro.com"),
            Map.entry("AXISBANK", "axisbank.com"),
            Map.entry("MARUTI", "marutisuzuki.com"),
            Map.entry("TATAMOTORS", "tatamotors.com"),
            Map.entry("ADANIENT", "adani.com"),
            Map.entry("WIPRO", "wipro.com"),
            Map.entry("HCLTECH", "hcltech.com"),
            Map.entry("BAJAJFINSV", "bajajfinserv.in"),
            Map.entry("KOTAKBANK", "kotak.com"),
            Map.entry("ONGC", "ongc.co.in"),
            Map.entry("NTPC", "ntpc.co.in"),
            Map.entry("POWERGRID", "powergrid.in"),
            Map.entry("TITAN", "titancompany.in"),
            Map.entry("SUNPHARMA", "sunpharma.com"),
            Map.entry("CIPLA", "cipla.com"),
            Map.entry("HINDUNILVR", "hindunilvr.com"),
            Map.entry("NESTLEIND", "nestleindia.in"),
            Map.entry("GRASIM", "grasim.com"),
            Map.entry("DRREDDY", "drreddys.com"),
            Map.entry("EICHERMOT", "eicher.in"),
            Map.entry("BRITANNIA", "britannia.co.in"),
            Map.entry("BPCL", "bpccindia.com"),
            Map.entry("IOC", "iocl.com"),
            Map.entry("HAL", "hal-india.co.in"),
            Map.entry("BEL", "bel.co.in"),
            Map.entry("VEDL", "vedl.com"),
            Map.entry("ZOMATO", "zomato.com"),
            Map.entry("PAYTM", "paytm.com"),
            Map.entry("NYKAA", "nykaa.com"),
            Map.entry("IRFC", "irfc.co.in"),
            Map.entry("DMART", "d-mart.com"),
            Map.entry("PIDILITIND", "pidilite.com"),
            Map.entry("SIEMENS", "siemens.com"),
            Map.entry("ABB", "abb.com"),
            Map.entry("SBILIFE", "sbilife.co.in"),
            Map.entry("HDFCLIFE", "hdfclife.com"),
            Map.entry("ICICIGI", "icicilomburgi.com"),
            Map.entry("M&M", "mahindra.com"),
            Map.entry("HEROMOTOCO", "heromotocorp.com"),
            Map.entry("DIVISLAB", "divislabs.com"),
            Map.entry("APOLLOHOSP", "apollohospitals.com"),
            Map.entry("TORNTPHARM", "torntpharma.com"),
            Map.entry("TECHM", "techmahindra.com"),
            Map.entry("LTIM", "ltimindtree.com"),
            Map.entry("POLYCAB", "polycabindia.com"),
            Map.entry("ASTRAL", "astralpipeline.com"),
            Map.entry("CUMMINSIND", "cumminsindia.com"),
            Map.entry("GAIL", "gailonline.com"),
            Map.entry("CANARA", "canarabank.com"),
            Map.entry("PNB", "pnbindia.in"),
            Map.entry("IDBI", "idbi.co.in"),
            Map.entry("FEDERALBK", "federalbank.co.in"),
            Map.entry("BANDHANBNK", "bandhanbank.in"),
            Map.entry("LICI", "licindia.in"),
            Map.entry("BTC-USD", "bitcoin.org"),
            Map.entry("ETH-USD", "ethereum.org"),
            Map.entry("SOL-USD", "solana.com"),
            Map.entry("XRP-USD", "ripple.com"),
            Map.entry("DOGE-USD", "dogecoin.com"),
            Map.entry("^NSEI", "nseindia.com"),
            Map.entry("^BSESN", "bseindia.com"),
            Map.entry("^NSEBANK", "nseindia.com"),
            Map.entry("^CNXIT", "nseindia.com"));

    private final HttpClient http;
    private final Map<String, String> cookies = new ConcurrentHashMap<>();
    private volatile String crumb;
    private volatile long crumbAt;

    public YahooClient() {
        this.http = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NORMAL)
                .connectTimeout(Duration.ofSeconds(20))
                .build();
    }

    /** Favicon URL for a symbol, or null when it is unknown. */
    public static String logoFor(String symbol) {
        if (symbol == null) {
            return null;
        }
        String base = symbol;
        int dot = symbol.lastIndexOf('.');
        if (dot > 0) {
            String suffix = symbol.substring(dot + 1).toUpperCase();
            if (suffix.equals("NS") || suffix.equals("BO")) {
                base = symbol.substring(0, dot);
            }
        }
        String domain = LOGO_DOMAINS.get(symbol);
        if (domain == null) {
            domain = LOGO_DOMAINS.get(base);
        }
        if (domain == null) {
            return null;
        }
        return "https://www.google.com/s2/favicons?domain=" + domain + "&sz=64";
    }

    private String send(String url, String accept) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(30))
                .header("User-Agent", USER_AGENT)
                .header("Accept", accept);
        if (!cookies.isEmpty()) {
            StringBuilder header = new StringBuilder();
            cookies.forEach((key, value) -> {
                if (header.length() > 0) {
                    header.append("; ");
                }
                header.append(key).append('=').append(value);
            });
            builder.header("Cookie", header.toString());
        }
        HttpResponse<String> response =
                http.send(builder.GET().build(), HttpResponse.BodyHandlers.ofString());
        response.headers().allValues("set-cookie").forEach(line -> {
            String pair = line.split(";")[0];
            int index = pair.indexOf('=');
            if (index > 0) {
                cookies.put(pair.substring(0, index).trim(), pair.substring(index + 1).trim());
            }
        });
        if (response.statusCode() / 100 != 2) {
            throw new IllegalStateException("HTTP " + response.statusCode() + " for " + url);
        }
        return response.body();
    }

    private String crumb() throws Exception {
        if (crumb != null && System.currentTimeMillis() - crumbAt < 1_800_000L) {
            return crumb;
        }
        try {
            send("https://fc.yahoo.com", "*/*");
        } catch (Exception ignored) {
            // the endpoint errors on purpose, it only sets cookies
        }
        String value = send("https://query1.finance.yahoo.com/v1/test/getcrumb", "*/*").trim();
        if (value.isEmpty() || value.startsWith("{") || value.startsWith("<")) {
            throw new IllegalStateException("could not obtain a crumb");
        }
        crumb = value;
        crumbAt = System.currentTimeMillis();
        return crumb;
    }

    /** Latest quote for each symbol. */
    public List<Map<String, Object>> quotes(List<String> symbols) {
        List<String> clean = new ArrayList<>();
        for (String symbol : symbols) {
            if (symbol != null && !symbol.isBlank()) {
                clean.add(symbol.trim());
            }
        }
        if (clean.isEmpty()) {
            return List.of();
        }
        try {
            return batchQuotes(clean);
        } catch (Exception error) {
            // Yahoo's batch endpoint refuses requests now and then. The chart
            // endpoint has no such restriction, so rebuild the quote from it.
            List<Map<String, Object>> quotes = new ArrayList<>();
            for (String symbol : clean) {
                try {
                    quotes.add(quoteFromChart(symbol));
                } catch (Exception ignored) {
                    continue;
                }
            }
            if (!quotes.isEmpty()) {
                return quotes;
            }
            throw new IllegalStateException(error.getMessage(), error);
        }
    }

    private List<Map<String, Object>> batchQuotes(List<String> symbols) throws Exception {
        String url = "https://query1.finance.yahoo.com/v7/finance/quote?symbols="
                + String.join(",", symbols) + "&crumb=" + crumb();
        Object payload;
        try {
            payload = Json.parse(send(url, "application/json"));
        } catch (Exception error) {
            crumb = null;
            url = "https://query1.finance.yahoo.com/v7/finance/quote?symbols="
                    + String.join(",", symbols) + "&crumb=" + crumb();
            payload = Json.parse(send(url, "application/json"));
        }
        Object results = Json.path(payload, "quoteResponse", "result");
        if (!(results instanceof List) || ((List<?>) results).isEmpty()) {
            throw new IllegalStateException("empty quote response");
        }
        List<Map<String, Object>> quotes = new ArrayList<>();
        for (Object item : (List<?>) results) {
            quotes.add(normalise(item));
        }
        return quotes;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> normalise(Object item) {
        Map<String, Object> source = (Map<String, Object>) item;
        String symbol = Json.text(source.get("symbol"));
        Map<String, Object> quote = new LinkedHashMap<>();
        quote.put("symbol", symbol);
        quote.put("name", firstText(source, "longName", "shortName", "symbol"));
        quote.put("exchange", firstText(source, "fullExchangeName", "exchange"));
        quote.put("currency", source.get("currency"));
        quote.put("price", Json.number(source.get("regularMarketPrice")));
        quote.put("change", Json.number(source.get("regularMarketChange")));
        quote.put("changePercent", Json.number(source.get("regularMarketChangePercent")));
        quote.put("previousClose", Json.number(source.get("regularMarketPreviousClose")));
        quote.put("open", Json.number(source.get("regularMarketOpen")));
        quote.put("dayHigh", Json.number(source.get("regularMarketDayHigh")));
        quote.put("dayLow", Json.number(source.get("regularMarketDayLow")));
        quote.put("volume", Json.number(source.get("regularMarketVolume")));
        quote.put("marketCap", Json.number(source.get("marketCap")));
        quote.put("trailingPE", Json.number(source.get("trailingPE")));
        quote.put("dividendYield", Json.number(source.get("dividendYield")));
        quote.put("week52High", Json.number(source.get("fiftyTwoWeekHigh")));
        quote.put("week52Low", Json.number(source.get("fiftyTwoWeekLow")));
        quote.put("marketState", source.getOrDefault("marketState", "CLOSED"));
        quote.put("logoUrl", logoFor(symbol));
        return quote;
    }

    @SuppressWarnings("unchecked")
    private String firstText(Map<String, Object> source, String... keys) {
        for (String key : keys) {
            Object value = source.get(key);
            if (value instanceof String) {
                return (String) value;
            }
        }
        return "";
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> quoteFromChart(String symbol) throws Exception {
        String body = send("https://query1.finance.yahoo.com/v8/finance/chart/"
                + symbol.replace(" ", "%20")
                + "?range=1d&interval=1m&includePrePost=true", "application/json");
        Object result = Json.path(Json.parse(body), "chart", "result");
        if (!(result instanceof List) || ((List<?>) result).isEmpty()) {
            throw new IllegalStateException("no data for " + symbol);
        }
        Map<String, Object> meta = (Map<String, Object>) ((List<?>) result).get(0);
        meta = (Map<String, Object>) meta.get("meta");
        if (meta == null) {
            throw new IllegalStateException("no meta for " + symbol);
        }
        Double price = Json.number(meta.get("regularMarketPrice"));
        Double previousClose = Json.number(meta.get("previousClose"));
        if (previousClose == null) {
            previousClose = Json.number(meta.get("chartPreviousClose"));
        }
        Double change = price != null && previousClose != null ? price - previousClose : null;
        Double changePercent = change != null && previousClose != null && previousClose != 0
                ? (change / previousClose) * 100
                : null;

        Map<String, Object> quote = new LinkedHashMap<>();
        quote.put("symbol", meta.getOrDefault("symbol", symbol));
        quote.put("name", firstText(meta, "longName", "shortName"));
        quote.put("exchange", firstText(meta, "fullExchangeName", "exchangeName"));
        quote.put("currency", meta.get("currency"));
        quote.put("price", price);
        quote.put("change", change);
        quote.put("changePercent", changePercent);
        quote.put("previousClose", previousClose);
        quote.put("open", Json.number(meta.get("regularMarketOpen")));
        quote.put("dayHigh", Json.number(meta.get("regularMarketDayHigh")));
        quote.put("dayLow", Json.number(meta.get("regularMarketDayLow")));
        quote.put("volume", Json.number(meta.get("regularMarketVolume")));
        quote.put("marketCap", null);
        quote.put("trailingPE", null);
        quote.put("dividendYield", null);
        quote.put("week52High", Json.number(meta.get("fiftyTwoWeekHigh")));
        quote.put("week52Low", Json.number(meta.get("fiftyTwoWeekLow")));
        quote.put("marketState", meta.getOrDefault("marketState", "CLOSED"));
        quote.put("logoUrl", logoFor(symbol));
        return quote;
    }

    /** Price series for a symbol. */
    @SuppressWarnings("unchecked")
    public Map<String, Object> chart(String symbol, String rangeKey) throws Exception {
        String key = rangeKey == null ? "1D" : rangeKey.toUpperCase();
        String[] parts = RANGES.getOrDefault(key, RANGES.get("1D")).split(",");
        Exception last = null;
        for (int index = 1; index < parts.length; index += 1) {
            try {
                String body = send("https://query1.finance.yahoo.com/v8/finance/chart/"
                        + symbol.replace(" ", "%20")
                        + "?range=" + parts[0] + "&interval=" + parts[index]
                        + "&includePrePost=true", "application/json");
                Object result = Json.path(Json.parse(body), "chart", "result");
                if (!(result instanceof List) || ((List<?>) result).isEmpty()) {
                    continue;
                }
                Map<String, Object> chart = (Map<String, Object>) ((List<?>) result).get(0);
                Map<String, Object> meta = (Map<String, Object>) chart.get("meta");
                List<Object> stamps = (List<Object>) chart.get("timestamp");
                Object quoteBlock = Json.path(chart, "indicators", "quote");
                List<Object> closes = new ArrayList<>();
                if (quoteBlock instanceof List && !((List<?>) quoteBlock).isEmpty()) {
                    Object first = ((List<?>) quoteBlock).get(0);
                    if (first instanceof Map) {
                        Object values = ((Map<String, Object>) first).get("close");
                        if (values instanceof List) {
                            closes = (List<Object>) values;
                        }
                    }
                }
                List<List<Object>> points = new ArrayList<>();
                for (int at = 0; at < stamps.size() && at < closes.size(); at += 1) {
                    if (closes.get(at) == null) {
                        continue;
                    }
                    points.add(List.of(stamps.get(at), closes.get(at)));
                }
                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("symbol", symbol);
                payload.put("range", key);
                payload.put("points", points);
                Double previousClose = Json.number(meta.get("previousClose"));
                if (previousClose == null) {
                    previousClose = Json.number(meta.get("chartPreviousClose"));
                }
                payload.put("previousClose", previousClose);
                payload.put("currency", meta.get("currency"));
                payload.put("marketState", meta.getOrDefault("marketState", "REGULAR"));
                return payload;
            } catch (Exception error) {
                last = error;
            }
        }
        throw new IllegalStateException("no chart data for " + symbol, last);
    }

    /** Symbol search. */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> search(String query, int limit) throws Exception {
        String body = send("https://query1.finance.yahoo.com/v1/finance/search?q="
                + query.replace(" ", "%20") + "&quotesCount=" + limit + "&newsCount=0",
                "application/json");
        Object quotes = Json.path(Json.parse(body), "quotes");
        List<Map<String, Object>> results = new ArrayList<>();
        if (!(quotes instanceof List)) {
            return results;
        }
        for (Object item : (List<?>) quotes) {
            Map<String, Object> source = (Map<String, Object>) item;
            String symbol = Json.text(source.get("symbol"));
            if (symbol == null) {
                continue;
            }
            Map<String, Object> hit = new LinkedHashMap<>();
            hit.put("symbol", symbol);
            hit.put("name", firstText(source, "longname", "shortname"));
            hit.put("exchange", firstText(source, "exchDisp", "exchange"));
            hit.put("type", firstText(source, "typeDisp", "quoteType"));
            results.add(hit);
            if (results.size() >= limit) {
                break;
            }
        }
        return results;
    }
}
