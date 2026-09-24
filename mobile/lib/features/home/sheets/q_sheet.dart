import 'package:flutter/cupertino.dart';

import '../../../core/theme/tokens.dart';

/// ONE standardized grabber for every home-feature sheet (quick_add, task_editor,
/// workspace_picker). Consistent margin + radius so the sheets read as a family.
class QGrabber extends StatelessWidget {
  const QGrabber({super.key, this.topPad = QSpace.sm, this.bottomPad = QSpace.sm});

  final double topPad;
  final double bottomPad;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(top: topPad, bottom: bottomPad),
      child: Center(
        child: Container(
          width: 36,
          height: 5,
          decoration: BoxDecoration(
            color: QColors.labelTertiary.resolveFrom(context),
            borderRadius: BorderRadius.circular(QRadius.capsule),
          ),
        ),
      ),
    );
  }
}

/// Standard rounded-top container decoration for a home-feature bottom sheet.
/// Modal sheets ground on [QColors.bgGrouped] with 28pt top corners (the one
/// place we use a literal radius — the modal-sheet corner per the contract).
BoxDecoration qSheetDecoration(BuildContext context) => const BoxDecoration(
      color: CupertinoColors.systemGroupedBackground,
      borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
    );
