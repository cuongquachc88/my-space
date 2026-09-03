import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/db/database.dart';
import '../../shared/theme/app_theme.dart';
import '../../shared/widgets/tag_input.dart';

// Provider for the database
// db functions imported from database.dart

class NotesScreen extends ConsumerStatefulWidget {
  const NotesScreen({super.key});

  @override
  ConsumerState<NotesScreen> createState() => _NotesScreenState();
}

class _NotesScreenState extends ConsumerState<NotesScreen> {
  List<NoteRow> _notes = [];
  List<String> _allTags = [];
  String? _activeTag;
  String _query = '';
  NoteRow? _selected;
  bool _previewMode = false;
  final _titleCtrl = TextEditingController();
  final _contentCtrl = TextEditingController();
  List<String> _editTags = [];
  List<String> _editImages = [];
  bool _saving = false;

  

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _contentCtrl.dispose();
    super.dispose();
  }

  Future<void> _load({String query = '', String? tag}) async {
    final notes = await listNotes(query: query, tag: tag);
    final tags = await notesTags();
    if (mounted) setState(() { _notes = notes; _allTags = tags; });
  }

  void _select(NoteRow n) {
    setState(() {
      _selected = n;
      _titleCtrl.text = n.title;
      _contentCtrl.text = n.content;
      _editTags = _parseTags(n.tags);
      _editImages = _parseImages(n.imageData);
      _previewMode = false;
    });
  }

  void _newNote() {
    setState(() {
      _selected = null;
      _titleCtrl.clear();
      _contentCtrl.clear();
      _editTags = [];
      _editImages = [];
      _previewMode = false;
    });
  }

  Future<void> _save() async {
    if (_titleCtrl.text.trim().isEmpty) return;
    setState(() => _saving = true);
    try {
      if (_selected == null) {
        await createNote(
          title: _titleCtrl.text.trim(),
          content: _contentCtrl.text,
          tags: _editTags,
          imageData: _editImages,
        );
      } else {
        await updateNote(
          id: _selected!.id,
          title: _titleCtrl.text.trim(),
          content: _contentCtrl.text,
          tags: _editTags,
          imageData: _editImages,
        );
      }
      await _load(query: _query, tag: _activeTag);
      if (mounted) setState(() { _selected = null; _saving = false; });
    } catch (_) {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete(NoteRow n) async {
    await deleteNote(n.id);
    await _load(query: _query, tag: _activeTag);
    if (mounted && _selected?.id == n.id) setState(() => _selected = null);
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
    if (file == null) return;
    final bytes = await file.readAsBytes();
    final b64 = base64Encode(bytes);
    final ext = file.path.split('.').last.toLowerCase();
    final mime = ext == 'png' ? 'image/png' : 'image/jpeg';
    setState(() => _editImages.add('data:$mime;base64,$b64'));
  }

  List<String> _parseTags(String json) {
    try { return List<String>.from(jsonDecode(json) as List); } catch (_) { return []; }
  }

  List<String> _parseImages(String json) {
    try { return List<String>.from(jsonDecode(json) as List); } catch (_) { return []; }
  }

  @override
  Widget build(BuildContext context) {
    final editing = _selected != null || _titleCtrl.text.isNotEmpty || _contentCtrl.text.isNotEmpty;

    return Column(
      children: [
        _Header(
          editing: editing,
          onNew: _newNote,
          onBack: editing ? () => setState(() { _selected = null; _titleCtrl.clear(); _contentCtrl.clear(); }) : null,
          accent: AppColors.notes,
        ),
        if (!editing) ...[
          _SearchBar(
            onChanged: (q) { setState(() => _query = q); _load(query: q, tag: _activeTag); },
          ),
          _TagFilter(
            tags: _allTags,
            active: _activeTag,
            onSelect: (t) { setState(() => _activeTag = t); _load(query: _query, tag: t); },
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              itemCount: _notes.length,
              itemBuilder: (ctx, i) => _NoteCard(
                note: _notes[i],
                onTap: () => _select(_notes[i]),
                onDelete: () => _delete(_notes[i]),
                parseTags: _parseTags,
              ),
            ),
          ),
        ] else ...[
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                children: [
                  TextField(
                    controller: _titleCtrl,
                    style: const TextStyle(color: AppColors.textPrimary, fontSize: 16, fontWeight: FontWeight.w600),
                    decoration: const InputDecoration(hintText: 'Title', border: InputBorder.none),
                    onChanged: (_) => setState(() {}),
                  ),
                  TagInput(
                    tags: _editTags,
                    onChanged: (t) => setState(() => _editTags = t),
                  ),
                  Row(
                    children: [
                      _PillButton(
                        label: 'Edit',
                        active: !_previewMode,
                        onTap: () => setState(() => _previewMode = false),
                      ),
                      const SizedBox(width: 8),
                      _PillButton(
                        label: 'Preview',
                        active: _previewMode,
                        onTap: () => setState(() => _previewMode = true),
                      ),
                      const Spacer(),
                      IconButton(
                        icon: const Icon(Icons.image_outlined, size: 20, color: AppColors.textSecondary),
                        onPressed: _pickImage,
                      ),
                    ],
                  ),
                  Expanded(
                    child: _previewMode
                        ? Markdown(
                            data: _contentCtrl.text,
                            styleSheet: MarkdownStyleSheet(
                              p: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                              code: const TextStyle(color: AppColors.notes, fontFamily: 'monospace'),
                            ),
                          )
                        : TextField(
                            controller: _contentCtrl,
                            maxLines: null,
                            expands: true,
                            style: const TextStyle(color: AppColors.textPrimary, fontSize: 14, height: 1.5),
                            decoration: const InputDecoration(
                              hintText: 'Write in markdown…',
                              border: InputBorder.none,
                            ),
                          ),
                  ),
                  if (_editImages.isNotEmpty)
                    SizedBox(
                      height: 80,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: _editImages.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (ctx, i) => Stack(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.memory(
                                base64Decode(_editImages[i].split(',').last),
                                width: 80,
                                height: 80,
                                fit: BoxFit.cover,
                              ),
                            ),
                            Positioned(
                              top: 2, right: 2,
                              child: GestureDetector(
                                onTap: () => setState(() => _editImages.removeAt(i)),
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: Colors.black54,
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(Icons.close, size: 14, color: Colors.white),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _saving ? null : _save,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.notes,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: _saving
                            ? const SizedBox(width: 16, height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('Save', style: TextStyle(fontWeight: FontWeight.w600)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}

// ── Sub-widgets ────────────────────────────────────────────────────────────

class _Header extends StatelessWidget {
  final bool editing;
  final VoidCallback onNew;
  final VoidCallback? onBack;
  final Color accent;

  const _Header({required this.editing, required this.onNew, required this.onBack, required this.accent});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          children: [
            if (editing && onBack != null)
              IconButton(
                icon: const Icon(Icons.arrow_back_ios, size: 18, color: AppColors.textSecondary),
                onPressed: onBack,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            Text(
              editing ? 'NoteRow' : 'Notes',
              style: const TextStyle(color: AppColors.textPrimary, fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const Spacer(),
            if (!editing)
              GestureDetector(
                onTap: onNew,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: accent.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text('+ New', style: TextStyle(color: accent, fontSize: 13, fontWeight: FontWeight.w600)),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _SearchBar extends StatelessWidget {
  final ValueChanged<String> onChanged;
  const _SearchBar({required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: TextField(
        onChanged: onChanged,
        style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
        decoration: const InputDecoration(
          hintText: 'Search notes…',
          prefixIcon: Icon(Icons.search, size: 18, color: AppColors.textDim),
        ),
      ),
    );
  }
}

class _TagFilter extends StatelessWidget {
  final List<String> tags;
  final String? active;
  final ValueChanged<String?> onSelect;

  const _TagFilter({required this.tags, required this.active, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    if (tags.isEmpty) return const SizedBox.shrink();
    return SizedBox(
      height: 32,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        children: [
          _Chip(label: 'All', active: active == null, onTap: () => onSelect(null)),
          ...tags.map((t) => _Chip(label: t, active: active == t, onTap: () => onSelect(t))),
        ],
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _Chip({required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 6),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: active ? AppColors.notes.withOpacity(0.2) : Colors.transparent,
          border: Border.all(
            color: active ? AppColors.notes : AppColors.border,
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: active ? AppColors.notes : AppColors.textSecondary,
            fontSize: 11,
            fontWeight: active ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}

class _NoteCard extends StatelessWidget {
  final NoteRow note;
  final VoidCallback onTap;
  final VoidCallback onDelete;
  final List<String> Function(String) parseTags;

  const _NoteCard({
    required this.note,
    required this.onTap,
    required this.onDelete,
    required this.parseTags,
  });

  @override
  Widget build(BuildContext context) {
    final tags = parseTags(note.tags);
    return GestureDetector(
      onTap: onTap,
      child: Container(
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
                  child: Text(
                    note.title.isEmpty ? 'Untitled' : note.title,
                    style: const TextStyle(color: AppColors.textPrimary, fontSize: 14, fontWeight: FontWeight.w600),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                GestureDetector(
                  onTap: onDelete,
                  child: const Icon(Icons.delete_outline, size: 16, color: AppColors.textDim),
                ),
              ],
            ),
            if (note.content.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                note.content,
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            if (tags.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 4,
                children: tags.map((t) => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.notes.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(t, style: const TextStyle(color: AppColors.notes, fontSize: 10)),
                )).toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _PillButton extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _PillButton({required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: active ? AppColors.notes.withOpacity(0.2) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: active ? AppColors.notes : AppColors.border),
        ),
        child: Text(label, style: TextStyle(
          color: active ? AppColors.notes : AppColors.textSecondary,
          fontSize: 12, fontWeight: active ? FontWeight.w600 : FontWeight.normal,
        )),
      ),
    );
  }
}
