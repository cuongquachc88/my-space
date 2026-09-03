import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/crypto/vault.dart';
import '../theme/app_theme.dart';

// VaultGate wraps a screen; shows setup or lock screen if vault is locked.
// Mirrors SetupScreen + LockScreen in App.tsx.

class VaultGate extends ConsumerStatefulWidget {
  final Widget child;
  const VaultGate({super.key, required this.child});

  @override
  ConsumerState<VaultGate> createState() => _VaultGateState();
}

class _VaultGateState extends ConsumerState<VaultGate> {
  bool? _hasSalt; // null=loading, false=first-time setup, true=has password

  @override
  void initState() {
    super.initState();
    _checkSalt();
  }

  Future<void> _checkSalt() async {
    final has = await hasVaultSalt();
    if (mounted) setState(() => _hasSalt = has);
  }

  @override
  Widget build(BuildContext context) {
    if (_hasSalt == null) {
      return const Center(child: SizedBox.shrink());
    }

    if (!_hasSalt!) {
      return _SetupScreen(onDone: () => setState(() {
        _hasSalt = true;
      }));
    }

    if (isVaultLocked) {
      return _LockScreen(onUnlocked: () => setState(() {}));
    }

    return widget.child;
  }
}

// ── Setup screen ───────────────────────────────────────────────────────────

class _SetupScreen extends StatefulWidget {
  final VoidCallback onDone;
  const _SetupScreen({required this.onDone});

  @override
  State<_SetupScreen> createState() => _SetupScreenState();
}

class _SetupScreenState extends State<_SetupScreen> {
  final _pwCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  String _error = '';
  bool _busy = false;

  @override
  void dispose() {
    _pwCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    final pw = _pwCtrl.text;
    final confirm = _confirmCtrl.text;
    if (pw.length < 8) {
      setState(() => _error = 'Password must be at least 8 characters');
      return;
    }
    if (pw != confirm) {
      setState(() => _error = 'Passwords do not match');
      return;
    }
    setState(() { _busy = true; _error = ''; });

    // Generate random 16-byte salt
    final salt = Uint8List(16);
    for (var i = 0; i < 16; i++) {
      salt[i] = DateTime.now().microsecondsSinceEpoch & 0xFF;
    }

    await saveVaultSalt(salt);
    final ok = await unlockVault(pw, salt);
    if (!mounted) return;
    if (ok) {
      widget.onDone();
    } else {
      setState(() { _error = 'Setup failed'; _busy = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _VaultIcon(),
            const SizedBox(height: 20),
            const Text('Create Master Password',
                style: TextStyle(color: AppColors.textPrimary, fontSize: 15, fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            const Text('This encrypts all your secrets',
                style: TextStyle(color: AppColors.textDim, fontSize: 12)),
            const SizedBox(height: 20),
            TextField(
              controller: _pwCtrl,
              obscureText: true,
              autofocus: true,
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: const InputDecoration(hintText: 'New password (min 8 chars)'),
              onSubmitted: (_) => _create(),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _confirmCtrl,
              obscureText: true,
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: const InputDecoration(hintText: 'Confirm password'),
              onSubmitted: (_) => _create(),
            ),
            if (_error.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(_error, style: const TextStyle(color: AppColors.error, fontSize: 12)),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _busy ? null : _create,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.keyvault,
                  foregroundColor: const Color(0xFF1C1917),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: _busy
                    ? const SizedBox(width: 16, height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Create Vault', style: TextStyle(fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Lock screen ────────────────────────────────────────────────────────────

class _LockScreen extends StatefulWidget {
  final VoidCallback onUnlocked;
  const _LockScreen({required this.onUnlocked});

  @override
  State<_LockScreen> createState() => _LockScreenState();
}

class _LockScreenState extends State<_LockScreen> {
  final _ctrl = TextEditingController();
  String _error = '';
  bool _busy = false;

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  Future<void> _unlock() async {
    setState(() { _busy = true; _error = ''; });
    final salt = await loadVaultSalt();
    if (salt == null) {
      setState(() { _error = 'Vault data missing'; _busy = false; });
      return;
    }
    final ok = await unlockVault(_ctrl.text, salt);
    if (!mounted) return;
    if (ok) {
      widget.onUnlocked();
    } else {
      setState(() { _error = 'Wrong password'; _busy = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _VaultIcon(),
            const SizedBox(height: 16),
            const Text('Vault is locked',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 14, fontWeight: FontWeight.w600)),
            const SizedBox(height: 20),
            TextField(
              controller: _ctrl,
              obscureText: true,
              autofocus: true,
              style: const TextStyle(color: AppColors.textPrimary),
              decoration: const InputDecoration(hintText: 'Master password'),
              onSubmitted: (_) => _unlock(),
            ),
            if (_error.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(_error, style: const TextStyle(color: AppColors.error, fontSize: 12)),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _busy ? null : _unlock,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.keyvault,
                  foregroundColor: const Color(0xFF1C1917),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: _busy
                    ? const SizedBox(width: 16, height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Unlock', style: TextStyle(fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _VaultIcon extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 52,
      height: 52,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.keyvault.withOpacity(0.6), width: 1.5),
        color: AppColors.keyvault.withOpacity(0.1),
      ),
      child: const Icon(Icons.shield_outlined, color: AppColors.keyvault, size: 26),
    );
  }
}
