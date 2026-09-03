import 'dart:convert';
import 'dart:math';
import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

// ── Singleton database ─────────────────────────────────────────────────────

Database? _db;

Future<Database> getDb() async {
  if (_db != null) return _db!;
  final dir = await getDatabasesPath();
  _db = await openDatabase(
    p.join(dir, 'my_space.db'),
    version: 1,
    onCreate: (db, v) async {
      await db.execute('''CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL DEFAULT '',
        tags TEXT NOT NULL DEFAULT '[]', image_data TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      )''');
      await db.execute('''CREATE TABLE IF NOT EXISTS secrets (
        id TEXT PRIMARY KEY, label TEXT NOT NULL,
        ciphertext TEXT NOT NULL, iv TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT '[]',
        url TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      )''');
      await db.execute('''CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY, name TEXT NOT NULL,
        amount REAL NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'USD',
        cycle TEXT NOT NULL DEFAULT 'monthly', start_date TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT '[]', notes TEXT NOT NULL DEFAULT '',
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      )''');
      await db.execute('''CREATE TABLE IF NOT EXISTS bills (
        sub_id TEXT NOT NULL, year INTEGER NOT NULL, month INTEGER NOT NULL,
        amount REAL NOT NULL, currency TEXT NOT NULL DEFAULT 'USD',
        notes TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL,
        PRIMARY KEY (sub_id, year, month)
      )''');
      await db.execute('''CREATE TABLE IF NOT EXISTS todo_lists (
        id TEXT PRIMARY KEY, name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#38bdf8', icon TEXT NOT NULL DEFAULT 'list',
        created_at TEXT NOT NULL
      )''');
      await db.execute('''CREATE TABLE IF NOT EXISTS todo_tasks (
        id TEXT PRIMARY KEY, list_id TEXT NOT NULL, title TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '', priority TEXT NOT NULL DEFAULT 'low',
        due_date TEXT, recurrence TEXT NOT NULL DEFAULT 'none',
        done INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      )''');
      await db.execute('''CREATE TABLE IF NOT EXISTS map_stacks (
        id TEXT PRIMARY KEY, name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#fb923c', icon TEXT NOT NULL DEFAULT 'map',
        created_at TEXT NOT NULL
      )''');
      await db.execute('''CREATE TABLE IF NOT EXISTS map_pins (
        id TEXT PRIMARY KEY, stack_id TEXT NOT NULL, label TEXT NOT NULL,
        lat REAL NOT NULL DEFAULT 0, lng REAL NOT NULL DEFAULT 0,
        url TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '',
        priority TEXT NOT NULL DEFAULT 'none', category TEXT NOT NULL DEFAULT '',
        rating REAL NOT NULL DEFAULT 0, review_note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      )''');
    },
  );
  return _db!;
}

String _now() => DateTime.now().toIso8601String();
String _uuid() {
  final rng = Random.secure();
  final bytes = List<int>.generate(16, (_) => rng.nextInt(256));
  bytes[6] = (bytes[6] & 0x0F) | 0x40;
  bytes[8] = (bytes[8] & 0x3F) | 0x80;
  String hex(int b) => b.toRadixString(16).padLeft(2, '0');
  return '${hex(bytes[0])}${hex(bytes[1])}${hex(bytes[2])}${hex(bytes[3])}'
      '-${hex(bytes[4])}${hex(bytes[5])}'
      '-${hex(bytes[6])}${hex(bytes[7])}'
      '-${hex(bytes[8])}${hex(bytes[9])}'
      '-${hex(bytes[10])}${hex(bytes[11])}${hex(bytes[12])}${hex(bytes[13])}${hex(bytes[14])}${hex(bytes[15])}';
}

List<String> _tags(String json) {
  try { return List<String>.from(jsonDecode(json) as List); } catch (_) { return []; }
}

// ── Data classes ───────────────────────────────────────────────────────────

