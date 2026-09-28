package app.sonaroids;

/* v0.57: hands the downloaded update (cache/update/sonaroids.apk) to Android's package installer as content://app.sonaroids.apk/sonaroids.apk.
   Needed because on MIUI (the maintainer's Mi 9 Lite and Redmi) an installer session started by the app itself fails with
   "INSTALL_FAILED_INTERNAL_ERROR: Permission Denied"; the classic «open this APK» intent goes through the phone's own installer screen.
   Read-only, one file, not exported — the installer gets a one-time read grant with the intent. */

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;

import java.io.File;
import java.io.FileNotFoundException;

public class ApkProvider extends ContentProvider {
    static final String AUTH = "app.sonaroids.apk";
    static File file(android.content.Context c) { File d = new File(c.getCacheDir(), "update"); d.mkdirs(); return new File(d, "sonaroids.apk"); }

    @Override public boolean onCreate() { return true; }
    @Override public String getType(Uri u) { return "application/vnd.android.package-archive"; }
    @Override public ParcelFileDescriptor openFile(Uri u, String mode) throws FileNotFoundException {
        return ParcelFileDescriptor.open(file(getContext()), ParcelFileDescriptor.MODE_READ_ONLY);
    }
    @Override public Cursor query(Uri u, String[] proj, String sel, String[] args, String sort) {
        File f = file(getContext());
        MatrixCursor c = new MatrixCursor(new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE});
        c.addRow(new Object[]{"sonaroids.apk", f.length()});
        return c;
    }
    @Override public Uri insert(Uri u, ContentValues v) { return null; }
    @Override public int delete(Uri u, String s, String[] a) { return 0; }
    @Override public int update(Uri u, ContentValues v, String s, String[] a) { return 0; }
}
