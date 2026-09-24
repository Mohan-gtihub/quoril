import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/providers.dart';
import '../../../core/models/models.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/editorial.dart';
import '../../../core/widgets/glass.dart';
import '../../../core/widgets/primary_button.dart';
import 'q_sheet.dart';

/// The app's canonical task creator/editor — a modal detent sheet built to the
/// Ember Editorial sheet recipe. Opened from Home *and* the Calendar, so it is
/// the reference for every other sheet in the app.
///
/// New task -> notifier.add; existing -> notifier.updateTask (+ Delete).
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

  bool _canSave = false;
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
    _canSave = _title.text.trim().isNotEmpty;
    _title.addListener(() {
      final can = _title.text.trim().isNotEmpty;
      if (can != _canSave) setState(() => _canSave = can);
    });
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
        height: 288,
        decoration: const BoxDecoration(
          color: CupertinoColors.systemGroupedBackground,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: SafeArea(
          top: false,
          child: Column(
            children: [
              const QGrabber(),
              CupertinoButton(
                onPressed: () {
                  HapticFeedback.selectionClick();
                  setState(() => _estMinutes = (h * 60 + m).clamp(0, 24 * 60));
                  Navigator.pop(context);
                },
                child: Text('Done', style: QType.headline.copyWith(color: QColors.brand.resolveFrom(context))),
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
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.74,
      minChildSize: 0.5,
      maxChildSize: 0.94,
      builder: (context, scrollController) {
        return Container(
          decoration: qSheetDecoration(context),
          child: Column(
            children: [
              const QGrabber(),
              // Cancel (plain, left) / Save (right). No center title — the title
              // field below IS the header.
              Padding(
                padding: const EdgeInsets.fromLTRB(QSpace.xs, 0, QSpace.xs, QSpace.xs),
                child: Row(
                  children: [
                    CupertinoButton(
                      padding: const EdgeInsets.symmetric(horizontal: QSpace.sm, vertical: 4),
                      onPressed: () => Navigator.pop(context),
                      child: Text('Cancel', style: QType.body.copyWith(color: QColors.labelSecondary.resolveFrom(context))),
                    ),
                    const Spacer(),
                    CupertinoButton(
                      padding: const EdgeInsets.symmetric(horizontal: QSpace.sm, vertical: 4),
                      onPressed: _canSave ? _save : null,
                      child: Text(
                        'Save',
                        style: QType.headline.copyWith(
                          color: _canSave
                              ? QColors.brand.resolveFrom(context)
                              : QColors.labelTertiary.resolveFrom(context),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.xs, QSpace.md, QSpace.xxl),
                  children: [
                    // The title field acts as the sheet header (title2).
                    Padding(
                      padding: const EdgeInsets.only(left: QSpace.xxs, bottom: QSpace.xs),
                      child: CupertinoTextField.borderless(
                        controller: _title,
                        placeholder: 'What needs doing?',
                        placeholderStyle: QType.title2.copyWith(color: QColors.labelTertiary.resolveFrom(context)),
                        style: QType.title2,
                        padding: EdgeInsets.zero,
                        maxLines: null,
                        autofocus: !_isEdit,
                        cursorColor: QColors.brand.resolveFrom(context),
                        textInputAction: TextInputAction.next,
                      ),
                    ),
                    const SizedBox(height: QSpace.lg),

                    // Est time / List — inset grouped rows.
                    QGroup(children: [
                      QRow(
                        icon: CupertinoIcons.clock,
                        label: 'Est time',
                        value: _estMinutes == 0 ? 'None' : _fmtEst(_estMinutes),
                        onTap: _openEstPicker,
                      ),
                      QRow(
                        icon: CupertinoIcons.square_stack_3d_up,
                        label: 'List',
                        value: currentWs?.name ?? 'No list',
                        valueColor: currentWs?.color,
                        onTap: () => _openListPicker(workspaces),
                      ),
                    ]),
                    const SizedBox(height: QSpace.lg),

                    // Priority.
                    const QSectionHeader(label: 'Priority'),
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
                            child: Text(
                              p.label,
                              style: QType.footnote.copyWith(
                                color: _priority == p ? p.color.resolveFrom(context) : QColors.labelSecondary.resolveFrom(context),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                      },
                    ),
                    const SizedBox(height: QSpace.lg),

                    // When.
                    const QSectionHeader(label: 'When'),
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
                    const SizedBox(height: QSpace.lg),

                    // Subtasks — ghost placeholder until the first is added.
                    const QSectionHeader(label: 'Subtasks'),
                    _subtaskEditor(context),
                    const SizedBox(height: QSpace.lg),

                    // Notes.
                    const QSectionHeader(label: 'Notes'),
                    _NotesField(controller: _notes),

                    if (_isEdit) ...[
                      const SizedBox(height: QSpace.xl),
                      SizedBox(
                        width: double.infinity,
                        child: CupertinoButton(
                          color: QColors.danger.resolveFrom(context).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(QRadius.capsule),
                          onPressed: _delete,
                          child: Text('Delete task', style: QType.headline.copyWith(color: QColors.danger.resolveFrom(context))),
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              // Pinned primary pill above the keyboard, on a blurred hairline bar.
              _PinnedBar(
                bottomInset: bottomInset,
                child: PrimaryButton(
                  label: _isEdit ? 'Save task' : 'Add task',
                  onPressed: _canSave ? _save : null,
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _subtaskEditor(BuildContext context) {
    final rows = <Widget>[
      for (var i = 0; i < _subtasks.length; i++)
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
      _AddSubtaskRow(onTap: () {
        HapticFeedback.selectionClick();
        setState(() => _subtasks.add(Subtask(id: 'local-${DateTime.now().microsecondsSinceEpoch}', title: '')));
      }),
    ];
    return QGroup(children: rows);
  }

  static String _fmtEst(int minutes) {
    final h = minutes ~/ 60;
    final m = minutes % 60;
    if (h > 0) return m > 0 ? '${h}h ${m}m' : '${h}h';
    return '${m}m';
  }
}

/// A ghost/placeholder notes field that grounds on the surface card.
class _NotesField extends StatelessWidget {
  const _NotesField({required this.controller});
  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: QColors.surface.resolveFrom(context),
        borderRadius: BorderRadius.circular(QRadius.card),
      ),
      child: CupertinoTextField.borderless(
        controller: controller,
        placeholder: 'Add notes…',
        placeholderStyle: QType.body.copyWith(color: QColors.labelTertiary.resolveFrom(context)),
        style: QType.body,
        padding: const EdgeInsets.all(QSpace.md),
        maxLines: 5,
        minLines: 3,
      ),
    );
  }
}

/// A blurred hairline bar pinning the primary pill above the keyboard.
class _PinnedBar extends StatelessWidget {
  const _PinnedBar({required this.child, required this.bottomInset});
  final Widget child;
  final double bottomInset;

  @override
  Widget build(BuildContext context) {
    return GlassSurface(
      radius: 0,
      tint: QColors.bgGrouped,
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          QSpace.md,
          QSpace.sm,
          QSpace.md,
          bottomInset > 0 ? bottomInset + QSpace.sm : MediaQuery.of(context).padding.bottom + QSpace.sm,
        ),
        child: child,
      ),
    );
  }
}

class _AddSubtaskRow extends StatelessWidget {
  const _AddSubtaskRow({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final brand = QColors.brand.resolveFrom(context);
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        constraints: const BoxConstraints(minHeight: 48),
        padding: const EdgeInsets.symmetric(horizontal: QSpace.md, vertical: QSpace.sm),
        child: Row(
          children: [
            Icon(CupertinoIcons.add_circled, size: 20, color: brand),
            const SizedBox(width: QSpace.sm),
            Text('Add subtask', style: QType.body.copyWith(color: brand)),
          ],
        ),
      ),
    );
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
    return Container(
      constraints: const BoxConstraints(minHeight: 48),
      padding: const EdgeInsets.symmetric(horizontal: QSpace.sm),
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
                color: widget.subtask.done ? QColors.brand.resolveFrom(context) : QColors.labelTertiary.resolveFrom(context),
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
