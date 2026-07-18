package dk.oneup.app;

import androidx.activity.result.ActivityResultLauncher;
import androidx.health.connect.client.HealthConnectClient;
import androidx.health.connect.client.permission.HealthPermission;
import androidx.health.connect.client.permission.PermissionController;
import androidx.health.connect.client.records.StepsRecord;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Collections;
import java.util.Set;

@CapacitorPlugin(name = "OneUpHealthConnect")
public class OneUpHealthConnectPlugin extends Plugin {
    private final String stepPermission = HealthPermission.getReadPermission(StepsRecord.class);
    private final Set<String> permissions = Collections.singleton(stepPermission);
    private PluginCall permissionCall;
    private ActivityResultLauncher<Set<String>> permissionLauncher;

    @Override
    public void load() {
        permissionLauncher = getActivity().registerForActivityResult(
            PermissionController.createRequestPermissionResultContract(),
            granted -> {
                PluginCall call = permissionCall;
                if (call == null) {
                    return;
                }
                permissionCall = null;
                boolean hasSteps = granted.contains(stepPermission);
                call.resolve(new JSObject()
                    .put("available", isAvailable())
                    .put("granted", hasSteps)
                    .put("message", hasSteps ? "Adgang til skridt er givet." : "Tilladelsen til skridt blev afvist."));
            });
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        boolean available = isAvailable();
        call.resolve(new JSObject()
            .put("available", available)
            .put("granted", false)
            .put("message", available ? "Health Connect er tilgængelig." : unavailableMessage()));
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (!isAvailable()) {
            call.reject(unavailableMessage());
            return;
        }
        permissionCall = call;
        permissionLauncher.launch(permissions);
    }

    @PluginMethod
    public void readTodaySteps(PluginCall call) {
        call.reject("Læsning af skridt fra Health Connect er ikke tilgængelig i denne build endnu.");
    }

    private boolean isAvailable() {
        return HealthConnectClient.getSdkStatus(getContext()) == HealthConnectClient.SDK_AVAILABLE;
    }

    private String unavailableMessage() {
        return "Health Connect er ikke installeret eller tilgængelig på denne Android-enhed.";
    }
}