class NoteRow {
  final String id, title, content, tags, imageData, createdAt, updatedAt;
  NoteRow.fromMap(Map<String, dynamic> m)
      : id = m['id'] as String,
        title = m['title'] as String,
        content = m['content'] as String,
        tags = m['tags'] as String,
        imageData = m['image_data'] as String,
        createdAt = m['created_at'] as String,
        updatedAt = m['updated_at'] as String;
  List<String> get tagList => _tags(tags);
  List<String> get images => _tags(imageData);
}

class SecretRow {
  final String id, label, ciphertext, iv, tags, url, description, createdAt, updatedAt;
  SecretRow.fromMap(Map<String, dynamic> m)
      : id = m['id'] as String,
        label = m['label'] as String,
        ciphertext = m['ciphertext'] as String,
        iv = m['iv'] as String,
        tags = m['tags'] as String,
        url = m['url'] as String,
        description = m['description'] as String,
        createdAt = m['created_at'] as String,
        updatedAt = m['updated_at'] as String;
  List<String> get tagList => _tags(tags);
}

class SubscriptionRow {
  final String id, name, currency, cycle, startDate, tags, notes, createdAt, updatedAt;
  final double amount;
  final bool active;
  SubscriptionRow.fromMap(Map<String, dynamic> m)
      : id = m['id'] as String,
        name = m['name'] as String,
        amount = (m['amount'] as num).toDouble(),
        currency = m['currency'] as String,
        cycle = m['cycle'] as String,
        startDate = m['start_date'] as String,
        tags = m['tags'] as String,
        notes = m['notes'] as String,
        active = (m['active'] as int) == 1,
        createdAt = m['created_at'] as String,
        updatedAt = m['updated_at'] as String;
  List<String> get tagList => _tags(tags);
}

class BillRow {
  final String subId, currency, notes, updatedAt;
  final int year, month;
  final double amount;
  BillRow.fromMap(Map<String, dynamic> m)
      : subId = m['sub_id'] as String,
        year = m['year'] as int,
        month = m['month'] as int,
        amount = (m['amount'] as num).toDouble(),
        currency = m['currency'] as String,
        notes = m['notes'] as String,
        updatedAt = m['updated_at'] as String;
}

class TodoListRow {
  final String id, name, color, icon, createdAt;
  TodoListRow.fromMap(Map<String, dynamic> m)
      : id = m['id'] as String,
        name = m['name'] as String,
        color = m['color'] as String,
        icon = m['icon'] as String,
        createdAt = m['created_at'] as String;
}

class TodoTaskRow {
  final String id, listId, title, note, priority, recurrence, createdAt, updatedAt;
  final String? dueDate;
  final bool done;
  TodoTaskRow.fromMap(Map<String, dynamic> m)
      : id = m['id'] as String,
        listId = m['list_id'] as String,
        title = m['title'] as String,
        note = m['note'] as String,
        priority = m['priority'] as String,
        dueDate = m['due_date'] as String?,
        recurrence = m['recurrence'] as String,
        done = (m['done'] as int) == 1,
        createdAt = m['created_at'] as String,
        updatedAt = m['updated_at'] as String;
}

class MapStackRow {
  final String id, name, color, icon, createdAt;
  MapStackRow.fromMap(Map<String, dynamic> m)
      : id = m['id'] as String,
        name = m['name'] as String,
        color = m['color'] as String,
        icon = m['icon'] as String,
        createdAt = m['created_at'] as String;
}

class MapPinRow {
  final String id, stackId, label, url, note, priority, category, reviewNote, createdAt;
  final double lat, lng, rating;
  MapPinRow.fromMap(Map<String, dynamic> m)
      : id = m['id'] as String,
        stackId = m['stack_id'] as String,
        label = m['label'] as String,
        lat = (m['lat'] as num).toDouble(),
        lng = (m['lng'] as num).toDouble(),
        url = m['url'] as String,
        note = m['note'] as String,
        priority = m['priority'] as String,
        category = m['category'] as String,
        rating = (m['rating'] as num).toDouble(),
        reviewNote = m['review_note'] as String,
        createdAt = m['created_at'] as String;
}

// ── Notes ──────────────────────────────────────────────────────────────────

