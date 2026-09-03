import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class TagInput extends StatefulWidget {
  final List<String> tags;
  final ValueChanged<List<String>> onChanged;
  final Color? accentColor;

  const TagInput({
    super.key,
    required this.tags,
    required this.onChanged,
    this.accentColor,
  });

  @override
  State<TagInput> createState() => _TagInputState();
}

class _TagInputState extends State<TagInput> {
  final _ctrl = TextEditingController();

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  void _add(String tag) {
    final t = tag.trim();
    if (t.isEmpty || widget.tags.contains(t)) return;
    final updated = [...widget.tags, t];
    widget.onChanged(updated);
    _ctrl.clear();
  }

  void _remove(String tag) {
    widget.onChanged(widget.tags.where((t) => t != tag).toList());
  }

  @override
  Widget build(BuildContext context) {
    final accent = widget.accentColor ?? AppColors.notes;
    return Wrap(
      spacing: 6,
      runSpacing: 4,
      children: [
        ...widget.tags.map((t) => _Tag(label: t, color: accent, onRemove: () => _remove(t))),
        SizedBox(
          width: 100,
          height: 28,
          child: TextField(
            controller: _ctrl,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 12),
            decoration: InputDecoration(
              hintText: '+ tag',
              hintStyle: const TextStyle(color: AppColors.textDim, fontSize: 12),
              contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(6),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(6),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(6),
                borderSide: BorderSide(color: accent.withOpacity(0.5)),
              ),
            ),
            onSubmitted: _add,
          ),
        ),
      ],
    );
  }
}

class _Tag extends StatelessWidget {
  final String label;
  final Color color;
  final VoidCallback onRemove;

  const _Tag({required this.label, required this.color, required this.onRemove});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 28,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(label, style: TextStyle(color: color, fontSize: 11)),
          const SizedBox(width: 4),
          GestureDetector(
            onTap: onRemove,
            child: Icon(Icons.close, size: 12, color: color.withOpacity(0.6)),
          ),
        ],
      ),
    );
  }
}
