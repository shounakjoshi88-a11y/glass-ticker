package com.shounak.glassticker

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.NotificationsOff
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import coil.compose.AsyncImage
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                GlassTickerApp()
            }
        }
    }
}

/** The carbon palette, matching the desktop app. */
object Theme {
    val background = Color(0xFF0B0C0E)
    val card = Color(0xFF141519)
    val raised = Color(0xFF1B1C21)
    val text = Color(0xFFF2F2F3)
    val muted = Color(0xFF878992)
    val dim = Color(0xFF5C5E67)
    val up = Color(0xFF5EEAA8)
    val down = Color(0xFFFF7A6B)
    val accent = Color(0xFF5EEAA8)
}

private val defaultSymbols = listOf(
    "^NSEI", "^BSESN", "RELIANCE.NS", "TCS.NS", "INFY.NS",
    "HDFCBANK.NS", "AAPL", "NVDA", "BTC-USD"
)

/** Strip the exchange suffix so "^NSEI" reads "NSEI" and "RELIANCE.NS" reads "RELIANCE". */
fun symbolLabel(s: String): String =
    s.replace(Regex("\\\\.(NS|BO)$", RegexOption.IGNORE_CASE), "").removePrefix("^")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GlassTickerApp() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var symbols by remember { mutableStateOf(defaultSymbols) }
    var quotes by remember { mutableStateOf<List<Quote>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }
    var refreshing by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var searching by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<List<SearchHit>>(emptyList()) }
    var selected by remember { mutableStateOf<Quote?>(null) }
    var liveOn by remember { mutableStateOf(false) }
    var islandExpanded by remember { mutableStateOf(false) }

    val notificationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            liveOn = true
            TickerService.start(context, symbols)
        }
    }

    suspend fun refresh() {
        loading = quotes.isEmpty()
        refreshing = true
        try {
            quotes = Api.quotes(symbols)
            message = null
        } catch (error: Exception) {
            message = error.message ?: "Could not load quotes"
        }
        loading = false
        refreshing = false
    }

    LaunchedEffect(Unit) { refresh() }

    // Keep the prices moving while the app is open.
    LaunchedEffect(Unit) {
        while (true) {
            delay(30_000)
            runCatching { quotes = Api.quotes(symbols) }
        }
    }

    LaunchedEffect(query) {
        val text = query.trim()
        if (text.isEmpty()) {
            results = emptyList()
            return@LaunchedEffect
        }
        delay(350)
        results = runCatching { Api.search(text) }.getOrDefault(emptyList())
    }

    val detail = selected
    if (detail != null) {
        DetailScreen(
            quote = detail,
            onBack = { selected = null }
        )
        return
    }

    Scaffold(
        containerColor = Theme.background,
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Theme.background,
                    titleContentColor = Theme.text
                ),
                title = {
                    if (searching) {
                        TextField(
                            value = query,
                            onValueChange = { query = it },
                            singleLine = true,
                            placeholder = { Text("Symbol or company", color = Theme.dim) },
                            colors = TextFieldDefaults.colors(
                                focusedContainerColor = Color.Transparent,
                                unfocusedContainerColor = Color.Transparent,
                                focusedTextColor = Theme.text,
                                unfocusedTextColor = Theme.text,
                                cursorColor = Theme.accent
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )
                    } else {
                        Text("Glass Ticker", fontWeight = FontWeight.SemiBold)
                    }
                },
                navigationIcon = {
                    if (searching) {
                        IconButton(onClick = {
                            searching = false
                            query = ""
                        }) {
                            Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = Theme.muted)
                        }
                    }
                },
                actions = {
                    if (!searching) {
                        IconButton(onClick = {
                            if (liveOn) {
                                liveOn = false
                                TickerService.stop(context)
                            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                                != PackageManager.PERMISSION_GRANTED
                            ) {
                                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                            } else {
                                liveOn = true
                                TickerService.start(context, symbols)
                            }
                        }) {
                            Icon(
                                if (liveOn) Icons.Filled.Notifications else Icons.Filled.NotificationsOff,
                                contentDescription = "Live price notification",
                                tint = if (liveOn) Theme.accent else Theme.muted
                            )
                        }
                        IconButton(onClick = { searching = true }) {
                            Icon(Icons.Filled.Search, contentDescription = "Search", tint = Theme.muted)
                        }
                        IconButton(onClick = { scope.launch { refresh() } }) {
                            Icon(Icons.Filled.Refresh, contentDescription = "Refresh", tint = Theme.muted)
                        }
                    }
                }
            )
        }
    ) { padding ->
        if (searching) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(12.dp)
            ) {
                items(results) { hit ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .clickable {
                                if (!symbols.contains(hit.symbol)) symbols = listOf(hit.symbol) + symbols
                                searching = false
                                query = ""
                                scope.launch { refresh() }
                                if (liveOn) TickerService.start(context, symbols)
                            }
                            .padding(10.dp)
                    ) {
                        Monogram(hit.symbol)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(hit.symbol, color = Theme.text, fontWeight = FontWeight.SemiBold)
                            Text(hit.name, color = Theme.muted, fontSize = 12.sp, maxLines = 1)
                        }
                        Text(hit.exchange, color = Theme.dim, fontSize = 10.sp)
                    }
                }
            }
        } else {
            val islandQuote = selected ?: quotes.firstOrNull()
            IslandPill(
                quote = islandQuote,
                expanded = islandExpanded,
                onToggle = { islandExpanded = !islandExpanded },
                onOpen = { islandQuote?.let { selected = it } }
            )
            PullToRefreshBox(
                isRefreshing = refreshing,
                onRefresh = { scope.launch { refresh() } },
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
            ) {
                LazyColumn(
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 12.dp)
                ) {
                    if (loading && quotes.isEmpty()) {
                        item {
                            Box(
                                Modifier
                                    .fillMaxWidth()
                                    .height(200.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                CircularProgressIndicator(color = Theme.accent)
                            }
                        }
                    }
                    message?.let { note ->
                        item {
                            Text(note, color = Theme.muted, fontSize = 12.sp, modifier = Modifier.padding(12.dp))
                        }
                    }
                    if (!loading && quotes.isEmpty() && message == null) {
                        item {
                            Box(
                                Modifier
                                    .fillMaxWidth()
                                    .height(200.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("No quotes. Pull to refresh.", color = Theme.muted, fontSize = 12.sp)
                            }
                        }
                    }
                    items(quotes, key = { it.symbol }) { quote ->
                        QuoteRow(
                            quote = quote,
                            onClick = { selected = quote },
                            onRemove = {
                                symbols = symbols.filter { it != quote.symbol }
                                quotes = quotes.filter { it.symbol != quote.symbol }
                                if (liveOn) TickerService.start(context, symbols)
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun QuoteRow(quote: Quote, onClick: () -> Unit, onRemove: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(vertical = 10.dp, horizontal = 4.dp)
    ) {
        if (quote.logoUrl != null) {
            AsyncImage(
                model = quote.logoUrl,
                contentDescription = quote.symbol,
                modifier = Modifier
                    .size(32.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Theme.raised),
                contentScale = ContentScale.Fit
            )
        } else {
            Monogram(quote.symbol)
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(symbolLabel(quote.symbol), color = Theme.text, fontWeight = FontWeight.SemiBold)
            Text(
                quote.name,
                color = Theme.muted,
                fontSize = 12.sp,
                maxLines = 1
            )
        }
        Column(horizontalAlignment = Alignment.End) {
            Text(
                Format.price(quote.price, quote.currency),
                color = Theme.text,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                Format.percent(quote.changePercent),
                color = if (quote.isUp) Theme.up else Theme.down,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
        Spacer(Modifier.width(8.dp))
        IconButton(onClick = onRemove) {
            Icon(
                Icons.Filled.NotificationsOff, // reuse as "remove" affordance placeholder
                contentDescription = "Remove",
                tint = Theme.dim
            )
        }
    }
}

@Composable
private fun Monogram(symbol: String) {
    Box(
        modifier = Modifier
            .size(32.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(Theme.raised),
        contentAlignment = Alignment.Center
    ) {
        Text(
            symbolLabel(symbol).take(2).uppercase(),
            color = Theme.muted,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

// ... DetailScreen, GlassPanel, PriceChart, Format unchanged (kept below)
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DetailScreen(quote: Quote, onBack: () -> Unit) {
    var range by remember { mutableStateOf(Range.DAY) }
    var points by remember { mutableStateOf<List<ChartPoint>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(range) {
        loading = true
        points = runCatching { Api.chart(quote.symbol, range) }.getOrDefault(emptyList())
        loading = false
    }

    val rising = points.size < 2 || points.last().price >= points.first().price

    Scaffold(
        containerColor = Theme.background,
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Theme.background,
                    titleContentColor = Theme.text
                ),
                title = { Text(symbolLabel(quote.symbol), fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = Theme.muted)
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 14.dp)
        ) {
            GlassPanel {
                Column {
                    Text(quote.name, color = Theme.text, fontWeight = FontWeight.SemiBold, maxLines = 1)
                    Text(
                        "${quote.symbol} · ${quote.exchange}",
                        color = Theme.muted,
                        fontSize = 12.sp
                    )
                    Spacer(Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text(
                            Format.price(quote.price, quote.currency),
                            color = Theme.text,
                            fontSize = 30.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(Modifier.width(10.dp))
                        Text(
                            Format.percent(quote.changePercent),
                            color = if (quote.isUp) Theme.up else Theme.down,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(bottom = 5.dp)
                        )
                    }
                }
            }

            Spacer(Modifier.height(10.dp))

            Row(
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Range.entries.forEach { item ->
                    val active = item == range
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (active) Theme.up.copy(alpha = 0.16f) else Theme.card)
                            .clickable { range = item }
                            .padding(horizontal = 10.dp, vertical = 5.dp)
                    ) {
                        Text(
                            item.label,
                            color = if (active) Theme.accent else Theme.muted,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }

            Spacer(Modifier.height(10.dp))

            GlassPanel {
                if (loading && points.isEmpty()) {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .height(200.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = Theme.accent)
                    }
                } else if (points.size < 2) {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .height(200.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("No chart data", color = Theme.muted, fontSize = 12.sp)
                    }
                } else {
                    PriceChart(points, rising, Modifier
                        .fillMaxWidth()
                        .height(210.dp))
                }
            }

            Spacer(Modifier.height(10.dp))

            GlassPanel {
                val rows = listOf(
                    "Open" to Format.price(quote.open, quote.currency),
                    "Day high" to Format.price(quote.dayHigh, quote.currency),
                    "Day low" to Format.price(quote.dayLow, quote.currency),
                    "Prev close" to Format.price(quote.previousClose, quote.currency),
                    "52W high" to Format.price(quote.week52High, quote.currency),
                    "52W low" to Format.price(quote.week52Low, quote.currency),
                    "Volume" to Format.volume(quote.volume),
                    "Mkt cap" to Format.large(quote.marketCap),
                    "P/E" to Format.decimal(quote.trailingPE),
                    "State" to quote.marketState
                )
                Column {
                    rows.forEach { row ->
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .padding(vertical = 6.dp)
                        ) {
                            Text(row.first, color = Theme.muted, fontSize = 12.sp, modifier = Modifier.weight(1f))
                            Text(row.second, color = Theme.text, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun IslandPill(
    quote: Quote?,
    expanded: Boolean,
    onToggle: () -> Unit,
    onOpen: () -> Unit
) {
    if (quote == null) return
    val up = quote.isUp
    val colour = if (up) Theme.up else Theme.down
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 8.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .background(
                    Brush.horizontalGradient(
                        listOf(Theme.raised, Theme.card)
                    )
                )
                .clickable { onToggle() }
                .padding(horizontal = 14.dp, vertical = 10.dp)
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (quote.logoUrl != null) {
                    AsyncImage(
                        model = quote.logoUrl,
                        contentDescription = quote.symbol,
                        modifier = Modifier
                            .size(24.dp)
                            .clip(RoundedCornerShape(6.dp))
                            .background(Theme.raised),
                        contentScale = ContentScale.Fit
                    )
                } else {
                    Box(
                        Modifier
                            .size(24.dp)
                            .clip(RoundedCornerShape(6.dp))
                            .background(Theme.raised),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            symbolLabel(quote.symbol).take(2).uppercase(),
                            color = Theme.muted,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        symbolLabel(quote.symbol),
                        color = Theme.text,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp
                    )
                    Text(
                        quote.name,
                        color = Theme.muted,
                        fontSize = 10.sp,
                        maxLines = 1
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        Format.price(quote.price, quote.currency),
                        color = Theme.text,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp
                    )
                    Text(
                        Format.percent(quote.changePercent),
                        color = colour,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
        if (expanded) {
            Spacer(Modifier.height(6.dp))
            GlassPanel {
                Column {
                    Text("Tap to open full detail", color = Theme.muted, fontSize = 11.sp)
                    Spacer(Modifier.height(6.dp))
                    androidx.compose.material3.Button(
                        onClick = onOpen,
                        colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                            containerColor = Theme.accent,
                            contentColor = Color(0xFF0B0C0E)
                        )
                    ) {
                        Text("Open ${symbolLabel(quote.symbol)}", fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }
}

@Composable
private fun GlassPanel(content: @Composable () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Theme.card),
        shape = RoundedCornerShape(18.dp),
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(listOf(Theme.raised, Theme.card)),
                RoundedCornerShape(18.dp)
            )
    ) {
        Box(Modifier.padding(14.dp)) { content() }
    }
}

@Composable
private fun PriceChart(points: List<ChartPoint>, rising: Boolean, modifier: Modifier) {
    val colour = if (rising) Theme.up else Theme.down
    Canvas(modifier) {
        if (points.size < 2) return@Canvas
        val min = points.minOf { it.price }
        val max = points.maxOf { it.price }
        val span = when {
            max - min > 0 -> max - min
            max > 0 -> max * 0.02
            else -> 1.0
        }
        val low = min - span * 0.14
        val high = max + span * 0.14
        val stepX = size.width / (points.size - 1)
        val stepY = size.height / (high - low)

        val line = Path()
        points.forEachIndexed { index, point ->
            val x = index * stepX
            val y = size.height - ((point.price - low) * stepY).toFloat()
            if (index == 0) line.moveTo(x, y) else line.lineTo(x, y)
        }

        val fill = Path().apply {
            addPath(line)
            lineTo(size.width, size.height)
            lineTo(0f, size.height)
            close()
        }
        drawPath(
            fill,
            brush = Brush.verticalGradient(
                listOf(colour.copy(alpha = 0.26f), Color.Transparent)
            )
        )
        drawPath(
            line,
            color = colour,
            style = Stroke(width = 4f, cap = StrokeCap.Round, join = StrokeJoin.Round)
        )
    }
}

/** Number formatting, matching the desktop app. */
object Format {
    fun price(value: Double?, currency: String?): String {
        if (value == null) return "--"
        return symbol(currency) + decimal(value, 2)
    }

    fun decimal(value: Double?, places: Int = 2): String {
        if (value == null) return "--"
        return String.format("%,.${places}f", value)
    }

    fun percent(value: Double?, places: Int = 2): String {
        if (value == null) return "--"
        val sign = if (value >= 0) "+" else "-"
        return "$sign${decimal(Math.abs(value), places)}%"
    }

    fun volume(value: Double?): String {
        if (value == null) return "--"
        return when {
            value >= 1_000_000_000 -> "${decimal(value / 1_000_000_000, 2)}B"
            value >= 1_000_000 -> "${decimal(value / 1_000_000, 2)}M"
            else -> decimal(value, 0)
        }
    }

    fun large(value: Double?): String {
        if (value == null) return "--"
        val sign = if (value < 0) "-" else ""
        val amount = Math.abs(value)
        return when {
            amount >= 1_000_000_000_000 -> "$sign${decimal(amount / 1_000_000_000_000, 2)}L Cr"
            amount >= 1_000_000_000 -> "$sign${decimal(amount / 1_000_000_000, 1)}K Cr"
            amount >= 10_000_000 -> "$sign${decimal(amount / 10_000_000, 2)}Cr"
            amount >= 100_000 -> "$sign${decimal(amount / 100_000, 2)}L"
            else -> sign + decimal(amount, 0)
        }
    }

    private fun symbol(currency: String?): String = when (currency?.uppercase()) {
        "USD" -> "$"
        "INR" -> "₹"
        "EUR" -> "€"
        "GBP" -> "£"
        "JPY" -> "¥"
        "CNY" -> "¥"
        "KRW" -> "₩"
        "CAD" -> "C$"
        "AUD" -> "A$"
        "BTC" -> "₿"
        else -> ""
    }
}
