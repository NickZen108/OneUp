package dk.oneup.app

import androidx.activity.result.ActivityResultLauncher
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.permission.PermissionController
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.time.LocalDate
import java.time.ZoneId
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@CapacitorPlugin(name = "OneUpHealthConnect")
class OneUpHealthConnectPlugin : Plugin() {
    private val stepPermission = HealthPermission.getReadPermission(StepsRecord::class)
    private val permissions = setOf(stepPermission)
    private val scope = CoroutineScope(Dispatchers.Main)
    private var permissionCall: PluginCall? = null
    private lateinit var permissionLauncher: ActivityResultLauncher<Set<String>>

    override fun load() {
        permissionLauncher = activity.registerForActivityResult(PermissionController.createRequestPermissionResultContract()) { granted ->
            val call = permissionCall ?: return@registerForActivityResult
            permissionCall = null
            val hasSteps = granted.contains(stepPermission)
            call.resolve(JSObject().put("available", isAvailable()).put("granted", hasSteps).put("message", if (hasSteps) "Adgang til skridt er givet." else "Tilladelsen til skridt blev afvist."))
        }
    }

    @PluginMethod
    fun getStatus(call: PluginCall) { scope.launch { runCatching {
        val available = isAvailable(); val granted = available && hasPermission()
        call.resolve(JSObject().put("available", available).put("granted", granted).put("message", if (available) "Health Connect er tilgængelig." else unavailableMessage()))
    }.getOrElse { call.reject(readableError(it)) } } }

    @PluginMethod
    fun requestPermissions(call: PluginCall) {
        if (!isAvailable()) return call.reject(unavailableMessage())
        scope.launch { runCatching {
            if (hasPermission()) call.resolve(JSObject().put("available", true).put("granted", true).put("message", "Adgang til skridt er allerede givet."))
            else { permissionCall = call; permissionLauncher.launch(permissions) }
        }.getOrElse { permissionCall = null; call.reject(readableError(it)) } }
    }

    @PluginMethod
    fun readTodaySteps(call: PluginCall) { scope.launch { runCatching {
        if (!isAvailable()) return@launch call.reject(unavailableMessage())
        if (!hasPermission()) return@launch call.reject("OneUp har ikke tilladelse til at læse skridt i Health Connect.")
        val steps = readStepsForToday()
        call.resolve(JSObject().put("steps", steps).put("message", if (steps > 0) "Dagens skridt er hentet fra Health Connect." else "Der findes ingen skridtdata for i dag."))
    }.getOrElse { call.reject(readableError(it)) } } }

    private fun isAvailable() = HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE
    private suspend fun hasPermission() = withContext(Dispatchers.IO) { HealthConnectClient.getOrCreate(context).permissionController.getGrantedPermissions().contains(stepPermission) }
    private suspend fun readStepsForToday(): Long = withContext(Dispatchers.IO) {
        val zone = ZoneId.systemDefault(); val start = LocalDate.now(zone).atStartOfDay(zone).toInstant(); val end = java.time.Instant.now()
        val response = HealthConnectClient.getOrCreate(context).aggregate(AggregateRequest(setOf(StepsRecord.COUNT_TOTAL), TimeRangeFilter.between(start, end)))
        response[StepsRecord.COUNT_TOTAL] ?: 0L
    }
    private fun unavailableMessage() = "Health Connect er ikke installeret eller tilgængelig på denne Android-enhed."
    private fun readableError(error: Throwable) = error.localizedMessage ?: "Health Connect kunne ikke gennemføre handlingen."
}
