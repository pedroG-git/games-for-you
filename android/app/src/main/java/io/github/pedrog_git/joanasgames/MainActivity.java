package io.github.pedrog_git.joanasgames;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(OrientationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
