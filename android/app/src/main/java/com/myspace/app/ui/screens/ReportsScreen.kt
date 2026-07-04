package com.myspace.app.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.myspace.app.data.AppDatabase
import com.myspace.app.data.BillEntity
import com.myspace.app.data.SubscriptionEntity
import com.myspace.app.ui.theme.*
import com.myspace.app.util.fromUSD
import com.myspace.app.util.toUSD
import com.myspace.app.util.expectedMonthlyUSD
import com.myspace.app.util.subActiveInMonth
import kotlinx.coroutines.launch
import java.time.YearMonth
import java.time.format.TextStyle
import java.util.Locale

private val CURRENCIES_R = listOf("USD", "EUR", "GBP", "VND", "JPY", "SGD")

// ── Data classes ─────────────────────────────────────────────────────────────

data class MonthPoint(val ym: YearMonth, val expectedUSD: Double, val actualUSD: Double)
data class SubMonthSummary(val sub: SubscriptionEntity, val bill: BillEntity?, val expectedUSD: Double)

// ── Main screen ──────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportsScreen(db: AppDatabase, onBack: (() -> Unit)? = null) {
    val scope = rememberCoroutineScope()
    var displayCurrency by remember { mutableStateOf("USD") }
    var selectedYM by remember { mutableStateOf(YearMonth.now()) }
    var subs by remember { mutableStateOf<List<SubscriptionEntity>>(emptyList()) }
    var bills by remember { mutableStateOf<List<BillEntity>>(emptyList()) }
    var chartPoints by remember { mutableStateOf<List<MonthPoint>>(emptyList()) }
    var expandedSubId by remember { mutableStateOf<String?>(null) }
    var editBill by remember { mutableStateOf<Pair<SubscriptionEntity, BillEntity?>?>(null) }

    fun reload() {
        scope.launch {
            subs = db.subscriptionDao().getAll()
            bills = db.billDao().getAll()

            // Build 6-month chart (oldest → newest)
            val now = YearMonth.now()
            chartPoints = (5 downTo 0).map { offset ->
                val ym = now.minusMonths(offset.toLong())
                val monthBills = bills.filter { it.year == ym.year && it.month == ym.monthValue }
                val expectedUSD = subs.filter { subActiveInMonth(it, ym) }.sumOf { expectedMonthlyUSD(it, ym) }
                val actualUSD = monthBills.sumOf { toUSD(it.amount, it.currency) }
                MonthPoint(ym, expectedUSD, actualUSD)
            }
        }
    }
    LaunchedEffect(Unit) { reload() }

    val subSummaries = remember(subs, bills, selectedYM) {
        subs.filter { subActiveInMonth(it, selectedYM) }.map { sub ->
            val bill = bills.find { it.subId == sub.id && it.year == selectedYM.year && it.month == selectedYM.monthValue }
            SubMonthSummary(sub, bill, expectedMonthlyUSD(sub, selectedYM))
        }
    }

    val totalExpectedUSD = subSummaries.sumOf { it.expectedUSD }
    val totalActualUSD   = subSummaries.sumOf { s ->
        s.bill?.let { toUSD(it.amount, it.currency) } ?: s.expectedUSD
    }
    val inactiveSubs = subs.filter { !it.active }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(top = 8.dp, bottom = 88.dp),
    ) {
        // ── Back button ─────────────────────────────────────────────────────
        if (onBack != null) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, "Back", tint = AccentReport)
                    }
                    Text("Reports & Bills", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                }
            }
        }

        // ── Header: month navigator + currency ──────────────────────────────
        item {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = { selectedYM = selectedYM.minusMonths(1) }) {
                    Icon(Icons.Default.ChevronLeft, null, tint = AccentReport)
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        selectedYM.month.getDisplayName(TextStyle.FULL, Locale.getDefault()),
                        fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White,
                    )
                    Text(
                        selectedYM.year.toString(),
                        fontSize = 12.sp, color = Color(0x66FFFFFF),
                    )
                }
                IconButton(
                    onClick = { selectedYM = selectedYM.plusMonths(1) },
                    enabled = selectedYM < YearMonth.now(),
                ) {
                    Icon(Icons.Default.ChevronRight, null, tint = if (selectedYM < YearMonth.now()) AccentReport else Color(0x33FFFFFF))
                }
            }
        }

        // ── Summary card ────────────────────────────────────────────────────
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = AccentReport.copy(alpha = 0.07f)),
                shape  = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        SummaryItem("Expected", fromUSD(totalExpectedUSD, displayCurrency), displayCurrency, AccentReport.copy(0.7f))
                        SummaryItem("Actual",   fromUSD(totalActualUSD,   displayCurrency), displayCurrency, AccentReport)
                    }
                    // Currency picker
                    var currExp by remember { mutableStateOf(false) }
                    ExposedDropdownMenuBox(expanded = currExp, onExpandedChange = { currExp = it }) {
                        OutlinedTextField(
                            value = displayCurrency, onValueChange = {},
                            readOnly = true,
                            modifier = Modifier.width(100.dp).menuAnchor(MenuAnchorType.PrimaryNotEditable),
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(currExp) },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = AccentReport,
                                unfocusedBorderColor = AccentReport.copy(0.3f),
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                            ),
                            textStyle = LocalTextStyle.current.copy(fontSize = 13.sp),
                            singleLine = true,
                        )
                        ExposedDropdownMenu(expanded = currExp, onDismissRequest = { currExp = false }) {
                            CURRENCIES_R.forEach { c ->
                                DropdownMenuItem(text = { Text(c) }, onClick = { displayCurrency = c; currExp = false })
                            }
                        }
                    }
                }
            }
        }

        // ── 6-month bar chart ───────────────────────────────────────────────
        item {
            ReportBarChart(
                points = chartPoints,
                displayCurrency = displayCurrency,
                selectedYM = selectedYM,
                onSelectMonth = { selectedYM = it },
            )
        }

        // ── Per-sub breakdown ───────────────────────────────────────────────
        if (subSummaries.isNotEmpty()) {
            item {
                Text(
                    "Subscriptions this month",
                    fontSize = 12.sp,
                    color = Color(0x66FFFFFF),
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
            items(subSummaries, key = { it.sub.id }) { summary ->
                SubReportCard(
                    summary = summary,
                    displayCurrency = displayCurrency,
                    expanded = expandedSubId == summary.sub.id,
                    onToggle = { expandedSubId = if (expandedSubId == summary.sub.id) null else summary.sub.id },
                    onAddBill = { editBill = summary.sub to summary.bill },
                    onDeleteBill = {
                        summary.bill?.let { b ->
                            scope.launch { db.billDao().delete(b.subId, b.year, b.month); reload() }
                        }
                    },
                )
            }
        } else {
            item {
                Box(Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) {
                    Text("No active subscriptions this month", fontSize = 14.sp, color = Color(0x44FFFFFF))
                }
            }
        }

        // ── Inactive subscriptions ──────────────────────────────────────────
        if (inactiveSubs.isNotEmpty()) {
            item {
                Text(
                    "Inactive (${inactiveSubs.size})",
                    fontSize = 12.sp,
                    color = Color(0x44FFFFFF),
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
            items(inactiveSubs, key = { "inactive_${it.id}" }) { sub ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = BgSurface.copy(alpha = 0.5f)),
                    shape  = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(
                        Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            Modifier.size(8.dp).clip(RoundedCornerShape(50)).background(Color(0x44FFFFFF))
                        )
                        Spacer(Modifier.width(10.dp))
                        Text(sub.name, fontSize = 14.sp, color = Color(0x55FFFFFF), modifier = Modifier.weight(1f))
                        Text(
                            "${sub.amount} ${sub.currency}/${sub.cycle.take(2)}",
                            fontSize = 12.sp,
                            color = Color(0x33FFFFFF),
                        )
                    }
                }
            }
        }
    }

    // Bill editor sheet
    editBill?.let { (sub, existing) ->
        BillEditorSheet(
            sub      = sub,
            existing = existing,
            ym       = selectedYM,
            onSave   = { bill ->
                scope.launch { db.billDao().upsert(bill); editBill = null; reload() }
            },
            onDismiss = { editBill = null },
        )
    }
}

