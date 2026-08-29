-keep class com.myspace.app.** { *; }
-keepattributes *Annotation*
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
# Room
-keep class * extends androidx.room.RoomDatabase
-dontwarn androidx.room.**
# Hilt
-dontwarn dagger.hilt.**
