package com.shounak.glassticker

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/** A quote from Yahoo Finance. */
data class Quote(
    val symbol: String,
    val name: String,
    val exchange: String,
    val currency: String?,
    val price: Double?,
    val change: Double?,
    val changePercent: Double?,
    val previousClose: Double?,
    val open: Double?,
    val dayHigh: Double?,
    val dayLow: Double?,
    val volume: Double?,
    val marketCap: Double?,
    val trailingPE: Double?,
    val dividendYield: Double?,
    val week52High: Double?,
    val week52Low: Double?,
    val marketState: String,
    val logoUrl: String?
) {
    val isUp: Boolean get() = (changePercent ?: 0.0) >= 0
}

/** One point on the price line. */
data class ChartPoint(val time: Long, val price: Double)

/** A search result. */
data class SearchHit(val symbol: String, val name: String, val exchange: String)

/** The chart ranges on offer. */
enum class Range(val label: String, val range: String, val interval: String) {
    DAY("1D", "1d", "5m"),
    FIVE_DAYS("5D", "5d", "30m"),
    MONTH("1M", "1mo", "1d"),
    THREE_MONTHS("3M", "3mo", "1d"),
    SIX_MONTHS("6M", "6mo", "1d"),
    YEAR("1Y", "1y", "1wk"),
    FIVE_YEARS("5Y", "5y", "1mo"),
    MAX("MAX", "max", "1mo")
}

/** Favicon domains for the symbols people watch most. */
object Logos {
    private val domains = mapOf(
        "AAPL" to "apple.com", "MSFT" to "microsoft.com", "GOOGL" to "google.com",
        "AMZN" to "amazon.com", "META" to "meta.com", "TSLA" to "tesla.com",
        "NVDA" to "nvidia.com", "INFY" to "infosys.com", "TCS" to "tcs.com",
        "RELIANCE" to "ril.com", "HDFCBANK" to "hdfcbank.com", "SBIN" to "sbi.co.in",
        "ITC" to "itcportal.com", "BHARTIARTL" to "bhartiarthtel.com",
        "AXISBANK" to "axisbank.com", "MARUTI" to "marutisuzuki.com",
        "TATAMOTORS" to "tatamotors.com", "ADANIENT" to "adani.com",
        "WIPRO" to "wipro.com", "HCLTECH" to "hcltech.com",
        "BAJAJFINSV" to "bajajfinserv.in", "KOTAKBANK" to "kotak.com",
        "ONGC" to "ongc.co.in", "NTPC" to "ntpc.co.in", "POWERGRID" to "powergrid.in",
        "TITAN" to "titancompany.in", "SUNPHARMA" to "sunpharma.com",
        "CIPLA" to "cipla.com", "HINDUNILVR" to "hindunilvr.com",
        "NESTLEIND" to "nestleindia.in", "GRASIM" to "grasim.com",
        "DRREDDY" to "drreddys.com", "EICHERMOT" to "eicher.in",
        "BRITANNIA" to "britannia.co.in", "BPCL" to "bpccindia.com",
        "IOC" to "iocl.com", "HAL" to "hal-india.co.in", "BEL" to "bel.co.in",
        "VEDL" to "vedl.com", "ZOMATO" to "zomato.com", "PAYTM" to "paytm.com",
        "NYKAA" to "nykaa.com", "IRFC" to "irfc.co.in", "DMART" to "d-mart.com",
        "PIDILITIND" to "pidilite.com", "SIEMENS" to "siemens.com", "ABB" to "abb.com",
        "SBILIFE" to "sbilife.co.in", "HDFCLIFE" to "hdfclife.com",
        "ICICIGI" to "icicilomburgi.com", "M&M" to "mahindra.com",
        "HEROMOTOCO" to "heromotocorp.com", "DIVISLAB" to "divislabs.com",
        "APOLLOHOSP" to "apollohospitals.com", "TORNTPHARM" to "torntpharma.com",
        "TECHM" to "techmahindra.com", "LTIM" to "ltimindtree.com",
        "POLYCAB" to "polycabindia.com", "ASTRAL" to "astralpipeline.com",
        "CUMMINSIND" to "cumminsindia.com", "GAIL" to "gailonline.com",
        "CANARA" to "canarabank.com", "PNB" to "pnbindia.in", "IDBI" to "idbi.co.in",
        "FEDERALBK" to "federalbank.co.in", "BANDHANBNK" to "bandhanbank.in",
        "LICI" to "licindia.in", "BTC-USD" to "bitcoin.org", "ETH-USD" to "ethereum.org",
        "SOL-USD" to "solana.com", "XRP-USD" to "ripple.com", "DOGE-USD" to "dogecoin.com",
        "^NSEI" to "nseindia.com", "^BSESN" to "bseindia.com",
        "^NSEBANK" to "nseindia.com", "^CNXIT" to "nseindia.com"
    )

