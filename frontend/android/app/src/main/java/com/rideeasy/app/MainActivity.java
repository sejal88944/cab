package com.rideeasy.app;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;

import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final long LOADING_DELAY_MS = 2800;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
        hideLoadingOverlayAfterDelay();
    }

    private void hideLoadingOverlayAfterDelay() {
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            View overlay = findViewById(R.id.loading_include);
            if (overlay != null) {
                overlay.animate().alpha(0f).withEndAction(() -> overlay.setVisibility(View.GONE)).setDuration(300).start();
            }
        }, LOADING_DELAY_MS);
    }
}
