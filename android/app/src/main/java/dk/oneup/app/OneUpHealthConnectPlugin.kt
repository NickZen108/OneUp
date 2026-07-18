package dk.oneup.app

import android.content.Intent
import androidx.activity.result.ActivityResultLauncher
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.ZonedDateTime

@CapacitorPlugin(name = "OneUpHealthConnect")
class OneUpHealthConnectPlugin : Plugin() {
    private val pluginScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val readStepsPermission = HealthPermission.getReadPermission(StepsRecord::class)
    private val permissions = setOf(readStepsPermission)
    private var permissionCall: PluginCall? = null
    private lateinit var permissionLauncher: ActivityResultLauncher<Set<String>>

    override fun load() {
        permissionLauncher = activity.registerForActivityResult(
            PermissionController.createRequestPermissionResultContract()
        ) { granted ->
            val call = permissionCall ?: return@registerForActivityResult
            permissionCall = null
            val hasSteps = granted.contains(readStepsPermission)
            call.resolve(statusObject(
                available = isAvailable(),
                granted = hasSteps,
                message = if (hasSteps) "OneUp har adgang til skridt." else "OneUp fik ikke adgang til skridt. Du kan give tilladelsen senere i Health Connect-indstillinger."
            ))
        }
    }

    @PluginMethod
    fun getStatus(call: PluginCall) {
        if (!isAvailable()) {
            call.resolve(statusObject(false, false, unavailableMessage()))
            return
        }
        pluginScope.launch {
            runCatching { healthConnectClient().permissionController.getGrantedPermissions() }
                .onSuccess { granted ->
                    val hasSteps = granted.contains(readStepsPermission)
                    resolveOnMain(call, statusObject(true, hasSteps, if (hasSteps) "OneUp har adgang til skridt." else "OneUp har endnu ikke adgang til skridt."))
                }
                .onFailure { rejectOnMain(call, "Health Connect-status kunne ikke hentes: ${it.localizedMessage ?: it.javaClass.simpleName}") }
        }
    }

    @PluginMethod
    fun requestPermissions(call: PluginCall) {
        if (!isAvailable()) {
            call.reject(unavailableMessage())
            return
        }
        pluginScope.launch {
            val alreadyGranted = runCatching { healthConnectClient().permissionController.getGrantedPermissions().contains(readStepsPermission) }.getOrDefault(false)
            withContext(Dispatchers.Main) {
                if (alreadyGranted) {
                    call.resolve(statusObject(true, true, "OneUp har adgang til skridt."))
                } else {
                    permissionCall = call
                    permissionLauncher.launch(permissions)
                }
            }
        }
    }

    @PluginMethod
    fun readTodaySteps(call: PluginCall) {
        if (!isAvailable()) {
            call.reject(unavailableMessage())
            return
        }
        pluginScope.launch {
            runCatching {
                val client = healthConnectClient()
                val granted = client.permissionController.getGrantedPermissions()
                if (!granted.contains(readStepsPermission)) error("OneUp har ikke adgang til skridt endnu.")
                val now = ZonedDateTime.now()
                val start = now.toLocalDate().atStartOfDay(now.zone).toInstant()
                val end = Instant.now()
                val result = client.aggregate(
                    AggregateRequest(
                        metrics = setOf(StepsRecord.COUNT_TOTAL),
                        timeRangeFilter = TimeRangeFilter.between(start, end)
                    )
                )
                JSObject()
                    .put("available", true)
                    .put("granted", true)
                    .put("steps", result[StepsRecord.COUNT_TOTAL] ?: 0L)
                    .put("source", "Health Connect")
                    .put("startTime", start.toString())
                    .put("endTime", end.toString())
            }.onSuccess { resolveOnMain(call, it) }
                .onFailure { rejectOnMain(call, it.localizedMessage ?: "Dagens skridt kunne ikke hentes fra Health Connect.") }
        }
    }

    @PluginMethod
    fun openHealthConnectSettings(call: PluginCall) {
        runCatching {
            val intent = Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        }.onSuccess { call.resolve(JSObject().put("opened", true)) }
            .onFailure { call.reject("Health Connect-indstillinger kunne ikke åbnes.") }
    }

    private fun healthConnectClient() = HealthConnectClient.getOrCreate(context)
    private fun isAvailable() = HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE
    private fun unavailableMessage() = "Health Connect er ikke installeret eller tilgængelig på denne Android-enhed."
    private fun statusObject(available: Boolean, granted: Boolean, message: String) = JSObject().put("available", available).put("granted", granted).put("message", message)
    private suspend fun resolveOnMain(call: PluginCall, data: JSObject) = withContext(Dispatchers.Main) { call.resolve(data) }
    private suspend fun rejectOnMain(call: PluginCall, message: String) = withContext(Dispatchers.Main) { call.reject(message) }
}
