package dk.oneup.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(OneUpHealthConnectPlugin.class);
        registerPlugin(OneUpScreenTimePlugin.class);
        registerPlugin(OneUpNotificationsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
