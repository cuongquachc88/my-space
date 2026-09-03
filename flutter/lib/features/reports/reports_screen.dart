import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/db/database.dart';
import '../../shared/theme/app_theme.dart';

// db functions imported from database.dart

const _months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const _currencies = ['USD', 'EUR', 'GBP', 'VND', 'JPY', 'SGD'];
const _toUsd = {'USD': 1.0, 'EUR': 1.08, 'GBP': 1.27, 'VND': 0.000039, 'JPY': 0.0067, 'SGD': 0.74};
const _fromUsd = {'USD': 1.0, 'EUR': 0.926, 'GBP': 0.787, 'VND': 25641.0, 'JPY': 149.25, 'SGD': 1.351};

double _toUsdAmt(double a, String c) => a * (_toUsd[c] ?? 1.0);
double _fromUsdAmt(double a, String c) => a * (_fromUsd[c] ?? 1.0);

double _expectedMonthlyUsd(SubscriptionRow sub, int year, int month) {
  final start = DateTime.parse(sub.startDate);
  final startYM = start.year * 12 + start.month - 1;
  final curYM = year * 12 + month - 1;
  if (startYM > curYM) return 0;
  final amt = sub.amount;
  switch (sub.cycle) {
    case 'monthly': return _toUsdAmt(amt, sub.currency);
    case 'yearly': return start.month == month ? _toUsdAmt(amt, sub.currency) : 0;
    case 'weekly': return _toUsdAmt(amt, sub.currency) * 4.33;
    default: return startYM == curYM ? _toUsdAmt(amt, sub.currency) : 0;
  }
}

class ReportsScreen extends ConsumerStatefulWidget {
  final VoidCallback? onBack;
  const ReportsScreen({super.key, this.onBack});

  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen> {
  List<SubscriptionRow> _subs = [];
  List<BillRow> _bills = [];
  String _displayCurrency = 'USD';
  late int _year;
  late int _month;

  

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _year = now.year;
    _month = now.month;
    _load();
  }

  Future<void> _load() async {
    final subs = await listSubscriptions();
    final bills = await allBills();
    if (mounted) setState(() { _subs = subs; _bills = bills; });
  }

  double _expectedForMonth(int year, int month) {
    return _subs.where((s) => s.active).fold(0.0,
        (acc, s) => acc + _expectedMonthlyUsd(s, year, month));
  }

  double _actualForMonth(int year, int month) {
    return _bills
        .where((b) => b.year == year && b.month == month)
        .fold(0.0, (acc, b) => acc + _toUsdAmt(b.amount, b.currency));
  }

  @override
  Widget build(BuildContext context) {
    final expected = _expectedForMonth(_year, _month);
    final actual = _actualForMonth(_year, _month);
    final expDisplay = _fromUsdAmt(expected, _displayCurrency);
    final actDisplay = _fromUsdAmt(actual, _displayCurrency);
    final symbol = _currencySymbol(_displayCurrency);

    // Build last 12 months bar data
    final now = DateTime.now();
    final bars = List.generate(12, (i) {
      final dt = DateTime(now.year, now.month - 11 + i);
      final exp = _expectedForMonth(dt.year, dt.month);
      return _BarData(
        label: _months[dt.month - 1],
        expected: exp,
        actual: _actualForMonth(dt.year, dt.month),
        isCurrent: dt.year == _year && dt.month == _month,
      );
    });
    final maxVal = bars.fold(0.0, (m, b) => b.expected > m ? b.expected : m);

    return Column(
      children: [
        SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                if (widget.onBack != null)
                  IconButton(
                    icon: const Icon(Icons.arrow_back_ios, size: 18, color: AppColors.textSecondary),
                    onPressed: widget.onBack,
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                const Text('Reports',
                    style: TextStyle(color: AppColors.textPrimary, fontSize: 18, fontWeight: FontWeight.w700)),
                const Spacer(),
                DropdownButton<String>(
                  value: _displayCurrency,
                  dropdownColor: AppColors.surface,
                  style: const TextStyle(color: AppColors.reports, fontSize: 13),
                  onChanged: (v) => setState(() => _displayCurrency = v!),
                  items: _currencies.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                ),
              ],
            ),
          ),
        ),
        // Month selector
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.chevron_left, color: AppColors.textSecondary),
                onPressed: () {
                  setState(() {
                    _month--;
                    if (_month < 1) { _month = 12; _year--; }
                  });
                },
              ),
              Text('${_months[_month - 1]} $_year',
                  style: const TextStyle(color: AppColors.textPrimary, fontSize: 15, fontWeight: FontWeight.w600)),
              IconButton(
                icon: const Icon(Icons.chevron_right, color: AppColors.textSecondary),
                onPressed: () {
                  setState(() {
                    _month++;
                    if (_month > 12) { _month = 1; _year++; }
                  });
                },
              ),
            ],
          ),
        ),
        // Summary cards
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(
            children: [
              _SummaryCard(label: 'Expected', value: '$symbol${expDisplay.toStringAsFixed(0)}', color: AppColors.reports),
              const SizedBox(width: 8),
              _SummaryCard(label: 'Actual', value: '$symbol${actDisplay.toStringAsFixed(0)}', color: AppColors.subscriptions),
            ],
          ),
        ),
        const SizedBox(height: 16),
        // Bar chart
        if (maxVal > 0)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SizedBox(
              height: 120,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: bars.map((b) {
                  final h = maxVal > 0 ? (b.expected / maxVal * 100) : 0.0;
                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 1),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Container(
                            height: h,
                            decoration: BoxDecoration(
                              color: b.isCurrent
                                  ? AppColors.reports
                                  : AppColors.reports.withOpacity(0.3),
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(3)),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(b.label,
                              style: TextStyle(
                                color: b.isCurrent ? AppColors.reports : AppColors.textDim,
                                fontSize: 8,
                              )),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
        const SizedBox(height: 16),
        // Active subscription breakdown
        Expanded(
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            children: _subs.where((s) => s.active).map((s) {
              final exp = _expectedMonthlyUsd(s, _year, _month);
              if (exp == 0) return const SizedBox.shrink();
              return Container(
                margin: const EdgeInsets.only(bottom: 6),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(s.name,
                          style: const TextStyle(color: AppColors.textPrimary, fontSize: 13)),
                    ),
                    Text(
                      '$symbol${_fromUsdAmt(exp, _displayCurrency).toStringAsFixed(2)}',
                      style: const TextStyle(color: AppColors.reports, fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}

class _BarData {
  final String label;
  final double expected;
  final double actual;
  final bool isCurrent;
  const _BarData({required this.label, required this.expected, required this.actual, required this.isCurrent});
}

class _SummaryCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _SummaryCard({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 11)),
            const SizedBox(height: 4),
            Text(value, style: TextStyle(color: color, fontSize: 18, fontWeight: FontWeight.w700)),
          ],
        ),
      ),
    );
  }
}

String _currencySymbol(String c) {
  const s = {'USD': '\$', 'EUR': '€', 'GBP': '£', 'VND': '₫', 'JPY': '¥', 'SGD': 'S\$'};
  return s[c] ?? c;
}
