package com.zsabe.rotastic;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

public class MainActivity extends Activity {
    private static final String APP_URL = "https://zsabe.github.io/Rotastic/";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(APP_URL));
        intent.addCategory(Intent.CATEGORY_BROWSABLE);
        startActivity(intent);
        finish();
    }
}
