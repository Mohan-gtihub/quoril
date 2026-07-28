import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/providers.dart';
import '../../../core/models/models.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';

/// Native draggable bottom sheet mirroring Blitzit's edit sheet.
/// New task -> notifier.add; existing -> notifier.update (+ Delete).
Future<void> showTaskEditorSheet(
  BuildContext context,
  WidgetRef ref, {
  Task? task,
}) {
  return showCupertinoModalPopup<void>(
    context: context,
    barrierColor: CupertinoColors.black.withValues(alpha: 0.4),
    builder: (_) => _TaskEditorSheet(ref: ref, task: task),
  );
}

class _TaskEditorSheet extends StatefulWidget {
  const _TaskEditorSheet({required this.ref, this.task});
  final WidgetRef ref;
  final Task? task;

  @override
  State<_TaskEditorSheet> createState() => _TaskEditorSheetState();
}

class _TaskEditorSheetState extends State<_TaskEditorSheet> {
  late final TextEditingController _title;
  late final TextEditingController _notes;
  late int _estMinutes;
  late Priority _priority;
  late TaskBucket _bucket;
  late String? _listId;
  late List<Subtask> _subtasks;

  bool get _isEdit => widget.task != null;

  @override
  void initState() {
    super.initState();
    final t = widget.task;
    _title = TextEditingController(text: t?.title ?? '');
    _notes = TextEditingController(text: t?.notes ?? '');
    _estMinutes = t?.estimateMinutes ?? 25;
    _priority = t?.priority ?? Priority.medium;
    _bucket = t?.bucket ?? TaskBucket.today;
    _listId = t?.listId ?? t?.workspaceId;
    _subtasks = [for (final s in t?.subtasks ?? const <Subtask>[]) Subtask(id: s.id, title: s.title, done: s.done)];
  }

  @override
  void dispose() {
    _title.dispose();
    _notes.dispose();
    super.dispose();
  }

