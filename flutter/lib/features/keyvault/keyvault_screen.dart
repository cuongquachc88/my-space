import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/db/database.dart';
import '../../core/crypto/vault.dart';
import '../../shared/theme/app_theme.dart';
import '../../shared/widgets/tag_input.dart';

// db functions imported from database.dart

class KeyvaultScreen extends ConsumerStatefulWidget {
  const KeyvaultScreen({super.key});

  @override
  ConsumerState<KeyvaultScreen> createState() => _KeyvaultScreenState();
}

class _KeyvaultScreenState extends ConsumerState<KeyvaultScreen> {
  List<SecretRow> _secrets = [];
  List<String> _allTags = [];
  String? _activeTag;
  String _query = '';
  bool _adding = false;
  final _labelCtrl = TextEditingController();
  final _valueCtrl = TextEditingController();
  final _urlCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  List<String> _newTags = [];
  bool _showValue = false;
  bool _saving = false;

  

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _labelCtrl.dispose();
    _valueCtrl.dispose();
    _urlCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final secrets = await listSecrets(query: _query, tag: _activeTag);
    final tags = await secretsTags();
    if (mounted) setState(() { _secrets = secrets; _allTags = tags; });
  }

  Future<void> _save() async {
    if (_labelCtrl.text.trim().isEmpty || _valueCtrl.text.isEmpty) return;
    setState(() => _saving = true);
    try {
      final enc = encryptVault(_valueCtrl.text);
      await createSecret(
        label: _labelCtrl.text.trim(),
        ciphertext: enc['ciphertext']!,
        iv: enc['iv']!,
        tags: _newTags,
        url: _urlCtrl.text.trim(),
        description: _descCtrl.text.trim(),
      );
      _labelCtrl.clear();
      _valueCtrl.clear();
      _urlCtrl.clear();
      _descCtrl.clear();
      setState(() { _adding = false; _newTags = []; _saving = false; });
      await _load();
    } catch (_) {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete(SecretRow s) async {
    await deleteSecret(s.id);
    await _load();
  }

  List<String> _parseTags(String json) {
    try { return List<String>.from(jsonDecode(json) as List); } catch (_) { return []; }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                const Text('Keyvault',
                    style: TextStyle(color: AppColors.textPrimary, fontSize: 18, fontWeight: FontWeight.w700)),
                const Spacer(),
                GestureDetector(
                  onTap: () => setState(() => _adding = !_adding),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.keyvault.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(_adding ? 'Cancel' : '+ New',
                        style: const TextStyle(color: AppColors.keyvault, fontSize: 13, fontWeight: FontWeight.w600)),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (_adding) _AddForm(
          labelCtrl: _labelCtrl,
          valueCtrl: _valueCtrl,
          urlCtrl: _urlCtrl,
          descCtrl: _descCtrl,
          tags: _newTags,
          showValue: _showValue,
          saving: _saving,
          onTagsChanged: (t) => setState(() => _newTags = t),
          onToggleShow: () => setState(() => _showValue = !_showValue),
          onSave: _save,
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          child: TextField(
            onChanged: (q) { setState(() => _query = q); _load(); },
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
            decoration: const InputDecoration(
              hintText: 'Search secrets…',
              prefixIcon: Icon(Icons.search, size: 18, color: AppColors.textDim),
            ),
          ),
        ),
        if (_allTags.isNotEmpty) SizedBox(
          height: 32,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            children: [
              _TagChip(label: 'All', active: _activeTag == null,
                  onTap: () { setState(() => _activeTag = null); _load(); }),
              ..._allTags.map((t) => _TagChip(label: t, active: _activeTag == t,
                  onTap: () { setState(() => _activeTag = t); _load(); })),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            itemCount: _secrets.length,
            itemBuilder: (ctx, i) => _SecretCard(
              secret: _secrets[i],
              parseTags: _parseTags,
              onDelete: () => _delete(_secrets[i]),
            ),
          ),
        ),
      ],
    );
  }
}

class _AddForm extends StatelessWidget {
  final TextEditingController labelCtrl, valueCtrl, urlCtrl, descCtrl;
  final List<String> tags;
  final bool showValue;
  final bool saving;
  final ValueChanged<List<String>> onTagsChanged;
  final VoidCallback onToggleShow;
  final VoidCallback onSave;

