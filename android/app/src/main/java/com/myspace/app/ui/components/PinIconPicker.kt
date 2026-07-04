package com.myspace.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.Canvas

val PIN_ICON_IDS = listOf("pin", "hotel", "cafe", "restaurant", "attraction", "shopping", "transport", "hospital")

@Composable
fun PinIconPicker(selected: String, onSelect: (String) -> Unit, accentColor: Color) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        PIN_ICON_IDS.forEach { id ->
            val isSelected = id == selected
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(accentColor.copy(alpha = if (isSelected) 0.25f else 0.08f))
                    .then(
                        if (isSelected) Modifier.border(1.5.dp, accentColor.copy(alpha = 0.8f), RoundedCornerShape(8.dp))
                        else Modifier
                    )
                    .clickable { onSelect(id) },
                contentAlignment = Alignment.Center,
            ) {
                PinIconCanvas(id = id, color = accentColor, size = 20.dp)
            }
        }
    }
}

@Composable
fun PinIconCanvas(id: String, color: Color, size: Dp) {
    Canvas(modifier = Modifier.size(size)) {
        when (id) {
            "pin" -> drawPin(color)
            "hotel" -> drawHotel(color)
            "cafe" -> drawCafe(color)
            "restaurant" -> drawRestaurant(color)
            "attraction" -> drawAttraction(color)
            "shopping" -> drawShopping(color)
            "transport" -> drawTransport(color)
            "hospital" -> drawHospital(color)
            else -> drawPin(color)
        }
    }
}

private fun DrawScope.drawPin(color: Color) {
    val r = size.width * 0.35f
    drawCircle(color = color.copy(alpha = 0.25f), radius = r, center = center.copy(y = size.height * 0.38f))
    drawCircle(color = color, radius = r, center = center.copy(y = size.height * 0.38f), style = Stroke(size.width * 0.1f))
    drawLine(color, start = center.copy(y = size.height * 0.73f), end = center.copy(y = size.height * 0.95f), strokeWidth = size.width * 0.12f)
}

private fun DrawScope.drawHotel(color: Color) {
    val w = size.width; val h = size.height
    drawRect(color = color.copy(alpha = 0.25f), topLeft = androidx.compose.ui.geometry.Offset(w * 0.1f, h * 0.2f), size = androidx.compose.ui.geometry.Size(w * 0.8f, h * 0.65f))
    drawRect(color = color, topLeft = androidx.compose.ui.geometry.Offset(w * 0.1f, h * 0.2f), size = androidx.compose.ui.geometry.Size(w * 0.8f, h * 0.65f), style = Stroke(w * 0.09f))
    drawRect(color = color, topLeft = androidx.compose.ui.geometry.Offset(w * 0.38f, h * 0.6f), size = androidx.compose.ui.geometry.Size(w * 0.24f, h * 0.25f))
}

private fun DrawScope.drawCafe(color: Color) {
    val w = size.width; val h = size.height
    drawOval(color = color.copy(alpha = 0.25f), topLeft = androidx.compose.ui.geometry.Offset(w * 0.15f, h * 0.3f), size = androidx.compose.ui.geometry.Size(w * 0.55f, h * 0.5f))
    drawOval(color = color, topLeft = androidx.compose.ui.geometry.Offset(w * 0.15f, h * 0.3f), size = androidx.compose.ui.geometry.Size(w * 0.55f, h * 0.5f), style = Stroke(w * 0.09f))
    drawLine(color, start = androidx.compose.ui.geometry.Offset(w * 0.7f, h * 0.35f), end = androidx.compose.ui.geometry.Offset(w * 0.85f, h * 0.35f), strokeWidth = w * 0.09f)
    drawLine(color, start = androidx.compose.ui.geometry.Offset(w * 0.72f, h * 0.55f), end = androidx.compose.ui.geometry.Offset(w * 0.83f, h * 0.55f), strokeWidth = w * 0.09f)
}

