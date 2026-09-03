import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/db/database.dart';
import '../../shared/theme/app_theme.dart';

// db functions imported from database.dart

const _listColors = ['#38bdf8','#818cf8','#34d399','#fb923c','#f472b6','#facc15','#f87171','#a78bfa'];
const _priorities = ['low', 'medium', 'high'];
const _recurrences = ['none', 'daily', 'weekly', 'monthly'];
const _priorityColors = {'low': AppColors.subscriptions, 'medium': AppColors.keyvault, 'high': AppColors.error};

Color _hex(String h) {
  final s = h.replaceAll('#', '');
  return Color(int.parse('FF$s', radix: 16));
}

class TodoScreen extends ConsumerStatefulWidget {
  const TodoScreen({super.key});

  @override
  ConsumerState<TodoScreen> createState() => _TodoScreenState();
}

class _TodoScreenState extends ConsumerState<TodoScreen> {
  List<TodoListRow> _lists = [];
  TodoListRow? _activeList;
  List<TodoTaskRow> _tasks = [];
  bool _addingList = false;
  bool _addingTask = false;
  final _listNameCtrl = TextEditingController();
  String _listColor = '#38bdf8';
  final _taskTitleCtrl = TextEditingController();
  final _taskNoteCtrl = TextEditingController();
  String _taskPriority = 'low';
  String _taskRecurrence = 'none';
  String? _taskDueDate;
  bool _saving = false;

  

  @override
  void initState() { super.initState(); _loadLists(); }

  @override
  void dispose() {
    _listNameCtrl.dispose(); _taskTitleCtrl.dispose(); _taskNoteCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadLists() async {
    final lists = await listTodoLists();
    if (mounted) setState(() {
      _lists = lists;
      if (_activeList != null) {
        _activeList = lists.firstWhere((l) => l.id == _activeList!.id, orElse: () => lists.first);
      } else if (lists.isNotEmpty) {
        _activeList = lists.first;
      }
    });
    if (_activeList != null) await _loadTasks();
  }

  Future<void> _loadTasks() async {
    if (_activeList == null) return;
    final tasks = await listTodoTasks(_activeList!.id);
    if (mounted) setState(() => _tasks = tasks);
  }

  Future<void> _saveList() async {
    if (_listNameCtrl.text.trim().isEmpty) return;
    setState(() => _saving = true);
    await createTodoList(name: _listNameCtrl.text.trim(), color: _listColor);
    _listNameCtrl.clear();
    setState(() { _addingList = false; _saving = false; });
    await _loadLists();
  }

  Future<void> _saveTask() async {
    if (_taskTitleCtrl.text.trim().isEmpty || _activeList == null) return;
    setState(() => _saving = true);
    await createTodoTask(
      listId: _activeList!.id,
      title: _taskTitleCtrl.text.trim(),
      note: _taskNoteCtrl.text.trim(),
      priority: _taskPriority,
      dueDate: _taskDueDate,
      recurrence: _taskRecurrence,
    );
    _taskTitleCtrl.clear(); _taskNoteCtrl.clear();
    setState(() { _addingTask = false; _taskPriority = 'low'; _taskRecurrence = 'none'; _taskDueDate = null; _saving = false; });
    await _loadTasks();
  }

  Future<void> _toggleDone(TodoTaskRow t) async {
    await updateTodoTask(id: t.id, done: !t.done);
    await _loadTasks();
  }

  Future<void> _deleteTask(TodoTaskRow t) async {
    await deleteTodoTask(t.id);
    await _loadTasks();
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
                const Text('Tasks',
                    style: TextStyle(color: AppColors.textPrimary, fontSize: 18, fontWeight: FontWeight.w700)),
                const Spacer(),
                GestureDetector(
                  onTap: () => setState(() => _addingList = !_addingList),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppColors.todo.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(_addingList ? 'Cancel' : '+ List',
                        style: const TextStyle(color: AppColors.todo, fontSize: 12, fontWeight: FontWeight.w600)),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (_addingList)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _listNameCtrl,
                    autofocus: true,
                    style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                    decoration: const InputDecoration(hintText: 'List name'),
                  ),
                ),
                const SizedBox(width: 8),
                ..._listColors.map((c) => GestureDetector(
                  onTap: () => setState(() => _listColor = c),
                  child: Container(
                    width: 18, height: 18,
                    margin: const EdgeInsets.only(right: 4),
                    decoration: BoxDecoration(
                      color: _hex(c),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: _listColor == c ? Colors.white : Colors.transparent,
                        width: 1.5,
                      ),
                    ),
                  ),
                )),
                IconButton(
                  icon: const Icon(Icons.check, color: AppColors.todo, size: 20),
                  onPressed: _saving ? null : _saveList,
                ),
              ],
            ),
          ),
        // List tabs
        if (_lists.isNotEmpty) SizedBox(
          height: 38,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            children: _lists.map((l) => GestureDetector(
              onTap: () { setState(() => _activeList = l); _loadTasks(); },
              child: Container(
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: _activeList?.id == l.id ? _hex(l.color).withOpacity(0.2) : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: _activeList?.id == l.id ? _hex(l.color) : AppColors.border,
                  ),
                ),
                child: Text(l.name,
                    style: TextStyle(
                      color: _activeList?.id == l.id ? _hex(l.color) : AppColors.textSecondary,
                      fontSize: 12,
                      fontWeight: _activeList?.id == l.id ? FontWeight.w600 : FontWeight.normal,
                    )),
              ),
            )).toList(),
          ),
        ),
        if (_activeList != null) Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: GestureDetector(
            onTap: () => setState(() => _addingTask = !_addingTask),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.todo.withOpacity(0.07),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.todo.withOpacity(0.2)),
              ),
              child: Row(
                children: [
                  Icon(Icons.add, color: AppColors.todo, size: 16),
                  const SizedBox(width: 6),
                  Text(_addingTask ? 'Cancel' : 'Add task',
                      style: const TextStyle(color: AppColors.todo, fontSize: 13)),
                ],
              ),
            ),
          ),
        ),
        if (_addingTask) _AddTaskForm(
          titleCtrl: _taskTitleCtrl, noteCtrl: _taskNoteCtrl,
          priority: _taskPriority, recurrence: _taskRecurrence, dueDate: _taskDueDate,
          saving: _saving,
          onPriority: (v) => setState(() => _taskPriority = v!),
          onRecurrence: (v) => setState(() => _taskRecurrence = v!),
          onDueDate: (v) => setState(() => _taskDueDate = v),
          onSave: _saveTask,
        ),
        Expanded(
          child: _tasks.isEmpty
              ? const Center(child: Text('No tasks', style: TextStyle(color: AppColors.textDim)))
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  itemCount: _tasks.length,
                  itemBuilder: (ctx, i) => _TaskTile(
                    task: _tasks[i],
                    listColor: _activeList != null ? _hex(_activeList!.color) : AppColors.todo,
                    onToggle: () => _toggleDone(_tasks[i]),
                    onDelete: () => _deleteTask(_tasks[i]),
                  ),
                ),
        ),
      ],
    );
  }
}

