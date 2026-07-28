import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/data/providers.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/inset_list.dart';
import '../../core/widgets/primary_button.dart';

/// E9 — Feedback sheet, wired to QuorilApi.submitFeedback.
Future<void> showFeedbackSheet(BuildContext context) {
  return showCupertinoModalPopup<void>(
    context: context,
    builder: (_) => const _FeedbackSheet(),
  );
}

enum _FbType { bug, idea, praise }

extension on _FbType {
  String get wire => switch (this) {
        _FbType.bug => 'bug',
        _FbType.idea => 'idea',
        _FbType.praise => 'praise',
      };
}

class _FeedbackSheet extends ConsumerStatefulWidget {
  const _FeedbackSheet();

  @override
  ConsumerState<_FeedbackSheet> createState() => _FeedbackSheetState();
}

class _FeedbackSheetState extends ConsumerState<_FeedbackSheet> {
  _FbType _type = _FbType.idea;
  final _controller = TextEditingController();
  bool _sent = false;
  bool _sending = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final message = _controller.text.trim();
    if (message.isEmpty || _sending) return;
    HapticFeedback.lightImpact();
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ref.read(apiProvider).submitFeedback(_type.wire, message);
      if (!mounted) return;
      HapticFeedback.heavyImpact();
      setState(() {
        _sent = true;
        _sending = false;
      });
    } catch (_) {
      if (!mounted) return;
      HapticFeedback.heavyImpact();
      setState(() {
        _sending = false;
        _error = 'Could not send right now. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return FractionallySizedBox(
      heightFactor: 0.82,
      child: Container(
        decoration: BoxDecoration(
          color: QColors.bgGrouped.resolveFrom(context),
          borderRadius:
              const BorderRadius.vertical(top: Radius.circular(QRadius.glass)),
        ),
        child: SafeArea(
          top: false,
          child: Column(
            children: [
              Container(
                width: 36,
                height: 5,
                margin: const EdgeInsets.only(top: QSpace.sm, bottom: QSpace.sm),
                decoration: BoxDecoration(
                  color: QColors.separator.resolveFrom(context),
                  borderRadius: BorderRadius.circular(QRadius.capsule),
                ),
              ),
              Expanded(child: _sent ? _success(context) : _form(context)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _success(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(QSpace.lg),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(CupertinoIcons.checkmark_circle_fill,
              size: 64, color: QColors.wellbeing.resolveFrom(context)),
          const SizedBox(height: QSpace.md),
          Text('Thank you!', style: QType.title2),
          const SizedBox(height: QSpace.xs),
          Text('Your feedback helps make Quoril better.',
              style: QType.subhead, textAlign: TextAlign.center),
          const SizedBox(height: QSpace.xl),
          PrimaryButton(
            label: 'Done',
            onPressed: () => Navigator.pop(context),
          ),
        ],
      ),
    );
  }

  Widget _form(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(QSpace.md, 0, QSpace.md, QSpace.md),
      physics: const BouncingScrollPhysics(),
      children: [
        Text('Send Feedback', style: QType.title2, textAlign: TextAlign.center),
        const SizedBox(height: QSpace.lg),
        CupertinoSlidingSegmentedControl<_FbType>(
          groupValue: _type,
          onValueChanged: (v) {
            if (v == null) return;
            HapticFeedback.selectionClick();
            setState(() => _type = v);
          },
          children: const {
            _FbType.bug: Padding(
                padding: EdgeInsets.symmetric(vertical: 6), child: Text('Bug')),
            _FbType.idea: Text('Idea'),
            _FbType.praise: Text('Praise'),
          },
        ),
        const SizedBox(height: QSpace.md),
        Container(
          decoration: BoxDecoration(
            color: QColors.surface.resolveFrom(context),
            borderRadius: BorderRadius.circular(QRadius.card),
          ),
          padding: const EdgeInsets.all(QSpace.sm),
          child: CupertinoTextField(
            controller: _controller,
            placeholder: 'Tell us what’s on your mind…',
            maxLines: 6,
            decoration: const BoxDecoration(),
            onChanged: (_) {
              if (_error != null) setState(() => _error = null);
            },
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: QSpace.sm),
          Text(_error!,
              style: QType.footnote
                  .copyWith(color: QColors.danger.resolveFrom(context))),
        ],
        const SizedBox(height: QSpace.md),
        InsetSection(
          children: [
            InsetRow(
              icon: CupertinoIcons.paperclip,
              iconColor: QColors.labelSecondary,
              title: 'Attach screenshot',
              onTap: () => HapticFeedback.selectionClick(),
            ),
          ],
        ),
        const SizedBox(height: QSpace.lg),
        PrimaryButton(
          label: 'Send',
          icon: CupertinoIcons.paperplane_fill,
          loading: _sending,
          onPressed: _send,
        ),
      ],
    );
  }
}
