package app.sonaroids;

/* The app's own sound (v0.50, 28 Sep 2026). In a WebView the page gets whatever microphone Android picks — on the maintainer's Redmi Note 10S
   that is sometimes the one at the port and sometimes the one at the front camera, and it cannot be chosen from the page. Here the app
   records and plays itself, and the page only processes:
   - the microphone: AudioRecord, 48 kHz, 16 bit, VOICE_RECOGNITION (by Android's rules without noise suppression and gain control; v0.53 — UNPROCESSED was unsteady on the Mi 9 Lite),
     on the microphone the page asks for (setPreferredDevice), else Android's own pick;
   - the probe: AudioTrack, 48 kHz stereo float, three looped 512-sample probes made by the page (all tones / even / odd) mixed with gains
     the page sets per channel — exactly what the page's Web Audio graph did;
   - the frames go to the page through a WebMessagePort, two frames (1024 samples) per message: "<seq>:<base64 of int16 LE>".
   Everything the game does with the sound (echo processing, logs) stays in the page, one code for the browser and the app. */

import android.media.AudioAttributes;
import android.media.AudioDeviceInfo;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioRecord;
import android.media.AudioTrack;
import android.media.MediaRecorder;
import android.media.MicrophoneInfo;
import android.media.audiofx.AcousticEchoCanceler;
import android.media.audiofx.AudioEffect;
import android.media.audiofx.AutomaticGainControl;
import android.media.audiofx.NoiseSuppressor;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.util.Base64;
import android.webkit.WebMessage;
import android.webkit.WebMessagePort;
import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.List;

class NativeAudio {
    static final int FS = 48000, N = 512;
    final AudioManager am; final WebView web; final Handler ui;
    AudioRecord rec; AudioTrack trk; Thread recT, playT; volatile boolean run = false, recRun = false; long seq = 0;
    WebMessagePort port;
    volatile float[] pAll, pEven, pOdd;                           // the probes, 512 samples each, made by the page
    volatile float tAllL, tAllR, tEven, tOdd;                     // gain targets set by the page
    volatile long frames = 0; volatile String error = "";
    AudioEffect fxNs, fxAgc, fxAec; String fxState = "";               // v0.51: the phone's own voice processing, switched off explicitly
    String srcName = "", usageName = ""; int micWanted = -1, outWanted = -1, channels = 1;

    NativeAudio(AudioManager am, WebView web, Handler ui) { this.am = am; this.web = web; this.ui = ui; }

    boolean unprocessedOk() { return "true".equals(am.getProperty(AudioManager.PROPERTY_SUPPORT_AUDIO_SOURCE_UNPROCESSED)); }

