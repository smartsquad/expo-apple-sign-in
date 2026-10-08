# expo-modules-core loads Modules 2.0 modules by reflection and their runtime reaches Java classes from native code by name, so R8 must keep them.
-keep class expo.modules.applesignin.** { *; }
-keep class io.github.expo.modules.v2.** { *; }
-keep class io.github.expo.kolibri.** { *; }
