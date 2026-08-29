package com.myspace.app.ui.screen

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.myspace.app.ui.viewmodel.ReportsViewModel
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportsScreen(
    onBack: () -> Unit,
    vm: ReportsViewModel = hiltViewModel()
) {
    val now  = remember { Calendar.getInstance() }
    val year = remember { now.get(Calendar.YEAR) }
    val month = remember { now.get(Calendar.MONTH) + 1 }

    var monthData by remember { mutableStateOf(listOf<Pair<String, Double>>()) }

    LaunchedEffect(Unit) {
        vm.last6MonthsTotals(year, month).collect { data ->
            monthData = data
        }
    }

    val maxVal = monthData.maxOfOrNull { it.second }?.coerceAtLeast(1.0) ?: 1.0

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Spending Reports") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = "Back") }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background)
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Text("Last 6 Months", style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface)
            }

            item {
                if (monthData.isNotEmpty()) {
                    BarChart(data = monthData, maxVal = maxVal)
                } else {
                    Box(Modifier.fillMaxWidth().height(180.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                }
            }

            item { HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant) }

            items(monthData.reversed()) { (label, amount) ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(label, style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface)
                    Text(
                        "$${"%.2f".format(amount)}",
                        style = MaterialTheme.typography.titleSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
    }
}

@Composable
private fun BarChart(data: List<Pair<String, Double>>, maxVal: Double) {
    val barColor   = MaterialTheme.colorScheme.primary
    val labelColor = MaterialTheme.colorScheme.onSurfaceVariant
    val gridColor  = MaterialTheme.colorScheme.outlineVariant

    Canvas(
        modifier = Modifier
            .fillMaxWidth()
            .height(200.dp)
    ) {
        val chartWidth  = size.width
        val chartHeight = size.height
        val barCount    = data.size
        if (barCount == 0) return@Canvas

        val barWidth  = (chartWidth / barCount) * 0.6f
        val barSpacing = chartWidth / barCount
        val bottomPad = 36f
        val topPad    = 16f
        val usableH   = chartHeight - bottomPad - topPad

        // Grid line at max
        drawLine(
            color = gridColor,
            start = Offset(0f, topPad),
            end   = Offset(chartWidth, topPad),
            strokeWidth = 1f
        )

        data.forEachIndexed { i, (label, value) ->
            val barH    = ((value / maxVal) * usableH).toFloat().coerceAtLeast(2f)
            val left    = barSpacing * i + (barSpacing - barWidth) / 2
            val top     = chartHeight - bottomPad - barH

            drawRect(
                color   = barColor,
                topLeft = Offset(left, top),
                size    = Size(barWidth, barH),
                alpha   = 0.85f
            )

            // Label below
            drawIntoCanvas { canvas ->
                val paint = android.graphics.Paint().apply {
                    color     = labelColor.copy(alpha = 0.8f).toArgb()
                    textSize  = 24f
                    textAlign = android.graphics.Paint.Align.CENTER
                }
                canvas.nativeCanvas.drawText(
                    label.take(6),
                    left + barWidth / 2,
                    chartHeight - 6f,
                    paint
                )
            }
        }
    }
}
