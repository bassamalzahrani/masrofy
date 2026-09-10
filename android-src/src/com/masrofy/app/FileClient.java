package com.masrofy.app;

import android.net.Uri;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

final class FileClient extends WebChromeClient {
    private final MainActivity activity;
    FileClient(MainActivity activity) { this.activity = activity; }
    @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
        activity.openImport(callback);
        return true;
    }
}
