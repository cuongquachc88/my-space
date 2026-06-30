package com.myspace.app.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.myspace.app.ui.theme.AccentVault
import com.myspace.app.ui.theme.BgDeep
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(onFinished: () -> Unit) {
    var visible by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        visible = true
        delay(2200)
        onFinished()
    }

    // ── Entry animations ───────────────────────────────────────────────────
    val shieldScale by animateFloatAsState(
        targetValue = if (visible) 1f else 0.6f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMediumLow,
        ),
        label = "shield_scale",
    )
    val shieldAlpha by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = tween(durationMillis = 600, easing = FastOutSlowInEasing),
        label = "shield_alpha",
    )
    val textAlpha by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = tween(durationMillis = 500, delayMillis = 250, easing = FastOutSlowInEasing),
        label = "text_alpha",
    )

    // ── Glow breathe (infinite) ────────────────────────────────────────────
    val breathe = rememberInfiniteTransition(label = "breathe")
    val glowRadius by breathe.animateFloat(
        initialValue = 0.80f,
        targetValue = 1.25f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "glow_radius",
    )
    val glowAlpha by breathe.animateFloat(
        initialValue = 0.30f,
        targetValue = 0.55f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "glow_alpha",
    )

    // ── Pulse rings (3 rings staggered, infinite) ──────────────────────────
    val pulse = rememberInfiniteTransition(label = "pulse")
    val ring1 by pulse.animateFloat(
        initialValue = 0f, targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1600, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
            initialStartOffset = StartOffset(0),
        ),
        label = "ring1",
    )
    val ring2 by pulse.animateFloat(
        initialValue = 0f, targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1600, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
            initialStartOffset = StartOffset(500),
        ),
        label = "ring2",
    )
    val ring3 by pulse.animateFloat(
        initialValue = 0f, targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1600, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
            initialStartOffset = StartOffset(1000),
        ),
        label = "ring3",
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BgDeep),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(0.dp),
        ) {
            // Shield with glow + pulse rings
            Box(
                modifier = Modifier
                    .size(200.dp)
                    .scale(shieldScale)
                    .graphicsLayer { alpha = shieldAlpha }
                    .drawWithContent {
                        val cx = size.width / 2f
                        val cy = size.height / 2f
                        val baseRadius = size.width * 0.42f

                        // Glow breathe layer
                        drawCircle(
                            brush = Brush.radialGradient(
                                colors = listOf(
                                    AccentVault.copy(alpha = glowAlpha),
                                    AccentVault.copy(alpha = glowAlpha * 0.4f),
                                    Color.Transparent,
                                ),
                                center = Offset(cx, cy),
                                radius = baseRadius * glowRadius * 2.2f,
                            ),
                        )

                        // Pulse ring layers
                        listOf(ring1, ring2, ring3).forEach { t ->
                            val ringRadius = baseRadius * (1f + t * 1.4f)
                            val ringAlpha = (1f - t) * 0.45f
                            drawCircle(
                                color = AccentVault.copy(alpha = ringAlpha),
                                radius = ringRadius,
                                center = Offset(cx, cy),
                                style = Stroke(width = (4f * (1f - t)).coerceAtLeast(0.5f)),
                            )
                        }

                        // Shield icon at center (60% of box size)
                        drawContent()
                    }
                    .drawBehind {
                        drawSplashShield(this)
                    },
                contentAlignment = Alignment.Center,
            ) { }

            Spacer(Modifier.height(36.dp))

            // Stacked wordmark
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.graphicsLayer { alpha = textAlpha },
            ) {
                Text(
                    text = "My",
                    fontSize = 52.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    letterSpacing = (-1).sp,
                    lineHeight = 52.sp,
                )
                Text(
                    text = "SPACE",
                    fontSize = 52.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    letterSpacing = (-1).sp,
                    lineHeight = 52.sp,
                )
                Spacer(Modifier.height(10.dp))
                Text(
                    text = "Private vault",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Normal,
                    color = Color(0x99FFFFFF),
                    letterSpacing = 0.3.sp,
                )
            }
        }
    }
}

private fun drawSplashShield(scope: DrawScope) {
    val w = scope.size.width
    val h = scope.size.height
    val paint = Paint().apply { isAntiAlias = true }
    scope.drawContext.canvas.apply {
        val path = Path().apply {
            moveTo(w * 0.5f, 0f)
            lineTo(w, h * 0.18f)
            lineTo(w, h * 0.55f)
            cubicTo(w, h * 0.82f, w * 0.75f, h * 0.93f, w * 0.5f, h)
            cubicTo(w * 0.25f, h * 0.93f, 0f, h * 0.82f, 0f, h * 0.55f)
            lineTo(0f, h * 0.18f)
            close()
        }
        paint.style = PaintingStyle.Fill
        paint.color = Color(0xFFF59E0B).copy(alpha = 0.85f)
        drawPath(path, paint)
        paint.style = PaintingStyle.Stroke
        paint.strokeWidth = w * 0.05f
        paint.color = Color(0xFFFBBF24).copy(alpha = 0.6f)
        drawPath(path, paint)

        val lx = w * 0.32f; val ly = h * 0.46f
        val lw = w * 0.36f; val lh = h * 0.28f
        paint.style = PaintingStyle.Fill
        paint.color = Color(0xFF1A1200).copy(alpha = 0.55f)
        drawPath(Path().apply {
            addRoundRect(RoundRect(lx, ly, lx + lw, ly + lh, CornerRadius(w * 0.06f)))
        }, paint)

        paint.style = PaintingStyle.Stroke
        paint.strokeWidth = w * 0.07f
        paint.color = Color(0xFF1A1200).copy(alpha = 0.65f)
        drawPath(Path().apply {
            moveTo(lx + lw * 0.25f, ly)
            lineTo(lx + lw * 0.25f, ly - lh * 0.40f)
            cubicTo(lx + lw * 0.25f, ly - lh * 0.70f, lx + lw * 0.75f, ly - lh * 0.70f, lx + lw * 0.75f, ly - lh * 0.40f)
            lineTo(lx + lw * 0.75f, ly)
        }, paint)

        paint.style = PaintingStyle.Fill
        paint.color = Color(0xFFF59E0B).copy(alpha = 0.9f)
        drawCircle(
            center = Offset(lx + lw * 0.5f, ly + lh * 0.38f),
            radius = lw * 0.14f,
            paint = paint,
        )
        drawPath(Path().apply {
            val kx = lx + lw * 0.5f
            val ky = ly + lh * 0.48f
            moveTo(kx - lw * 0.08f, ky)
            lineTo(kx + lw * 0.08f, ky)
            lineTo(kx + lw * 0.05f, ky + lh * 0.30f)
            lineTo(kx - lw * 0.05f, ky + lh * 0.30f)
            close()
        }, paint)
    }
}
