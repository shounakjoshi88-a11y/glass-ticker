package com.github.shounakjoshi88.glassticker;

/** Helpers for embedding Glass Ticker into a Java application. */
public final class Embed {

    private Embed() {
    }

    /** An iframe snippet that embeds a running Glass Ticker server. */
    public static String iframe(String url, int height, String width) {
        return "<iframe src=\"" + url + "\" width=\"" + width + "\" height=\"" + height
                + "\" style=\"border:0;border-radius:14px;overflow:hidden\" "
                + "title=\"Glass Ticker\" loading=\"lazy\"></iframe>";
    }

    /** An iframe snippet with a sensible default size. */
    public static String iframe(String url) {
        return iframe(url, 480, "100%");
    }

    /**
     * A JavaFX snippet that shows the ticker in a web view.
     *
     * <pre>
     * WebView view = new WebView();
     * view.getEngine().load(server.url());
     * </pre>
     */
    public static String javafx(String url) {
        return "WebView view = new WebView();\n"
                + "view.getEngine().load(\"" + url + "\");\n"
                + "StackPane root = new StackPane(view);";
    }
}