  const _AddForm({
    required this.labelCtrl, required this.valueCtrl, required this.urlCtrl,
    required this.descCtrl, required this.tags, required this.showValue,
    required this.saving, required this.onTagsChanged,
    required this.onToggleShow, required this.onSave,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.keyvault.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: labelCtrl,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
            decoration: const InputDecoration(hintText: 'Label (e.g. GitHub)'),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: valueCtrl,
                  obscureText: !showValue,
                  style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                  decoration: const InputDecoration(hintText: 'SecretRow value'),
                ),
              ),
              IconButton(
                icon: Icon(showValue ? Icons.visibility_off : Icons.visibility,
                    size: 18, color: AppColors.textDim),
                onPressed: onToggleShow,
              ),
            ],
          ),
          const SizedBox(height: 8),
          TextField(
            controller: urlCtrl,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
            decoration: const InputDecoration(hintText: 'URL (optional)'),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: descCtrl,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
            decoration: const InputDecoration(hintText: 'Description (optional)'),
          ),
          const SizedBox(height: 8),
          TagInput(tags: tags, onChanged: onTagsChanged, accentColor: AppColors.keyvault),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: saving ? null : onSave,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.keyvault,
                foregroundColor: const Color(0xFF1C1917),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: saving
                  ? const SizedBox(width: 14, height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Save SecretRow', style: TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
    );
  }
}

class _SecretCard extends StatefulWidget {
  final SecretRow secret;
  final VoidCallback onDelete;
  final List<String> Function(String) parseTags;

  const _SecretCard({required this.secret, required this.onDelete, required this.parseTags});

  @override
  State<_SecretCard> createState() => _SecretCardState();
}

class _SecretCardState extends State<_SecretCard> {
  String? _revealed;
  bool _loading = false;

  Future<void> _reveal() async {
    if (_revealed != null) { setState(() => _revealed = null); return; }
    setState(() => _loading = true);
    try {
      final v = decryptVault(widget.secret.ciphertext, widget.secret.iv);
      setState(() { _revealed = v; _loading = false; });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tags = widget.parseTags(widget.secret.tags);
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(widget.secret.label,
                    style: const TextStyle(color: AppColors.textPrimary, fontSize: 14, fontWeight: FontWeight.w600)),
              ),
              if (_loading)
                const SizedBox(width: 14, height: 14,
                    child: CircularProgressIndicator(strokeWidth: 1.5, color: AppColors.keyvault))
              else
                IconButton(
                  icon: Icon(_revealed != null ? Icons.visibility_off : Icons.visibility,
                      size: 16, color: AppColors.keyvault),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                  onPressed: _reveal,
                ),
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.delete_outline, size: 16, color: AppColors.textDim),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                onPressed: widget.onDelete,
              ),
            ],
          ),
          if (widget.secret.url.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(widget.secret.url,
                style: const TextStyle(color: AppColors.textDim, fontSize: 11),
                maxLines: 1,
                overflow: TextOverflow.ellipsis),
          ],
          if (_revealed != null) ...[
            const SizedBox(height: 8),
            GestureDetector(
              onTap: () => Clipboard.setData(ClipboardData(text: _revealed!)),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.keyvault.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(_revealed!,
                          style: const TextStyle(color: AppColors.keyvault, fontSize: 13, fontFamily: 'monospace')),
                    ),
                    const Icon(Icons.copy, size: 14, color: AppColors.keyvault),
                  ],
                ),
              ),
            ),
          ],
          if (tags.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 4,
              children: tags.map((t) => Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.keyvault.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(t, style: const TextStyle(color: AppColors.keyvault, fontSize: 10)),
              )).toList(),
            ),
          ],
        ],
      ),
    );
  }
}

class _TagChip extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _TagChip({required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 6),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: active ? AppColors.keyvault.withOpacity(0.2) : Colors.transparent,
          border: Border.all(color: active ? AppColors.keyvault : AppColors.border),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(label,
            style: TextStyle(
              color: active ? AppColors.keyvault : AppColors.textSecondary,
              fontSize: 11,
              fontWeight: active ? FontWeight.w600 : FontWeight.normal,
            )),
      ),
    );
  }
}
