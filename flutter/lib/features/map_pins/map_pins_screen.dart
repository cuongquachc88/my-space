import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/db/database.dart';
import '../../shared/theme/app_theme.dart';

// db functions imported from database.dart

const _stackColors = ['#fb923c','#34d399','#818cf8','#f472b6','#60a5fa','#facc15','#f87171','#a78bfa'];
const _categories = ['', 'Hotel', 'Restaurant', 'Café', 'Attraction', 'Shopping', 'Transport', 'Hospital', 'Other'];
const _priorities = ['none', 'low', 'medium', 'high'];

const _priorityColors = {
  'none': AppColors.border,
  'low': Color(0xFF34D399),
  'medium': Color(0xFFFACC15),
  'high': Color(0xFFF87171),
};

Color _hex(String h) => Color(int.parse('FF${h.replaceAll("#", "")}', radix: 16));

class MapPinsScreen extends ConsumerStatefulWidget {
  const MapPinsScreen({super.key});

  @override
  ConsumerState<MapPinsScreen> createState() => _MapPinsScreenState();
}

class _MapPinsScreenState extends ConsumerState<MapPinsScreen> {
  List<MapStackRow> _stacks = [];
  MapStackRow? _activeStack;
  List<MapPinRow> _pins = [];
  bool _addingStack = false;
  bool _addingPin = false;
  final _stackNameCtrl = TextEditingController();
  String _stackColor = '#fb923c';
  final _pinLabelCtrl = TextEditingController();
  final _pinUrlCtrl = TextEditingController();
  final _pinNoteCtrl = TextEditingController();
  String _pinPriority = 'none';
  String _pinCategory = '';
  bool _saving = false;

  

  @override
  void initState() { super.initState(); _loadStacks(); }

  @override
  void dispose() {
    _stackNameCtrl.dispose(); _pinLabelCtrl.dispose();
    _pinUrlCtrl.dispose(); _pinNoteCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadStacks() async {
    final s = await listMapStacks();
    if (mounted) setState(() {
      _stacks = s;
      if (_activeStack != null) {
        _activeStack = s.firstWhere((st) => st.id == _activeStack!.id, orElse: () => s.first);
      } else if (s.isNotEmpty) {
        _activeStack = s.first;
      }
    });
    if (_activeStack != null) await _loadPins();
  }

  Future<void> _loadPins() async {
    if (_activeStack == null) return;
    final pins = await listMapPins(_activeStack!.id);
    if (mounted) setState(() => _pins = pins);
  }

  Future<void> _saveStack() async {
    if (_stackNameCtrl.text.trim().isEmpty) return;
    setState(() => _saving = true);
    await createMapStack(name: _stackNameCtrl.text.trim(), color: _stackColor);
    _stackNameCtrl.clear();
    setState(() { _addingStack = false; _saving = false; });
    await _loadStacks();
  }

  Future<void> _savePin() async {
    if (_pinLabelCtrl.text.trim().isEmpty || _activeStack == null) return;
    setState(() => _saving = true);
    await createMapPin(
      stackId: _activeStack!.id,
      label: _pinLabelCtrl.text.trim(),
      lat: 0, lng: 0,
      url: _pinUrlCtrl.text.trim(),
      note: _pinNoteCtrl.text.trim(),
      priority: _pinPriority,
      category: _pinCategory,
    );
    _pinLabelCtrl.clear(); _pinUrlCtrl.clear(); _pinNoteCtrl.clear();
    setState(() { _addingPin = false; _pinPriority = 'none'; _pinCategory = ''; _saving = false; });
    await _loadPins();
  }

  Future<void> _deletePin(MapPinRow p) async {
    await deleteMapPin(p.id);
    await _loadPins();
  }

  Future<void> _openInMaps(MapPinRow p) async {
    final uri = p.url.isNotEmpty
        ? Uri.tryParse(p.url)
        : Uri.parse('https://maps.google.com/?q=${p.lat},${p.lng}');
    if (uri != null && await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
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
                const Text('Map Pins',
                    style: TextStyle(color: AppColors.textPrimary, fontSize: 18, fontWeight: FontWeight.w700)),
                const Spacer(),
                GestureDetector(
                  onTap: () => setState(() => _addingStack = !_addingStack),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppColors.mapPins.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(_addingStack ? 'Cancel' : '+ Stack',
                        style: const TextStyle(color: AppColors.mapPins, fontSize: 12, fontWeight: FontWeight.w600)),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (_addingStack)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _stackNameCtrl,
                    autofocus: true,
                    style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                    decoration: const InputDecoration(hintText: 'Stack name (e.g. Tokyo 2025)'),
                  ),
                ),
                const SizedBox(width: 8),
                ..._stackColors.map((c) => GestureDetector(
                  onTap: () => setState(() => _stackColor = c),
                  child: Container(
                    width: 18, height: 18,
                    margin: const EdgeInsets.only(right: 4),
                    decoration: BoxDecoration(
                      color: _hex(c),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: _stackColor == c ? Colors.white : Colors.transparent,
                        width: 1.5,
                      ),
                    ),
                  ),
                )),
                IconButton(
                  icon: const Icon(Icons.check, color: AppColors.mapPins, size: 20),
                  onPressed: _saving ? null : _saveStack,
                ),
              ],
            ),
          ),
        // Stack tabs
        if (_stacks.isNotEmpty) SizedBox(
          height: 38,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            children: _stacks.map((s) => GestureDetector(
              onTap: () { setState(() => _activeStack = s); _loadPins(); },
              child: Container(
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: _activeStack?.id == s.id ? _hex(s.color).withOpacity(0.2) : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: _activeStack?.id == s.id ? _hex(s.color) : AppColors.border,
                  ),
                ),
                child: Text(s.name,
                    style: TextStyle(
                      color: _activeStack?.id == s.id ? _hex(s.color) : AppColors.textSecondary,
                      fontSize: 12,
                      fontWeight: _activeStack?.id == s.id ? FontWeight.w600 : FontWeight.normal,
                    )),
              ),
            )).toList(),
          ),
        ),
        if (_activeStack != null) Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: GestureDetector(
            onTap: () => setState(() => _addingPin = !_addingPin),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.mapPins.withOpacity(0.07),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.mapPins.withOpacity(0.2)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.add_location_alt_outlined, color: AppColors.mapPins, size: 16),
                  const SizedBox(width: 6),
                  Text(_addingPin ? 'Cancel' : 'Add pin',
                      style: const TextStyle(color: AppColors.mapPins, fontSize: 13)),
                ],
              ),
            ),
          ),
        ),
        if (_addingPin) _AddPinForm(
          labelCtrl: _pinLabelCtrl, urlCtrl: _pinUrlCtrl, noteCtrl: _pinNoteCtrl,
          priority: _pinPriority, category: _pinCategory, saving: _saving,
          onPriority: (v) => setState(() => _pinPriority = v!),
          onCategory: (v) => setState(() => _pinCategory = v!),
          onSave: _savePin,
        ),
        Expanded(
          child: _pins.isEmpty
              ? const Center(child: Text('No pins yet', style: TextStyle(color: AppColors.textDim)))
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  itemCount: _pins.length,
                  itemBuilder: (ctx, i) => _PinCard(
                    pin: _pins[i],
                    stackColor: _activeStack != null ? _hex(_activeStack!.color) : AppColors.mapPins,
                    onOpen: () => _openInMaps(_pins[i]),
                    onDelete: () => _deletePin(_pins[i]),
                  ),
                ),
        ),
      ],
    );
  }
}

