package com.devjeff.svgeditor;

import android.graphics.Typeface;
import android.util.Log;

import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;

import org.apache.commons.io.FileUtils;

class LoadFontException extends Exception {
    // Parameterless Constructor
    public LoadFontException() {}

    // Constructor that accepts a message
    public LoadFontException(String message)
    {
        super(message);
    }

    public LoadFontException(Throwable exception)
    {
        super(exception);
    }

    public LoadFontException(String message, Throwable exception)
    {
        super(message, exception);
    }
}

public class TypefaceManager {
    private static TypefaceManager INSTANCE = null;

    // other instance variables can be here
    private Map<String, Typeface> installedFonts = new HashMap<String, Typeface>();

    private TypefaceManager() {};

    public static TypefaceManager getInstance() {
        if (INSTANCE == null) {
            INSTANCE = new TypefaceManager();
        }
        return(INSTANCE);
    }

    // other instance methods can follow
    public Typeface createFontWithUrl(String url) throws LoadFontException {
        Log.i("TypefaceManager", "Create Font With Url: " + url);

        File tempFile = null;
        try {
            tempFile = File.createTempFile("fontTempFile", null);
            FileUtils.copyURLToFile(new URL(url), tempFile);
        } catch (MalformedURLException e) {
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        }

        if (tempFile == null) {
            throw new LoadFontException("something");
        }

        Typeface typeface = Typeface.createFromFile(tempFile);
        return typeface;
    }

    public Typeface getTypeface(String name) {
          return installedFonts.get(name);
    }
}
