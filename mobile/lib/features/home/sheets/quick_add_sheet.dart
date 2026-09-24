import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/providers.dart';
import '../../../core/models/models.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/primary_button.dart';
import 'q_sheet.dart';

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
    final mint = QSection.workspaces.resolveFrom(context);
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: Container(
        decoration: qSheetDecoration(context),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(QSpace.md, 0, QSpace.md, QSpace.md),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const QGrabber(),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text('Quick add', style: QType.title3),
                    const Spacer(),
                    if (_added > 0)
                      Text(
                        '$_added added',
                        style: QType.meta.copyWith(color: mint),
                      ),
                  ],
                ),
                const SizedBox(height: QSpace.md),
                // One fast field — the title is the header, this is the input.
                CupertinoTextField.borderless(
                  controller: _controller,
                  focusNode: _focus,
                  autofocus: true,
                  placeholder: 'What needs doing?',
                  placeholderStyle: QType.title3.copyWith(color: QColors.labelTertiary.resolveFrom(context)),
                  style: QType.title3,
                  padding: EdgeInsets.zero,
                  cursorColor: mint,
                  onSubmitted: (_) => _submit(),
                  textInputAction: TextInputAction.done,
                ),
                const SizedBox(height: QSpace.md),
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
                PrimaryButton(
                  label: 'Add task',
                  icon: CupertinoIcons.add,
                  color: mint,
                  onPressed: _submit,
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
    final c = (color ?? QSection.workspaces).resolveFrom(context);
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

