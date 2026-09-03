import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/db/database.dart';
import '../../shared/theme/app_theme.dart';
import '../../shared/widgets/tag_input.dart';

// db functions imported from database.dart

const _cycles = ['monthly', 'yearly', 'weekly', 'one-time'];
const _currencies = ['USD', 'EUR', 'GBP', 'VND', 'JPY', 'SGD'];
const _cycleLabels = {'monthly': '/mo', 'yearly': '/yr', 'weekly': '/wk', 'one-time': 'once'};
const _toUsd = {'USD': 1.0, 'EUR': 1.08, 'GBP': 1.27, 'VND': 0.000039, 'JPY': 0.0067, 'SGD': 0.74};

double _monthlyUsd(double amount, String currency, String cycle) {
  final usd = amount * (_toUsd[currency] ?? 1.0);
  if (cycle == 'monthly') return usd;
  if (cycle == 'yearly') return usd / 12;
  if (cycle == 'weekly') return usd * 4.33;
  return 0;
}

String _nextBilling(String startDate, String cycle) {
  if (cycle == 'one-time') return startDate;
  final today = DateTime.now();
  var d = DateTime.parse(startDate);
  for (var i = 0; i < 1000; i++) {
    if (d.isAfter(today)) return d.toIso8601String().substring(0, 10);
    if (cycle == 'weekly') d = d.add(const Duration(days: 7));
    else if (cycle == 'monthly') d = DateTime(d.year, d.month + 1, d.day);
    else if (cycle == 'yearly') d = DateTime(d.year + 1, d.month, d.day);
    else break;
  }
  return d.toIso8601String().substring(0, 10);
}

int _daysUntil(String dateStr) {
  final target = DateTime.parse(dateStr);
  final now = DateTime.now();
  final t = DateTime(target.year, target.month, target.day);
  final n = DateTime(now.year, now.month, now.day);
  return t.difference(n).inDays;
}

String _fmtCurrency(double amount, String currency) {
  return '${_currencySymbol(currency)}${amount.toStringAsFixed(2)}';
}

String _currencySymbol(String c) {
  const s = {'USD': '\$', 'EUR': '€', 'GBP': '£', 'VND': '₫', 'JPY': '¥', 'SGD': 'S\$'};
  return s[c] ?? c;
}

class SubscriptionsScreen extends ConsumerStatefulWidget {
  final VoidCallback onGoReports;
  const SubscriptionsScreen({super.key, required this.onGoReports});

  @override
  ConsumerState<SubscriptionsScreen> createState() => _SubscriptionsScreenState();
}

class _SubscriptionsScreenState extends ConsumerState<SubscriptionsScreen> {
  List<SubscriptionRow> _subs = [];
  bool _adding = false;
  final _nameCtrl = TextEditingController();
  final _amountCtrl = TextEditingController();
  String _currency = 'USD';
  String _cycle = 'monthly';
  String _startDate = DateTime.now().toIso8601String().substring(0, 10);
  List<String> _tags = [];
  final _notesCtrl = TextEditingController();
  bool _saving = false;

  

  @override
  void initState() { super.initState(); _load(); }

  @override
  void dispose() {
    _nameCtrl.dispose(); _amountCtrl.dispose(); _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final s = await listSubscriptions();
    if (mounted) setState(() => _subs = s);
  }

  Future<void> _save() async {
    if (_nameCtrl.text.trim().isEmpty) return;
    setState(() => _saving = true);
    try {
      await createSubscription(
        name: _nameCtrl.text.trim(),
        amount: double.tryParse(_amountCtrl.text) ?? 0,
        currency: _currency,
        cycle: _cycle,
        startDate: _startDate,
        tags: _tags,
        notes: _notesCtrl.text.trim(),
      );
      _nameCtrl.clear(); _amountCtrl.clear(); _notesCtrl.clear();
      setState(() { _adding = false; _tags = []; _saving = false; });
      await _load();
    } catch (_) {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete(SubscriptionRow s) async {
    await deleteSubscription(s.id);
    await _load();
  }

  Future<void> _toggleActive(SubscriptionRow s) async {
    await updateSubscription(id: s.id, active: !s.active);
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final totalMonthly = _subs.where((s) => s.active).fold(0.0,
        (acc, s) => acc + _monthlyUsd(s.amount, s.currency, s.cycle));

    return Column(
      children: [
        SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                const Text('Subscriptions',
                    style: TextStyle(color: AppColors.textPrimary, fontSize: 18, fontWeight: FontWeight.w700)),
                const Spacer(),
                TextButton(
                  onPressed: widget.onGoReports,
                  child: const Text('Reports', style: TextStyle(color: AppColors.reports, fontSize: 13)),
                ),
                const SizedBox(width: 4),
                GestureDetector(
                  onTap: () => setState(() => _adding = !_adding),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.subscriptions.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(_adding ? 'Cancel' : '+ New',
                        style: const TextStyle(color: AppColors.subscriptions, fontSize: 13, fontWeight: FontWeight.w600)),
                  ),
                ),
              ],
            ),
          ),
        ),
        // Total pill
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: AppColors.subscriptions.withOpacity(0.08),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.subscriptions.withOpacity(0.2)),
          ),
          child: Row(
            children: [
              const Text('Active monthly total',
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
              const Spacer(),
              Text('\$${totalMonthly.toStringAsFixed(2)}/mo',
                  style: const TextStyle(color: AppColors.subscriptions, fontSize: 14, fontWeight: FontWeight.w700)),
            ],
          ),
        ),
        if (_adding) _AddForm(
          nameCtrl: _nameCtrl, amountCtrl: _amountCtrl, notesCtrl: _notesCtrl,
          currency: _currency, cycle: _cycle, startDate: _startDate, tags: _tags,
          saving: _saving,
          onCurrency: (v) => setState(() => _currency = v!),
          onCycle: (v) => setState(() => _cycle = v!),
          onStartDate: (v) => setState(() => _startDate = v),
          onTagsChanged: (t) => setState(() => _tags = t),
          onSave: _save,
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            itemCount: _subs.length,
            itemBuilder: (ctx, i) => _SubCard(
              sub: _subs[i],
              onDelete: () => _delete(_subs[i]),
              onToggle: () => _toggleActive(_subs[i]),
            ),
          ),
        ),
      ],
    );
  }
}

