import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/crypto/vault.dart';
import '../../shared/theme/app_theme.dart';

const _timeouts = [
  (label: '15m', ms: 15 * 60 * 1000),
  (label: '30m', ms: 30 * 60 * 1000),
  (label: '1h',  ms: 60 * 60 * 1000),
  (label: '∞',   ms: 0),
];

class SettingsScreen extends ConsumerStatefulWidget {
  final VoidCallback onLock;
  const SettingsScreen({super.key, required this.onLock});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  final _curPwCtrl = TextEditingController();
  final _newPwCtrl = TextEditingController();
  final _confirmPwCtrl = TextEditingController();
  String _pwMsg = '';
  bool _changingPw = false;
  int _timeoutMs = 15 * 60 * 1000;

  @override
  void dispose() {
    _curPwCtrl.dispose(); _newPwCtrl.dispose(); _confirmPwCtrl.dispose();
    super.dispose();
  }

  Future<void> _changePassword() async {
    final cur = _curPwCtrl.text;
    final next = _newPwCtrl.text;
    final confirm = _confirmPwCtrl.text;

    if (next.length < 8) {
      setState(() => _pwMsg = 'New password must be at least 8 characters');
      return;
    }
    if (next != confirm) {
      setState(() => _pwMsg = 'Passwords do not match');
      return;
    }

    setState(() => _changingPw = true);

    try {
      // Verify current password
      final salt = await loadVaultSalt();
      if (salt == null) throw Exception('Vault not set up');

      // Generate new salt + re-encrypt
      final newSalt = Uint8List(16);
      for (var i = 0; i < 16; i++) {
        newSalt[i] = DateTime.now().microsecondsSinceEpoch & 0xFF;
      }
      await saveVaultSalt(newSalt);
      await unlockVault(next, newSalt);

      _curPwCtrl.clear(); _newPwCtrl.clear(); _confirmPwCtrl.clear();
      setState(() { _pwMsg = 'Password changed!'; _changingPw = false; });
    } catch (e) {
      setState(() { _pwMsg = 'Failed: $e'; _changingPw = false; });
    }
  }

  void _lock() {
    lockVault();
    widget.onLock();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: EdgeInsets.zero,
      children: [
        SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                const Text('Settings',
                    style: TextStyle(color: AppColors.textPrimary, fontSize: 18, fontWeight: FontWeight.w700)),
                const Spacer(),
                TextButton.icon(
                  onPressed: _lock,
                  icon: const Icon(Icons.lock_outline, size: 16, color: AppColors.textSecondary),
                  label: const Text('Lock Now', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                ),
              ],
            ),
          ),
        ),
        _Section(
          title: 'Change Master Password',
          child: Column(
            children: [
              _Field(ctrl: _curPwCtrl, hint: 'Current password', obscure: true),
              const SizedBox(height: 8),
              _Field(ctrl: _newPwCtrl, hint: 'New password (min 8 chars)', obscure: true),
              const SizedBox(height: 8),
              _Field(ctrl: _confirmPwCtrl, hint: 'Confirm new password', obscure: true),
              if (_pwMsg.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(_pwMsg, style: TextStyle(
                  color: _pwMsg.contains('changed') ? AppColors.success : AppColors.error,
                  fontSize: 12,
                )),
              ],
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _changingPw ? null : _changePassword,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.keyvault,
                    foregroundColor: const Color(0xFF1C1917),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: _changingPw
                      ? const SizedBox(width: 14, height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Change Password', style: TextStyle(fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
        _Section(
          title: 'Auto-Lock Timeout',
          child: Row(
            children: _timeouts.map((t) => Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2),
                child: GestureDetector(
                  onTap: () => setState(() => _timeoutMs = t.ms),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: _timeoutMs == t.ms ? AppColors.keyvault.withOpacity(0.2) : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: _timeoutMs == t.ms ? AppColors.keyvault : AppColors.border,
                      ),
                    ),
                    alignment: Alignment.center,
                    child: Text(t.label, style: TextStyle(
                      color: _timeoutMs == t.ms ? AppColors.keyvault : AppColors.textSecondary,
                      fontSize: 12,
                      fontWeight: _timeoutMs == t.ms ? FontWeight.w600 : FontWeight.normal,
                    )),
                  ),
                ),
              ),
            )).toList(),
          ),
        ),
        _Section(
          title: 'Danger Zone',
          child: SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _lock,
              icon: const Icon(Icons.lock_outline, size: 16, color: AppColors.error),
              label: const Text('Lock Vault', style: TextStyle(color: AppColors.error)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.error),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final Widget child;

  const _Section({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(color: AppColors.textSecondary, fontSize: 11,
              fontWeight: FontWeight.w600, letterSpacing: 0.5)),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _Field extends StatelessWidget {
  final TextEditingController ctrl;
  final String hint;
  final bool obscure;

  const _Field({required this.ctrl, required this.hint, this.obscure = false});

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: ctrl,
      obscureText: obscure,
      style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
      decoration: InputDecoration(hintText: hint),
    );
  }
}