Future<List<NoteRow>> listNotes({String? query, String? tag}) async {
  final db = await getDb();
  final all = (await db.query('notes', orderBy: 'updated_at DESC'))
      .map(NoteRow.fromMap).toList();
  return all.where((n) {
    if (tag != null && !n.tagList.contains(tag)) return false;
    if (query != null && query.isNotEmpty) {
      final lq = query.toLowerCase();
      if (!n.title.toLowerCase().contains(lq) && !n.content.toLowerCase().contains(lq)) return false;
    }
    return true;
  }).toList();
}

Future<NoteRow?> getNoteById(String id) async {
  final db = await getDb();
  final rows = await db.query('notes', where: 'id = ?', whereArgs: [id]);
  return rows.isEmpty ? null : NoteRow.fromMap(rows.first);
}

Future<NoteRow> createNote({
  required String title,
  String content = '',
  List<String> tags = const [],
  List<String> imageData = const [],
}) async {
  final db = await getDb();
  final id = _uuid();
  final now = _now();
  await db.insert('notes', {
    'id': id, 'title': title, 'content': content,
    'tags': jsonEncode(tags), 'image_data': jsonEncode(imageData),
    'created_at': now, 'updated_at': now,
  });
  return (await getNoteById(id))!;
}

Future<void> updateNote({
  required String id,
  String? title, String? content, List<String>? tags, List<String>? imageData,
}) async {
  final db = await getDb();
  final vals = <String, dynamic>{'updated_at': _now()};
  if (title != null) vals['title'] = title;
  if (content != null) vals['content'] = content;
  if (tags != null) vals['tags'] = jsonEncode(tags);
  if (imageData != null) vals['image_data'] = jsonEncode(imageData);
  await db.update('notes', vals, where: 'id = ?', whereArgs: [id]);
}

Future<void> deleteNote(String id) async =>
    (await getDb()).delete('notes', where: 'id = ?', whereArgs: [id]);

Future<List<String>> notesTags() async {
  final all = await listNotes();
  final set = <String>{};
  for (final n in all) set.addAll(n.tagList);
  return set.toList()..sort();
}

// ── Secrets ────────────────────────────────────────────────────────────────

Future<List<SecretRow>> listSecrets({String? query, String? tag}) async {
  final db = await getDb();
  final all = (await db.query('secrets', orderBy: 'updated_at DESC'))
      .map(SecretRow.fromMap).toList();
  return all.where((s) {
    if (tag != null && !s.tagList.contains(tag)) return false;
    if (query != null && query.isNotEmpty) {
      if (!s.label.toLowerCase().contains(query.toLowerCase())) return false;
    }
    return true;
  }).toList();
}

Future<SecretRow?> getSecret(String id) async {
  final db = await getDb();
  final rows = await db.query('secrets', where: 'id = ?', whereArgs: [id]);
  return rows.isEmpty ? null : SecretRow.fromMap(rows.first);
}

Future<void> createSecret({
  required String label, required String ciphertext, required String iv,
  List<String> tags = const [], String url = '', String description = '',
}) async {
  final db = await getDb();
  final now = _now();
  await db.insert('secrets', {
    'id': _uuid(), 'label': label, 'ciphertext': ciphertext, 'iv': iv,
    'tags': jsonEncode(tags), 'url': url, 'description': description,
    'created_at': now, 'updated_at': now,
  });
}

Future<void> updateSecret({
  required String id,
  String? label, String? ciphertext, String? iv,
  List<String>? tags, String? url, String? description,
}) async {
  final db = await getDb();
  final vals = <String, dynamic>{'updated_at': _now()};
  if (label != null) vals['label'] = label;
  if (ciphertext != null) vals['ciphertext'] = ciphertext;
  if (iv != null) vals['iv'] = iv;
  if (tags != null) vals['tags'] = jsonEncode(tags);
  if (url != null) vals['url'] = url;
  if (description != null) vals['description'] = description;
  await db.update('secrets', vals, where: 'id = ?', whereArgs: [id]);
}

Future<void> deleteSecret(String id) async =>
    (await getDb()).delete('secrets', where: 'id = ?', whereArgs: [id]);