private fun DrawScope.drawRestaurant(color: Color) {
    val w = size.width; val h = size.height
    drawLine(color, start = androidx.compose.ui.geometry.Offset(w * 0.3f, h * 0.1f), end = androidx.compose.ui.geometry.Offset(w * 0.3f, h * 0.9f), strokeWidth = w * 0.1f)
    drawLine(color, start = androidx.compose.ui.geometry.Offset(w * 0.7f, h * 0.1f), end = androidx.compose.ui.geometry.Offset(w * 0.7f, h * 0.5f), strokeWidth = w * 0.1f)
    drawOval(color = color, topLeft = androidx.compose.ui.geometry.Offset(w * 0.5f, h * 0.1f), size = androidx.compose.ui.geometry.Size(w * 0.4f, h * 0.35f), style = Stroke(w * 0.09f))
}

private fun DrawScope.drawAttraction(color: Color) {
    val w = size.width; val h = size.height
    drawCircle(color = color.copy(alpha = 0.2f), radius = w * 0.42f)
    drawCircle(color = color, radius = w * 0.42f, style = Stroke(w * 0.09f))
    drawLine(color, start = androidx.compose.ui.geometry.Offset(w * 0.5f, h * 0.08f), end = androidx.compose.ui.geometry.Offset(w * 0.5f, h * 0.92f), strokeWidth = w * 0.08f)
    drawLine(color, start = androidx.compose.ui.geometry.Offset(w * 0.08f, h * 0.5f), end = androidx.compose.ui.geometry.Offset(w * 0.92f, h * 0.5f), strokeWidth = w * 0.08f)
}

private fun DrawScope.drawShopping(color: Color) {
    val w = size.width; val h = size.height
    drawRect(color = color.copy(alpha = 0.25f), topLeft = androidx.compose.ui.geometry.Offset(w * 0.1f, h * 0.35f), size = androidx.compose.ui.geometry.Size(w * 0.8f, h * 0.55f))
    drawRect(color = color, topLeft = androidx.compose.ui.geometry.Offset(w * 0.1f, h * 0.35f), size = androidx.compose.ui.geometry.Size(w * 0.8f, h * 0.55f), style = Stroke(w * 0.09f))
    drawArc(color = color, startAngle = 200f, sweepAngle = 140f, useCenter = false,
        topLeft = androidx.compose.ui.geometry.Offset(w * 0.28f, h * 0.08f),
        size = androidx.compose.ui.geometry.Size(w * 0.44f, h * 0.44f),
        style = Stroke(w * 0.1f))
}

private fun DrawScope.drawTransport(color: Color) {
    val w = size.width; val h = size.height
    drawRoundRect(color = color.copy(alpha = 0.2f), topLeft = androidx.compose.ui.geometry.Offset(w * 0.1f, h * 0.15f), size = androidx.compose.ui.geometry.Size(w * 0.8f, h * 0.6f), cornerRadius = androidx.compose.ui.geometry.CornerRadius(w * 0.15f))
    drawRoundRect(color = color, topLeft = androidx.compose.ui.geometry.Offset(w * 0.1f, h * 0.15f), size = androidx.compose.ui.geometry.Size(w * 0.8f, h * 0.6f), cornerRadius = androidx.compose.ui.geometry.CornerRadius(w * 0.15f), style = Stroke(w * 0.09f))
    drawCircle(color = color, radius = w * 0.1f, center = androidx.compose.ui.geometry.Offset(w * 0.28f, h * 0.82f))
    drawCircle(color = color, radius = w * 0.1f, center = androidx.compose.ui.geometry.Offset(w * 0.72f, h * 0.82f))
}

private fun DrawScope.drawHospital(color: Color) {
    val w = size.width; val h = size.height
    drawLine(color, start = androidx.compose.ui.geometry.Offset(w * 0.5f, h * 0.15f), end = androidx.compose.ui.geometry.Offset(w * 0.5f, h * 0.85f), strokeWidth = w * 0.22f)
    drawLine(color, start = androidx.compose.ui.geometry.Offset(w * 0.15f, h * 0.5f), end = androidx.compose.ui.geometry.Offset(w * 0.85f, h * 0.5f), strokeWidth = w * 0.22f)
    drawLine(color.copy(alpha = 0f), start = androidx.compose.ui.geometry.Offset(w * 0.5f, h * 0.15f), end = androidx.compose.ui.geometry.Offset(w * 0.5f, h * 0.85f), strokeWidth = w * 0.22f)
}