// ── Summary item ─────────────────────────────────────────────────────────────

@Composable
private fun SummaryItem(label: String, amount: Double, currency: String, color: Color) {
    Column {
        Text(label, fontSize = 11.sp, color = Color(0x66FFFFFF))
        Text(
            "~${"%.2f".format(amount)} $currency",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = color,
        )
    }
}

// ── Bar chart ─────────────────────────────────────────────────────────────────

@Composable
private fun ReportBarChart(
    points: List<MonthPoint>,
    displayCurrency: String,
    selectedYM: YearMonth,
    onSelectMonth: (YearMonth) -> Unit,
) {
    Card(
        colors   = CardDefaults.cardColors(containerColor = BgSurface),
        shape    = RoundedCornerShape(16.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(horizontal = 16.dp, vertical = 14.dp)) {
            Text("6-month spending", fontSize = 12.sp, color = Color(0x66FFFFFF))
            Spacer(Modifier.height(12.dp))

            if (points.isEmpty()) {
                Box(Modifier.fillMaxWidth().height(110.dp), contentAlignment = Alignment.Center) {
                    Text("No data yet", fontSize = 12.sp, color = Color(0x33FFFFFF))
                }
            } else {
                val maxUSD = points.maxOf { maxOf(it.expectedUSD, it.actualUSD) }.takeIf { it > 0 } ?: 1.0
                val expectedColor = AccentReport.copy(alpha = 0.25f)
                val actualColor   = AccentReport

                Canvas(
                    modifier = Modifier.fillMaxWidth().height(120.dp).clickable(indication = null, interactionSource = null) {},
                ) {
                    val totalW  = size.width
                    val totalH  = size.height
                    val barH    = totalH - 28.dp.toPx()
                    val count   = points.size
                    val slotW   = totalW / count
                    val bW      = slotW * 0.28f  // each sub-bar width

                    points.forEachIndexed { i, pt ->
                        val cx    = slotW * i + slotW / 2f
                        val isSelected = pt.ym == selectedYM

                        // Expected bar (left, dimmer)
                        val expH = (pt.expectedUSD / maxUSD * barH).toFloat().coerceAtLeast(0f)
                        drawRoundRect(
                            color       = if (isSelected) expectedColor.copy(alpha = 0.5f) else expectedColor,
                            topLeft     = Offset(cx - bW - 2.dp.toPx(), totalH - expH - 20.dp.toPx()),
                            size        = Size(bW, expH),
                            cornerRadius = CornerRadius(4.dp.toPx()),
                        )

                        // Actual bar (right, bright)
                        val actH = (pt.actualUSD / maxUSD * barH).toFloat().coerceAtLeast(0f)
                        drawRoundRect(
                            color       = if (isSelected) actualColor else actualColor.copy(alpha = 0.4f),
                            topLeft     = Offset(cx + 2.dp.toPx(), totalH - actH - 20.dp.toPx()),
                            size        = Size(bW, actH),
                            cornerRadius = CornerRadius(4.dp.toPx()),
                        )

                        // Selected indicator dot
                        if (isSelected) {
                            drawCircle(
                                color  = AccentReport,
                                radius = 3.dp.toPx(),
                                center = Offset(cx, totalH - 8.dp.toPx()),
                            )
                        }

                        // Month label
                        drawIntoCanvas { canvas ->
                            val paint = android.graphics.Paint().apply {
                                color = if (isSelected)
                                    android.graphics.Color.argb(230, 244, 114, 182)
                                else
                                    android.graphics.Color.argb(100, 255, 255, 255)
                                textSize = 22f
                                textAlign = android.graphics.Paint.Align.CENTER
                                isAntiAlias = true
                                if (isSelected) isFakeBoldText = true
                            }
                            val label = pt.ym.month.getDisplayName(TextStyle.SHORT, Locale.getDefault())
                            canvas.nativeCanvas.drawText(label, cx, totalH - 14.dp.toPx(), paint)
                        }

                        // Tap zone per month (invisible, handled by parent clickable per item)
                        // We draw actual amount above selected bar
                        if (isSelected && pt.actualUSD > 0) {
                            val display = fromUSD(pt.actualUSD, displayCurrency)
                            drawIntoCanvas { canvas ->
                                val paint = android.graphics.Paint().apply {
                                    color = android.graphics.Color.argb(210, 244, 114, 182)
                                    textSize = 20f
                                    textAlign = android.graphics.Paint.Align.CENTER
                                    isAntiAlias = true
                                }
                                val top = totalH - actH - 20.dp.toPx()
                                canvas.nativeCanvas.drawText(
                                    if (display < 1000) "%.0f".format(display) else "${"%.1f".format(display / 1000)}k",
                                    cx + bW / 2f + 2.dp.toPx(), top - 4f, paint,
                                )
                            }
                        }
                    }
                }

                // Month tap row
                Row(Modifier.fillMaxWidth()) {
                    points.forEach { pt ->
                        Box(
                            Modifier.weight(1f).height(24.dp).clickable { onSelectMonth(pt.ym) }
                        )
                    }
                }

                // Legend
                Spacer(Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    LegendDot(AccentReport.copy(alpha = 0.35f), "Expected")
                    LegendDot(AccentReport, "Actual")
                }
            }
        }
    }
}