Future<List<String>> secretsTags() async {
  final all = await listSecrets();
  final set = <String>{};
  for (final s in all) set.addAll(s.tagList);
  return set.toList()..sort();
}

// ── Subscriptions ──────────────────────────────────────────────────────────

Future<List<SubscriptionRow>> listSubscriptions({String? query, String? tag}) async {
  final db = await getDb();
  final all = (await db.query('subscriptions', orderBy: 'updated_at DESC'))
      .map(SubscriptionRow.fromMap).toList();
  return all.where((s) {
    if (tag != null && !s.tagList.contains(tag)) return false;
    if (query != null && query.isNotEmpty) {
      if (!s.name.toLowerCase().contains(query.toLowerCase())) return false;
    }
    return true;
  }).toList();
}

Future<void> createSubscription({
  required String name, required double amount, required String currency,
  required String cycle, required String startDate,
  List<String> tags = const [], String notes = '', bool active = true,
}) async {
  final db = await getDb();
  final now = _now();
  await db.insert('subscriptions', {
    'id': _uuid(), 'name': name, 'amount': amount, 'currency': currency,
    'cycle': cycle, 'start_date': startDate,
    'tags': jsonEncode(tags), 'notes': notes, 'active': active ? 1 : 0,
    'created_at': now, 'updated_at': now,
  });
}

Future<void> updateSubscription({
  required String id,
  String? name, double? amount, String? currency, String? cycle, String? startDate,
  List<String>? tags, String? notes, bool? active,
}) async {
  final db = await getDb();
  final vals = <String, dynamic>{'updated_at': _now()};
  if (name != null) vals['name'] = name;
  if (amount != null) vals['amount'] = amount;
  if (currency != null) vals['currency'] = currency;
  if (cycle != null) vals['cycle'] = cycle;
  if (startDate != null) vals['start_date'] = startDate;
  if (tags != null) vals['tags'] = jsonEncode(tags);
  if (notes != null) vals['notes'] = notes;
  if (active != null) vals['active'] = active ? 1 : 0;
  await db.update('subscriptions', vals, where: 'id = ?', whereArgs: [id]);
}

Future<void> deleteSubscription(String id) async =>
    (await getDb()).delete('subscriptions', where: 'id = ?', whereArgs: [id]);

// ── Bills ──────────────────────────────────────────────────────────────────

Future<List<BillRow>> allBills() async =>
    (await (await getDb()).query('bills')).map(BillRow.fromMap).toList();

Future<void> upsertBill({
  required String subId, required int year, required int month,
  required double amount, required String currency, String notes = '',
}) async {
  await (await getDb()).insert('bills', {
    'sub_id': subId, 'year': year, 'month': month, 'amount': amount,
    'currency': currency, 'notes': notes, 'updated_at': _now(),
  }, conflictAlgorithm: ConflictAlgorithm.replace);
}

// ── Todo Lists ─────────────────────────────────────────────────────────────

Future<List<TodoListRow>> listTodoLists() async =>
    (await (await getDb()).query('todo_lists', orderBy: 'created_at ASC'))
        .map(TodoListRow.fromMap).toList();

Future<void> createTodoList({
  required String name, required String color, String icon = 'list',
}) async {
  await (await getDb()).insert('todo_lists', {
    'id': _uuid(), 'name': name, 'color': color, 'icon': icon, 'created_at': _now(),
  });
}

Future<void> deleteTodoList(String id) async {
  final db = await getDb();
  await db.delete('todo_tasks', where: 'list_id = ?', whereArgs: [id]);
  await db.delete('todo_lists', where: 'id = ?', whereArgs: [id]);
}

// ── Todo Tasks ─────────────────────────────────────────────────────────────

Future<List<TodoTaskRow>> listTodoTasks(String listId) async =>
    (await (await getDb()).query('todo_tasks',
        where: 'list_id = ?', whereArgs: [listId], orderBy: 'created_at ASC'))
        .map(TodoTaskRow.fromMap).toList();

