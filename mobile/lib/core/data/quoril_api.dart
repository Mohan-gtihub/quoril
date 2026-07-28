import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';
import '../models/models.dart';

/// Data access against the Quoril Supabase backend. All rows are RLS-scoped to
/// the signed-in user, so no explicit user filters are needed on read.
/// Soft-deleted rows (`deleted_at`) are filtered client-side where relevant.
class QuorilApi {
  QuorilApi(this._db);
  final SupabaseClient _db;
  static const _uuid = Uuid();

  String? get _uid => _db.auth.currentUser?.id;
  bool get signedIn => _uid != null;

  // --- Workspaces (task groupings) -----------------------------------------

  Future<List<Workspace>> fetchWorkspaces() async {
    final rows = await _db
        .from('workspaces')
        .select('id,name,color,sort_order,deleted_at')
        .filter('deleted_at', 'is', null)
        .order('sort_order');
    final list = (rows as List).cast<Map<String, dynamic>>();
    return [
      for (var i = 0; i < list.length; i++) Workspace.fromDb(list[i], index: i),
    ];
  }

  Future<Workspace> createWorkspace(String name, String colorHex) async {
    final id = _uuid.v4();
    await _db.from('workspaces').insert({
      'id': id,
      'user_id': _uid,
      'name': name,
      'color': colorHex,
      'sort_order': 999,
    });
    return Workspace(id: id, name: name, color: parseColor(colorHex));
  }

  // --- Tasks ----------------------------------------------------------------

  Future<List<Task>> fetchTasks() async {
    final taskRows = await _db
        .from('tasks')
        .select('id,list_id,title,description,status,priority,estimate_m,spent_s,due_at,deleted_at')
        .filter('deleted_at', 'is', null)
        .order('sort_order');
    final tasks = (taskRows as List).cast<Map<String, dynamic>>();
    if (tasks.isEmpty) return [];

    // Batch-load subtasks for these tasks.
    final ids = tasks.map((t) => t['id']).toList();
    final subRows = await _db
        .from('subtasks')
        .select('id,task_id,title,done,deleted_at')
        .inFilter('task_id', ids)
        .filter('deleted_at', 'is', null);
    final byTask = <String, List<Subtask>>{};
    for (final s in (subRows as List).cast<Map<String, dynamic>>()) {
      byTask.putIfAbsent('${s['task_id']}', () => []).add(Subtask.fromDb(s));
    }
    return [
      for (final t in tasks) Task.fromDb(t, subs: byTask['${t['id']}'] ?? const []),
    ];
  }

  Future<Task> createTask(String title, {int? estimateMinutes, Priority priority = Priority.medium, String? listId, TaskBucket bucket = TaskBucket.today}) async {
    final id = _uuid.v4();
    final due = _dueForBucket(bucket);
    await _db.from('tasks').insert({
      'id': id,
      'user_id': _uid,
      'list_id': listId,
      'title': title,
      'status': 'todo',
      'priority': Task.priorityToDb(priority),
      'estimate_m': estimateMinutes,
      'due_at': due?.toIso8601String(),
    });
    return Task(id: id, title: title, estimateMinutes: estimateMinutes, priority: priority, bucket: bucket, dueAt: due, listId: listId);
  }

  Future<void> setDone(String taskId, bool done) async {
    await _db.from('tasks').update({
      'status': done ? 'done' : 'todo',
      'completed_at': done ? DateTime.now().toIso8601String() : null,
    }).eq('id', taskId);
  }

  Future<void> moveBucket(String taskId, TaskBucket bucket) async {
    await _db.from('tasks').update({
      'status': bucket == TaskBucket.done ? 'done' : 'todo',
      'due_at': _dueForBucket(bucket)?.toIso8601String(),
    }).eq('id', taskId);
  }

  Future<void> updateTask(Task t) async {
    await _db.from('tasks').update({
      'title': t.title,
      'priority': Task.priorityToDb(t.priority),
      'estimate_m': t.estimateMinutes,
      'description': t.notes,
      'due_at': (t.dueAt ?? _dueForBucket(t.bucket))?.toIso8601String(),
    }).eq('id', t.id);
  }

  Future<void> deleteTask(String taskId) async {
    await _db.from('tasks').update({'deleted_at': DateTime.now().toIso8601String()}).eq('id', taskId);
  }

  // --- Focus sessions -------------------------------------------------------

  Future<void> logSession({required SessionType type, required int seconds, String? taskId}) async {
    await _db.from('focus_sessions').insert({
      'id': _uuid.v4(),
      'user_id': _uid,
      'task_id': taskId,
      'type': type == SessionType.pomodoro ? 'focus' : 'deep_work',
      'seconds': seconds,
      'start_time': DateTime.now().subtract(Duration(seconds: seconds)).toIso8601String(),
      'end_time': DateTime.now().toIso8601String(),
    });
  }

  Future<List<FocusSession>> fetchSessions({int limit = 20}) async {
    final rows = await _db
        .from('focus_sessions')
        .select('id,type,seconds,task_id,start_time')
        .order('start_time', ascending: false)
        .limit(limit);
    return [
      for (final r in (rows as List).cast<Map<String, dynamic>>())
        FocusSession(
          id: '${r['id']}',
          type: '${r['type']}' == 'focus' ? SessionType.pomodoro : SessionType.deepWork,
          durationSeconds: (r['seconds'] as num?)?.toInt() ?? 0,
          startedAt: r['start_time'] != null ? DateTime.tryParse('${r['start_time']}') : null,
        ),
    ];
  }

  // --- Profile & feedback ---------------------------------------------------

  Future<Map<String, dynamic>?> fetchProfile() async {
    if (_uid == null) return null;
    final rows = await _db.from('profiles').select().eq('id', _uid!).limit(1);
    final list = (rows as List).cast<Map<String, dynamic>>();
    return list.isEmpty ? null : list.first;
  }

  Future<void> submitFeedback(String type, String message, {String? route}) async {
    await _db.from('feedback').insert({
      'id': _uuid.v4(),
      'user_id': _uid,
      'user_email': _db.auth.currentUser?.email,
      'type': type,
      'message': message,
      'route': route,
      'platform': 'ios',
      'app_version': '1.0.0',
      'status': 'new',
    });
  }

  DateTime? _dueForBucket(TaskBucket b) {
    final now = DateTime.now();
    return switch (b) {
      TaskBucket.today => DateTime(now.year, now.month, now.day, 23, 59),
      TaskBucket.week => DateTime(now.year, now.month, now.day + 5, 23, 59),
      TaskBucket.backlog => null,
      TaskBucket.done => null,
    };
  }
}
