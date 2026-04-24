package com.mapic.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.provider.MediaStore;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

public class ImagePickerModule extends ReactContextBaseJavaModule {
    private static final int PICK_IMAGE_REQUEST = 1;
    private Promise mPickerPromise;

    private final ActivityEventListener mActivityEventListener = new BaseActivityEventListener() {
        @Override
        public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
            if (requestCode == PICK_IMAGE_REQUEST) {
                if (mPickerPromise != null) {
                    if (resultCode == Activity.RESULT_CANCELED) {
                        mPickerPromise.reject("E_PICKER_CANCELLED", "User cancelled image picker");
                    } else if (resultCode == Activity.RESULT_OK) {
                        if (data != null) {
                            Uri uri = data.getData();
                            if (uri != null) {
                                WritableMap response = Arguments.createMap();
                                response.putString("uri", uri.toString());
                                mPickerPromise.resolve(response);
                            } else {
                                mPickerPromise.reject("E_NO_IMAGE_DATA", "No image data");
                            }
                        } else {
                            mPickerPromise.reject("E_NO_IMAGE_DATA", "No image data");
                        }
                    }
                    mPickerPromise = null;
                }
            }
        }
    };

    public ImagePickerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        reactContext.addActivityEventListener(mActivityEventListener);
    }

    @Override
    public String getName() {
        return "ImagePickerModule";
    }

    @ReactMethod
    public void pickImage(Promise promise) {
        Activity currentActivity = getCurrentActivity();

        if (currentActivity == null) {
            promise.reject("E_ACTIVITY_DOES_NOT_EXIST", "Activity doesn't exist");
            return;
        }

        mPickerPromise = promise;

        try {
            Intent intent = new Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
            intent.setType("image/*");
            currentActivity.startActivityForResult(intent, PICK_IMAGE_REQUEST);
        } catch (Exception e) {
            mPickerPromise.reject("E_FAILED_TO_SHOW_PICKER", e);
            mPickerPromise = null;
        }
    }
}