class _AddPinForm extends StatelessWidget {
  final TextEditingController labelCtrl, urlCtrl, noteCtrl;
  final String priority, category;
  final bool saving;
  final ValueChanged<String?> onPriority, onCategory;
  final VoidCallback onSave;

  const _AddPinForm({
    required this.labelCtrl, required this.urlCtrl, required this.noteCtrl,
    required this.priority, required this.category, required this.saving,
    required this.onPriority, required this.onCategory, required this.onSave,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.mapPins.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          TextField(
            controller: labelCtrl,
            autofocus: true,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
            decoration: const InputDecoration(hintText: 'Place name'),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: urlCtrl,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
            decoration: const InputDecoration(hintText: 'Google Maps URL (optional)'),
          ),
          const SizedBox(height: 6),
          TextField(
            controller: noteCtrl,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
            decoration: const InputDecoration(hintText: 'NoteRow (optional)'),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Text('Priority:', style: TextStyle(color: AppColors.textDim, fontSize: 11)),
              const SizedBox(width: 6),
              DropdownButton<String>(
                value: priority,
                dropdownColor: AppColors.surface,
                style: const TextStyle(color: AppColors.textPrimary, fontSize: 12),
                onChanged: onPriority,
                items: _priorities.map((p) => DropdownMenuItem(
                    value: p,
                    child: Text(p, style: TextStyle(color: _priorityColors[p])))).toList(),
              ),
              const SizedBox(width: 12),
              const Text('Category:', style: TextStyle(color: AppColors.textDim, fontSize: 11)),
              const SizedBox(width: 6),
              DropdownButton<String>(
                value: category,
                dropdownColor: AppColors.surface,
                style: const TextStyle(color: AppColors.textPrimary, fontSize: 12),
                onChanged: onCategory,
                items: _categories.map((c) => DropdownMenuItem(
                    value: c, child: Text(c.isEmpty ? 'None' : c))).toList(),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: saving ? null : onSave,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.mapPins,
                foregroundColor: AppColors.background,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('Add Pin', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            ),
          ),
        ],
      ),
    );
  }
}

class _PinCard extends StatelessWidget {
  final MapPinRow pin;
  final Color stackColor;
  final VoidCallback onOpen;
  final VoidCallback onDelete;

  const _PinCard({required this.pin, required this.stackColor, required this.onOpen, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final priorityColor = _priorityColors[pin.priority] ?? AppColors.border;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
              color: stackColor.withOpacity(0.1),
              shape: BoxShape.circle,
              border: Border.all(color: stackColor.withOpacity(0.3)),
            ),
            child: Icon(Icons.location_on, color: stackColor, size: 18),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(pin.label,
                    style: const TextStyle(color: AppColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
                if (pin.category.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(pin.category,
                      style: const TextStyle(color: AppColors.textDim, fontSize: 10)),
                ],
                if (pin.note.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(pin.note,
                      style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                ],
              ],
            ),
          ),
          if (pin.priority != 'none') Container(
            width: 6, height: 6,
            decoration: BoxDecoration(color: priorityColor, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          if (pin.url.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.open_in_new, size: 16, color: AppColors.mapPins),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
              onPressed: onOpen,
            ),
          const SizedBox(width: 4),
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
