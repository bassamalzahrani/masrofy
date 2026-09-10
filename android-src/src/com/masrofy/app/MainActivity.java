package com.masrofy.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.webkit.ValueCallback;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {
    static final String APP_HOST = "appassets.androidplatform.net";
    static final String APP_ORIGIN = "https://" + APP_HOST + "/";
    static final int OPEN_FILE = 1001;
    static final int SAVE_FILE = 1002;
    WebView webView;
    ValueCallback<Uri[]> fileCallback;
    byte[] pendingBytes;
    String pendingName;
    String pendingMime;

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(79, 70, 229));
        webView = new WebView(this);
        setContentView(webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        if (android.os.Build.VERSION.SDK_INT >= 26) settings.setSafeBrowsingEnabled(true);
        webView.addJavascriptInterface(new ExportBridge(this), "MasrofyAndroid");
        webView.setWebViewClient(new LocalClient(this));
        webView.setWebChromeClient(new FileClient(this));
        if (state == null) webView.loadUrl(APP_ORIGIN + "index.html"); else webView.restoreState(state);
    }

    void openImport(ValueCallback<Uri[]> callback) {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        fileCallback = callback;
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        startActivityForResult(intent, OPEN_FILE);
    }

    WebResourceResponse assetResponse(Uri uri) {
        if (!APP_HOST.equals(uri.getHost())) return null;
        String path = uri.getPath() == null ? "index.html" : uri.getPath().replaceFirst("^/", "");
        if (path.isEmpty()) path = "index.html";
        if (path.contains("..")) return new WebResourceResponse("text/plain", "UTF-8", 403, "Forbidden", null, new ByteArrayInputStream(new byte[0]));
        try {
            String mime = android.webkit.MimeTypeMap.getSingleton().getMimeTypeFromExtension(android.webkit.MimeTypeMap.getFileExtensionFromUrl(path));
            if (mime == null) mime = "application/octet-stream";
            return new WebResourceResponse(mime, "UTF-8", getAssets().open("www/" + path));
        } catch (Exception ignored) { return null; }
    }

    boolean route(Uri uri) {
        if (APP_HOST.equals(uri.getHost())) return false;
        if ("http".equals(uri.getScheme()) || "https".equals(uri.getScheme())) {
            try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) {}
        }
        return true;
    }

    void prepareSave(String name, String mime, String base64) {
        if (base64 == null || base64.length() > 30_000_000) return;
        try {
            pendingBytes = Base64.decode(base64, Base64.DEFAULT);
            pendingName = cleanName(name);
            pendingMime = mime == null ? "application/octet-stream" : mime;
            runOnUiThread(new SaveRequest(this));
        } catch (Exception ignored) {}
    }

    void launchSavePicker() {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(pendingMime);
        intent.putExtra(Intent.EXTRA_TITLE, pendingName);
        startActivityForResult(intent, SAVE_FILE);
    }

    private String cleanName(String name) {
        String cleaned = name == null ? "masrofy-export" : name.replaceAll("[^a-zA-Z0-9._-]", "_");
        return cleaned.isEmpty() ? "masrofy-export" : cleaned.substring(0, Math.min(80, cleaned.length()));
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == OPEN_FILE) {
            Uri value = resultCode == RESULT_OK && data != null ? data.getData() : null;
            if (fileCallback != null) fileCallback.onReceiveValue(value == null ? null : new Uri[]{value});
            fileCallback = null;
        } else if (requestCode == SAVE_FILE) {
            if (resultCode == RESULT_OK && data != null && data.getData() != null && pendingBytes != null) {
                try (OutputStream out = getContentResolver().openOutputStream(data.getData())) {
                    if (out != null) out.write(pendingBytes);
                    Toast.makeText(this, "تم حفظ الملف", Toast.LENGTH_SHORT).show();
                } catch (Exception e) { Toast.makeText(this, "تعذر حفظ الملف", Toast.LENGTH_SHORT).show(); }
            }
            pendingBytes = null; pendingName = null; pendingMime = null;
        }
    }

    @Override protected void onSaveInstanceState(Bundle out) { webView.saveState(out); super.onSaveInstanceState(out); }
    @Override public void onBackPressed() { if (webView.canGoBack()) webView.goBack(); else super.onBackPressed(); }
    @Override protected void onDestroy() { if (webView != null) { webView.removeJavascriptInterface("MasrofyAndroid"); webView.destroy(); } super.onDestroy(); }
}
