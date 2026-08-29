package com.myspace.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.myspace.app.data.dao.BillDao
import com.myspace.app.data.dao.SubscriptionDao
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import java.text.DateFormatSymbols
import javax.inject.Inject

@HiltViewModel
class ReportsViewModel @Inject constructor(
    private val billDao: BillDao,
    private val subDao: SubscriptionDao
) : ViewModel() {

    fun last6MonthsTotals(currentYear: Int, currentMonth: Int): Flow<List<Pair<String, Double>>> = flow {
        val months = (5 downTo 0).map { offset ->
            var m = currentMonth - offset
            var y = currentYear
            while (m < 1) { m += 12; y-- }
            Pair(y, m)
        }
        val labels = DateFormatSymbols().shortMonths
        val result = months.map { (y, m) ->
            val bills = billDao.getByMonth(y, m)
            val label = "${labels[m - 1]} $y"
            val total = bills.sumOf { it.amount }
            label to total
        }
        emit(result)
    }
}
