package com.myspace.app.ui.screen

import android.Manifest
import android.util.Size
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size as ComposeSize
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

@OptIn(ExperimentalPermissionsApi::class, ExperimentalMaterial3Api::class)
@Composable
fun QrScannerScreen(
    onResult: (String) -> Unit,
    onBack: () -> Unit
) {
    val cameraPermission = rememberPermissionState(Manifest.permission.CAMERA)
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    LaunchedEffect(Unit) {
        if (!cameraPermission.status.isGranted) {
            cameraPermission.launchPermissionRequest()
        }
    }

    var statusText by remember { mutableStateOf("Point camera at a QR code") }
    var scanned    by remember { mutableStateOf(false) }
    val cameraExecutor: ExecutorService = remember { Executors.newSingleThreadExecutor() }

    DisposableEffect(Unit) {
        onDispose { cameraExecutor.shutdown() }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        if (cameraPermission.status.isGranted) {
            // Camera preview
            AndroidView(
                factory = { ctx ->
                    val previewView = PreviewView(ctx)
                    val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                    cameraProviderFuture.addListener({
                        val cameraProvider = cameraProviderFuture.get()

                        val preview = Preview.Builder().build().also {
                            it.setSurfaceProvider(previewView.surfaceProvider)
                        }

                        val imageAnalysis = ImageAnalysis.Builder()
                            .setTargetResolution(Size(1280, 720))
                            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                            .build()

                        imageAnalysis.setAnalyzer(cameraExecutor) { proxy ->
                            if (!scanned) {
                                val mediaImage = proxy.image
                                if (mediaImage != null) {
                                    val image = InputImage.fromMediaImage(
                                        mediaImage, proxy.imageInfo.rotationDegrees
                                    )
                                    BarcodeScanning.getClient()
                                        .process(image)
                                        .addOnSuccessListener { barcodes ->
                                            barcodes.firstOrNull { it.valueType == Barcode.TYPE_URL || it.rawValue != null }
                                                ?.rawValue?.let { url ->
                                                    if (!scanned) {
                                                        scanned = true
                                                        onResult(url)
                                                    }
                                                }
                                        }
                                        .addOnCompleteListener { proxy.close() }
                                } else {
                                    proxy.close()
                                }
                            } else {
                                proxy.close()
                            }
                        }

                        try {
                            cameraProvider.unbindAll()
                            cameraProvider.bindToLifecycle(
                                lifecycleOwner,
                                CameraSelector.DEFAULT_BACK_CAMERA,
                                preview,
                                imageAnalysis
                            )
                        } catch (_: Exception) {}
                    }, ContextCompat.getMainExecutor(ctx))
                    previewView
                },
                modifier = Modifier.fillMaxSize()
            )

            // Scan reticle overlay
            Canvas(modifier = Modifier.fillMaxSize()) {
                val reticleSize = size.width * 0.65f
                val left  = (size.width - reticleSize) / 2
                val top   = (size.height - reticleSize) / 2
                val armLen = reticleSize * 0.15f
                val strokeWidth = 4.dp.toPx()
                val color  = Color(0xFF4AE4A1)

                // Semi-transparent overlay outside reticle
                drawRect(color = Color.Black.copy(alpha = 0.45f))
                drawRoundRect(
                    color = Color.Transparent,
                    topLeft = Offset(left, top),
                    size = ComposeSize(reticleSize, reticleSize),
                    cornerRadius = CornerRadius(16.dp.toPx()),
                )

                // Corner brackets
                // Top-left
                drawLine(color = color, start = Offset(left, top + armLen), end = Offset(left, top), strokeWidth = strokeWidth, cap = StrokeCap.Round)
                drawLine(color = color, start = Offset(left, top), end = Offset(left + armLen, top), strokeWidth = strokeWidth, cap = StrokeCap.Round)
                // Top-right
                drawLine(color = color, start = Offset(left + reticleSize - armLen, top), end = Offset(left + reticleSize, top), strokeWidth = strokeWidth, cap = StrokeCap.Round)
                drawLine(color = color, start = Offset(left + reticleSize, top), end = Offset(left + reticleSize, top + armLen), strokeWidth = strokeWidth, cap = StrokeCap.Round)
                // Bottom-left
                drawLine(color = color, start = Offset(left, top + reticleSize - armLen), end = Offset(left, top + reticleSize), strokeWidth = strokeWidth, cap = StrokeCap.Round)
                drawLine(color = color, start = Offset(left, top + reticleSize), end = Offset(left + armLen, top + reticleSize), strokeWidth = strokeWidth, cap = StrokeCap.Round)
                // Bottom-right
                drawLine(color = color, start = Offset(left + reticleSize - armLen, top + reticleSize), end = Offset(left + reticleSize, top + reticleSize), strokeWidth = strokeWidth, cap = StrokeCap.Round)
                drawLine(color = color, start = Offset(left + reticleSize, top + reticleSize), end = Offset(left + reticleSize, top + reticleSize - armLen), strokeWidth = strokeWidth, cap = StrokeCap.Round)
            }
        } else {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text("Camera permission required", color = Color.White)
                    Button(onClick = { cameraPermission.launchPermissionRequest() }) {
                        Text("Grant permission")
                    }
                }
            }
        }

        // Top bar
        Row(
            modifier = Modifier.fillMaxWidth().statusBarsPadding().padding(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
            }
            Text("Scan QR Code", color = Color.White, style = MaterialTheme.typography.titleMedium)
        }

        // Status text at bottom
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(bottom = 48.dp)
        ) {
            Surface(
                shape = MaterialTheme.shapes.medium,
                color = Color.Black.copy(alpha = 0.6f)
            ) {
                Text(
                    statusText,
                    color = Color.White,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp)
                )
            }
        }
    }
}
