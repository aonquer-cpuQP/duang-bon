package com.aon.duangbon;

import android.app.Activity;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * ดวงบอล — เปิดแอปเวอร์ชันล่าสุดจาก GitHub Pages
 * ถ้าไม่มีเน็ตหรือโหลดไม่ได้ ใช้สำเนาที่ฝังมากับแอป (assets/index.html)
 * สำเนาฝังโหลดด้วย base URL เดียวกับเว็บ ข้อมูลที่บันทึกในเครื่องจึงเป็นชุดเดียวกันทั้งออนไลน์และออฟไลน์
 */
public class MainActivity extends Activity {
    static final String HOST = "aonquer-cpuqp.github.io";
    static final String URL = "https://" + HOST + "/duang-bon/duang-bon.html";
    static final long STALE_MS = 30L * 60L * 1000L;   // กลับเข้าแอปหลัง 30 นาที โหลดของใหม่
    static final int REQ_OPEN = 1;
    static final int REQ_SAVE = 2;

    WebView web;
    boolean offline;
    long loadedAt;
    ValueCallback<Uri[]> fileCallback;
    String pendingSave;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        boolean night = (getResources().getConfiguration().uiMode
                & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        int bg = night ? Color.rgb(0x1C, 0x1B, 0x19) : Color.rgb(0xF6, 0xF3, 0xEE);
        styleBars(bg, night);

        web = new WebView(this);
        web.setBackgroundColor(bg);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setSupportZoom(false);
        web.setWebViewClient(new Client());
        web.setWebChromeClient(new Chrome());
        web.addJavascriptInterface(new Bridge(), "DuangAndroid");
        setContentView(web);
        loadOnline();
    }

    void styleBars(int bg, boolean night) {
        Window w = getWindow();
        w.setStatusBarColor(bg);
        w.setNavigationBarColor(bg);
        if (!night) {
            int flags = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if (Build.VERSION.SDK_INT >= 26) flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            w.getDecorView().setSystemUiVisibility(flags);
        }
    }

    void loadOnline() {
        offline = false;
        loadedAt = SystemClock.elapsedRealtime();
        web.loadUrl(URL);
    }

    void loadOffline() {
        offline = true;
        loadedAt = SystemClock.elapsedRealtime();
        String html = readAsset("index.html");
        if (html == null) {
            html = "<meta charset='utf-8'><body style='font-family:sans-serif;padding:24px'>"
                    + "เปิดแอปไม่ได้ ต้องต่ออินเทอร์เน็ตครั้งแรก</body>";
        }
        web.loadDataWithBaseURL(URL, html, "text/html", "utf-8", URL);
    }

    String readAsset(String name) {
        InputStream in = null;
        try {
            in = getAssets().open(name);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[65536];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toString("UTF-8");
        } catch (Exception e) {
            return null;
        } finally {
            if (in != null) {
                try { in.close(); } catch (Exception ignored) { }
            }
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web == null || loadedAt == 0) return;
        long age = SystemClock.elapsedRealtime() - loadedAt;
        if (offline && age > 60L * 1000L) {
            loadOnline();                          // เคยออฟไลน์ ลองโหลดของจริงอีกครั้ง
        } else if (!offline && age > STALE_MS) {
            loadedAt = SystemClock.elapsedRealtime();
            web.reload();                          // ดึงตัวจริงและราคาล่าสุด
        }
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("(window.__duangBack && window.__duangBack()) ? '1' : '0'",
                new ValueCallback<String>() {
                    @Override
                    public void onReceiveValue(String v) {
                        if (!"\"1\"".equals(v)) finish();
                    }
                });
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        Uri uri = (res == RESULT_OK && data != null) ? data.getData() : null;
        if (req == REQ_OPEN) {
            if (fileCallback != null) {
                fileCallback.onReceiveValue(uri != null ? new Uri[]{uri} : null);
                fileCallback = null;
            }
        } else if (req == REQ_SAVE) {
            if (uri != null && pendingSave != null) writeTo(uri, pendingSave);
            pendingSave = null;
        } else {
            super.onActivityResult(req, res, data);
        }
    }

    void writeTo(Uri uri, String text) {
        OutputStream os = null;
        try {
            os = getContentResolver().openOutputStream(uri);
            os.write(text.getBytes("UTF-8"));
            os.flush();
            toast("บันทึกไฟล์สำรองแล้ว");
        } catch (Exception e) {
            toast("บันทึกไฟล์ไม่สำเร็จ");
        } finally {
            if (os != null) {
                try { os.close(); } catch (Exception ignored) { }
            }
        }
    }

    void toast(String msg) {
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show();
    }

    class Client extends WebViewClient {
        @Override
        public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
            if (r.isForMainFrame() && !offline) loadOffline();
        }

        @Override
        public void onReceivedHttpError(WebView v, WebResourceRequest r, WebResourceResponse resp) {
            if (r.isForMainFrame() && !offline && resp.getStatusCode() >= 400) loadOffline();
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
            Uri u = r.getUrl();
            String scheme = u.getScheme();
            if (HOST.equals(u.getHost()) || "blob".equals(scheme) || "data".equals(scheme)) return false;
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, u));   // ลิงก์ภายนอกเปิดในเบราว์เซอร์
            } catch (Exception ignored) { }
            return true;
        }
    }

    class Chrome extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = cb;
            Intent i = new Intent(Intent.ACTION_GET_CONTENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType("*/*");
            try {
                startActivityForResult(i, REQ_OPEN);
                return true;
            } catch (Exception e) {
                fileCallback = null;
                toast("เครื่องนี้เปิดหน้าเลือกไฟล์ไม่ได้");
                return false;
            }
        }
    }

    /** เรียกจากหน้าเว็บ: window.DuangAndroid.saveFile(ชื่อไฟล์, ข้อความ) */
    class Bridge {
        @JavascriptInterface
        public void saveFile(final String name, final String text) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    pendingSave = text;
                    Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType("application/json");
                    i.putExtra(Intent.EXTRA_TITLE, name);
                    try {
                        startActivityForResult(i, REQ_SAVE);
                    } catch (Exception e) {
                        pendingSave = null;
                        toast("เครื่องนี้เปิดหน้าบันทึกไฟล์ไม่ได้");
                    }
                }
            });
        }
    }
}
