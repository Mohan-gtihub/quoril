import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../../core/models/models.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/glass.dart';

/// A collapsible section grouping the tasks of a single [Workspace].
///
/// The header carries the workspace color dot + badge, its name, a
/// `done/total` count, and a chevron that rotates as the section opens.
/// Tapping the header expands/collapses (gated by Reduce Motion) to reveal
/// compact task rows. Each row has a leading check circle ([onToggleDone]),
/// the title (strikethrough when done), a small estimate/priority meta line,
/// and a play button ([onFocus]); tapping the row body calls [onOpen].
class WorkspaceSection extends StatefulWidget {
  const WorkspaceSection({
    super.key,
    required this.workspace,
    required this.tasks,
    this.initiallyExpanded = false,
    required this.onToggleDone,
    required this.onOpen,
    required this.onFocus,
  });

  final Workspace workspace;
  final List<Task> tasks;
  final bool initiallyExpanded;
  final void Function(Task) onToggleDone;
  final void Function(Task) onOpen;
  final void Function(Task) onFocus;

  @override
  State<WorkspaceSection> createState() => _WorkspaceSectionState();
}

class _WorkspaceSectionState extends State<WorkspaceSection> {
  late bool _expanded = widget.initiallyExpanded;

  void _toggle() {
    HapticFeedback.selectionClick();
    setState(() => _expanded = !_expanded);
  }

  @override
  Widget build(BuildContext context) {
    final ws = widget.workspace;
    final color = ws.color.resolveFrom(context);
    final total = widget.tasks.length;
    final done = widget.tasks.where((t) => t.done).length;
    final reduced = QMotion.reduced(context);

    final body = widget.tasks.isEmpty
        ? Padding(
            padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.xs, QSpace.md, QSpace.sm),
            child: Text(
              'No tasks',
              style: QType.subhead.copyWith(color: QColors.labelTertiary.resolveFrom(context)),
            ),
          )
        : Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (final t in widget.tasks)
                _TaskRow(
                  task: t,
                  onToggleDone: () => widget.onToggleDone(t),
                  onOpen: () => widget.onOpen(t),
                  onFocus: () => widget.onFocus(t),
                ),
            ],
          );

    // Frosted glass section card with a whisper of the ember (home) section
    // hue. The header manages its own tap, so the card itself is non-interactive.
    return GlassCard(
      padding: EdgeInsets.zero,
      tint: QSection.home.resolveFrom(context),
      child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: _toggle,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: QSpace.md, vertical: QSpace.sm + 2),
                child: Row(
                  children: [
                    Container(
                      width: 26,
                      height: 26,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.16),
                        borderRadius: BorderRadius.circular(QRadius.chip),
                      ),
                      child: Text(
                        ws.badge,
                        style: QType.caption2.copyWith(color: color, fontWeight: FontWeight.w700),
                      ),
                    ),
                    const SizedBox(width: QSpace.sm),
                    Expanded(
                      child: Text(
                        ws.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: QType.headline.copyWith(color: QColors.label.resolveFrom(context)),
                      ),
                    ),
                    Text(
                      '$done/$total',
                      style: QType.footnoteEmphasized.copyWith(
                        color: QColors.labelSecondary.resolveFrom(context),
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                    const SizedBox(width: QSpace.sm),
                    AnimatedRotation(
                      turns: _expanded ? 0.25 : 0.0,
                      duration: reduced ? Duration.zero : QMotion.duration(context, QMotion.fast),
                      curve: QMotion.standard,
                      child: Icon(
                        CupertinoIcons.chevron_right,
                        size: 15,
                        color: QColors.labelTertiary.resolveFrom(context),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            AnimatedCrossFade(
              firstChild: const SizedBox(width: double.infinity, height: 0),
              secondChild: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    height: 0.5,
                    color: QColors.separator.resolveFrom(context).withValues(alpha: 0.5),
                  ),
                  body,
                ],
              ),
              crossFadeState:
                  _expanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
              duration: reduced ? Duration.zero : QMotion.duration(context, QMotion.base),
              sizeCurve: QMotion.standard,
            ),
          ],
        ),
    );
  }
}

/// A compact task row used inside an expanded [WorkspaceSection].
class _TaskRow extends StatelessWidget {
  const _TaskRow({
    required this.task,
    required this.onToggleDone,
    required this.onOpen,
    required this.onFocus,
  });

  final Task task;
  final VoidCallback onToggleDone;
  final VoidCallback onOpen;
  final VoidCallback onFocus;

  String? _meta() {
    final parts = <String>[];
    final e = task.estimateMinutes;
    if (e != null) {
      final h = e ~/ 60;
      final m = e % 60;
      parts.add(h > 0 ? (m > 0 ? '${h}h ${m}m' : '${h}h') : '${m}m');
    }
    if (task.priority == Priority.high || task.priority == Priority.critical) {
      parts.add(task.priority.label);
    }
    return parts.isEmpty ? null : parts.join(' · ');
  }

  @override
  Widget build(BuildContext context) {
    final done = task.done;
    final meta = _meta();
    final isHot = task.priority == Priority.high || task.priority == Priority.critical;
    final accent = task.priority.color.resolveFrom(context);

    return AnimatedOpacity(
      duration: QMotion.duration(context, QMotion.fast),
      opacity: done ? 0.55 : 1.0,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onOpen,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.xs + 2, QSpace.sm, QSpace.xs + 2),
          child: Row(
            children: [
              GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () {
                  HapticFeedback.heavyImpact();
                  onToggleDone();
                },
                child: SizedBox(
                  width: 26,
                  height: 26,
                  child: Center(
                    child: Icon(
                      done ? CupertinoIcons.checkmark_circle_fill : CupertinoIcons.circle,
                      size: 22,
                      color: done
                          ? QColors.wellbeing.resolveFrom(context)
                          : QColors.labelTertiary.resolveFrom(context),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: QSpace.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        if (isHot) ...[
                          Icon(CupertinoIcons.flame_fill, size: 12, color: accent),
                          const SizedBox(width: 4),
                        ],
                        Flexible(
                          child: Text(
                            task.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: QType.subhead.copyWith(
                              fontWeight: FontWeight.w600,
                              decoration: done ? TextDecoration.lineThrough : null,
                              color: done
                                  ? QColors.labelTertiary.resolveFrom(context)
                                  : QColors.label.resolveFrom(context),
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (meta != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 1),
                        child: Text(
                          meta,
                          style: QType.meta.copyWith(
                            fontFeatures: const [FontFeature.tabularFigures()],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              if (!done)
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () {
                    HapticFeedback.mediumImpact();
                    onFocus();
                  },
                  child: Padding(
                    padding: const EdgeInsets.all(6),
                    child: Icon(
                      CupertinoIcons.play_circle_fill,
                      size: 24,
                      color: QColors.brand.resolveFrom(context),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
