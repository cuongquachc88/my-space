import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../shared/theme/app_theme.dart';

// Mirrors GeneratorView.tsx: PBKDF2-grade password generator

const _upper   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const _lower   = 'abcdefghijklmnopqrstuvwxyz';
const _digits  = '0123456789';
const _symbols = '!@#\$%^&*()_+-=[]{}|;:,.<>?';

String _generatePassword({
  required int length,
  required bool upper,
  required bool lower,
  required bool digits,
  required bool symbols,
}) {
  final sets = <String>[];
  if (upper) sets.add(_upper);
  if (lower) sets.add(_lower);
  if (digits) sets.add(_digits);
  if (symbols) sets.add(_symbols);
  if (sets.isEmpty) return '';
  if (length < sets.length) length = sets.length;

  final alphabet = sets.join();
  final rng = Random.secure();

  // Guarantee one char from each set
  final chars = sets.map((s) => s[rng.nextInt(s.length)]).toList();
  while (chars.length < length) {
    chars.add(alphabet[rng.nextInt(alphabet.length)]);
  }
  chars.shuffle(rng);
  return chars.join();
}

double _calcBits({required bool upper, required bool lower, required bool digits, required bool symbols, required int length}) {
  int charsetSize = 0;
  if (upper) charsetSize += 26;
  if (lower) charsetSize += 26;
  if (digits) charsetSize += 10;
  if (symbols) charsetSize += 28;
  if (charsetSize == 0) return 0;
  return log(charsetSize.toDouble()) / log(2) * length;
}

class GeneratorScreen extends StatefulWidget {
  const GeneratorScreen({super.key});

  @override
  State<GeneratorScreen> createState() => _GeneratorScreenState();
}

class _GeneratorScreenState extends State<GeneratorScreen> {
  int _length = 20;
  bool _upper = true;
  bool _lower = true;
  bool _digits = true;
  bool _symbols = true;
  String _password = '';
  bool _copied = false;

  @override
  void initState() {
    super.initState();
    _generate();
  }

  void _generate() {
    setState(() {
      _password = _generatePassword(
        length: _length,
        upper: _upper,
        lower: _lower,
        digits: _digits,
        symbols: _symbols,
      );
      _copied = false;
    });
  }

  ({String label, Color color}) get _strength {
    final bits = _calcBits(upper: _upper, lower: _lower, digits: _digits, symbols: _symbols, length: _length);
    if (bits < 40) return (label: 'Weak', color: AppColors.error);
    if (bits < 60) return (label: 'Fair', color: AppColors.keyvault);
    if (bits < 80) return (label: 'Strong', color: const Color(0xFF6EE7B7));
    return (label: 'Very Strong', color: AppColors.generator);
  }

  @override
  Widget build(BuildContext context) {
    final s = _strength;

    return Column(
      children: [
        SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                const Text('Generator',
                    style: TextStyle(color: AppColors.textPrimary, fontSize: 18, fontWeight: FontWeight.w700)),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: s.color.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(s.label, style: TextStyle(color: s.color, fontSize: 12, fontWeight: FontWeight.w600)),
                ),
              ],
            ),
          ),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 24),
                // Password display
                GestureDetector(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: _password));
                    setState(() => _copied = true);
                    Future.delayed(const Duration(seconds: 2), () {
                      if (mounted) setState(() => _copied = false);
                    });
                  },
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.generator.withOpacity(0.07),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.generator.withOpacity(0.3)),
                    ),
                    child: Column(
                      children: [
                        Text(
                          _password,
                          style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 18,
                            fontFamily: 'monospace',
                            letterSpacing: 2,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _copied ? 'Copied!' : 'Tap to copy',
                          style: TextStyle(
                            color: _copied ? AppColors.success : AppColors.textDim,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 32),
                // Length slider
                Row(
                  children: [
                    const Text('Length', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.generator.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text('$_length',
                          style: const TextStyle(color: AppColors.generator, fontSize: 13, fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
                SliderTheme(
                  data: SliderTheme.of(context).copyWith(
                    activeTrackColor: AppColors.generator,
                    inactiveTrackColor: AppColors.generator.withOpacity(0.2),
                    thumbColor: AppColors.generator,
                    overlayColor: AppColors.generator.withOpacity(0.15),
                  ),
                  child: Slider(
                    value: _length.toDouble(),
                    min: 8,
                    max: 64,
                    divisions: 56,
                    onChanged: (v) { setState(() => _length = v.round()); _generate(); },
                  ),
                ),
                const SizedBox(height: 16),
                // Toggles
                _Toggle(label: 'Uppercase (A–Z)', value: _upper, accent: AppColors.generator,
                    onChanged: (v) { setState(() => _upper = v); _generate(); }),
                _Toggle(label: 'Lowercase (a–z)', value: _lower, accent: AppColors.generator,
                    onChanged: (v) { setState(() => _lower = v); _generate(); }),
                _Toggle(label: 'Digits (0–9)', value: _digits, accent: AppColors.generator,
                    onChanged: (v) { setState(() => _digits = v); _generate(); }),
                _Toggle(label: 'Symbols (!@#…)', value: _symbols, accent: AppColors.generator,
                    onChanged: (v) { setState(() => _symbols = v); _generate(); }),
                const SizedBox(height: 32),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _generate,
                        icon: const Icon(Icons.refresh, size: 16),
                        label: const Text('Regenerate'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.generator.withOpacity(0.2),
                          foregroundColor: AppColors.generator,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _Toggle extends StatelessWidget {
  final String label;
  final bool value;
  final Color accent;
  final ValueChanged<bool> onChanged;

  const _Toggle({required this.label, required this.value, required this.accent, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
          const Spacer(),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: accent,
            activeTrackColor: accent.withOpacity(0.3),
            inactiveTrackColor: const Color(0xFF21262D),
            inactiveThumbColor: AppColors.textDim,
          ),
        ],
      ),
    );
  }
}