  void _openEstPicker() {
    HapticFeedback.selectionClick();
    final hours = _estMinutes ~/ 60;
    final mins = _estMinutes % 60;
    var h = hours, m = mins;
    showCupertinoModalPopup<void>(
      context: context,
      builder: (_) => Container(
        height: 280,
        color: QColors.bgGrouped.resolveFrom(context),
        child: SafeArea(
          top: false,
          child: Column(
            children: [
              CupertinoButton(
                onPressed: () {
                  HapticFeedback.selectionClick();
                  setState(() => _estMinutes = (h * 60 + m).clamp(0, 24 * 60));
                  Navigator.pop(context);
                },
                child: const Text('Done'),
              ),
              Expanded(
                child: Row(
                  children: [
                    Expanded(
                      child: CupertinoPicker(
                        scrollController: FixedExtentScrollController(initialItem: hours),
                        itemExtent: 34,
                        onSelectedItemChanged: (i) => h = i,
                        children: [for (var i = 0; i < 13; i++) Center(child: Text('$i h'))],
                      ),
                    ),
                    Expanded(
                      child: CupertinoPicker(
                        scrollController: FixedExtentScrollController(initialItem: mins ~/ 5),
                        itemExtent: 34,
                        onSelectedItemChanged: (i) => m = i * 5,
                        children: [for (var i = 0; i < 12; i++) Center(child: Text('${i * 5} m'))],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openListPicker(List<Workspace> workspaces) {
    HapticFeedback.selectionClick();
    showCupertinoModalPopup<void>(
      context: context,
      builder: (_) => CupertinoActionSheet(
        title: const Text('List'),
        actions: [
          CupertinoActionSheetAction(
            onPressed: () {
              setState(() => _listId = null);
              Navigator.pop(context);
            },
            child: const Text('No list'),
          ),
          for (final w in workspaces)
            CupertinoActionSheetAction(
              onPressed: () {
                setState(() => _listId = w.id);
                Navigator.pop(context);
              },
              child: Text(w.name),
            ),
        ],
        cancelButton: CupertinoActionSheetAction(
          isDefaultAction: true,
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
      ),
    );
  }

  void _save() {
    final title = _title.text.trim();
    if (title.isEmpty) return;
    HapticFeedback.lightImpact();
    final notifier = widget.ref.read(tasksProvider.notifier);
    if (_isEdit) {
      final t = widget.task!;
      t.title = title;
      t.notes = _notes.text.trim().isEmpty ? null : _notes.text.trim();
      t.estimateMinutes = _estMinutes == 0 ? null : _estMinutes;
      t.priority = _priority;
      t.subtasks = _subtasks;
      t.listId = _listId;
      notifier.updateTask(t);
      if (t.bucket != _bucket) notifier.move(t, _bucket);
    } else {
      notifier.add(
        title,
        estimateMinutes: _estMinutes == 0 ? null : _estMinutes,
        priority: _priority,
        bucket: _bucket,
        listId: _listId,
      );
    }
    Navigator.pop(context);
  }

  void _delete() {
    HapticFeedback.mediumImpact();
    widget.ref.read(tasksProvider.notifier).remove(widget.task!);
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final workspaces = widget.ref.watch(workspacesProvider).valueOrNull ?? const <Workspace>[];
    final currentWs = _listId == null
        ? null
        : workspaces.where((w) => w.id == _listId).cast<Workspace?>().firstWhere((w) => true, orElse: () => null);

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.72,
      minChildSize: 0.5,
      maxChildSize: 0.94,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: QColors.bgGrouped.resolveFrom(context),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(QRadius.glass)),
          ),
          child: Column(
            children: [
              _Grabber(),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
                child: Row(
                  children: [
                    CupertinoButton(
                      padding: EdgeInsets.zero,
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancel'),
                    ),
                    const Spacer(),
                    Text(_isEdit ? 'Edit task' : 'New task', style: QType.headline),
                    const Spacer(),
                    CupertinoButton(
                      padding: EdgeInsets.zero,
                      onPressed: _save,
                      child: const Text('Save', style: TextStyle(fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.xs, QSpace.md, QSpace.xl),
                  children: [
                    _field(
                      context,
                      child: CupertinoTextField.borderless(
                        controller: _title,
                        placeholder: 'Task name',
                        style: QType.title3,
                        padding: const EdgeInsets.all(QSpace.md),
                        autofocus: !_isEdit,
                      ),
                    ),
                    const SizedBox(height: QSpace.md),
                    _rowTile(
                      context,
                      icon: CupertinoIcons.clock,
                      label: 'Est time',
                      value: _estMinutes == 0 ? 'None' : _fmtEst(_estMinutes),
                      onTap: _openEstPicker,
                    ),
                    _divider(context),
                    _rowTile(
                      context,
                      icon: CupertinoIcons.square_stack_3d_up,
                      label: 'List',
                      value: currentWs?.name ?? 'No list',
                      valueColor: currentWs?.color,
                      onTap: () => _openListPicker(workspaces),
                    ),
                    const SizedBox(height: QSpace.md),
                    Padding(
                      padding: const EdgeInsets.only(left: QSpace.xxs, bottom: QSpace.xs),
                      child: Text('PRIORITY', style: QType.sectionHeader),
                    ),
                    CupertinoSlidingSegmentedControl<Priority>(
                      groupValue: _priority,
                      onValueChanged: (p) {
                        if (p == null) return;
                        HapticFeedback.selectionClick();
                        setState(() => _priority = p);
                      },
                      children: {
                        for (final p in Priority.values)
                          p: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            child: Text(p.label, style: QType.footnote.copyWith(color: p.color.resolveFrom(context), fontWeight: FontWeight.w600)),
                          ),
                      },
                    ),
                    const SizedBox(height: QSpace.md),
                    Padding(
                      padding: const EdgeInsets.only(left: QSpace.xxs, bottom: QSpace.xs),
                      child: Text('WHEN', style: QType.sectionHeader),
                    ),
                    CupertinoSlidingSegmentedControl<TaskBucket>(
                      groupValue: _bucket,
                      onValueChanged: (b) {
                        if (b == null) return;
                        HapticFeedback.selectionClick();
                        setState(() => _bucket = b);
                      },
                      children: {
                        for (final b in [TaskBucket.backlog, TaskBucket.week, TaskBucket.today, TaskBucket.done])
                          b: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            child: Text(b == TaskBucket.week ? 'Week' : b.label, style: QType.footnote),
                          ),
                      },
                    ),
                    const SizedBox(height: QSpace.md),
                    Padding(
                      padding: const EdgeInsets.only(left: QSpace.xxs, bottom: QSpace.xs),
                      child: Text('SUBTASKS', style: QType.sectionHeader),
                    ),
                    _subtaskEditor(context),
                    const SizedBox(height: QSpace.md),
                    _field(
                      context,
                      child: CupertinoTextField.borderless(
                        controller: _notes,
                        placeholder: 'Notes',
                        style: QType.body,
                        padding: const EdgeInsets.all(QSpace.md),
                        maxLines: 4,
                        minLines: 3,
                      ),
                    ),
                    if (_isEdit) ...[
                      const SizedBox(height: QSpace.lg),
                      SizedBox(
                        width: double.infinity,
                        child: CupertinoButton(
                          color: QColors.danger.resolveFrom(context).withValues(alpha: 0.14),
                          borderRadius: BorderRadius.circular(QRadius.capsule),
                          onPressed: _delete,
                          child: Text('Delete task', style: QType.headline.copyWith(color: QColors.danger.resolveFrom(context))),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _subtaskEditor(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: QColors.surface.resolveFrom(context),
        borderRadius: BorderRadius.circular(QRadius.card),
      ),
      child: Column(
        children: [
          for (var i = 0; i < _subtasks.length; i++) ...[
            if (i > 0) _divider(context),
            _SubtaskEditorRow(
              key: ValueKey(_subtasks[i].id),
              subtask: _subtasks[i],
              onToggle: () {
                HapticFeedback.selectionClick();
                setState(() => _subtasks[i].done = !_subtasks[i].done);
              },
              onChanged: (v) => _subtasks[i].title = v,
              onDelete: () {
                HapticFeedback.selectionClick();
                setState(() => _subtasks.removeAt(i));
              },
            ),
          ],
          if (_subtasks.isNotEmpty) _divider(context),
          CupertinoButton(
            padding: const EdgeInsets.all(QSpace.sm),
            onPressed: () {
              HapticFeedback.selectionClick();
              setState(() => _subtasks.add(Subtask(id: 'local-${DateTime.now().microsecondsSinceEpoch}', title: '')));
            },
            child: Row(
              mainAxisAlignment: MainAxisAlignment.start,
              children: [
                Icon(CupertinoIcons.add_circled, size: 20, color: QColors.tint.resolveFrom(context)),
                const SizedBox(width: QSpace.xs),
                Text('Add subtask', style: QType.callout.copyWith(color: QColors.tint.resolveFrom(context))),
                const Spacer(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _field(BuildContext context, {required Widget child}) {
    return Container(
      decoration: BoxDecoration(
        color: QColors.surface.resolveFrom(context),
        borderRadius: BorderRadius.circular(QRadius.card),
      ),
      child: child,
    );
  }

  Widget _rowTile(
    BuildContext context, {
    required IconData icon,
    required String label,
    required String value,
    Color? valueColor,
    required VoidCallback onTap,
  }) {
    final decorFirst = label == 'Est time';
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        constraints: const BoxConstraints(minHeight: 48),
        decoration: BoxDecoration(
          color: QColors.surface.resolveFrom(context),
          borderRadius: decorFirst
              ? const BorderRadius.vertical(top: Radius.circular(QRadius.card))
              : const BorderRadius.vertical(bottom: Radius.circular(QRadius.card)),
        ),
        padding: const EdgeInsets.symmetric(horizontal: QSpace.md, vertical: QSpace.sm),
        child: Row(
          children: [
            Icon(icon, size: 20, color: QColors.labelSecondary.resolveFrom(context)),
            const SizedBox(width: QSpace.sm),
            Text(label, style: QType.body),
            const Spacer(),
            Text(
              value,
              style: QType.body.copyWith(color: (valueColor ?? QColors.labelSecondary).resolveFrom(context)),
            ),
            const SizedBox(width: QSpace.xs),
            Icon(CupertinoIcons.chevron_right, size: 16, color: QColors.labelTertiary.resolveFrom(context)),
          ],
        ),
      ),
    );
  }

  Widget _divider(BuildContext context) => Container(
        height: 0.5,
        margin: const EdgeInsets.only(left: QSpace.md),
        color: QColors.separator.resolveFrom(context),
      );

  static String _fmtEst(int minutes) {
    final h = minutes ~/ 60;
    final m = minutes % 60;
    if (h > 0) return m > 0 ? '${h}h ${m}m' : '${h}h';
    return '${m}m';
  }
}

class _SubtaskEditorRow extends StatefulWidget {
  const _SubtaskEditorRow({
    super.key,
    required this.subtask,
    required this.onToggle,
    required this.onChanged,
    required this.onDelete,
  });
  final Subtask subtask;
  final VoidCallback onToggle;
  final ValueChanged<String> onChanged;
  final VoidCallback onDelete;

  @override
  State<_SubtaskEditorRow> createState() => _SubtaskEditorRowState();
}

class _SubtaskEditorRowState extends State<_SubtaskEditorRow> {
  late final TextEditingController _c = TextEditingController(text: widget.subtask.title);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: QSpace.sm, vertical: 2),
      child: Row(
        children: [
          GestureDetector(
            onTap: widget.onToggle,
            behavior: HitTestBehavior.opaque,
            child: Padding(
              padding: const EdgeInsets.all(6),
              child: Icon(
                widget.subtask.done ? CupertinoIcons.checkmark_circle_fill : CupertinoIcons.circle,
                size: 22,
                color: widget.subtask.done ? QColors.tint.resolveFrom(context) : QColors.labelTertiary.resolveFrom(context),
              ),
            ),
          ),
          Expanded(
            child: CupertinoTextField.borderless(
              controller: _c,
              placeholder: 'Subtask',
              style: QType.callout,
              autofocus: widget.subtask.title.isEmpty,
              onChanged: widget.onChanged,
            ),
          ),
          GestureDetector(
            onTap: widget.onDelete,
            behavior: HitTestBehavior.opaque,
            child: Padding(
              padding: const EdgeInsets.all(6),
              child: Icon(CupertinoIcons.minus_circle, size: 20, color: QColors.labelTertiary.resolveFrom(context)),
            ),
          ),
        ],
      ),
    );
  }
}

class _Grabber extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 36,
        height: 5,
        margin: const EdgeInsets.symmetric(vertical: QSpace.sm),
        decoration: BoxDecoration(
          color: QColors.labelTertiary.resolveFrom(context),
          borderRadius: BorderRadius.circular(QRadius.capsule),
        ),
      ),
    );
  }
}
