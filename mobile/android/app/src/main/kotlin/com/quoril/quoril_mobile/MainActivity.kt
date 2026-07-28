package com.quoril.quoril_mobile

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.android.RenderMode

class MainActivity : FlutterActivity() {
    // Render into a TextureView instead of the default SurfaceView. On many
    // Android emulators the SurfaceView overlay composites as a black screen
    // (and `adb screencap` can't read it). TextureView lives in the normal view
    // hierarchy, so it paints correctly and is capturable.
    override fun getRenderMode(): RenderMode = RenderMode.texture
}
