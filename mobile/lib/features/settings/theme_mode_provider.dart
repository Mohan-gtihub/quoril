import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// App appearance override. `system` follows the OS; `light`/`dark` force one.
enum QThemeMode { system, light, dark }

extension QThemeModeX on QThemeMode {
  /// The brightness this mode forces, or `null` to follow the platform.
  Brightness? get forcedBrightness => switch (this) {
        QThemeMode.system => null,
        QThemeMode.light => Brightness.light,
        QThemeMode.dark => Brightness.dark,
      };

  String get storageKey => switch (this) {
        QThemeMode.system => 'system',
        QThemeMode.light => 'light',
        QThemeMode.dark => 'dark',
      };

  static QThemeMode fromStorage(String? raw) => switch (raw) {
        'light' => QThemeMode.light,
        'dark' => QThemeMode.dark,
        _ => QThemeMode.system,
      };
}

const _kThemeModePrefsKey = 'quoril.appearance.themeMode';

/// Persisted app-appearance override.
///
/// The app root (CupertinoApp) must read this to resolve the active brightness
/// so the choice takes effect globally — not just inside the Appearance preview.
///
/// TODO(app-root): in lib/main.dart, make `QuorilApp` a `ConsumerWidget` and
/// resolve brightness as:
///   `final forced = ref.watch(themeModeProvider).forcedBrightness;`
///   `final brightness = forced ?? (MediaQuery...platformBrightness);`
/// then pass `theme: brightness == Brightness.dark ? QTheme.dark : QTheme.light`.
final themeModeProvider =
    NotifierProvider<ThemeModeNotifier, QThemeMode>(ThemeModeNotifier.new);

class ThemeModeNotifier extends Notifier<QThemeMode> {
  @override
  QThemeMode build() {
    _restore();
    return QThemeMode.system;
  }

  Future<void> _restore() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      state = QThemeModeX.fromStorage(prefs.getString(_kThemeModePrefsKey));
    } catch (_) {
      // Non-fatal: fall back to the default `system` already set in build().
    }
  }

  Future<void> set(QThemeMode mode) async {
    if (mode == state) return;
    state = mode;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_kThemeModePrefsKey, mode.storageKey);
    } catch (_) {
      // Best-effort persistence; in-memory state is already updated.
    }
  }
}
