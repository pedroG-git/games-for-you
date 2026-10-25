package io.github.pedrog_git.joanasgames;

import android.app.Activity;
import android.content.pm.ActivityInfo;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Lets a game turn the phone: Orientation.lock({ to: 'landscape' | 'portrait' }). The app starts in portrait.
// Landscape is full screen (status and navigation bars hidden; a swipe from the edge shows them for a moment).
@CapacitorPlugin(name = "Orientation")
public class OrientationPlugin extends Plugin {
    @PluginMethod
    public void lock(PluginCall call) {
        int o = "landscape".equals(call.getString("to"))
            ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
            : ActivityInfo.SCREEN_ORIENTATION_PORTRAIT;
        boolean wide = o == ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE;
        Activity a = getActivity();
        a.runOnUiThread(() -> {
            a.setRequestedOrientation(o);
            WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(a.getWindow(), a.getWindow().getDecorView());
            if (wide) {
                bars.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                bars.hide(WindowInsetsCompat.Type.systemBars());
            } else {
                bars.show(WindowInsetsCompat.Type.systemBars());
            }
        });
        call.resolve();
    }
}