    /* cfg: {"mic": device id or -1, "out": device id or -1, "src": "auto"|"unprocessed"|"voice"|"mic"|"camcorder", "ch": 1|2} */
    synchronized boolean start(String cfg) {
        stop();
        try {
            JSONObject c = new JSONObject(cfg == null || cfg.isEmpty() ? "{}" : cfg);
            outWanted = c.optInt("out", -1); channels = c.optInt("ch", 1) == 2 ? 2 : 1;
            // v0.52: the probe as media by default (as the WebView plays it). On the Mi 9 Lite as a game sound (USAGE_GAME) its level at the
            // microphone wandered by ~10% frame to frame in an empty room (0.8% through the WebView) — the empty room did not cancel out
            // (residual −12 dB against −33) and the palm was lost again and again
            String u = c.optString("usage", "media"); usageName = u;
            int usage = u.equals("game") ? AudioAttributes.USAGE_GAME : u.equals("unknown") ? AudioAttributes.USAGE_UNKNOWN : AudioAttributes.USAGE_MEDIA;
            int ctype = u.equals("game") ? AudioAttributes.CONTENT_TYPE_SONIFICATION : AudioAttributes.CONTENT_TYPE_MUSIC;
            if (!openRec(c)) { release(); return false; }

            int minOut = AudioTrack.getMinBufferSize(FS, AudioFormat.CHANNEL_OUT_STEREO, AudioFormat.ENCODING_PCM_FLOAT);
            trk = new AudioTrack.Builder()
                .setAudioAttributes(new AudioAttributes.Builder().setUsage(usage).setContentType(ctype).build())
                .setAudioFormat(new AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_FLOAT).setSampleRate(FS)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_STEREO).build())
                .setBufferSizeInBytes(Math.max(minOut * 2, 4 * N * 2 * 4)).setTransferMode(AudioTrack.MODE_STREAM).build();
            if (outWanted >= 0) { AudioDeviceInfo d = device(outWanted, AudioManager.GET_DEVICES_OUTPUTS); if (d != null) trk.setPreferredDevice(d); }
            frames = 0; seq = 0; error = ""; run = true; recRun = true;
            rec.startRecording(); trk.play();
            playT = new Thread(this::playLoop, "sonar-play"); playT.start();
            // the port is made on the UI thread (WebView's rule); the recording thread starts once the page has its end
            ui.post(() -> {
                try {
                    WebMessagePort[] ch = web.createWebMessageChannel();
                    port = ch[0];
                    web.postWebMessage(new WebMessage("sonaroids-audio", new WebMessagePort[]{ch[1]}), Uri.parse("https://sonaroids.app"));
                    recT = new Thread(this::recLoop, "sonar-rec"); recT.start();
                } catch (Exception e) { error = "port: " + e; }
            });
            return true;
        } catch (Exception e) { error = String.valueOf(e); release(); return false; }
    }

    /* the recording: source and microphone from cfg (also used by switchInput) */
    boolean openRec(JSONObject c) {
        micWanted = c.optInt("mic", -1);
        String s = c.optString("src", "auto");
        int src;
        if (s.equals("voice")) src = MediaRecorder.AudioSource.VOICE_RECOGNITION;
        else if (s.equals("mic")) src = MediaRecorder.AudioSource.MIC;
        else if (s.equals("camcorder")) src = MediaRecorder.AudioSource.CAMCORDER;
        // v0.53: «auto» is VOICE_RECOGNITION. On the Mi 9 Lite UNPROCESSED let the probe's level wander ~6% frame to frame in an empty
        // room (the residual −13 dB, the palm lost now and then) while VOICE_RECOGNITION kept it at 0.9% (−36 dB), as the WebView (0.8%)
        else if (s.equals("unprocessed")) src = MediaRecorder.AudioSource.UNPROCESSED;
        else src = MediaRecorder.AudioSource.VOICE_RECOGNITION;
        srcName = src == MediaRecorder.AudioSource.UNPROCESSED ? "unprocessed" : src == MediaRecorder.AudioSource.VOICE_RECOGNITION ? "voice"
            : src == MediaRecorder.AudioSource.CAMCORDER ? "camcorder" : "mic";
        int chIn = channels == 2 ? AudioFormat.CHANNEL_IN_STEREO : AudioFormat.CHANNEL_IN_MONO;
        int minIn = AudioRecord.getMinBufferSize(FS, chIn, AudioFormat.ENCODING_PCM_16BIT);
        rec = new AudioRecord(src, FS, chIn, AudioFormat.ENCODING_PCM_16BIT, Math.max(minIn * 2, 8 * N * 2 * channels));
        if (rec.getState() != AudioRecord.STATE_INITIALIZED) { error = "record-init"; return false; }
        if (micWanted >= 0) { AudioDeviceInfo d = device(micWanted, AudioManager.GET_DEVICES_INPUTS); if (d != null) rec.setPreferredDevice(d); }
        // v0.51: the source already asks for no processing (UNPROCESSED; VOICE_RECOGNITION — by Android's rules without noise suppression and
        // gain control), but some phones attach noise suppression, gain control or echo cancelling to a recording anyway: switch them off
        int sid = rec.getAudioSessionId(); StringBuilder fx = new StringBuilder();
        fxNs = fxOff(NoiseSuppressor.isAvailable() ? NoiseSuppressor.create(sid) : null, "ns", NoiseSuppressor.isAvailable(), fx);
        fxAgc = fxOff(AutomaticGainControl.isAvailable() ? AutomaticGainControl.create(sid) : null, "agc", AutomaticGainControl.isAvailable(), fx);
        fxAec = fxOff(AcousticEchoCanceler.isAvailable() ? AcousticEchoCanceler.create(sid) : null, "aec", AcousticEchoCanceler.isAvailable(), fx);
        fxState = fx.toString();
        return true;
    }

    /* v0.54: another source or microphone without stopping the probe or the port — for the page's short test of the phone's options
       during «take your hand away». The frames' numbering goes on; the first ones after a switch are the new recording's */
    synchronized boolean switchInput(String cfg) {
        if (!run) return false;
        try {
            recRun = false; try { if (recT != null) recT.join(500); } catch (Exception e) { }
            recT = null; releaseRec();
            if (!openRec(new JSONObject(cfg == null || cfg.isEmpty() ? "{}" : cfg))) return false;
            rec.startRecording(); recRun = true;
            recT = new Thread(this::recLoop, "sonar-rec"); recT.start();
            return true;
        } catch (Exception e) { error = "switch: " + e; return false; }
    }

    synchronized void stop() {
        run = false; recRun = false;
        try { if (recT != null) recT.join(500); } catch (Exception e) { }
        try { if (playT != null) playT.join(500); } catch (Exception e) { }
        recT = null; playT = null;
        release();
        final WebMessagePort p = port; port = null;
        if (p != null) ui.post(() -> { try { p.close(); } catch (Exception e) { } });
    }

    /* an effect the phone offers for this recording: switched off; the state goes into the status ("ns:off agc:none …") */
    AudioEffect fxOff(AudioEffect e, String name, boolean avail, StringBuilder log) {
        String st;
        if (!avail) st = "none";
        else if (e == null) st = "fail";
        else { try { boolean was = e.getEnabled(); e.setEnabled(false); st = (was ? "was-on," : "") + (e.getEnabled() ? "on" : "off"); } catch (Exception x) { st = "err"; } }
        if (log.length() > 0) log.append(' ');
        log.append(name).append(':').append(st);
        return e;
    }

    void releaseRec() {
        for (AudioEffect e : new AudioEffect[]{fxNs, fxAgc, fxAec}) { try { if (e != null) e.release(); } catch (Exception x) { } }
        fxNs = null; fxAgc = null; fxAec = null;
        try { if (rec != null) { try { rec.stop(); } catch (Exception e) { } rec.release(); } } catch (Exception e) { }
        rec = null;
    }

    void release() {
        releaseRec();
        try { if (trk != null) { try { trk.pause(); trk.flush(); } catch (Exception e) { } trk.release(); } } catch (Exception e) { }
        trk = null;
    }

    /* two frames per message; a short read (the phone took the microphone away) ends the loop — the page sees no frames and asks again */
    void recLoop() {
        final int n = 2 * N * channels; short[] buf = new short[n]; ByteBuffer bb = ByteBuffer.allocate(n * 2).order(ByteOrder.LITTLE_ENDIAN);
        final AudioRecord r0 = rec;
        while (run && recRun) {
            int got = 0;
            while (got < n && run && recRun) { int r = r0.read(buf, got, n - got); if (r <= 0) { if (recRun) { error = "read " + r; run = false; } break; } got += r; }
            if (!run || !recRun) break;
            bb.clear(); bb.asShortBuffer().put(buf, 0, n);
            final String msg = seq + ":" + Base64.encodeToString(bb.array(), Base64.NO_WRAP);
            seq += 2; frames += 2;
            final WebMessagePort p = port;
            if (p != null) ui.post(() -> { try { p.postMessage(new WebMessage(msg)); } catch (Exception e) { } });
        }
    }

    /* the probe: gains glide to their targets in ~20 ms, like the page's setTargetAtTime */
    void playLoop() {
        float[] out = new float[2 * N]; float gAL = 0, gAR = 0, gE = 0, gO = 0; final float a = (float) (1 - Math.exp(-1.0 / (0.02 * FS)));
        int ph = 0;
        while (run) {
            float[] A = pAll, E = pEven, O = pOdd;
            for (int i = 0; i < N; i++) {
                gAL += (tAllL - gAL) * a; gAR += (tAllR - gAR) * a; gE += (tEven - gE) * a; gO += (tOdd - gO) * a;
                float s = A != null ? A[ph] : 0, e = E != null ? E[ph] : 0, o = O != null ? O[ph] : 0;
                out[2 * i] = gAL * s + gE * e; out[2 * i + 1] = gAR * s + gO * o;
                ph = (ph + 1) % N;
            }
            int w = trk.write(out, 0, out.length, AudioTrack.WRITE_BLOCKING);
            if (w < 0) { error = "write " + w; break; }
        }
    }

    /* which: "all" | "even" | "odd"; b64: 512 float32 LE */
    void probe(String which, String b64) {
        try {
            byte[] b = Base64.decode(b64, Base64.DEFAULT); ByteBuffer bb = ByteBuffer.wrap(b).order(ByteOrder.LITTLE_ENDIAN);
            float[] f = new float[N]; for (int i = 0; i < N && bb.remaining() >= 4; i++) f[i] = bb.getFloat();
            if (which.equals("all")) pAll = f; else if (which.equals("even")) pEven = f; else pOdd = f;
        } catch (Exception e) { error = "probe: " + e; }
    }

    void gains(double allL, double allR, double even, double odd) { tAllL = (float) allL; tAllR = (float) allR; tEven = (float) even; tOdd = (float) odd; }

    AudioDeviceInfo device(int id, int kind) { for (AudioDeviceInfo d : am.getDevices(kind)) if (d.getId() == id) return d; return null; }

    static String typeName(int t) {
        switch (t) {
            case AudioDeviceInfo.TYPE_BUILTIN_MIC: return "builtin_mic";
            case AudioDeviceInfo.TYPE_BUILTIN_SPEAKER: return "speaker";
            case AudioDeviceInfo.TYPE_BUILTIN_EARPIECE: return "earpiece";
            case AudioDeviceInfo.TYPE_TELEPHONY: return "telephony";
            case AudioDeviceInfo.TYPE_WIRED_HEADSET: return "wired_headset";
            case AudioDeviceInfo.TYPE_WIRED_HEADPHONES: return "wired_headphones";
            case AudioDeviceInfo.TYPE_BLUETOOTH_SCO: return "bt_sco";
            case AudioDeviceInfo.TYPE_BLUETOOTH_A2DP: return "bt_a2dp";
            case AudioDeviceInfo.TYPE_USB_DEVICE: return "usb";
            case AudioDeviceInfo.TYPE_FM_TUNER: return "fm";
            default: return "type" + t;
        }
    }

    JSONObject dev(AudioDeviceInfo d) throws Exception {
        JSONObject j = new JSONObject();
        j.put("id", d.getId()); j.put("type", typeName(d.getType())); j.put("name", String.valueOf(d.getProductName()));
        if (Build.VERSION.SDK_INT >= 28) j.put("address", d.getAddress());
        return j;
    }

    JSONObject mic(MicrophoneInfo m) throws Exception {
        JSONObject j = new JSONObject();
        j.put("id", m.getId()); j.put("address", m.getAddress()); j.put("desc", m.getDescription()); j.put("type", typeName(m.getType()));
        j.put("location", m.getLocation());
        MicrophoneInfo.Coordinate3F p = m.getPosition();
        if (p != null) { JSONArray a = new JSONArray(); a.put(Math.round(p.x * 1000)); a.put(Math.round(p.y * 1000)); a.put(Math.round(p.z * 1000)); j.put("pos_mm", a); }
        return j;
    }

    /* the phone's microphones and outputs: AudioDeviceInfo (what can be picked) and, on Android 9+, MicrophoneInfo (where each one is) */
    String devices() {
        try {
            JSONObject j = new JSONObject(); JSONArray in = new JSONArray(), out = new JSONArray(), mics = new JSONArray();
            for (AudioDeviceInfo d : am.getDevices(AudioManager.GET_DEVICES_INPUTS)) in.put(dev(d));
            for (AudioDeviceInfo d : am.getDevices(AudioManager.GET_DEVICES_OUTPUTS)) out.put(dev(d));
            if (Build.VERSION.SDK_INT >= 28) { try { for (MicrophoneInfo m : am.getMicrophones()) mics.put(mic(m)); } catch (Exception e) { } }
            j.put("inputs", in); j.put("outputs", out); j.put("mics", mics); j.put("unprocessed", unprocessedOk()); j.put("sdk", Build.VERSION.SDK_INT);
            return j.toString();
        } catch (Exception e) { return "{}"; }
    }

    /* what is really in use now: the routed devices and, on Android 9+, the active microphones of the recording */
    String status() {
        try {
            JSONObject j = new JSONObject();
            j.put("running", run); j.put("frames", frames); j.put("src", srcName); j.put("usage", usageName); j.put("ch", channels); j.put("mic_wanted", micWanted); j.put("out_wanted", outWanted);
            j.put("error", error); j.put("fx", fxState);
            AudioRecord r = rec; AudioTrack t = trk;
            if (r != null) { AudioDeviceInfo d = r.getRoutedDevice(); if (d != null) j.put("in", dev(d));
                if (Build.VERSION.SDK_INT >= 28) { try { JSONArray a = new JSONArray(); List<MicrophoneInfo> l = r.getActiveMicrophones(); for (MicrophoneInfo m : l) a.put(mic(m)); j.put("active", a); } catch (Exception e) { } } }
            if (t != null) { AudioDeviceInfo d = t.getRoutedDevice(); if (d != null) j.put("out", dev(d)); }
            return j.toString();
        } catch (Exception e) { return "{}"; }
    }
}
