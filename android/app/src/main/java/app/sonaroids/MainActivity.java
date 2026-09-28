package app.sonaroids;

/* Sonaroids for Android (v0.41, 27 Sep 2026). A thin shell: the game is the page https://sonaroids.app/play/ in a WebView, so everything that
   changes on the site reaches the app by itself (the page's service worker is network-first: a new version on the next launch when online).
   The shell adds what a browser cannot:
   - the microphone permission is asked once, as an app permission, and then given to the page without prompts;
   - window.SonaroidsApp for the page: media volume (the most common failure is «too quiet»), the audio route, app info, update check;
   - the screen stays on, landscape, full screen;
   - app updates: on every launch (and on request from the page) it reads app.json of the latest GitHub release; a newer build → a dialog
     that opens the APK download. After a long pause on the title screen the page is reloaded, so a site update arrives without a restart.
   - v0.50: its own sound (NativeAudio): the page may record and play through the app — then the microphone and the speaker can be picked. */

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;

public class MainActivity extends Activity {
    static final String GAME_URL = "https://sonaroids.app/play/";
    static final String GAME_HOST = "sonaroids.app";
    static final String UPDATE_URL = "https://github.com/neokrasav4ik/sonaroids/releases/latest/download/app.json";
    static final int REQ_MIC = 1;
    static final long RELOAD_AFTER_MS = 30 * 60 * 1000L;