class _AddForm extends StatelessWidget {
  final TextEditingController nameCtrl, amountCtrl, notesCtrl;
  final String currency, cycle, startDate;
  final List<String> tags;
  final bool saving;
  final ValueChanged<String?> onCurrency;
  final ValueChanged<String?> onCycle;
  final ValueChanged<String> onStartDate;
  final ValueChanged<List<String>> onTagsChanged;
  final VoidCallback onSave;

  const _AddForm({
    required this.nameCtrl, required this.amountCtrl, required this.notesCtrl,
    required this.currency, required this.cycle, required this.startDate,
    required this.tags, required this.saving,
    required this.onCurrency, required this.onCycle, required this.onStartDate,
    required this.onTagsChanged, required this.onSave,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.subscriptions.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: nameCtrl,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
            decoration: const InputDecoration(hintText: 'Name (e.g. Netflix)'),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: amountCtrl,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                  decoration: const InputDecoration(hintText: 'Amount'),
                ),
              ),
              const SizedBox(width: 8),
              DropdownButton<String>(
                value: currency,
                dropdownColor: AppColors.surface,
                style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
                onChanged: onCurrency,
                items: _currencies.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
              ),
            ],
          ),
          const SizedBox(height: 8),
          DropdownButton<String>(
            value: cycle,
            dropdownColor: AppColors.surface,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
            onChanged: onCycle,
            items: _cycles.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
          ),
          const SizedBox(height: 8),
          TagInput(tags: tags, onChanged: onTagsChanged, accentColor: AppColors.subscriptions),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: saving ? null : onSave,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.subscriptions,
                foregroundColor: const Color(0xFF1C1917),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: saving
                  ? const SizedBox(width: 14, height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Save', style: TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
    );
  }
}

class _SubCard extends StatelessWidget {
  final SubscriptionRow sub;
  final VoidCallback onDelete;
  final VoidCallback onToggle;

  const _SubCard({required this.sub, required this.onDelete, required this.onToggle});

  @override
  Widget build(BuildContext context) {
    final next = sub.cycle == 'one-time' ? null : _nextBilling(sub.startDate, sub.cycle);
    final days = next != null ? _daysUntil(next) : null;
    final monthlyUsd = _monthlyUsd(sub.amount, sub.currency, sub.cycle);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: sub.active ? AppColors.subscriptions.withOpacity(0.3) : AppColors.border,
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(sub.name,
                    style: TextStyle(
                      color: sub.active ? AppColors.textPrimary : AppColors.textDim,
                      fontSize: 14, fontWeight: FontWeight.w600,
                    )),
                const SizedBox(height: 2),
                Text(
                  '${_fmtCurrency(sub.amount, sub.currency)}${_cycleLabels[sub.cycle] ?? ''}'
                  ' · \$${monthlyUsd.toStringAsFixed(2)}/mo',
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                ),
                if (days != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    days == 0 ? 'Due today' : days < 0 ? 'Overdue ${-days}d' : 'Due in ${days}d',
                    style: TextStyle(
                      color: days <= 3 ? AppColors.error : AppColors.textDim,
                      fontSize: 10,
                    ),
                  ),
                ],
              ],
            ),
          ),
          Switch(
            value: sub.active,
            onChanged: (_) => onToggle(),
            activeColor: AppColors.subscriptions,
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline, size: 16, color: AppColors.textDim),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
            onPressed: onDelete,
          ),
        ],
      ),
    );
  }
}
