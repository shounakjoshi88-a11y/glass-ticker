package com.shounak.glassticker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * Android's answer to the desktop "Dynamic Island": a persistent, live
 * notification that keeps the top watched price on screen even when the app is
 * in the background. Tap it to jump back into the app.
 */
class TickerService : Service() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var job: Job? = null
    private var symbols: List<String> = listOf("^NSEI")

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val incoming = intent?.getStringArrayListExtra(EXTRA_SYMBOLS)
        if (!incoming.isNullOrEmpty()) symbols = incoming
        createChannel()
        startForeground(NOTIFICATION_ID, buildNotification("Loading…", null))
        startPolling()
        return START_STICKY
    }

    override fun onDestroy() {
        job?.cancel()
        super.onDestroy()
    }

    private fun startPolling() {
        job?.cancel()
        job = scope.launch {
            while (isActive) {
                try {
                    val quotes = Api.quotes(symbols)
                    val top = quotes.firstOrNull()
                    val text = if (top != null) {
                        "${top.symbol}  ${Format.price(top.price, top.currency)}  ${Format.percent(top.changePercent)}"
                    } else {
                        "No data"
                    }
                    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                    manager.notify(NOTIFICATION_ID, buildNotification(text, top))
                } catch (_: Exception) {
                    // Keep the service alive; retry next cycle.
                }
                delay(30_000)
            }
        }
    }

    private fun buildNotification(text: String, quote: Quote?): Notification {
        val openIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pending = PendingIntent.getActivity(
            this, 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val title = quote?.let { "${it.symbol} · ${it.name}" } ?: "Glass Ticker live"
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentTitle(title)
            .setContentText(text)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setContentIntent(pending)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .build()
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Glass Ticker live price",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps the top watched price on screen while the app runs."
                setShowBadge(false)
            }
            (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(channel)
        }
    }

    companion object {
        const val EXTRA_SYMBOLS = "symbols"
        private const val CHANNEL_ID = "glass_ticker_live"
        private const val NOTIFICATION_ID = 4242

        fun start(context: Context, symbols: List<String>) {
            val intent = Intent(context, TickerService::class.java).apply {
                putStringArrayListExtra(EXTRA_SYMBOLS, ArrayList(symbols))
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, TickerService::class.java))
        }
    }
}
