package com.zsabe.rotastic;

import android.app.Activity;
import android.net.Uri;
import android.os.Bundle;

import androidx.browser.customtabs.CustomTabsIntent;

public class MainActivity extends Activity {
    private static final String APP_URL = "https://zsabe.github.io/Rotastic/";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        openRotastic();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (!isFinishing() && hasWindowFocus()) {
            // No embedded WebView state is kept; the browser-backed tab owns the session.
        }
    }

    private void openRotastic() {
        CustomTabsIntent customTabsIntent = new CustomTabsIntent.Builder()
                .setShowTitle(false)
                .setUrlBarHidingEnabled(true)
                .build();
        customTabsIntent.launchUrl(this, Uri.parse(APP_URL));
        finish();
    }
}