@Composable
private fun LegendDot(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Box(Modifier.size(8.dp).clip(RoundedCornerShape(2.dp)).background(color))
        Text(label, fontSize = 10.sp, color = Color(0x66FFFFFF))
    }
}

// ── Per-sub row ───────────────────────────────────────────────────────────────

@Composable
private fun SubReportCard(
    summary: SubMonthSummary,
    displayCurrency: String,
    expanded: Boolean,
    onToggle: () -> Unit,
    onAddBill: () -> Unit,
    onDeleteBill: () -> Unit,
) {
    val sub      = summary.sub
    val bill     = summary.bill
    val expAmt   = fromUSD(summary.expectedUSD, displayCurrency)
    val actUSD   = bill?.let { toUSD(it.amount, it.currency) } ?: summary.expectedUSD
    val actAmt   = fromUSD(actUSD, displayCurrency)
    val diff     = actAmt - expAmt
    val hasBill  = bill != null

    Card(
        colors   = CardDefaults.cardColors(containerColor = BgSurface),
        shape    = RoundedCornerShape(14.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(horizontal = 14.dp, vertical = 12.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.clickable(onClick = onToggle),
            ) {
                // Active indicator
                Box(
                    Modifier
                        .size(8.dp)
                        .clip(RoundedCornerShape(50))
                        .background(AccentSubs),
                )
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(sub.name, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                    Text(
                        "${sub.amount} ${sub.currency}/${sub.cycle.take(2)}",
                        fontSize = 11.sp, color = Color(0x66FFFFFF),
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        "~${"%.2f".format(actAmt)} $displayCurrency",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (hasBill) AccentReport else AccentSubs,
                    )
                    if (hasBill && kotlin.math.abs(diff) > 0.01) {
                        Text(
                            "${if (diff > 0) "+" else ""}${"%.2f".format(diff)}",
                            fontSize = 10.sp,
                            color = if (diff > 0) Color(0xFFFC8181) else Color(0xFF34D399),
                        )
                    }
                }
                Icon(
                    if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    null,
                    tint = Color(0x44FFFFFF),
                    modifier = Modifier.size(20.dp).padding(start = 4.dp),
                )
            }

            if (expanded) {
                Spacer(Modifier.height(10.dp))
                HorizontalDivider(color = Color(0x15FFFFFF))
                Spacer(Modifier.height(10.dp))

                if (hasBill) {
                    // Show recorded bill
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text("Recorded bill", fontSize = 11.sp, color = Color(0x66FFFFFF))
                            Text(
                                "${bill!!.amount} ${bill.currency}",
                                fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = AccentReport,
                            )
                            if (bill.notes.isNotBlank()) {
                                Text(bill.notes, fontSize = 11.sp, color = Color(0x55FFFFFF))
                            }
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(
                                onClick = onAddBill,
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = AccentReport),
                                border = ButtonDefaults.outlinedButtonBorder.copy(width = 1.dp),
                            ) { Text("Edit", fontSize = 11.sp) }
                            IconButton(onClick = onDeleteBill, modifier = Modifier.size(32.dp)) {
                                Icon(Icons.Default.Delete, null, tint = Color(0x55FFFFFF), modifier = Modifier.size(16.dp))
                            }
                        }
                    }
                } else {
                    // No bill yet — show expected + add button
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text("No bill recorded", fontSize = 11.sp, color = Color(0x44FFFFFF))
                            Text(
                                "Expected: ~${"%.2f".format(expAmt)} $displayCurrency",
                                fontSize = 12.sp, color = Color(0x66FFFFFF),
                            )
                        }
                        Button(
                            onClick = onAddBill,
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = AccentReport.copy(alpha = 0.15f), contentColor = AccentReport),
                        ) {
                            Icon(Icons.Default.Add, null, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Add bill", fontSize = 11.sp)
                        }
                    }
                }
            }
        }
    }
}

