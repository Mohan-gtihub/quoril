import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../../core/models/models.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';

/// Result of the workspace picker: null id = "All lists".
class WorkspacePick {
  const WorkspacePick(this.workspace);
  final Workspace? workspace; // null => All lists
}

/// Opens the workspace picker. Returns the chosen workspace (or null for All),
/// or null if dismissed. [onCreate] is invoked when a new workspace is added.
Future<WorkspacePick?> showWorkspacePickerSheet(
  BuildContext context, {
  required List<Workspace> workspaces,
  required String? currentId,
  required Future<Workspace?> Function() onCreate,
}) {
  return showCupertinoModalPopup<WorkspacePick>(
    context: context,
    barrierColor: CupertinoColors.black.withValues(alpha: 0.4),
    builder: (_) => _WorkspacePickerSheet(
      workspaces: workspaces,
      currentId: currentId,
      onCreate: onCreate,
    ),
  );
}

class _WorkspacePickerSheet extends StatelessWidget {
  const _WorkspacePickerSheet({
    required this.workspaces,
    required this.currentId,
    required this.onCreate,
  });
  final List<Workspace> workspaces;
  final String? currentId;
  final Future<Workspace?> Function() onCreate;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.72),
      decoration: BoxDecoration(
        color: QColors.bgGrouped.resolveFrom(context),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(QRadius.glass)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _grabber(context),
            Padding(
              padding: const EdgeInsets.fromLTRB(QSpace.md, 0, QSpace.md, QSpace.sm),
              child: Row(
                children: [
                  Text('Lists', style: QType.title3),
                  const Spacer(),
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Done'),
                  ),
                ],
              ),
            ),
            Flexible(
              child: ListView(
                shrinkWrap: true,
                padding: const EdgeInsets.fromLTRB(QSpace.md, 0, QSpace.md, QSpace.md),
                children: [
                  _row(
                    context,
                    leading: _squareBadge(context, QColors.labelSecondary, '∷'),
                    title: 'All lists',
                    trailing: null,
                    selected: currentId == null,
                    onTap: () {
                      HapticFeedback.selectionClick();
                      Navigator.pop(context, const WorkspacePick(null));
                    },
                  ),
                  for (final w in workspaces)
                    _row(
                      context,
                      leading: _squareBadge(context, w.color, w.badge),
                      title: w.name,
                      trailing: '${w.taskCount}',
                      selected: currentId == w.id,
                      onTap: () {
                        HapticFeedback.selectionClick();
                        Navigator.pop(context, WorkspacePick(w));
                      },
                    ),
                  const SizedBox(height: QSpace.xs),
                  GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () async {
                      HapticFeedback.selectionClick();
                      final created = await onCreate();
                      if (created != null && context.mounted) {
                        Navigator.pop(context, WorkspacePick(created));
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: QSpace.sm, vertical: QSpace.sm),
                      child: Row(
                        children: [
                          Icon(CupertinoIcons.add_circled, size: 26, color: QColors.tint.resolveFrom(context)),
                          const SizedBox(width: QSpace.sm),
                          Text('New workspace', style: QType.body.copyWith(color: QColors.tint.resolveFrom(context))),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _row(
    BuildContext context, {
    required Widget leading,
    required String title,
    required String? trailing,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        constraints: const BoxConstraints(minHeight: 52),
        margin: const EdgeInsets.only(bottom: QSpace.xs),
        padding: const EdgeInsets.symmetric(horizontal: QSpace.sm),
        decoration: BoxDecoration(
          color: QColors.surface.resolveFrom(context),
          borderRadius: BorderRadius.circular(QRadius.row),
        ),
        child: Row(
          children: [
            leading,
            const SizedBox(width: QSpace.sm),
            Expanded(child: Text(title, style: QType.body, overflow: TextOverflow.ellipsis)),
            if (trailing != null)
              Text(trailing, style: QType.footnote.copyWith(fontFeatures: const [FontFeature.tabularFigures()])),
            const SizedBox(width: QSpace.sm),
            Icon(
              CupertinoIcons.checkmark_alt,
              size: 20,
              color: selected ? QColors.tint.resolveFrom(context) : CupertinoColors.transparent,
            ),
          ],
        ),
      ),
    );
  }

  Widget _squareBadge(BuildContext context, Color color, String letter) {
    final c = color.resolveFrom(context);
    return Container(
      width: 28,
      height: 28,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(letter, style: QType.footnote.copyWith(color: CupertinoColors.white, fontWeight: FontWeight.w700)),
    );
  }

  Widget _grabber(BuildContext context) => Container(
        width: 36,
        height: 5,
        margin: const EdgeInsets.symmetric(vertical: QSpace.sm),
        decoration: BoxDecoration(
          color: QColors.labelTertiary.resolveFrom(context),
          borderRadius: BorderRadius.circular(QRadius.capsule),
        ),
      );
}

/// Small name + color sheet to create a workspace. Returns a local Workspace
/// (not persisted — the picker uses it optimistically).
Future<Workspace?> showNewWorkspaceSheet(BuildContext context) {
  return showCupertinoModalPopup<Workspace>(
    context: context,
    barrierColor: CupertinoColors.black.withValues(alpha: 0.4),
    builder: (_) => const _NewWorkspaceSheet(),
  );
}

class _NewWorkspaceSheet extends StatefulWidget {
  const _NewWorkspaceSheet();
  @override
  State<_NewWorkspaceSheet> createState() => _NewWorkspaceSheetState();
}

class _NewWorkspaceSheetState extends State<_NewWorkspaceSheet> {
  final _c = TextEditingController();
  int _colorIndex = 0;

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottom),
      child: Container(
        decoration: BoxDecoration(
          color: QColors.bgGrouped.resolveFrom(context),
          borderRadius: const BorderRadius.vertical(top: Radius.circular(QRadius.glass)),
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.all(QSpace.md),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 5,
                    margin: const EdgeInsets.only(bottom: QSpace.md),
                    decoration: BoxDecoration(color: QColors.labelTertiary.resolveFrom(context), borderRadius: BorderRadius.circular(QRadius.capsule)),
                  ),
                ),
                Text('New workspace', style: QType.headline),
                const SizedBox(height: QSpace.sm),
                CupertinoTextField(
                  controller: _c,
                  autofocus: true,
                  placeholder: 'Name',
                  padding: const EdgeInsets.all(QSpace.sm),
                  style: QType.body,
                  decoration: BoxDecoration(
                    color: QColors.surface.resolveFrom(context),
                    borderRadius: BorderRadius.circular(QRadius.row),
                  ),
                ),
                const SizedBox(height: QSpace.md),
                Wrap(
                  spacing: QSpace.sm,
                  runSpacing: QSpace.sm,
                  children: [
                    for (var i = 0; i < QColors.workspacePalette.length; i++)
                      GestureDetector(
                        onTap: () {
                          HapticFeedback.selectionClick();
                          setState(() => _colorIndex = i);
                        },
                        child: Container(
                          width: 34,
                          height: 34,
                          decoration: BoxDecoration(
                            color: QColors.workspacePalette[i].resolveFrom(context),
                            borderRadius: BorderRadius.circular(9),
                            border: Border.all(
                              color: _colorIndex == i ? QColors.label.resolveFrom(context) : CupertinoColors.transparent,
                              width: 2.5,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: QSpace.lg),
                SizedBox(
                  width: double.infinity,
                  child: CupertinoButton.filled(
                    borderRadius: BorderRadius.circular(QRadius.capsule),
                    onPressed: () {
                      final name = _c.text.trim();
                      if (name.isEmpty) return;
                      HapticFeedback.lightImpact();
                      Navigator.pop(
                        context,
                        Workspace(
                          id: 'local-${DateTime.now().microsecondsSinceEpoch}',
                          name: name,
                          color: QColors.workspacePalette[_colorIndex],
                        ),
                      );
                    },
                    child: const Text('Create'),
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
