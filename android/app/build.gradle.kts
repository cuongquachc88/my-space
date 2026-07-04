import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    kotlin("kapt")
}

android {
    namespace = "com.myspace.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.myspace.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 4
        versionName = "0.3.2"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        val keystoreProps = Properties()
        val propsFile = rootProject.file("keystore.properties")
        if (propsFile.exists()) keystoreProps.load(propsFile.inputStream())

        create("release") {
            keyAlias     = keystoreProps.getProperty("keyAlias")     ?: ""
            keyPassword  = keystoreProps.getProperty("keyPassword")  ?: ""
            storeFile    = keystoreProps.getProperty("storeFile")?.let { path -> file(path) }
            storePassword = keystoreProps.getProperty("storePassword") ?: ""
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("release")
        }
    }
    compileOptions {
        isCoreLibraryDesugaringEnabled = true
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { compose = true; buildConfig = true }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material.icons)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    kapt(libs.androidx.room.compiler)
    implementation(libs.androidx.security.crypto)
    implementation(libs.androidx.datastore)
    implementation(libs.androidx.credentials)
    implementation(libs.googleid)
    implementation(libs.retrofit)
    implementation(libs.retrofit.gson)
    implementation(libs.okhttp.logging)
    implementation(libs.gson)
    debugImplementation(libs.androidx.ui.tooling.preview)
    coreLibraryDesugaring(libs.desugar.jdk.libs)
    implementation(libs.coil.compose)
    implementation(libs.androidx.splashscreen)
    implementation("androidx.biometric:biometric:1.2.0-alpha05")
    testImplementation(libs.junit)
    testImplementation(libs.androidx.room.testing)
    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(libs.androidx.test.runner)
    androidTestImplementation(libs.androidx.test.rules)
}
