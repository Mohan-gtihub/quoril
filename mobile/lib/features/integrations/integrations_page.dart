import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/app_kit.dart';
import '../../core/widgets/editorial.dart';
import '../../core/widgets/primary_button.dart';
import '../settings/settings_widgets.dart';
import 'google_service.dart';

/// Integrations settings page — connect Google Calendar / Meet so that upcoming
/// events and join links surface alongside the user's tasks.
class IntegrationsPage extends ConsumerWidget {
  const IntegrationsPage({super.key});

  Future<void> _toggleConnection(BuildContext context, WidgetRef ref) async {
    final notifier = ref.read(googleConnectionProvider.notifier);
    final connected = ref.read(googleConnectionProvider);
    HapticFeedback.mediumImpact();
    try {
      if (connected) {
        await notifier.disconnect();
      } else {
        await notifier.connect();
      }
    } catch (_) {
      if (!context.mounted) return;
      HapticFeedback.heavyImpact();
      showCupertinoDialog<void>(
        context: context,
        builder: (ctx) => CupertinoAlertDialog(
          title: const Text('Could not connect'),
          content: const Padding(
            padding: EdgeInsets.only(top: QSpace.xs),
            child: Text('Google sign-in failed. Please try again.'),
          ),
          actions: [
            CupertinoDialogAction(
              isDefaultAction: true,
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('OK'),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final connected = ref.watch(googleConnectionProvider);

    return SettingsAmbientBackground(
      child: AppScaffold(
      title: 'Integrations',
      backgroundColor: const Color(0x00000000),
      transitionBetweenRoutes: true,
      slivers: [
        SliverPagePadding(
          top: QSpace.xs,
          child: QStagger(children: [
            _ConnectionSection(
              connected: connected,
              onTap: () => _toggleConnection(context, ref),
            ),
            if (connected) ...[
              const SizedBox(height: QSpace.xl),
              const _UpcomingSection(),
            ],
            const SizedBox(height: QSpace.lg),
            const SettingsFootnote(
              'Quoril reads your calendar in read-only mode to surface '
              'upcoming events and Meet links on your tasks. Your calendar '
              'data stays on your device and is never shared.',
            ),
          ]),
        ),
      ],
    ),
    );
  }
}

/// The Google Calendar + Meet connection group.
class _ConnectionSection extends StatelessWidget {
  const _ConnectionSection({required this.connected, required this.onTap});

  final bool connected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final statusColor = connected
        ? QColors.wellbeing.resolveFrom(context)
        : QColors.labelSecondary.resolveFrom(context);
    Widget status() => Text(
          connected ? 'Connected' : 'Not connected',
          style: QType.meta.copyWith(color: statusColor),
        );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const QSectionHeader(label: 'Google'),
        FrostedGroup(children: [
          SettingsRow(
            icon: CupertinoIcons.calendar,
            iconColor: QPlay.sky,
            title: 'Google Calendar',
            chevron: false,
            trailing: status(),
            onTap: onTap,
          ),
          SettingsRow(
            icon: CupertinoIcons.videocam_fill,
            iconColor: QPlay.mint,
            title: 'Google Meet',
            chevron: false,
            trailing: status(),
            onTap: onTap,
          ),
        ]),
        const SettingsFootnote('Join links surface on your tasks.'),
        const SizedBox(height: QSpace.md),
        _ConnectButton(connected: connected, onTap: onTap),
      ],
    );
  }
}

/// The connect / disconnect CTA. Connect uses the ember brand action; a
/// connected state offers a quiet, destructive-tinted disconnect.
class _ConnectButton extends StatelessWidget {
  const _ConnectButton({required this.connected, required this.onTap});

  final bool connected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    if (connected) {
      return SizedBox(
        width: double.infinity,
        child: CupertinoButton(
          padding: const EdgeInsets.symmetric(vertical: QSpace.sm),
          onPressed: onTap,
          child: Text(
            'Disconnect Google',
            style: QType.headline
                .copyWith(color: QColors.danger.resolveFrom(context)),
          ),
        ),
      );
    }
    return PrimaryButton(
      label: 'Connect Google',
      icon: CupertinoIcons.link,
      color: QColors.brand.resolveFrom(context),
      onPressed: onTap,
    );
  }
}

/// Upcoming events list, shown only when connected.
class _UpcomingSection extends ConsumerWidget {
  const _UpcomingSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final eventsAsync = ref.watch(googleEventsProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const QSectionHeader(label: 'Upcoming'),
        eventsAsync.when(
          loading: () => const FrostedGroup(children: [_EmptyEvents(text: 'Loading…')]),
          error: (_, _) => const FrostedGroup(
              children: [_EmptyEvents(text: 'Couldn’t load your calendar.')]),
          data: (events) {
            if (events.isEmpty) {
              return const FrostedGroup(
                  children: [_EmptyEvents(text: 'No upcoming events.')]);
            }
            return FrostedGroup(
              children: [for (final e in events) _EventRow(event: e)],
            );
          },
        ),
      ],
    );
  }
}

class _EmptyEvents extends StatelessWidget {
  const _EmptyEvents({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
          horizontal: QSpace.md, vertical: QSpace.md),
      child: Text(text, style: QType.subhead),
    );
  }
}

class _EventRow extends StatelessWidget {
  const _EventRow({required this.event});
  final GoogleEvent event;

  void _copyJoinLink(BuildContext context) {
    final link = event.meetLink;
    if (link == null) return;
    HapticFeedback.selectionClick();
    Clipboard.setData(ClipboardData(text: link));
    showCupertinoDialog<void>(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: const Text('Meet link copied'),
        content: const Padding(
          padding: EdgeInsets.only(top: QSpace.xs),
          child: Text('The join link is on your clipboard.'),
        ),
        actions: [
          CupertinoDialogAction(
            isDefaultAction: true,
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding:
          const EdgeInsets.symmetric(horizontal: QSpace.md, vertical: QSpace.sm),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 48),
        child: Row(
          children: [
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    event.title,
                    style: QType.body,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(_formatStart(event.start), style: QType.footnote),
                ],
              ),
            ),
            if (event.meetLink != null) ...[
              const SizedBox(width: QSpace.sm),
              CupertinoButton(
                padding: const EdgeInsets.symmetric(
                    horizontal: QSpace.sm, vertical: QSpace.xxs),
                borderRadius: BorderRadius.circular(QRadius.capsule),
                color: QColors.brand.resolveFrom(context),
                minimumSize: const Size(0, 0),
                onPressed: () => _copyJoinLink(context),
                child: Text(
                  'Join',
                  style: QType.footnote.copyWith(
                    color: CupertinoColors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatStart(DateTime dt) {
    final now = DateTime.now();
    final isToday =
        dt.year == now.year && dt.month == now.month && dt.day == now.day;
    final tomorrow = now.add(const Duration(days: 1));
    final isTomorrow = dt.year == tomorrow.year &&
        dt.month == tomorrow.month &&
        dt.day == tomorrow.day;

    final h = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
    final m = dt.minute.toString().padLeft(2, '0');
    final ampm = dt.hour < 12 ? 'AM' : 'PM';
    final time = '$h:$m $ampm';

    if (isToday) return 'Today · $time';
    if (isTomorrow) return 'Tomorrow · $time';
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${months[dt.month - 1]} ${dt.day} · $time';
  }
}
