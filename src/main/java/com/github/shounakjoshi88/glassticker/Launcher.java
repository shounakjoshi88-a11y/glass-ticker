package com.github.shounakjoshi88.glassticker;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;

/**
 * Launcher for the Glass Ticker desktop app.
 *
 * <p>The Windows executable is downloaded from the GitHub release and checked
 * against the SHA-256 published next to it in release.json.
 *
 * <pre>
 *   java -jar glass-ticker-launcher.jar            launch the app
 *   java -jar glass-ticker-launcher.jar install    download only
 *   java -jar glass-ticker-launcher.jar path       print the exe location
 *   java -jar glass-ticker-launcher.jar version
 * </pre>
 */
public final class Launcher {

    private static final String REPO = "shounakjoshi88-a11y/glass-ticker";
    private static final String RELEASE_BASE = "https://github.com/" + REPO + "/releases/latest/download";
    private static final String MANIFEST_URL = RELEASE_BASE + "/release.json";
    private static final String VERSION = "2.5.0";

    private Launcher() {
    }

    public static void main(String[] args) throws Exception {
        String command = args.length == 0 ? "launch" : args[0].toLowerCase();

        switch (command) {
            case "version":
                System.out.println(VERSION);
                return;
            case "path":
                System.out.println(executablePath());
                return;
            case "install":
                ensureInstalled();
                return;
            case "launch":
                ensureInstalled();
                launch();
                return;
            default:
                System.err.println("Unknown command: " + command);
                System.err.println("Usage: launch | install | path | version");
                System.exit(2);
        }
    }

    static Path installDir() {
        String override = System.getenv("GLASS_TICKER_HOME");
        if (override != null && !override.isBlank()) {
            return Paths.get(override);
        }
        String localAppData = System.getenv("LOCALAPPDATA");
        Path base = localAppData != null && !localAppData.isBlank()
                ? Paths.get(localAppData)
                : Paths.get(System.getProperty("user.home"), ".local", "share");
        return base.resolve("GlassTicker");
    }

    static Path executablePath() {
        return installDir().resolve("GlassTicker.exe");
    }

    static String sha256(Path path) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream stream = Files.newInputStream(path)) {
            byte[] buffer = new byte[262144];
            int read;
            while ((read = stream.read(buffer)) > 0) {
                digest.update(buffer, 0, read);
            }
        }
        return HexFormat.of().formatHex(digest.digest());
    }

    /** Downloads the executable when needed and returns its path. */
    static Path ensureInstalled() throws Exception {
        if (!System.getProperty("os.name").toLowerCase().contains("win")) {
            System.out.println("[glass-ticker] Windows only - skipping download on "
                    + System.getProperty("os.name"));
            return null;
        }

        Files.createDirectories(installDir());

        String manifest = httpGet(MANIFEST_URL);
        Path target = executablePath();
        if (Files.exists(target) && manifest.contains("\"sha256\"")) {
            String expected = extractJsonString(manifest, "sha256").toLowerCase();
            if (sha256(target).equals(expected)) {
                System.out.println("[glass-ticker] ready at " + target);
                return target;
            }
        }

        String url = manifest.contains("\"url\"")
                ? extractJsonString(manifest, "url")
                : RELEASE_BASE + "/GlassTicker.exe";
        System.out.println("[glass-ticker] downloading Glass Ticker...");

        Path temp = installDir().resolve("GlassTicker.exe.download");
        try (InputStream stream = httpGetStream(url)) {
            Files.copy(stream, temp, StandardCopyOption.REPLACE_EXISTING);
        }

        if (manifest.contains("\"sha256\"")) {
            String expected = extractJsonString(manifest, "sha256").toLowerCase();
            if (!sha256(temp).equals(expected)) {
                Files.deleteIfExists(temp);
                throw new IOException("checksum mismatch - download rejected");
            }
        }

        Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING);
        System.out.println("[glass-ticker] installed to " + target);
        return target;
    }

    static void launch() throws Exception {
        Path target = executablePath();
        new ProcessBuilder(target.toString())
                .directory(installDir().toFile())
                .start();
    }

    private static HttpClient client() {
        return HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NORMAL)
                .connectTimeout(Duration.ofSeconds(30))
                .build();
    }

    static String httpGet(String url) throws Exception {
        try (InputStream stream = httpGetStream(url)) {
            return new String(stream.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
        }
    }

    static InputStream httpGetStream(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofMinutes(15))
                .header("User-Agent", "glass-ticker-maven")
                .GET()
                .build();
        HttpResponse<InputStream> response =
                client().send(request, HttpResponse.BodyHandlers.ofInputStream());
        if (response.statusCode() / 100 != 2) {
            throw new IOException("download failed (HTTP " + response.statusCode() + ")");
        }
        return response.body();
    }

    /** Tiny helper so the launcher needs no JSON dependency. */
    static String extractJsonString(String json, String key) {
        String needle = "\"" + key + "\"";
        int at = json.indexOf(needle);
        if (at < 0) {
            throw new IllegalArgumentException("missing key: " + key);
        }
        int colon = json.indexOf(':', at);
        int firstQuote = json.indexOf('"', colon);
        int end = json.indexOf('"', firstQuote + 1);
        return json.substring(firstQuote + 1, end);
    }
}
