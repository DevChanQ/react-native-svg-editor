package com.devjeff.svgeditor; // replace com.your-app-name with your app’s name

import android.app.Activity;
import android.graphics.Typeface;
import android.net.Uri;
import android.database.Cursor;
import android.provider.OpenableColumns;
import android.provider.DocumentsContract;
import android.util.Log;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.views.text.ReactFontManager;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.lang.IllegalArgumentException;
import java.lang.reflect.Type;
import java.net.URL;
import java.security.SecureRandom;

import org.apache.commons.io.FileUtils;

public class SvgEditorModule extends ReactContextBaseJavaModule {
  ReactApplicationContext mContext = null;
  SvgEditorModule(ReactApplicationContext context) {
    super(context);
    mContext = context;
  }

  @Override
  public String getName() {
    return "SvgEditor";
  }

  @ReactMethod
  public void getFilePath(String filepath, Promise promise) {
    Uri uri = Uri.parse(filepath);
    Uri docUriTree = DocumentsContract.buildDocumentUriUsingTree(uri, DocumentsContract.getTreeDocumentId(uri));

    String fileName = "";

    if (uri.getScheme().equals("content")) {
      try {
        Cursor cursor = mContext.getContentResolver().query(uri, null, null, null, null);

        if (cursor.moveToFirst()) {
          fileName = cursor.getString(cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME));
          Log.d("FS", "Real File name: " + fileName);
        }
        cursor.close();
        promise.resolve(fileName);
      } catch (IllegalArgumentException ignored) {
        promise.reject("1", "Can not get cursor");
      }
    } else {
      promise.resolve(fileName);
    }
  }

  @ReactMethod
  public void createFontWithUrl(String url, Promise promise) {
    try {
      File tempFile = File.createTempFile("fontTempFile", null);
      FileUtils.copyURLToFile(new URL(url), tempFile);

      InputStream inputStream = new FileInputStream(tempFile);

      TTFFile ttfFile = FontFileReader.readTTF(inputStream);
      String fontFamilyName = ttfFile.getFullName();

      // throw Error if fontFamilyName is null
      if (fontFamilyName == null) {
        throw new Exception("Error when loading font...");
      }

      Typeface tf = Typeface.createFromFile(tempFile);
      ReactFontManager fontManager = ReactFontManager.getInstance();

      fontManager.setTypeface(fontFamilyName, Typeface.NORMAL, tf);

      promise.resolve(fontFamilyName);
    } catch (Exception e) {
      promise.reject(e);
    }
  }

  @ReactMethod
  public void createFontWithLocalFile(String path, Promise promise) {
    try {
      File fontFile = new File(mContext.getFilesDir(), path);
      InputStream inputStream = new FileInputStream(fontFile);

      TTFFile ttfFile = FontFileReader.readTTF(inputStream);
      String fontFamilyName = ttfFile.getFullName();

      Typeface tf = Typeface.createFromFile(fontFile);
      ReactFontManager fontManager = ReactFontManager.getInstance();

      fontManager.setTypeface(fontFamilyName, Typeface.NORMAL, tf);

      promise.resolve(fontFamilyName);
    } catch (IOException e) {
      promise.reject(e);
    }
  }
}