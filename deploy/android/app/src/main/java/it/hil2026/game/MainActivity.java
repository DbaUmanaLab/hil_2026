package it.hil2026.game;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Contenitore Android di HIL 2026: una WebView a tutto schermo che serve il gioco
 * dagli asset dell'APK (assets/web/...) tramite WebViewAssetLoader, cioè da un'origine
 * https vera (https://appassets.androidplatform.net/) e non da file:// — così fetch(),
 * XMLHttpRequest, localStorage e WebGL funzionano come nel browser.
 */
public class MainActivity extends Activity {

    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/web/index.html";

    private WebView webView;
    private long lastBackAt = 0;
    private TextToSpeech tts;
    private boolean ttsReady = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = w.getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            w.setAttributes(lp);
        }

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .setDomain(HOST)
                .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#050913"));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);                      // localStorage: impostazioni, squadra, grafica
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);       // musica e cori partono senza un tocco dedicato
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setTextZoom(100);                                 // ignora la dimensione caratteri di sistema
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (HOST.equals(uri.getHost())) return false;
                // link esterni (siti dei club, ecc.) nel browser di sistema
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) { }
                return true;
            }
        });

        setupTextToSpeech();

        // build di debug: WebView ispezionabile da chrome://inspect sul PC
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) WebView.setWebContentsDebuggingEnabled(true);

        setContentView(webView);
        enterImmersive();

        if (savedInstanceState != null) webView.restoreState(savedInstanceState);
        else webView.loadUrl(START_URL);
    }

    /** Tasto indietro = Esc (pausa / chiudi menu); due volte di fila entro 2 s per uscire. */
    @Override
    public void onBackPressed() {
        long now = System.currentTimeMillis();
        if (now - lastBackAt < 2000) {
            super.onBackPressed();
            return;
        }
        lastBackAt = now;
        webView.evaluateJavascript(
                "(function(){var t=document.activeElement||document;" +
                "['keydown','keyup'].forEach(function(type){t.dispatchEvent(new KeyboardEvent(type," +
                "{key:'Escape',code:'Escape',keyCode:27,which:27,bubbles:true,cancelable:true}));});})();",
                null);
        Toast.makeText(this, "Premi di nuovo indietro per uscire", Toast.LENGTH_SHORT).show();
    }

    private void enterImmersive() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_FULLSCREEN);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) enterImmersive();
    }

    @Override
    protected void onPause() {
        super.onPause();
        // in background la pagina risulta nascosta: audio e rendering si fermano
        webView.onPause();
        webView.pauseTimers();
        if (tts != null) tts.stop();
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.resumeTimers();
        webView.onResume();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    /**
     * Telecronaca: la WebView di Android non ha speechSynthesis, quindi il gioco usa il
     * TextToSpeech di sistema tramite window.HILNativeTTS (vedi src/audio/Commentary.js).
     * A fine frase avvisa la pagina con Commentary._nativeEvent(id, 'end').
     */
    private void setupTextToSpeech() {
        tts = new TextToSpeech(this, status -> {
            ttsReady = status == TextToSpeech.SUCCESS;
            if (!ttsReady) return;
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String id) { }
                @Override public void onDone(String id) { notifyTts(id, "end"); }
                @Override public void onError(String id) { notifyTts(id, "error"); }
                @Override public void onStop(String id, boolean interrupted) { notifyTts(id, "end"); }
            });
        });
        webView.addJavascriptInterface(new NativeTts(), "HILNativeTTS");
    }

    private void notifyTts(String id, String kind) {
        final String js = "window.Commentary&&window.Commentary._nativeEvent(" + jsId(id) + ",'" + kind + "')";
        runOnUiThread(() -> { if (webView != null) webView.evaluateJavascript(js, null); });
    }

    private static String jsId(String s) {
        return "'" + (s == null ? "" : s.replaceAll("[^A-Za-z0-9_-]", "")) + "'";
    }

    // ---------------------------------------------------------------- scelta della voce
    // Android non dichiara il genere delle voci: si riconoscono dai codici delle voci Google
    // (it-it-x-itc / itd, en-gb-x-gbb / gbd / rjs, en-us-x-iol / iom / tpd) o dal nome ("male").
    private static final String[] MALE_CODES = { "-itc", "-itd", "-gbb", "-gbd", "-rjs", "-iol", "-iom", "-tpd", "-aua", "-aub" };
    private volatile String chosenVoice = "";

    private static boolean isMaleVoice(Voice v) {
        String n = v.getName().toLowerCase(Locale.ROOT);
        if (n.contains("female")) return false;
        if (n.contains("male")) return true;
        for (String c : MALE_CODES) if (n.contains(c)) return true;
        return false;
    }

    private List<Voice> voicesFor(String lang) {
        List<Voice> list = new ArrayList<>();
        if (!ttsReady || tts == null) return list;
        Locale want = Locale.forLanguageTag(lang == null ? "it-IT" : lang);
        Set<Voice> all;
        try { all = tts.getVoices(); } catch (Exception e) { return list; }
        if (all == null) return list;
        for (Voice v : all) {
            Locale l = v.getLocale();
            if (l == null || !l.getLanguage().equals(want.getLanguage())) continue;
            if (v.getFeatures() != null && v.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)) continue;
            list.add(v);
        }
        // prima le maschili, poi quelle del paese giusto (it-IT, en-GB), poi quelle che non chiedono la rete
        Collections.sort(list, (a, b) -> {
            int c = Boolean.compare(isMaleVoice(b), isMaleVoice(a));
            if (c != 0) return c;
            c = Boolean.compare(want.getCountry().equals(b.getLocale().getCountry()), want.getCountry().equals(a.getLocale().getCountry()));
            if (c != 0) return c;
            c = Boolean.compare(!b.isNetworkConnectionRequired(), !a.isNetworkConnectionRequired());
            if (c != 0) return c;
            return a.getName().compareTo(b.getName());
        });
        return list;
    }

    private Voice pickVoice(String lang) {
        List<Voice> list = voicesFor(lang);
        if (list.isEmpty()) return null;
        String want = chosenVoice;
        if (want != null && !want.isEmpty()) for (Voice v : list) if (v.getName().equals(want)) return v;
        return list.get(0);
    }

    private class NativeTts {
        @JavascriptInterface
        public boolean available() { return ttsReady; }

        /** Voci installate per la lingua (es. "it-IT"), le maschili per prime: [{"n":nome,"m":maschile,"l":locale}]. */
        @JavascriptInterface
        public String voices(String lang) {
            JSONArray out = new JSONArray();
            for (Voice v : voicesFor(lang)) {
                try {
                    JSONObject o = new JSONObject();
                    o.put("n", v.getName());
                    o.put("m", isMaleVoice(v));
                    o.put("l", !v.isNetworkConnectionRequired());
                    out.put(o);
                } catch (Exception ignored) { }
            }
            return out.toString();
        }

        /** Voce scelta dall'utente nelle opzioni ("" = automatica: la prima voce maschile disponibile). */
        @JavascriptInterface
        public void setVoice(String name) { chosenVoice = name == null ? "" : name; }

        /** Nome della voce che verrebbe usata per la lingua. */
        @JavascriptInterface
        public String currentVoice(String lang) {
            Voice v = pickVoice(lang);
            return v == null ? "" : v.getName();
        }

        @JavascriptInterface
        public void speak(String id, String text, String lang, float rate, float pitch, float volume) {
            if (!ttsReady || tts == null) { notifyTts(id, "error"); return; }
            Locale loc = Locale.forLanguageTag(lang == null ? "it-IT" : lang);
            if (tts.isLanguageAvailable(loc) >= TextToSpeech.LANG_AVAILABLE) tts.setLanguage(loc);
            Voice v = pickVoice(lang);
            if (v != null && (tts.getVoice() == null || !v.getName().equals(tts.getVoice().getName()))) tts.setVoice(v);
            tts.setSpeechRate(rate);
            tts.setPitch(pitch);
            Bundle params = new Bundle();
            params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, Math.max(0f, Math.min(1f, volume)));
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, params, id);
        }

        @JavascriptInterface
        public void stop() { if (tts != null) tts.stop(); }
    }

    @Override
    protected void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
