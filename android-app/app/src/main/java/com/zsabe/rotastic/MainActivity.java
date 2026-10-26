package com.zsabe.rotastic;

import android.app.Activity;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;

import androidx.browser.customtabs.CustomTabColorSchemeParams;
import androidx.browser.customtabs.CustomTabsIntent;

public class MainActivity extends Activity {
    private static final String APP_URL = "https://zsabe.github.io/Rotastic/";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        CustomTabColorSchemeParams darkColors = new CustomTabColorSchemeParams.Builder()
                .setToolbarColor(Color.rgb(9, 13, 22))
                .setNavigationBarColor(Color.rgb(9, 13, 22))
                .setNavigationBarDividerColor(Color.rgb(9, 13, 22))
                .build();

        CustomTabsIntent customTabsIntent = new CustomTabsIntent.Builder()
                .setDefaultColorSchemeParams(darkColors)
                .setColorScheme(CustomTabsIntent.COLOR_SCHEME_DARK)
                .setShowTitle(false)
                .setUrlBarHidingEnabled(true)
                .setShareState(CustomTabsIntent.SHARE_STATE_OFF)
                .build();

        customTabsIntent.launchUrl(this, Uri.parse(APP_URL));
        finish();
    }
}
