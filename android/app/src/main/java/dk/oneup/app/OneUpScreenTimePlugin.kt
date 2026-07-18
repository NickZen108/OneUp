package dk.oneup.app

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Process
import android.provider.Settings
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.time.ZoneId
import java.time.ZonedDateTime
import kotlin.math.max

@CapacitorPlugin(name = "OneUpScreenTime")
class OneUpScreenTimePlugin : Plugin() {
    @PluginMethod
    fun hasUsageAccess(call: PluginCall) {
        call.resolve(JSObject().put("granted", hasUsageAccess()).put("packageName", context.packageName))
    }

    @PluginMethod
    fun openUsageAccessSettings(call: PluginCall) {
        runCatching {
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            if (intent.resolveActivity(context.packageManager) == null) error("No settings activity")
            context.startActivity(intent)
        }.onSuccess { call.resolve(JSObject().put("opened", true)) }
            .onFailure { call.reject("Androids side til brugsdata kunne ikke åbnes.") }
    }

    @PluginMethod
    fun queryUsageStats(call: PluginCall) {
        if (!hasUsageAccess()) {
            call.resolve(JSObject().put("granted", false).put("apps", JSArray()))
            return
        }
        val now = System.currentTimeMillis()
        val zone = ZoneId.systemDefault()
        val start = ZonedDateTime.now(zone).toLocalDate().atStartOfDay(zone).toInstant().toEpochMilli()
        val exclude = mutableSetOf(context.packageName, "android", "com.android.systemui")
        call.getArray("excludePackages")?.toList<String>()?.let { exclude.addAll(it) }
        val apps = foregroundIntervals(start, now)
            .filterKeys { it !in exclude }
            .filterValues { it >= 60_000L }
            .map { (pkg, ms) -> appObject(pkg, ms, start, now) }
            .sortedByDescending { it.getLong("foregroundTimeMs") ?: 0L }
        call.resolve(JSObject()
            .put("granted", true)
            .put("startTimeMs", start)
            .put("endTimeMs", now)
            .put("apps", JSArray(apps)))
    }

    private fun foregroundIntervals(start: Long, end: Long): Map<String, Long> {
        val usage = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val events = usage.queryEvents(start, end) ?: return emptyMap()
        val active = mutableMapOf<String, Long>()
        val totals = mutableMapOf<String, Long>()
        val event = UsageEvents.Event()
        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            val pkg = event.packageName ?: continue
            val t = event.timeStamp.coerceIn(start, end)
            when (event.eventType) {
                UsageEvents.Event.MOVE_TO_FOREGROUND, UsageEvents.Event.ACTIVITY_RESUMED -> active[pkg] = t
                UsageEvents.Event.MOVE_TO_BACKGROUND, UsageEvents.Event.ACTIVITY_PAUSED, UsageEvents.Event.ACTIVITY_STOPPED -> {
                    val s = active.remove(pkg) ?: continue
                    totals[pkg] = (totals[pkg] ?: 0L) + max(0L, t - s)
                }
            }
        }
        active.forEach { (pkg, s) -> totals[pkg] = (totals[pkg] ?: 0L) + max(0L, end - s) }
        return totals
    }

    private fun appObject(packageName: String, ms: Long, start: Long, end: Long): JSObject {
        val label = runCatching {
            val info = context.packageManager.getApplicationInfo(packageName, 0)
            context.packageManager.getApplicationLabel(info).toString()
        }.getOrDefault(packageName)
        return JSObject()
            .put("packageName", packageName)
            .put("appLabel", label)
            .put("foregroundTimeMs", max(0L, ms))
            .put("category", "Andet")
            .put("periodStartMs", start)
            .put("periodEndMs", end)
    }

    private fun hasUsageAccess(): Boolean {
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
        } else {
            @Suppress("DEPRECATION") appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }
}