class _AddTaskForm extends StatelessWidget {
  final TextEditingController titleCtrl, noteCtrl;
  final String priority, recurrence;
  final String? dueDate;
  final bool saving;
  final ValueChanged<String?> onPriority, onRecurrence;
  final ValueChanged<String?> onDueDate;
  final VoidCallback onSave;

  const _AddTaskForm({
    required this.titleCtrl, required this.noteCtrl, required this.priority,
    required this.recurrence, required this.dueDate, required this.saving,
    required this.onPriority, required this.onRecurrence, required this.onDueDate,
    required this.onSave,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.todo.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: titleCtrl,
            autofocus: true,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
            decoration: const InputDecoration(hintText: 'Task title'),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Text('Priority:', style: TextStyle(color: AppColors.textDim, fontSize: 11)),
              const SizedBox(width: 6),
              DropdownButton<String>(
                value: priority,
                dropdownColor: AppColors.surface,
                style: TextStyle(color: _priorityColors[priority] ?? AppColors.textPrimary, fontSize: 12),
                onChanged: onPriority,
                items: _priorities.map((p) => DropdownMenuItem(
                  value: p, child: Text(p, style: TextStyle(color: _priorityColors[p])))).toList(),
              ),
              const SizedBox(width: 12),
              const Text('Repeat:', style: TextStyle(color: AppColors.textDim, fontSize: 11)),
              const SizedBox(width: 6),
              DropdownButton<String>(
                value: recurrence,
                dropdownColor: AppColors.surface,
                style: const TextStyle(color: AppColors.textPrimary, fontSize: 12),
                onChanged: onRecurrence,
                items: _recurrences.map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: saving ? null : onSave,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.todo,
                foregroundColor: AppColors.background,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('Add Task', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            ),
          ),
        ],
      ),
    );
  }
}

class _TaskTile extends StatelessWidget {
  final TodoTaskRow task;
  final Color listColor;
  final VoidCallback onToggle;
  final VoidCallback onDelete;

  const _TaskTile({required this.task, required this.listColor, required this.onToggle, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final priorityColor = _priorityColors[task.priority] ?? AppColors.textDim;
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: task.done ? AppColors.border : listColor.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: onToggle,
            child: Container(
              width: 20, height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: task.done ? listColor : listColor.withOpacity(0.4),
                  width: 1.5,
                ),
                color: task.done ? listColor.withOpacity(0.3) : Colors.transparent,
              ),
              child: task.done
                  ? const Icon(Icons.check, size: 12, color: Colors.white)
                  : null,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  task.title,
                  style: TextStyle(
                    color: task.done ? AppColors.textDim : AppColors.textPrimary,
                    fontSize: 13,
                    decoration: task.done ? TextDecoration.lineThrough : null,
                  ),
                ),
                if (task.dueDate != null) ...[
                  const SizedBox(height: 2),
                  Text(task.dueDate!, style: const TextStyle(color: AppColors.textDim, fontSize: 10)),
                ],
              ],
            ),
          ),
          Container(
            width: 4, height: 20,
            decoration: BoxDecoration(
              color: priorityColor,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: onDelete,
            child: const Icon(Icons.delete_outline, size: 15, color: AppColors.textDim),
          ),
        ],
      ),
    );
  }
}
