package com.myspace.app.viewmodel

import com.myspace.app.data.entity.SubscriptionEntity
import org.junit.Assert.*
import org.junit.Test

/**
 * Tests for the billing-cycle normalisation logic used in SubscriptionsScreen
 * (monthly total calculation). The formula is inline in the screen composable
 * but the math is business logic — tested here independently.
 */
class SubscriptionBillingTest {

    private fun monthlyAmount(amount: Double, cycle: String): Double = when (cycle) {
        "yearly"    -> amount / 12.0
        "weekly"    -> amount * 4.0
        "quarterly" -> amount / 3.0
        else        -> amount   // monthly
    }

    private fun totalMonthly(subs: List<SubscriptionEntity>): Double =
        subs.filter { it.active }.sumOf { monthlyAmount(it.amount, it.cycle) }

    private fun sub(id: String, amount: Double, cycle: String, active: Boolean = true) =
        SubscriptionEntity(id = id, name = "Sub$id", amount = amount, currency = "USD",
            cycle = cycle, startDate = "2024-01-01", active = active)

    @Test
    fun `monthly subscription counts at face value`() {
        assertEquals(9.99, monthlyAmount(9.99, "monthly"), 0.001)
    }

    @Test
    fun `yearly subscription divides by 12`() {
        assertEquals(10.0, monthlyAmount(120.0, "yearly"), 0.001)
    }

    @Test
    fun `weekly subscription multiplies by 4`() {
        assertEquals(20.0, monthlyAmount(5.0, "weekly"), 0.001)
    }

    @Test
    fun `quarterly subscription divides by 3`() {
        assertEquals(10.0, monthlyAmount(30.0, "quarterly"), 0.001)
    }

    @Test
    fun `unknown cycle treated as monthly`() {
        assertEquals(7.5, monthlyAmount(7.5, "biannual"), 0.001)
    }

    @Test
    fun `inactive subscriptions excluded from total`() {
        val subs = listOf(
            sub("1", 10.0, "monthly", active = true),
            sub("2", 50.0, "monthly", active = false)
        )
        assertEquals(10.0, totalMonthly(subs), 0.001)
    }

    @Test
    fun `mixed cycles sum correctly`() {
        val subs = listOf(
            sub("1", 10.0, "monthly"),     // 10.00/mo
            sub("2", 120.0, "yearly"),     // 10.00/mo
            sub("3", 5.0, "weekly"),       // 20.00/mo
            sub("4", 30.0, "quarterly")    // 10.00/mo
        )
        assertEquals(50.0, totalMonthly(subs), 0.001)
    }

    @Test
    fun `empty list totals zero`() {
        assertEquals(0.0, totalMonthly(emptyList()), 0.001)
    }

    @Test
    fun `all inactive totals zero`() {
        val subs = listOf(
            sub("1", 9.99, "monthly", active = false),
            sub("2", 99.0, "yearly", active = false)
        )
        assertEquals(0.0, totalMonthly(subs), 0.001)
    }
}
