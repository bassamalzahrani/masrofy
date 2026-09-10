package com.masrofy.app;

import android.webkit.JavascriptInterface;

final class ExportBridge {
    private final MainActivity activity;
    ExportBridge(MainActivity activity) { this.activity = activity; }
    @JavascriptInterface public void saveFile(String name, String mime, String base64) { activity.prepareSave(name, mime, base64); }
}
