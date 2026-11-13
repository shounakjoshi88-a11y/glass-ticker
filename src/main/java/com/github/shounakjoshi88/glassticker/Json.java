package com.github.shounakjoshi88.glassticker;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * A very small JSON reader and writer.
 *
 * <p>The Glass Ticker server has no third party dependencies, so it needs its
 * own JSON handling. This covers everything Yahoo and the browser use:
 * objects, arrays, strings, numbers, booleans and null.
 */
public final class Json {

    private final String text;
    private int at;

    private Json(String text) {
        this.text = text;
    }

    /** Parse a JSON document into Map, List, String, Double, Boolean or null. */
    public static Object parse(String text) {
        Json parser = new Json(text);
        parser.skipSpace();
        Object value = parser.readValue();
        return value;
    }

    /** Read a nested value, for example path("quoteResponse", "result"). */
    @SuppressWarnings("unchecked")
    public static Object path(Object root, String... keys) {
        Object current = root;
        for (String key : keys) {
            if (!(current instanceof Map)) {
                return null;
            }
            current = ((Map<String, Object>) current).get(key);
        }
        return current;
    }

    /** Read a double, returning null when the value is missing or not numeric. */
    public static Double number(Object value) {
        if (value instanceof Double) {
            return (Double) value;
        }
        if (value instanceof String) {
            try {
                return Double.parseDouble((String) value);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    /** Read a string, returning null when the value is missing. */
    public static String text(Object value) {
        return value instanceof String ? (String) value : null;
    }

    /** Serialise a value built from Map, List, String, Number, Boolean or null. */
    public static String write(Object value) {
        StringBuilder out = new StringBuilder();
        writeValue(out, value);
        return out.toString();
    }

    private static void writeValue(StringBuilder out, Object value) {
        if (value == null) {
            out.append("null");
        } else if (value instanceof Map) {
            out.append('{');
            boolean first = true;
            for (Map.Entry<?, ?> entry : ((Map<?, ?>) value).entrySet()) {
                if (!first) {
                    out.append(',');
                }
                first = false;
                writeString(out, String.valueOf(entry.getKey()));
                out.append(':');
                writeValue(out, entry.getValue());
            }
            out.append('}');
        } else if (value instanceof List) {
            out.append('[');
            boolean first = true;
            for (Object item : (List<?>) value) {
                if (!first) {
                    out.append(',');
                }
                first = false;
                writeValue(out, item);
            }
            out.append(']');
        } else if (value instanceof Number) {
            double number = ((Number) value).doubleValue();
            if (number == Math.floor(number) && !Double.isInfinite(number)) {
                out.append((long) number);
            } else {
                out.append(number);
            }
        } else if (value instanceof Boolean) {
            out.append(value.toString());
        } else {
            writeString(out, String.valueOf(value));
        }
    }

    private static void writeString(StringBuilder out, String value) {
        out.append('"');
        for (int index = 0; index < value.length(); index += 1) {
            char character = value.charAt(index);
            switch (character) {
                case '"':
                    out.append("\\\"");
                    break;
                case '\\':
                    out.append("\\\\");
                    break;
                case '\n':
                    out.append("\\n");
                    break;
                case '\r':
                    out.append("\\r");
                    break;
                case '\t':
                    out.append("\\t");
                    break;
                default:
                    if (character < 0x20) {
                        out.append(String.format("\\u%04x", (int) character));
                    } else {
                        out.append(character);
                    }
            }
        }
        out.append('"');
    }

    private void skipSpace() {
        while (at < text.length() && Character.isWhitespace(text.charAt(at))) {
            at += 1;
        }
    }

    private Object readValue() {
        skipSpace();
        if (at >= text.length()) {
            return null;
        }
        char character = text.charAt(at);
        switch (character) {
            case '{':
                return readObject();
            case '[':
                return readArray();
            case '"':
                return readString();
            case 't':
                at += 4;
                return Boolean.TRUE;
            case 'f':
                at += 5;
                return Boolean.FALSE;
            case 'n':
                at += 4;
                return null;
            default:
                return readNumber();
        }
    }

    private Map<String, Object> readObject() {
        Map<String, Object> object = new LinkedHashMap<>();
        at += 1;
        skipSpace();
        if (at < text.length() && text.charAt(at) == '}') {
            at += 1;
            return object;
        }
        while (at < text.length()) {
            skipSpace();
            String key = readString();
            skipSpace();
            if (at < text.length() && text.charAt(at) == ':') {
                at += 1;
            }
            object.put(key, readValue());
            skipSpace();
            if (at < text.length() && text.charAt(at) == ',') {
                at += 1;
                continue;
            }
            if (at < text.length() && text.charAt(at) == '}') {
                at += 1;
            }
            break;
        }
        return object;
    }

    private List<Object> readArray() {
        List<Object> array = new ArrayList<>();
        at += 1;
        skipSpace();
        if (at < text.length() && text.charAt(at) == ']') {
            at += 1;
            return array;
        }
        while (at < text.length()) {
            array.add(readValue());
            skipSpace();
            if (at < text.length() && text.charAt(at) == ',') {
                at += 1;
                continue;
            }
            if (at < text.length() && text.charAt(at) == ']') {
                at += 1;
            }
            break;
        }
        return array;
    }

    private String readString() {
        StringBuilder out = new StringBuilder();
        if (at >= text.length() || text.charAt(at) != '"') {
            return "";
        }
        at += 1;
        while (at < text.length()) {
            char character = text.charAt(at);
            if (character == '"') {
                at += 1;
                break;
            }
            if (character == '\\' && at + 1 < text.length()) {
                at += 1;
                char escaped = text.charAt(at);
                switch (escaped) {
                    case 'n':
                        out.append('\n');
                        break;
                    case 't':
                        out.append('\t');
                        break;
                    case 'r':
                        out.append('\r');
                        break;
                    case 'b':
                        out.append('\b');
                        break;
                    case 'f':
                        out.append('\f');
                        break;
                    case 'u':
                        if (at + 4 < text.length()) {
                            out.append((char) Integer.parseInt(text.substring(at + 1, at + 5), 16));
                            at += 4;
                        }
                        break;
                    default:
                        out.append(escaped);
                }
                at += 1;
                continue;
            }
            out.append(character);
            at += 1;
        }
        return out.toString();
    }

    private Double readNumber() {
        int start = at;
        while (at < text.length() && "+-0123456789.eE".indexOf(text.charAt(at)) >= 0) {
            at += 1;
        }
        try {
            return Double.parseDouble(text.substring(start, at));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }
}