    WebView web;
    AudioManager audio;
    NativeAudio nat;
    PermissionRequest pending;
    long pausedAt = 0;
    // files from the page (game logs): WebView cannot download blob: links or use the share sheet, so the page hands them over in pieces
    OutputStream fileOut; Uri fileUri; File fileLegacy; final ArrayList<Uri> saved = new ArrayList<>(); final ArrayList<String> savedNames = new ArrayList<>();
    final Handler ui = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setVolumeControlStream(AudioManager.STREAM_MUSIC);           // the volume keys change the probe's loudness, not the ringer
        audio = (AudioManager) getSystemService(AUDIO_SERVICE);

        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) WebView.setWebContentsDebuggingEnabled(true);
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUserAgentString(s.getUserAgentString() + " SonaroidsApp/" + versionName());
        web.setBackgroundColor(0xFF1B1A2E);
        nat = new NativeAudio(audio, web, ui);
        web.addJavascriptInterface(new Bridge(), "SonaroidsApp");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (GAME_HOST.equals(u.getHost())) return false;          // the game and the lab stay inside
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception e) { }
                return true;                                               // everything else (source code, GitHub) — in the browser
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest r) {
                ui.post(() -> {
                    if (!GAME_HOST.equals(r.getOrigin().getHost())) { r.deny(); return; }
                    if (hasMic()) r.grant(r.getResources());
                    else { pending = r; requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC); }
                });
            }
        });
        setContentView(web);
        immersive();
        if (!hasMic()) requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
        web.loadUrl(GAME_URL);
        checkUpdate(false);
    }

    boolean hasMic() { return checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED; }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        if (code != REQ_MIC || pending == null) return;
        if (hasMic()) pending.grant(pending.getResources()); else pending.deny();
        pending = null;
    }

    void immersive() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }

    @Override
    public void onWindowFocusChanged(boolean f) { super.onWindowFocusChanged(f); if (f) immersive(); }

    @Override
    protected void onPause() { super.onPause(); pausedAt = SystemClock.elapsedRealtime(); nat.stop(); web.onPause(); }   // the page sees no frames and asks for the microphone again

    @Override
    protected void onDestroy() { nat.stop(); super.onDestroy(); }

    @Override
    protected void onResume() {
        super.onResume(); web.onResume();
        // after a long pause, on the title screen only (never in a game): reload — a site update arrives without restarting the app
        if (pausedAt > 0 && SystemClock.elapsedRealtime() - pausedAt > RELOAD_AFTER_MS) {
            web.evaluateJavascript("(window.__sonaroids&&__sonaroids.scr)?__sonaroids.scr():''", v -> {
                if (v == null || v.contains("title") || v.equals("\"\"")) web.reload(); });
            checkUpdate(false);
        }
    }

    @Override
    public void onBackPressed() { if (web.canGoBack()) web.goBack(); else super.onBackPressed(); }

    String versionName() { try { return pkg().versionName; } catch (Exception e) { return "?"; } }
    long versionCode() { try { PackageInfo p = pkg(); return Build.VERSION.SDK_INT >= 28 ? p.getLongVersionCode() : p.versionCode; } catch (Exception e) { return 0; } }
    PackageInfo pkg() throws Exception { return getPackageManager().getPackageInfo(getPackageName(), 0); }
    boolean ru() { return "ru".equals(Locale.getDefault().getLanguage()); }

    /* app updates: app.json of the latest release — {"versionCode":N,"versionName":"…","url":"…apk"} */
    void checkUpdate(final boolean manual) {
        new Thread(() -> {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(UPDATE_URL).openConnection();
                c.setInstanceFollowRedirects(true); c.setConnectTimeout(8000); c.setReadTimeout(8000); c.setUseCaches(false);
                int code = c.getResponseCode();
                if (code / 100 == 3) { String loc = c.getHeaderField("Location"); c.disconnect(); c = (HttpURLConnection) new URL(loc).openConnection(); }
                BufferedReader in = new BufferedReader(new InputStreamReader(c.getInputStream(), "UTF-8"));
                StringBuilder sb = new StringBuilder(); String line; while ((line = in.readLine()) != null) sb.append(line); in.close();
                final JSONObject j = new JSONObject(sb.toString());
                final long remote = j.optLong("versionCode", 0);
                final String url = j.optString("url", "https://github.com/neokrasav4ik/sonaroids/releases/latest");
                final String name = j.optString("versionName", "");
                ui.post(() -> {
                    if (remote > versionCode()) {
                        new AlertDialog.Builder(this)
                            .setTitle(ru() ? "Новая версия приложения" : "A new version of the app")
                            .setMessage((ru() ? "Доступна версия " : "Version ") + name + (ru() ? ". Скачать и установить?" : " is available. Download and install it?"))
                            .setPositiveButton(ru() ? "Скачать" : "Download", (d, w) -> {
                                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception e) { } })
                            .setNegativeButton(ru() ? "Потом" : "Later", null).show();
                    } else if (manual) {
                        Toast.makeText(this, (ru() ? "Приложение последней версии " : "The app is up to date ") + versionName(), Toast.LENGTH_SHORT).show();
                    }
                });
            } catch (final Exception e) {
                if (manual) ui.post(() -> Toast.makeText(this, ru() ? "Не удалось проверить обновление" : "Could not check for updates", Toast.LENGTH_SHORT).show());
            }
        }).start();
    }

    /* window.SonaroidsApp — for the page (src/49_main.js, APP) */
    class Bridge {
        @JavascriptInterface
        public double getVolume() {
            int max = audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
            return max > 0 ? (double) audio.getStreamVolume(AudioManager.STREAM_MUSIC) / max : 0;
        }
        @JavascriptInterface
        public void setVolume(double f) {
            int max = audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
            int v = (int) Math.round(Math.max(0, Math.min(1, f)) * max);
            try { audio.setStreamVolume(AudioManager.STREAM_MUSIC, v, 0); } catch (Exception e) { }
        }
        /* where the sound goes: headphones or Bluetooth mean the probe does not reach the palm */
        @JavascriptInterface
        public String route() {
            String r = "speaker";
            for (AudioDeviceInfo d : audio.getDevices(AudioManager.GET_DEVICES_OUTPUTS)) {
                int t = d.getType();
                if (t == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP || t == AudioDeviceInfo.TYPE_BLUETOOTH_SCO) return "bluetooth";
                if (t == AudioDeviceInfo.TYPE_WIRED_HEADPHONES || t == AudioDeviceInfo.TYPE_WIRED_HEADSET || (Build.VERSION.SDK_INT >= 26 && t == AudioDeviceInfo.TYPE_USB_HEADSET)) r = "wired";
            }
            return r;
        }
        @JavascriptInterface
        public String info() {
            try {
                JSONObject j = new JSONObject();
                j.put("app", versionName()); j.put("code", versionCode()); j.put("sdk", Build.VERSION.SDK_INT); j.put("model", Build.MODEL);
                j.put("unprocessed", "true".equals(audio.getProperty(AudioManager.PROPERTY_SUPPORT_AUDIO_SOURCE_UNPROCESSED)));
                j.put("route", route()); j.put("volume", Math.round(getVolume() * 100) / 100.0);
                return j.toString();
            } catch (Exception e) { return "{}"; }
        }
        @JavascriptInterface
        public void checkUpdate() { MainActivity.this.checkUpdate(true); }
        /* v0.50, the app's own sound (NativeAudio): start → the page gets a MessagePort ("sonaroids-audio") with the microphone frames */
        @JavascriptInterface
        public boolean audioStart(String cfg) {
            if (!hasMic()) { ui.post(() -> requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC)); return false; }
            return nat.start(cfg);
        }
        @JavascriptInterface
        public void audioStop() { nat.stop(); }
        @JavascriptInterface
        public void audioProbe(String which, String b64) { nat.probe(which, b64); }
        @JavascriptInterface
        public void audioGains(double allL, double allR, double even, double odd) { nat.gains(allL, allR, even, odd); }
        @JavascriptInterface
        public String audioDevices() { return nat.devices(); }
        @JavascriptInterface
        public String audioStatus() { return nat.status(); }
        /* saving a file from the page: fileBegin → fileChunk (base64, any number) → fileEnd; then shareFiles() opens the share sheet.
           Android 10+: into Downloads/Sonaroids (no permission needed); older: the app's own folder. Returns false on failure */
        @JavascriptInterface
        public boolean fileBegin(String name, String mime) {
            try {
                fileUri = null; fileLegacy = null;
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                    cv.put(MediaStore.MediaColumns.MIME_TYPE, mime);
                    cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Sonaroids");
                    cv.put(MediaStore.MediaColumns.IS_PENDING, 1);
                    fileUri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                    fileOut = getContentResolver().openOutputStream(fileUri);
                } else {
                    File dir = getExternalFilesDir(null); fileLegacy = new File(dir, name); fileOut = new FileOutputStream(fileLegacy);
                }
                savedNames.add(name);
                return fileOut != null;
            } catch (Exception e) { fileOut = null; return false; }
        }
        @JavascriptInterface
        public boolean fileChunk(String b64) {
            try { fileOut.write(Base64.decode(b64, Base64.DEFAULT)); return true; } catch (Exception e) { return false; }
        }
        @JavascriptInterface
        public boolean fileEnd() {
            try {
                fileOut.close(); fileOut = null;
                if (fileUri != null) { ContentValues cv = new ContentValues(); cv.put(MediaStore.MediaColumns.IS_PENDING, 0); getContentResolver().update(fileUri, cv, null, null); saved.add(fileUri); }
                return true;
            } catch (Exception e) { return false; }
        }
        @JavascriptInterface
        public void shareFiles() {
            final ArrayList<Uri> list = new ArrayList<>(saved); final int n = savedNames.size(); saved.clear(); savedNames.clear();
            ui.post(() -> {
                Toast.makeText(MainActivity.this, (ru() ? "Сохранено в Загрузки/Sonaroids: " : "Saved to Downloads/Sonaroids: ") + n, Toast.LENGTH_LONG).show();
                if (list.isEmpty()) return;
                try {
                    Intent i = new Intent(list.size() > 1 ? Intent.ACTION_SEND_MULTIPLE : Intent.ACTION_SEND);
                    i.setType("audio/wav");
                    if (list.size() > 1) i.putParcelableArrayListExtra(Intent.EXTRA_STREAM, list); else i.putExtra(Intent.EXTRA_STREAM, list.get(0));
                    i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(Intent.createChooser(i, ru() ? "Отправить журналы" : "Send the logs"));
                } catch (Exception e) { }
            });
        }
    }
}