// ── Bill editor bottom sheet ──────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BillEditorSheet(
    sub: SubscriptionEntity,
    existing: BillEntity?,
    ym: YearMonth,
    onSave: (BillEntity) -> Unit,
    onDismiss: () -> Unit,
) {
    var amount  by remember { mutableStateOf(existing?.amount?.toString() ?: sub.amount.toString()) }
    var currency by remember { mutableStateOf(existing?.currency ?: sub.currency) }
    var notes   by remember { mutableStateOf(existing?.notes ?: "") }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState       = rememberModalBottomSheetState(),
        containerColor   = Color(0xFF0A0E17),
        dragHandle       = null,
    ) {
        Column(
            Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 32.dp),
        ) {
            Row(
                Modifier.fillMaxWidth().padding(top = 16.dp, bottom = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TextButton(onClick = onDismiss) {
                    Text("Cancel", fontSize = 15.sp, color = Color(0x88FFFFFF))
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        "${if (existing == null) "Record" else "Edit"} Bill",
                        fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = Color.White,
                    )
                    Text(
                        "${sub.name} · ${ym.month.getDisplayName(TextStyle.SHORT, Locale.getDefault())} ${ym.year}",
                        fontSize = 11.sp, color = AccentReport.copy(0.7f),
                    )
                }
                TextButton(onClick = {
                    val amt = amount.toDoubleOrNull()
                    if (amt != null) {
                        onSave(BillEntity(
                            subId     = sub.id,
                            year      = ym.year,
                            month     = ym.monthValue,
                            amount    = amt,
                            currency  = currency,
                            notes     = notes,
                            updatedAt = System.currentTimeMillis(),
                        ))
                    }
                }) {
                    Text("Save", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = AccentReport)
                }
            }

            HorizontalDivider(color = Color(0x20FFFFFF))
            Spacer(Modifier.height(16.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = amount, onValueChange = { amount = it },
                    label = { Text("Amount paid") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = reportFieldColors(),
                    textStyle = LocalTextStyle.current.copy(fontSize = 16.sp),
                )
                var currExp by remember { mutableStateOf(false) }
                ExposedDropdownMenuBox(
                    expanded = currExp, onExpandedChange = { currExp = it },
                    modifier = Modifier.width(110.dp),
                ) {
                    OutlinedTextField(
                        value = currency, onValueChange = {},
                        readOnly = true,
                        modifier = Modifier.menuAnchor(MenuAnchorType.PrimaryNotEditable),
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(currExp) },
                        shape = RoundedCornerShape(12.dp),
                        colors = reportFieldColors(),
                        textStyle = LocalTextStyle.current.copy(fontSize = 14.sp),
                        singleLine = true,
                    )
                    ExposedDropdownMenu(expanded = currExp, onDismissRequest = { currExp = false }) {
                        CURRENCIES_R.forEach { c ->
                            DropdownMenuItem(text = { Text(c) }, onClick = { currency = c; currExp = false })
                        }
                    }
                }
            }

            Spacer(Modifier.height(12.dp))

            OutlinedTextField(
                value = notes, onValueChange = { notes = it },
                label = { Text("Notes (optional)") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = reportFieldColors(),
                textStyle = LocalTextStyle.current.copy(fontSize = 14.sp),
                minLines = 2,
            )
        }
    }
}

@Composable
private fun reportFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor     = AccentReport.copy(alpha = 0.7f),
    unfocusedBorderColor   = BgCardBorder,
    focusedContainerColor  = BgSurface,
    unfocusedContainerColor = BgSurface,
    focusedTextColor       = Color.White,
    unfocusedTextColor     = Color.White,
    focusedLabelColor      = AccentReport,
    unfocusedLabelColor    = Color(0x88FFFFFF),
)
