package com.myspace.app

import com.myspace.app.data.SubscriptionEntity
import com.myspace.app.util.*
import org.junit.Assert.*
import org.junit.Test
import java.time.YearMonth

class BillingCalcTest {

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun sub(
        cycle: String = "monthly",
        amount: Double = 10.0,
        currency: String = "USD",
        active: Boolean = true,
        startDate: String = "2024-01-01",
    ) = SubscriptionEntity(
        id        = "test-id",
        name      = "Test Sub",
        amount    = amount,
        currency  = currency,
        cycle     = cycle,
        startDate = startDate,
        tags      = "",
        notes     = "",
        active    = active,
        createdAt = 0L,
        updatedAt = 0L,
    )

    // ── toUSD / fromUSD ──────────────────────────────────────────────────────

    @Test fun `toUSD USD is identity`() {
        assertEquals(10.0, toUSD(10.0, "USD"), 0.0001)
    }

    @Test fun `toUSD EUR converts correctly`() {
        assertEquals(10.8, toUSD(10.0, "EUR"), 0.001)
    }

    @Test fun `toUSD unknown currency falls back to 1_0`() {
        assertEquals(42.0, toUSD(42.0, "XYZ"), 0.0001)
    }

    @Test fun `fromUSD is inverse of toUSD`() {
        val currencies = listOf("USD", "EUR", "GBP", "VND", "JPY", "SGD")
        currencies.forEach { c ->
            val original = 100.0
            val roundTripped = fromUSD(toUSD(original, c), c)
            assertEquals("round-trip failed for $c", original, roundTripped, 0.001)
        }
    }

    // ── monthlyEquivalentUSD ─────────────────────────────────────────────────

    @Test fun `monthly cycle returns usd directly`() {
        assertEquals(10.0, monthlyEquivalentUSD(10.0, "USD", "monthly"), 0.0001)
    }

    @Test fun `yearly cycle divides by 12`() {
        assertEquals(10.0, monthlyEquivalentUSD(120.0, "USD", "yearly"), 0.0001)
    }

    @Test fun `weekly cycle multiplies by 4_33`() {
        assertEquals(43.3, monthlyEquivalentUSD(10.0, "USD", "weekly"), 0.01)
    }

    @Test fun `one-time cycle returns 0`() {
        assertEquals(0.0, monthlyEquivalentUSD(999.0, "USD", "one-time"), 0.0001)
    }

    @Test fun `unknown cycle returns 0`() {
        assertEquals(0.0, monthlyEquivalentUSD(100.0, "USD", "biannual"), 0.0001)
    }

    @Test fun `non-USD currency is converted before dividing`() {
        // EUR 120/yr = 120*1.08 USD / 12 = 10.8
        assertEquals(10.8, monthlyEquivalentUSD(120.0, "EUR", "yearly"), 0.001)
    }

    // ── expectedMonthlyUSD ───────────────────────────────────────────────────

    @Test fun `inactive sub returns 0`() {
        val s = sub(active = false, amount = 50.0)
        assertEquals(0.0, expectedMonthlyUSD(s), 0.0001)
    }

    @Test fun `active monthly sub returns monthly equivalent`() {
        val s = sub(cycle = "monthly", amount = 15.0, currency = "USD")
        assertEquals(15.0, expectedMonthlyUSD(s), 0.0001)
    }

    @Test fun `sub not yet started in query month returns 0`() {
        val ym = YearMonth.of(2024, 3)
        val s = sub(startDate = "2024-06-01") // starts June, query is March
        assertEquals(0.0, expectedMonthlyUSD(s, ym), 0.0001)
    }

    @Test fun `sub started exactly in query month counts`() {
        val ym = YearMonth.of(2024, 6)
        val s = sub(startDate = "2024-06-15", amount = 20.0)
        assertEquals(20.0, expectedMonthlyUSD(s, ym), 0.0001)
    }

    @Test fun `sub started before query month counts`() {
        val ym = YearMonth.of(2025, 1)
        val s = sub(startDate = "2024-01-01", amount = 9.99)
        assertEquals(9.99, expectedMonthlyUSD(s, ym), 0.001)
    }

    @Test fun `invalid startDate falls back to including sub`() {
        val s = sub(startDate = "not-a-date", amount = 12.0)
        assertEquals(12.0, expectedMonthlyUSD(s), 0.0001)
    }

    // ── subActiveInMonth ─────────────────────────────────────────────────────

    @Test fun `inactive sub is never active in any month`() {
        val ym = YearMonth.of(2020, 1)
        assertFalse(subActiveInMonth(sub(active = false), ym))
    }

    @Test fun `sub started before query month is active`() {
        val ym = YearMonth.of(2025, 6)
        assertTrue(subActiveInMonth(sub(startDate = "2024-01-01"), ym))
    }

    @Test fun `sub started same month is active`() {
        val ym = YearMonth.of(2025, 6)
        assertTrue(subActiveInMonth(sub(startDate = "2025-06-30"), ym))
    }

    @Test fun `sub starting next month is not active`() {
        val ym = YearMonth.of(2025, 5)
        assertFalse(subActiveInMonth(sub(startDate = "2025-06-01"), ym))
    }

    @Test fun `invalid startDate defaults to active`() {
        val ym = YearMonth.of(2025, 1)
        assertTrue(subActiveInMonth(sub(startDate = "bad-date"), ym))
    }

    // ── buildMonthlyChart ────────────────────────────────────────────────────

    @Test fun `chart returns requested number of months`() {
        val result = buildMonthlyChart(emptyList(), months = 6)
        assertEquals(6, result.size)
    }

    @Test fun `chart months are ordered oldest to newest`() {
        val ref = YearMonth.of(2025, 6)
        val result = buildMonthlyChart(emptyList(), months = 3, referenceYM = ref)
        assertEquals(YearMonth.of(2025, 4), result[0].first)
        assertEquals(YearMonth.of(2025, 5), result[1].first)
        assertEquals(YearMonth.of(2025, 6), result[2].first)
    }

    @Test fun `chart total is 0 when no subs`() {
        val result = buildMonthlyChart(emptyList())
        assertTrue(result.all { it.second == 0.0 })
    }

    @Test fun `inactive sub contributes 0 to every month`() {
        val s = sub(active = false, amount = 100.0)
        val result = buildMonthlyChart(listOf(s))
        assertTrue(result.all { it.second == 0.0 })
    }

    @Test fun `sub not yet started excluded from earlier months`() {
        val ref = YearMonth.of(2025, 6)
        // Sub starts May 2025 — should appear in May and June but not April
        val s = sub(startDate = "2025-05-01", amount = 10.0, currency = "USD", cycle = "monthly")
        val result = buildMonthlyChart(listOf(s), months = 3, referenceYM = ref)
        assertEquals(0.0,  result[0].second, 0.0001) // April
        assertEquals(10.0, result[1].second, 0.0001) // May
        assertEquals(10.0, result[2].second, 0.0001) // June
    }

    @Test fun `multiple active subs totals correctly`() {
        val ref = YearMonth.of(2025, 6)
        val s1 = sub(amount = 10.0, currency = "USD", cycle = "monthly")
        val s2 = sub(amount = 20.0, currency = "USD", cycle = "monthly")
        val result = buildMonthlyChart(listOf(s1, s2), months = 1, referenceYM = ref)
        assertEquals(30.0, result[0].second, 0.0001)
    }
}
