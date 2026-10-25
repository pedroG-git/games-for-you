package io.github.pedrog_git.joanasgames;

import android.content.pm.ActivityInfo;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Lets a game turn the phone: Orientation.lock({ to: 'landscape' | 'portrait' }). The app starts in portrait.
@CapacitorPlugin(name = "Orientation")
public class OrientationPlugin extends Plugin {
    @PluginMethod
    public void lock(PluginCall call) {
        int o = "landscape".equals(call.getString("to"))
            ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
            : ActivityInfo.SCREEN_ORIENTATION_PORTRAIT;
        getActivity().runOnUiThread(() -> getActivity().setRequestedOrientation(o));
        call.resolve();
    }
}
