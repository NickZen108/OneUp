package dk.oneup.app

import android.content.Intent
import androidx.activity.result.ActivityResultLauncher
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
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
    private val permissionByType = mapOf(
        "steps" to HealthPermission.getReadPermission(StepsRecord::class),
        "distance" to HealthPermission.getReadPermission(DistanceRecord::class),
        "activeCalories" to HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
        "exerciseDuration" to HealthPermission.getReadPermission(ExerciseSessionRecord::class)
    )
    private val readStepsPermission = permissionByType.getValue("steps")
    private var permissionCall: PluginCall? = null
    private lateinit var permissionLauncher: ActivityResultLauncher<Set<String>>

    override fun load() {
        permissionLauncher = activity.registerForActivityResult(
            PermissionController.createRequestPermissionResultContract()
        ) { granted ->
            val call = permissionCall ?: return@registerForActivityResult
            permissionCall = null
            val requested = requestedTypes(call)
            val grantedTypes = requested.filter { granted.contains(permissionByType.getValue(it)) }.toSet()
            val allGranted = grantedTypes.containsAll(requested)
            call.resolve(statusObject(
                available = isAvailable(),
                granted = allGranted,
                message = if (allGranted) "OneUp har adgang til de valgte Health Connect-data." else "OneUp fik ikke alle valgte tilladelser. Du kan give adgang senere i Health Connect."
            ).put("grantedTypes", grantedTypes.toJsArray()).put("missingTypes", requested.filterNot { grantedTypes.contains(it) }.toJsArray()))
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
                    val requested = requestedTypes(call)
                    val grantedTypes = requested.filter { granted.contains(permissionByType.getValue(it)) }.toSet()
                    val missingTypes = requested.filterNot { grantedTypes.contains(it) }
                    resolveOnMain(call, statusObject(true, missingTypes.isEmpty(), if (missingTypes.isEmpty()) "OneUp har adgang til de valgte Health Connect-data." else "Tilladelse mangler for: ${missingTypes.joinToString()}.")
                        .put("grantedTypes", grantedTypes.toJsArray()).put("missingTypes", missingTypes.toJsArray()))
                }
                .onFailure { rejectOnMain(call, "Health Connect-status kunne ikke hentes: ${it.localizedMessage ?: it.javaClass.simpleName}") }
        }
    }

    @PluginMethod
    fun requestHealthPermissions(call: PluginCall) {
        if (!isAvailable()) {
            call.reject(unavailableMessage())
            return
        }
        pluginScope.launch {
            val requested = requestedTypes(call)
            val granted = runCatching { healthConnectClient().permissionController.getGrantedPermissions() }.getOrDefault(emptySet())
            val missing = requested.filterNot { granted.contains(permissionByType.getValue(it)) }.toSet()
            withContext(Dispatchers.Main) {
                if (missing.isEmpty()) {
                    call.resolve(statusObject(true, true, "OneUp har adgang til de valgte Health Connect-data.").put("grantedTypes", requested.toJsArray()).put("missingTypes", emptyList<String>().toJsArray()))
                } else {
                    permissionCall = call
                    permissionLauncher.launch(missing.map { permissionByType.getValue(it) }.toSet())
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
    fun readTodayAggregates(call: PluginCall) {
        if (!isAvailable()) {
            call.reject(unavailableMessage())
            return
        }
        pluginScope.launch {
            runCatching {
                val client = healthConnectClient()
                val requested = requestedTypes(call)
                val granted = client.permissionController.getGrantedPermissions()
                val allowed = requested.filter { granted.contains(permissionByType.getValue(it)) }.toSet()
                val missing = requested.filterNot { allowed.contains(it) }
                val now = ZonedDateTime.now()
                val start = now.toLocalDate().atStartOfDay(now.zone).toInstant()
                val end = Instant.now()
                val metrics = buildSet {
                    if (allowed.contains("steps")) add(StepsRecord.COUNT_TOTAL)
                    if (allowed.contains("distance")) add(DistanceRecord.DISTANCE_TOTAL)
                    if (allowed.contains("activeCalories")) add(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL)
                    if (allowed.contains("exerciseDuration")) add(ExerciseSessionRecord.EXERCISE_DURATION_TOTAL)
                }
                val result = if (metrics.isEmpty()) null else client.aggregate(AggregateRequest(metrics = metrics, timeRangeFilter = TimeRangeFilter.between(start, end)))
                JSObject()
                    .put("available", true)
                    .put("granted", missing.isEmpty())
                    .put("grantedTypes", allowed.toJsArray())
                    .put("missingTypes", missing.toJsArray())
                    .put("steps", result?.get(StepsRecord.COUNT_TOTAL) ?: 0L)
                    .put("distanceKm", result?.get(DistanceRecord.DISTANCE_TOTAL)?.inKilometers ?: 0.0)
                    .put("activeCaloriesKcal", result?.get(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL)?.inKilocalories ?: 0.0)
                    .put("exerciseDurationMinutes", (result?.get(ExerciseSessionRecord.EXERCISE_DURATION_TOTAL)?.seconds ?: 0L) / 60.0)
                    .put("source", "Health Connect")
                    .put("startTime", start.toString())
                    .put("endTime", end.toString())
            }.onSuccess { resolveOnMain(call, it) }
                .onFailure { rejectOnMain(call, it.localizedMessage ?: "Dagens data kunne ikke hentes fra Health Connect.") }
        }
    }

    @PluginMethod
    fun openHealthConnectSettings(call: PluginCall) {
        runCatching {
            val intent = Intent("android.health.connect.action.MANAGE_HEALTH_PERMISSIONS").putExtra(Intent.EXTRA_PACKAGE_NAME, context.packageName)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        }.onSuccess { call.resolve(JSObject().put("opened", true)) }
            .onFailure { call.reject("Health Connect-indstillinger kunne ikke åbnes.") }
    }

    private fun healthConnectClient() = HealthConnectClient.getOrCreate(context)
    private fun isAvailable() = HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE
    private fun unavailableMessage() = "Health Connect er ikke installeret eller tilgængelig på denne Android-enhed."
    private fun requestedTypes(call: PluginCall): List<String> {
        val values = call.getArray("dataTypes")?.toList<String>() ?: listOf("steps")
        return values.mapNotNull { type -> permissionByType.keys.firstOrNull { it == type } }.ifEmpty { listOf("steps") }
    }
    private fun Iterable<String>.toJsArray() = com.getcapacitor.JSArray().also { array -> forEach { array.put(it) } }
    private fun statusObject(available: Boolean, granted: Boolean, message: String) = JSObject().put("available", available).put("granted", granted).put("message", message)
    private suspend fun resolveOnMain(call: PluginCall, data: JSObject) = withContext(Dispatchers.Main) { call.resolve(data) }
    private suspend fun rejectOnMain(call: PluginCall, message: String) = withContext(Dispatchers.Main) { call.reject(message) }
}