Future<void> createTodoTask({
  required String listId, required String title,
  String note = '', String priority = 'low',
  String? dueDate, String recurrence = 'none',
}) async {
  final now = _now();
  await (await getDb()).insert('todo_tasks', {
    'id': _uuid(), 'list_id': listId, 'title': title, 'note': note,
    'priority': priority, 'due_date': dueDate, 'recurrence': recurrence,
    'done': 0, 'created_at': now, 'updated_at': now,
  });
}

Future<void> updateTodoTask({
  required String id,
  String? title, String? note, String? priority,
  String? dueDate, String? recurrence, bool? done,
}) async {
  final db = await getDb();
  final vals = <String, dynamic>{'updated_at': _now()};
  if (title != null) vals['title'] = title;
  if (note != null) vals['note'] = note;
  if (priority != null) vals['priority'] = priority;
  if (dueDate != null) vals['due_date'] = dueDate;
  if (recurrence != null) vals['recurrence'] = recurrence;
  if (done != null) vals['done'] = done ? 1 : 0;
  await db.update('todo_tasks', vals, where: 'id = ?', whereArgs: [id]);
}

Future<void> deleteTodoTask(String id) async =>
    (await getDb()).delete('todo_tasks', where: 'id = ?', whereArgs: [id]);

// ── Map Stacks ─────────────────────────────────────────────────────────────

Future<List<MapStackRow>> listMapStacks() async =>
    (await (await getDb()).query('map_stacks', orderBy: 'created_at ASC'))
        .map(MapStackRow.fromMap).toList();

Future<void> createMapStack({
  required String name, required String color, String icon = 'map',
}) async {
  await (await getDb()).insert('map_stacks', {
    'id': _uuid(), 'name': name, 'color': color, 'icon': icon, 'created_at': _now(),
  });
}

Future<void> deleteMapStack(String id) async {
  final db = await getDb();
  await db.delete('map_pins', where: 'stack_id = ?', whereArgs: [id]);
  await db.delete('map_stacks', where: 'id = ?', whereArgs: [id]);
}

// ── Map Pins ───────────────────────────────────────────────────────────────

Future<List<MapPinRow>> listMapPins(String stackId) async =>
    (await (await getDb()).query('map_pins',
        where: 'stack_id = ?', whereArgs: [stackId]))
        .map(MapPinRow.fromMap).toList();

Future<void> createMapPin({
  required String stackId, required String label,
  double lat = 0, double lng = 0,
  String url = '', String note = '',
  String priority = 'none', String category = '',
  double rating = 0, String reviewNote = '',
}) async {
  await (await getDb()).insert('map_pins', {
    'id': _uuid(), 'stack_id': stackId, 'label': label,
    'lat': lat, 'lng': lng, 'url': url, 'note': note,
    'priority': priority, 'category': category,
    'rating': rating, 'review_note': reviewNote,
    'created_at': _now(),
  });
}

Future<void> updateMapPin({
  required String id,
  String? label, String? note, String? priority,
  String? category, double? rating, String? reviewNote,
}) async {
  final db = await getDb();
  final vals = <String, dynamic>{};
  if (label != null) vals['label'] = label;
  if (note != null) vals['note'] = note;
  if (priority != null) vals['priority'] = priority;
  if (category != null) vals['category'] = category;
  if (rating != null) vals['rating'] = rating;
  if (reviewNote != null) vals['review_note'] = reviewNote;
  if (vals.isNotEmpty) await db.update('map_pins', vals, where: 'id = ?', whereArgs: [id]);
}

Future<void> deleteMapPin(String id) async =>
    (await getDb()).delete('map_pins', where: 'id = ?', whereArgs: [id]);

// ── Full export (for sync) ─────────────────────────────────────────────────

Future<Map<String, dynamic>> exportAll() async {
  final db = await getDb();
  return {
    'notes': (await db.query('notes')).toList(),
    'secrets': (await db.query('secrets')).toList(),
    'subscriptions': (await db.query('subscriptions')).toList(),
    'bills': (await db.query('bills')).toList(),
    'todoLists': (await db.query('todo_lists')).toList(),
    'todoTasks': (await db.query('todo_tasks')).toList(),
    'mapStacks': (await db.query('map_stacks')).toList(),
    'mapPins': (await db.query('map_pins')).toList(),
  };
}
