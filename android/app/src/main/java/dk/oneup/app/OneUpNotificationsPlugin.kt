package dk.oneup.app

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

@CapacitorPlugin(
    name = "OneUpNotifications",
    permissions = [Permission(alias = "notifications", strings = [Manifest.permission.POST_NOTIFICATIONS])]
)
class OneUpNotificationsPlugin : Plugin() {
    override fun load() { createChannels() }

    @PluginMethod
    fun getPermissionStatus(call: PluginCall) {
        createChannels()
        call.resolve(statusObject())
    }

    @PluginMethod
    fun requestPermission(call: PluginCall) {
        createChannels()
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || getPermissionState("notifications") == PermissionState.GRANTED) {
            call.resolve(statusObject("granted")); return
        }
        requestPermissionForAlias("notifications", call, "notificationPermissionCallback")
    }

    @PermissionCallback
    private fun notificationPermissionCallback(call: PluginCall) { call.resolve(statusObject()) }

    @PluginMethod
    fun openNotificationSettings(call: PluginCall) {
        val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
            putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
        call.resolve(statusObject())
    }

    @PluginMethod
    fun getFcmToken(call: PluginCall) {
        // Remote push requires adding Firebase Messaging and a private backend endpoint.
        // Do not expose or log full FCM tokens until that infrastructure exists.
        val ret = JSObject()
        ret.put("available", false)
        ret.put("tokenRegistered", false)
        ret.put("message", "FCM-backend mangler; token registreres ikke i denne version.")
        call.resolve(ret)
    }

    private fun statusObject(forced: String? = null): JSObject {
        val status = forced ?: if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) "granted" else if (context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) "granted" else "denied"
        val ret = JSObject()
        ret.put("status", status)
        ret.put("permission", status)
        ret.put("androidVersion", Build.VERSION.SDK_INT)
        val canExplainDenial = activity?.shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS) == true
        ret.put("permanentDenied", Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && status != "granted" && !canExplainDenial)
        ret.put("notificationsEnabled", NotificationManagerCompat.from(context).areNotificationsEnabled())
        return ret
    }

    private fun createChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java)
        val channels = listOf(
            NotificationChannel("oneup_invitations", "Invitationer", NotificationManager.IMPORTANCE_DEFAULT),
            NotificationChannel("oneup_competitions", "Konkurrencer og samarbejder", NotificationManager.IMPORTANCE_DEFAULT),
            NotificationChannel("oneup_progress", "Fremskridt", NotificationManager.IMPORTANCE_DEFAULT),
            NotificationChannel("oneup_reminders", "Påmindelser", NotificationManager.IMPORTANCE_DEFAULT)
        )
        channels.forEach { it.enableVibration(false); it.setSound(null, null) }
        manager.createNotificationChannels(channels)
    }
}
