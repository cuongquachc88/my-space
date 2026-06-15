package com.myspace.app.util

import com.myspace.app.data.SubscriptionEntity
import java.time.LocalDate
import java.time.YearMonth

val TO_USD = mapOf(
    "USD" to 1.0,
    "EUR" to 1.08,
    "GBP" to 1.27,
    "VND" to 0.000039,
    "JPY" to 0.0067,
    "SGD" to 0.74,
)
val FROM_USD: Map<String, Double> = TO_USD.mapValues { 1.0 / it.value }

fun toUSD(amount: Double, currency: String): Double = amount * (TO_USD[currency] ?: 1.0)
fun fromUSD(usd: Double, currency: String): Double  = usd  * (FROM_USD[currency] ?: 1.0)

fun monthlyEquivalentUSD(amount: Double, currency: String, cycle: String): Double {
    val usd = toUSD(amount, currency)
    return when (cycle) {
        "monthly"  -> usd
        "yearly"   -> usd / 12.0
        "weekly"   -> usd * 4.33
        "one-time" -> 0.0
        else       -> 0.0
    }
}

fun expectedMonthlyUSD(sub: SubscriptionEntity, ym: YearMonth = YearMonth.now()): Double {
    if (!sub.active) return 0.0
    return try {
        val start = LocalDate.parse(sub.startDate)
        if (YearMonth.from(start) > ym) 0.0
        else monthlyEquivalentUSD(sub.amount, sub.currency, sub.cycle)
    } catch (_: Exception) {
        monthlyEquivalentUSD(sub.amount, sub.currency, sub.cycle)
    }
}

fun subActiveInMonth(sub: SubscriptionEntity, ym: YearMonth): Boolean {
    if (!sub.active) return false
    return try {
        val start = LocalDate.parse(sub.startDate)
        YearMonth.from(start) <= ym
    } catch (_: Exception) { true }
}

fun buildMonthlyChart(
    subs: List<SubscriptionEntity>,
    months: Int = 6,
    referenceYM: YearMonth = YearMonth.now(),
): List<Pair<YearMonth, Double>> {
    return (months - 1 downTo 0).map { offset ->
        val ym = referenceYM.minusMonths(offset.toLong())
        val total = subs.filter { subActiveInMonth(it, ym) }
            .sumOf { expectedMonthlyUSD(it, ym) }
        ym to total
    }
}
