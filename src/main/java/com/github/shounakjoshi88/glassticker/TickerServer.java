package com.github.shounakjoshi88.glassticker;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;

/**
 * A tiny HTTP server that feeds the Glass Ticker component.
 *
 * <pre>
 *   try (TickerServer server = TickerServer.start(8787)) {
 *       System.out.println(server.url());
 *   }
 * </pre>
 *
 * Endpoints:
 *
 * <pre>
 *   GET /api/quotes?symbols=NVDA,AAPL
 *   GET /api/chart?symbol=NVDA&amp;range=1D
 *   GET /api/search?q=tesla
 *   GET /                a ready-made page with the component in it
 * </pre>
 */
public final class TickerServer implements AutoCloseable {

    public static final String DEFAULT_COMPONENT_URL =
            "https://unpkg.com/@glass-ticker/core/dist/glass-ticker.js";

    private static final String PAGE = """
            <!doctype html>
            <html lang="en">
            <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Glass Ticker</title>
            <style>
              html, body { margin: 0; height: 100%%; background: #08080a; }
              glass-ticker { display: block; height: 100%%; }
            </style>
            </head>
            <body>
            <glass-ticker id="ticker" symbols="%s" symbol="%s" range="%s" theme="%s" endpoint=""></glass-ticker>
            <script type="module" src="%s"></script>
            </body>
            </html>
            """;

    private final HttpServer http;
    private final YahooClient client;
    private final String componentUrl;
    private final String symbols;
    private final String symbol;
    private final String range;
    private final String theme;

    private TickerServer(HttpServer http, YahooClient client, String componentUrl,
            String symbols, String symbol, String range, String theme) {
        this.http = http;
        this.client = client;
        this.componentUrl = componentUrl;
        this.symbols = symbols;
        this.symbol = symbol;
        this.range = range;
        this.theme = theme;
    }

    /** Start a server on the given port. */
    public static TickerServer start(int port) throws IOException {
        return start(port, "NVDA,AAPL,MSFT,TSLA", "NVDA", "1D", "carbon", DEFAULT_COMPONENT_URL);
    }

    /** Start a server with a custom configuration. */
    public static TickerServer start(int port, String symbols, String symbol, String range,
            String theme, String componentUrl) throws IOException {
        HttpServer http = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
        TickerServer server = new TickerServer(http, new YahooClient(), componentUrl,
                symbols, symbol, range, theme);
        http.createContext("/api/quotes", exchange -> server.handleQuotes(exchange));
        http.createContext("/api/chart", exchange -> server.handleChart(exchange));
        http.createContext("/api/search", exchange -> server.handleSearch(exchange));
        http.createContext("/api/health", exchange -> sendJson(exchange, 200, "{\"ok\":true}"));
        http.createContext("/", exchange -> server.handlePage(exchange));
        http.setExecutor(Executors.newFixedThreadPool(4));
        http.start();
        return server;
    }

    /** Base URL of the running server. */
    public String url() {
        return "http://127.0.0.1:" + http.getAddress().getPort();
    }

    @Override
    public void close() {
        http.stop(0);
    }

    private void handleQuotes(HttpExchange exchange) throws IOException {
        try {
            List<String> symbols = new ArrayList<>();
            for (String part : query(exchange).getOrDefault("symbols", "").split(",")) {
                if (!part.isBlank()) {
                    symbols.add(part.trim());
                }
            }
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("quotes", client.quotes(symbols));
            payload.put("source", "yahoo");
            sendJson(exchange, 200, Json.write(payload));
        } catch (Exception error) {
            sendJson(exchange, 502, "{\"error\":" + quote(error.getMessage()) + "}");
        }
    }

    private void handleChart(HttpExchange exchange) throws IOException {
        try {
            Map<String, String> query = query(exchange);
            String symbol = query.getOrDefault("symbol", "NVDA");
            String range = query.getOrDefault("range", "1D");
            sendJson(exchange, 200, Json.write(client.chart(symbol, range)));
        } catch (Exception error) {
            sendJson(exchange, 502, "{\"error\":" + quote(error.getMessage()) + "}");
        }
    }

    private void handleSearch(HttpExchange exchange) throws IOException {
        try {
            String query = query(exchange).getOrDefault("q", "");
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("results", client.search(query, 8));
            payload.put("source", "yahoo");
            sendJson(exchange, 200, Json.write(payload));
        } catch (Exception error) {
            sendJson(exchange, 502, "{\"error\":" + quote(error.getMessage()) + "}");
        }
    }

    private void handlePage(HttpExchange exchange) throws IOException {
        String path = exchange.getRequestURI().getPath();
        if (!path.equals("/") && !path.equals("/index.html")) {
            sendJson(exchange, 404, "{\"error\":\"not found\"}");
            return;
        }
        String page = String.format(PAGE, symbols, symbol, range, theme, componentUrl);
        byte[] body = page.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "text/html; charset=utf-8");
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        exchange.sendResponseHeaders(200, body.length);
        try (OutputStream stream = exchange.getResponseBody()) {
            stream.write(body);
        }
    }

    private static Map<String, String> query(HttpExchange exchange) {
        Map<String, String> values = new HashMap<>();
        String raw = exchange.getRequestURI().getRawQuery();
        if (raw == null || raw.isEmpty()) {
            return values;
        }
        for (String pair : raw.split("&")) {
            int index = pair.indexOf('=');
            if (index < 0) {
                continue;
            }
            String key = URLDecoder.decode(pair.substring(0, index), StandardCharsets.UTF_8);
            String value = URLDecoder.decode(pair.substring(index + 1), StandardCharsets.UTF_8);
            values.put(key, value);
        }
        return values;
    }

    private static void sendJson(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json; charset=utf-8");
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().add("Cache-Control", "no-store");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream stream = exchange.getResponseBody()) {
            stream.write(bytes);
        }
    }

    private static String quote(String value) {
        return "\"" + String.valueOf(value).replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    /** Run the server from the command line: {@code java -jar ... 8787}. */
    public static void main(String[] args) throws Exception {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : 8787;
        TickerServer server = start(port);
        System.out.println("Glass Ticker data API on " + server.url());
        System.out.println("Embed with: " + server.url());
        Runtime.getRuntime().addShutdownHook(new Thread(server::close));
        Thread.currentThread().join();
    }
}