    fun url(symbol: String): String? {
        val suffix = symbol.substringAfterLast('.', "")
        val base = if (suffix == "NS" || suffix == "BO") symbol.substringBeforeLast('.') else symbol
        val domain = domains[symbol] ?: domains[base] ?: return null
        return "https://www.google.com/s2/favicons?domain=$domain&sz=128"
    }
}

/** Yahoo Finance client. A native app is not a browser, so there is no CORS here. */
object Api {
    private const val AGENT =
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) " +
            "Chrome/124.0.0.0 Mobile Safari/537.36"

    private var crumb: String? = null
    private var crumbAt = 0L

    suspend fun quotes(symbols: List<String>): List<Quote> {
        val clean = symbols.map { it.trim() }.filter { it.isNotEmpty() }
        if (clean.isEmpty()) return emptyList()
        return try {
            batchQuotes(clean)
        } catch (error: Exception) {
            // The batch endpoint refuses requests now and then - the chart
            // endpoint does not, so rebuild the quote from it.
            val fallback = clean.mapNotNull { runCatching { quoteFromChart(it) }.getOrNull() }
            if (fallback.isEmpty()) throw error
            fallback
        }
    }

    private suspend fun batchQuotes(symbols: List<String>): List<Quote> {
        val url = "https://query1.finance.yahoo.com/v7/finance/quote?symbols=" +
            symbols.joinToString(",") + "&crumb=" + currentCrumb()
        val payload = get(url)
        val results = payload.optJSONObject("quoteResponse")?.optJSONArray("result")
            ?: JSONArray()
        if (results.length() == 0) throw IllegalStateException("empty quote response")
        val quotes = mutableListOf<Quote>()
        for (index in 0 until results.length()) {
            normalise(results.getJSONObject(index))?.let { quotes.add(it) }
        }
        return quotes
    }

    private fun normalise(item: JSONObject): Quote? {
        val symbol = item.optString("symbol").takeIf { it.isNotEmpty() } ?: return null
        return Quote(
            symbol = symbol,
            name = item.optString("longName", item.optString("shortName", symbol)),
            exchange = item.optString("fullExchangeName", item.optString("exchange")),
            currency = item.optString("currency").takeIf { it.isNotEmpty() },
            price = item.optDoubleOrNull("regularMarketPrice"),
            change = item.optDoubleOrNull("regularMarketChange"),
            changePercent = item.optDoubleOrNull("regularMarketChangePercent"),
            previousClose = item.optDoubleOrNull("regularMarketPreviousClose")
                ?: item.optDoubleOrNull("previousClose"),
            open = item.optDoubleOrNull("regularMarketOpen"),
            dayHigh = item.optDoubleOrNull("regularMarketDayHigh"),
            dayLow = item.optDoubleOrNull("regularMarketDayLow"),
            volume = item.optDoubleOrNull("regularMarketVolume"),
            marketCap = item.optDoubleOrNull("marketCap"),
            trailingPE = item.optDoubleOrNull("trailingPE"),
            dividendYield = item.optDoubleOrNull("dividendYield"),
            week52High = item.optDoubleOrNull("fiftyTwoWeekHigh"),
            week52Low = item.optDoubleOrNull("fiftyTwoWeekLow"),
            marketState = item.optString("marketState", "CLOSED"),
            logoUrl = Logos.url(symbol)
        )
    }

    private suspend fun quoteFromChart(symbol: String): Quote {
        val url = "https://query1.finance.yahoo.com/v8/finance/chart/" +
            java.net.URLEncoder.encode(symbol, "UTF-8") + "?range=1d&interval=1m&includePrePost=true"
        val payload = get(url)
        val meta = payload.optJSONObject("chart")?.optJSONArray("result")
            ?.optJSONObject(0)?.optJSONObject("meta") ?: throw IllegalStateException("no meta")
        val price = meta.optDoubleOrNull("regularMarketPrice")
        val previous = meta.optDoubleOrNull("previousClose") ?: meta.optDoubleOrNull("chartPreviousClose")
        var change: Double? = null
        var percent: Double? = null
        if (price != null && previous != null && previous != 0.0) {
            change = price - previous
            percent = change!! / previous * 100
        }
        val resolved = meta.optString("symbol", symbol)
        return Quote(
            symbol = resolved,
            name = meta.optString("longName", meta.optString("shortName", resolved)),
            exchange = meta.optString("fullExchangeName", meta.optString("exchangeName")),
            currency = meta.optString("currency").takeIf { it.isNotEmpty() },
            price = price,
            change = change,
            changePercent = percent,
            previousClose = previous,
            open = meta.optDoubleOrNull("regularMarketOpen"),
            dayHigh = meta.optDoubleOrNull("regularMarketDayHigh"),
            dayLow = meta.optDoubleOrNull("regularMarketDayLow"),
            volume = meta.optDoubleOrNull("regularMarketVolume"),
            marketCap = null,
            trailingPE = null,
            dividendYield = null,
            week52High = meta.optDoubleOrNull("fiftyTwoWeekHigh"),
            week52Low = meta.optDoubleOrNull("fiftyTwoWeekLow"),
            marketState = meta.optString("marketState", "CLOSED"),
            logoUrl = Logos.url(resolved)
        )
    }

    suspend fun chart(symbol: String, range: Range): List<ChartPoint> {
        val url = "https://query1.finance.yahoo.com/v8/finance/chart/" +
            java.net.URLEncoder.encode(symbol, "UTF-8") +
            "?range=${range.range}&interval=${range.interval}&includePrePost=true"
        val payload = get(url)
        val result = payload.optJSONObject("chart")?.optJSONArray("result")
            ?.optJSONObject(0) ?: throw IllegalStateException("no chart")
        val stamps = result.optJSONArray("timestamp") ?: JSONArray()
        val closes = result.optJSONObject("indicators")?.optJSONArray("quote")
            ?.optJSONObject(0)?.optJSONArray("close") ?: JSONArray()
        val points = mutableListOf<ChartPoint>()
        for (index in 0 until stamps.length()) {
            if (index >= closes.length()) break
            val close = closes.optDoubleOrNull(index) ?: continue
            points.add(ChartPoint(stamps.optLong(index), close))
        }
        return points
    }

    suspend fun search(text: String): List<SearchHit> {
        val url = "https://query1.finance.yahoo.com/v1/finance/search?q=" +
            java.net.URLEncoder.encode(text, "UTF-8") + "&quotesCount=12&newsCount=0"
        val payload = get(url)
        val quotes = payload.optJSONArray("quotes") ?: JSONArray()
        val hits = mutableListOf<SearchHit>()
        for (index in 0 until quotes.length()) {
            val item = quotes.optJSONObject(index) ?: continue
            val symbol = item.optString("symbol").takeIf { it.isNotEmpty() } ?: continue
            hits.add(
                SearchHit(
                    symbol = symbol,
                    name = item.optString("longname", item.optString("shortname", symbol)),
                    exchange = item.optString("exchDisp", item.optString("exchange"))
                )
            )
        }
        return hits
    }

    private suspend fun currentCrumb(): String = withContext(Dispatchers.IO) {
        val now = System.currentTimeMillis()
        val cached = crumb
        if (cached != null && now - crumbAt < 1_800_000) return@withContext cached
        // This endpoint errors on purpose - it only sets the cookie.
        runCatching { raw("https://fc.yahoo.com") }
        val value = raw("https://query1.finance.yahoo.com/v1/test/getcrumb").trim()
        if (value.isEmpty() || value.startsWith("{") || value.startsWith("<")) {
            throw IllegalStateException("could not obtain a crumb")
        }
        crumb = value
        crumbAt = now
        value
    }

    private suspend fun get(url: String): JSONObject = withContext(Dispatchers.IO) {
        JSONObject(raw(url))
    }

    private fun raw(url: String): String {
        val connection = URL(url).openConnection() as HttpURLConnection
        connection.connectTimeout = 15_000
        connection.readTimeout = 20_000
        connection.setRequestProperty("User-Agent", AGENT)
        connection.setRequestProperty("Accept", "application/json")
        try {
            val code = connection.responseCode
            if (code !in 200..299) throw IllegalStateException("HTTP $code")
            return connection.inputStream.bufferedReader().use { it.readText() }
        } finally {
            connection.disconnect()
        }
    }
}

/** Read a double, or null when the key is missing or not a number. */
private fun JSONObject.optDoubleOrNull(key: String): Double? {
    if (!has(key) || isNull(key)) return null
    val value = opt(key)
    return when (value) {
        is Number -> value.toDouble()
        is String -> value.toDoubleOrNull()
        else -> null
    }
}

/** Read a double at an index, or null. */
private fun JSONArray.optDoubleOrNull(index: Int): Double? {
    if (index >= length()) return null
    val value = opt(index)
    return when (value) {
        is Number -> value.toDouble()
        is String -> value.toDoubleOrNull()
        else -> null
    }
}
