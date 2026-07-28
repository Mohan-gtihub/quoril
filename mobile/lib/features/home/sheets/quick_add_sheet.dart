import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/providers.dart';
import '../../../core/models/models.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';

/// Compact, autofocused quick-add sheet. Stays open for rapid entry.
Future<void> showQuickAddSheet(
  BuildContext context,
  WidgetRef ref, {
  TaskBucket bucket = TaskBucket.today,
}) {
  return showCupertinoModalPopup<void>(
    context: context,
    barrierColor: CupertinoColors.black.withValues(alpha: 0.35),
    builder: (_) => _QuickAddSheet(ref: ref, bucket: bucket),
  );
}

class _QuickAddSheet extends StatefulWidget {
  const _QuickAddSheet({required this.ref, required this.bucket});
  final WidgetRef ref;
  final TaskBucket bucket;

  @override
  State<_QuickAddSheet> createState() => _QuickAddSheetState();
}

class _QuickAddSheetState extends State<_QuickAddSheet> {
  final _controller = TextEditingController();
  final _focus = FocusNode();
  Priority _priority = Priority.medium;
  int? _estimate = 25;
  int _added = 0;

  static const _estOptions = <int?>[null, 15, 25, 45, 60];

  @override
  void dispose() {
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _submit() {
    final title = _controller.text.trim();
    if (title.isEmpty) return;
    HapticFeedback.lightImpact();
    widget.ref.read(tasksProvider.notifier).add(
          title,
          estimateMinutes: _estimate,
          priority: _priority,
          bucket: widget.bucket,
        );
    setState(() {
      _added++;
      _controller.clear();
    });
    _focus.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        decoration: BoxDecoration(
          color: QColors.bgGrouped.resolveFrom(context),
          borderRadius: const BorderRadius.vertical(top: Radius.circular(QRadius.glass)),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.sm, QSpace.md, QSpace.md),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _Grabber(),
                Row(
                  children: [
                    Text('Quick add', style: QType.headline),
                    const Spacer(),
                    if (_added > 0)
                      Text('$_added added', style: QType.footnote.copyWith(color: QColors.tint.resolveFrom(context))),
                  ],
                ),
                const SizedBox(height: QSpace.sm),
                CupertinoTextField(
                  controller: _controller,
                  focusNode: _focus,
                  autofocus: true,
                  placeholder: 'Task name',
                  style: QType.body,
                  padding: const EdgeInsets.all(QSpace.sm),
                  decoration: BoxDecoration(
                    color: QColors.surface.resolveFrom(context),
                    borderRadius: BorderRadius.circular(QRadius.row),
                  ),
                  onSubmitted: (_) => _submit(),
                  textInputAction: TextInputAction.done,
                ),
                const SizedBox(height: QSpace.sm),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      for (final e in _estOptions)
                        Padding(
                          padding: const EdgeInsets.only(right: QSpace.xs),
                          child: _MiniChip(
                            label: e == null ? 'No est' : '${e}m',
                            active: _estimate == e,
                            onTap: () {
                              HapticFeedback.selectionClick();
                              setState(() => _estimate = e);
                            },
                          ),
                        ),
                      Container(width: 1, height: 22, color: QColors.separator.resolveFrom(context)),
                      const SizedBox(width: QSpace.xs),
                      for (final p in Priority.values)
                        Padding(
                          padding: const EdgeInsets.only(right: QSpace.xs),
                          child: _MiniChip(
                            label: p.label,
                            color: p.color,
                            active: _priority == p,
                            onTap: () {
                              HapticFeedback.selectionClick();
                              setState(() => _priority = p);
                            },
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: QSpace.md),
                SizedBox(
                  width: double.infinity,
                  child: CupertinoButton.filled(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    borderRadius: BorderRadius.circular(QRadius.capsule),
                    onPressed: _submit,
                    child: const Text('Add task'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MiniChip extends StatelessWidget {
  const _MiniChip({required this.label, required this.active, required this.onTap, this.color});
  final String label;
  final bool active;
  final VoidCallback onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = (color ?? QColors.tint).resolveFrom(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        constraints: const BoxConstraints(minHeight: 32),
        padding: const EdgeInsets.symmetric(horizontal: QSpace.sm, vertical: 6),
        decoration: BoxDecoration(
          color: active ? c.withValues(alpha: 0.16) : QColors.surface.resolveFrom(context),
          borderRadius: BorderRadius.circular(QRadius.capsule),
        ),
        child: Text(
          label,
          style: QType.footnote.copyWith(
            color: active ? c : QColors.labelSecondary.resolveFrom(context),
            fontWeight: FontWeight.w600,
          ),
        ),
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
        margin: const EdgeInsets.only(bottom: QSpace.sm),
        decoration: BoxDecoration(
          color: QColors.labelTertiary.resolveFrom(context),
          borderRadius: BorderRadius.circular(QRadius.capsule),
        ),
      ),
    );
  }
}
