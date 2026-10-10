package com.orbita.contas;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final int PICK_FILE = 1;
    /** Os arquivos do app sao servidos como https neste endereco, para o login e o banco do Google funcionarem. */
    private static final String HOST = "appassets.androidplatform.net";
    private WebView web;
    private boolean pageReady = false;
    private String pendingToken = null;
    private ValueCallback<Uri[]> fileCallback;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(0xFF05070E);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        web.addJavascriptInterface(new Bridge(), "OrbitaApp");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                String scheme = u.getScheme();
                if (HOST.equals(u.getHost())) return false;
                if ("http".equals(scheme) || "https".equals(scheme)) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception e) { }
                    return true;
                }
                return false;
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (!HOST.equals(u.getHost())) return null;
                String path = u.getPath() == null ? "" : u.getPath().replaceFirst("^/+", "");
                if (path.isEmpty()) path = "index.html";
                try {
                    InputStream in = getAssets().open(path);
                    return new WebResourceResponse(mimeOf(path), "UTF-8", in);
                } catch (Exception e) {
                    return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
                deliverToken();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = cb;
                Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType("*/*");
                try {
                    startActivityForResult(Intent.createChooser(i, "Escolher backup"), PICK_FILE);
                } catch (Exception e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });
        if (state != null) web.restoreState(state);
        else web.loadUrl("https://" + HOST + "/index.html");
        setContentView(web);
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    /** Recebe orbitacontas://login?token=... quando o login com Google termina no navegador. */
    private void handleIntent(Intent intent) {
        Uri d = intent == null ? null : intent.getData();
        if (d == null || !"orbitacontas".equals(d.getScheme())) return;
        String token = d.getQueryParameter("token");
        if (token == null || token.isEmpty()) return;
        pendingToken = token;
        deliverToken();
    }

    private void deliverToken() {
        if (!pageReady || pendingToken == null) return;
        String js = "window.orbitaToken && window.orbitaToken(" + JSONObject.quote(pendingToken) + ")";
        pendingToken = null;
        web.evaluateJavascript(js, null);
    }

    private static String mimeOf(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".json") || p.endsWith(".webmanifest")) return "application/json";
        return "application/octet-stream";
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == PICK_FILE && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            fileCallback = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("(window.orbitaBack && window.orbitaBack()) ? 'y' : 'n'", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String v) {
                if (v == null || !v.contains("y")) finish();
            }
        });
    }

    private class Bridge {
        /** Abre um endereco no navegador do celular (usado para o login com Google). */
        @JavascriptInterface
        public void abrirNavegador(final String url) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception e) { }
                }
            });
        }

        /** Grava o backup na pasta Downloads (Android 10+) ou abre o menu de compartilhar. Retorna "downloads" ou "share". */
        @JavascriptInterface
        public String salvarBackup(String nome, String conteudo) {
            if (Build.VERSION.SDK_INT >= 29) {
                try {
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.MediaColumns.DISPLAY_NAME, nome);
                    v.put(MediaStore.MediaColumns.MIME_TYPE, "application/json");
                    v.put("relative_path", "Download");
                    Uri uri = getContentResolver().insert(Uri.parse("content://media/external/downloads"), v);
                    if (uri != null) {
                        try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                            os.write(conteudo.getBytes(StandardCharsets.UTF_8));
                        }
                        return "downloads";
                    }
                } catch (Exception e) { }
            }
            final Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.putExtra(Intent.EXTRA_SUBJECT, nome);
            send.putExtra(Intent.EXTRA_TEXT, conteudo);
            runOnUiThread(new Runnable() {
                @Override
                public void run() { startActivity(Intent.createChooser(send, "Guardar backup")); }
            });
            return "share";
        }
    }
}
