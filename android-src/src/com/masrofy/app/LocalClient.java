package com.masrofy.app;

import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

final class LocalClient extends WebViewClient {
    private final MainActivity activity;
    LocalClient(MainActivity activity) { this.activity = activity; }
    @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) { return activity.assetResponse(request.getUrl()); }
    @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return activity.route(request.getUrl()); }
    @SuppressWarnings("deprecation") @Override public boolean shouldOverrideUrlLoading(WebView view, String url) { return activity.route(Uri.parse(url)); }
}
