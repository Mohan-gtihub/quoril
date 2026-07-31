import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../auth/auth_service.dart';
import '../models/models.dart';
import 'mock_data.dart';
import 'quoril_api.dart';

/// Supabase client (initialized in main before runApp).
final supabaseClientProvider = Provider<SupabaseClient>((_) => Supabase.instance.client);

final authServiceProvider = Provider<AuthService>((ref) => AuthService(ref.watch(supabaseClientProvider)));

/// Emits on every auth change (sign in/out, token refresh).
final authStateProvider = StreamProvider<AuthState>((ref) => ref.watch(authServiceProvider).onAuthStateChange);

/// True once a session exists.
final signedInProvider = Provider<bool>((ref) {
  ref.watch(authStateProvider); // rebuild on change
  return ref.watch(authServiceProvider).isSignedIn;
});

final apiProvider = Provider<QuorilApi>((ref) => QuorilApi(ref.watch(supabaseClientProvider)));

/// Workspaces — real when signed in, mock otherwise (or on error).
final workspacesProvider = FutureProvider<List<Workspace>>((ref) async {
  ref.watch(authStateProvider);
  final api = ref.watch(apiProvider);
  if (!api.signedIn) return Mock.workspaces;
  try {
    final ws = await api.fetchWorkspaces();
    return ws.isEmpty ? Mock.workspaces : ws;
  } catch (_) {
    return Mock.workspaces;
  }
});

final profileProvider = FutureProvider<Map<String, dynamic>?>((ref) async {
  ref.watch(authStateProvider);
  final api = ref.watch(apiProvider);
  if (!api.signedIn) return null;
  try {
    return await api.fetchProfile();
  } catch (_) {
    return null;
  }
});

/// Tasks with optimistic mutations. Works signed-in (Supabase) or offline (mock).
final tasksProvider = AsyncNotifierProvider<TasksNotifier, List<Task>>(TasksNotifier.new);

class TasksNotifier extends AsyncNotifier<List<Task>> {
  QuorilApi get _api => ref.read(apiProvider);

  @override
  Future<List<Task>> build() async {
    if (!_api.signedIn) return Mock.tasks();
    try {
      final t = await _api.fetchTasks();
      return t.isEmpty ? Mock.tasks() : t;
    } catch (_) {
      return Mock.tasks();
    }
  }

  List<Task> get _current => state.valueOrNull ?? const [];

  Future<void> toggleDone(Task task) async {
    final next = task.done ? TaskBucket.today : TaskBucket.done;
    _patch(task.id, (t) {
      t.done = !t.done;
      t.bucket = t.done ? TaskBucket.done : next;
    });
    if (_api.signedIn) {
      try {
        await _api.setDone(task.id, !task.done);
      } catch (_) {}
    }
  }

  Future<void> move(Task task, TaskBucket bucket) async {
    _patch(task.id, (t) {
      t.bucket = bucket;
      t.done = bucket == TaskBucket.done;
    });
    if (_api.signedIn) {
      try {
        await _api.moveBucket(task.id, bucket);
      } catch (_) {}
    }
  }

  Future<void> add(String title, {int? estimateMinutes, Priority priority = Priority.medium, TaskBucket bucket = TaskBucket.today, String? listId}) async {
    Task created;
    if (_api.signedIn) {
      try {
        created = await _api.createTask(title, estimateMinutes: estimateMinutes, priority: priority, bucket: bucket, listId: listId);
      } catch (_) {
        created = Task(id: 'local-${DateTime.now().microsecondsSinceEpoch}', title: title, estimateMinutes: estimateMinutes, priority: priority, bucket: bucket);
      }
    } else {
      created = Task(id: 'local-${DateTime.now().microsecondsSinceEpoch}', title: title, estimateMinutes: estimateMinutes, priority: priority, bucket: bucket);
    }
    state = AsyncData([created, ..._current]);
  }

  /// Move an existing task to a specific start time + duration (drag-to-schedule
  /// / AI plan). Patches dueAt, startLabel and estimate optimistically.
  Future<void> scheduleTask(Task task, DateTime startAt, {int? durationMinutes}) async {
    final label =
        '${startAt.hour.toString().padLeft(2, '0')}:${startAt.minute.toString().padLeft(2, '0')}';
    _patch(task.id, (t) {
      t.dueAt = startAt;
      t.startLabel = label;
      t.bucket = Task.bucketFrom(t.done ? 'done' : null, startAt);
      if (durationMinutes != null) t.estimateMinutes = durationMinutes;
    });
    if (_api.signedIn) {
      try {
        await _api.updateTask(_current.firstWhere((t) => t.id == task.id));
      } catch (_) {}
    }
  }

  /// Create a task scheduled at a specific time with a duration (Structured
  /// create flow). Optimistic local insert; best-effort backend write.
  Future<void> addScheduled({
    required String title,
    required DateTime startAt,
    int durationMinutes = 30,
    Priority priority = Priority.medium,
  }) async {
    final id = 'local-${DateTime.now().microsecondsSinceEpoch}';
    final startLabel =
        '${startAt.hour.toString().padLeft(2, '0')}:${startAt.minute.toString().padLeft(2, '0')}';
    final task = Task(
      id: id,
      title: title,
      estimateMinutes: durationMinutes,
      priority: priority,
      bucket: Task.bucketFrom(null, startAt),
      dueAt: startAt,
      startLabel: startLabel,
    );
    state = AsyncData([task, ..._current]);
    if (_api.signedIn) {
      try {
        await _api.createTask(title, estimateMinutes: durationMinutes, priority: priority, bucket: task.bucket);
      } catch (_) {}
    }
  }

  Future<void> updateTask(Task task) async {
    _patch(task.id, (t) {
      t.title = task.title;
      t.priority = task.priority;
      t.estimateMinutes = task.estimateMinutes;
      t.notes = task.notes;
      t.subtasks = task.subtasks;
    });
    if (_api.signedIn) {
      try {
        await _api.updateTask(task);
      } catch (_) {}
    }
  }

  /// Record focused time against a task (updates its cumulative spent time so
  /// the board, calendar, and Summary rings all reflect the session).
  Future<void> logFocus(String taskId, int seconds) async {
    if (seconds <= 0) return;
    _patch(taskId, (t) => t.spentSeconds += seconds);
    if (_api.signedIn) {
      try {
        await _api.addTaskSpent(taskId, seconds);
      } catch (_) {}
    }
  }

  Future<void> remove(Task task) async {
    state = AsyncData(_current.where((t) => t.id != task.id).toList());
    if (_api.signedIn) {
      try {
        await _api.deleteTask(task.id);
      } catch (_) {}
    }
  }

  void _patch(String id, void Function(Task) mutate) {
    final list = [..._current];
    for (final t in list) {
      if (t.id == id) {
        mutate(t);
        break;
      }
    }
    state = AsyncData(list);
  }
}

/// Recent focus sessions.
final sessionsProvider = FutureProvider<List<FocusSession>>((ref) async {
  ref.watch(authStateProvider);
  final api = ref.watch(apiProvider);
  if (!api.signedIn) return Mock.recentSessions;
  try {
    final s = await api.fetchSessions();
    return s.isEmpty ? Mock.recentSessions : s;
  } catch (_) {
    return Mock.recentSessions;
  }
});
