import 'dart:convert';
import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/config.dart';

/// A single upcoming Google Calendar event, trimmed to what the UI surfaces.
class GoogleEvent {
  const GoogleEvent({required this.title, required this.start, this.meetLink});

  final String title;
  final DateTime start;

  /// Google Meet / Hangout join URL, if the event carries one.
  final String? meetLink;
}

/// Wraps the shared Supabase client to add Google Calendar / Meet as an
/// *integration* (distinct from the sign-in path). Connecting requests the
/// calendar.readonly scope; the resulting provider token is used to read the
/// user's primary calendar over plain dart:io HttpClient (no http package).
///
/// TODO(config): For real OAuth this requires Supabase + Google Cloud setup:
///   1. Supabase Dashboard → Authentication → Providers → Google: enable it and
///      paste the OAuth Client ID + Secret from Google Cloud.
///   2. Google Cloud Console → APIs & Services:
///        - Enable the Google Calendar API.
///        - OAuth consent screen: add scopes `email`, `profile`, and
///          `https://www.googleapis.com/auth/calendar.readonly`.
///        - Credentials → Authorized redirect URIs: add Supabase's callback
///          `https://<project-ref>.supabase.co/auth/v1/callback`.
///   3. Supabase → URL Configuration → Redirect URLs: add the app deep link
///      `quoril://auth/callback` (QConfig.authCallback) so the browser returns
///      to the app after consent.
///   4. To keep a long-lived provider token across restarts, enable "provider
///      token" persistence / offline access (add `access_type=offline`).
class GoogleIntegrationService {
  GoogleIntegrationService(this._client);

  final SupabaseClient _client;

  static const _prefsKey = 'q_google_connected';

  /// Scopes requested when the user connects the Google integration.
  static const _scopes =
      'email profile https://www.googleapis.com/auth/calendar.readonly';

  SupabaseClient get client => _client;

  bool _connected = false;
  bool get connected => _connected;

  /// Loads the persisted flag. Call once before reading [connected].
  Future<bool> load() async {
    final prefs = await SharedPreferences.getInstance();
    _connected = prefs.getBool(_prefsKey) ?? false;
    return _connected;
  }

  /// Launches the Google OAuth consent flow (PKCE, external browser) reusing the
  /// app's existing deep-link callback, then persists the connected flag.
  Future<void> connect() async {
    await _client.auth.signInWithOAuth(
      OAuthProvider.google,
      scopes: _scopes,
      redirectTo: QConfig.authCallback,
      authScreenLaunchMode: LaunchMode.externalApplication,
    );
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_prefsKey, true);
    _connected = true;
  }

  /// Clears the connected flag. The Supabase session itself is left intact so
  /// the user stays signed in; only the integration is forgotten.
  Future<void> disconnect() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_prefsKey, false);
    _connected = false;
  }

  /// Reads the next few events from the user's primary calendar. Returns [] on
  /// any failure or when no provider token is available on the session.
  Future<List<GoogleEvent>> upcomingEvents() async {
    final token = _client.auth.currentSession?.providerToken;
    if (token == null || token.isEmpty) return const [];

    HttpClient? httpClient;
    try {
      final nowIso = DateTime.now().toUtc().toIso8601String();
      final uri = Uri.https(
        'www.googleapis.com',
        '/calendar/v3/calendars/primary/events',
        {
          'timeMin': nowIso,
          'maxResults': '10',
          'singleEvents': 'true',
          'orderBy': 'startTime',
        },
      );

      httpClient = HttpClient();
      final req = await httpClient.getUrl(uri);
      req.headers.set(HttpHeaders.authorizationHeader, 'Bearer $token');
      final resp = await req.close();
      if (resp.statusCode != 200) return const [];

      final body = await resp.transform(utf8.decoder).join();
      final json = jsonDecode(body) as Map<String, dynamic>;
      final items = json['items'];
      if (items is! List) return const [];

      final events = <GoogleEvent>[];
      for (final raw in items) {
        if (raw is! Map<String, dynamic>) continue;
        final start = _parseStart(raw['start']);
        if (start == null) continue;
        events.add(GoogleEvent(
          title: (raw['summary'] as String?)?.trim().isNotEmpty == true
              ? raw['summary'] as String
              : '(No title)',
          start: start,
          meetLink: _parseMeetLink(raw),
        ));
      }
      return events;
    } catch (_) {
      return const [];
    } finally {
      httpClient?.close(force: true);
    }
  }

  DateTime? _parseStart(Object? start) {
    if (start is! Map) return null;
    final dateTime = start['dateTime'] ?? start['date'];
    if (dateTime is! String) return null;
    return DateTime.tryParse(dateTime)?.toLocal();
  }

  String? _parseMeetLink(Map<String, dynamic> event) {
    final hangout = event['hangoutLink'];
    if (hangout is String && hangout.isNotEmpty) return hangout;

    final conf = event['conferenceData'];
    if (conf is Map) {
      final entryPoints = conf['entryPoints'];
      if (entryPoints is List) {
        for (final ep in entryPoints) {
          if (ep is Map &&
              ep['entryPointType'] == 'video' &&
              ep['uri'] is String) {
            return ep['uri'] as String;
          }
        }
      }
    }
    return null;
  }
}

/// The service instance, bound to the shared Supabase client.
final googleServiceProvider = Provider<GoogleIntegrationService>(
  (ref) => GoogleIntegrationService(Supabase.instance.client),
);

/// Exposes the connected flag + connect()/disconnect(); persists to
/// shared_preferences key 'q_google_connected'.
final googleConnectionProvider =
    NotifierProvider<GoogleNotifier, bool>(GoogleNotifier.new);

class GoogleNotifier extends Notifier<bool> {
  @override
  bool build() {
    // Hydrate the persisted flag asynchronously, then flip state.
    ref.read(googleServiceProvider).load().then((v) {
      if (state != v) state = v;
    });
    return ref.read(googleServiceProvider).connected;
  }

  Future<void> connect() async {
    await ref.read(googleServiceProvider).connect();
    state = true;
    ref.invalidate(googleEventsProvider);
  }

  Future<void> disconnect() async {
    await ref.read(googleServiceProvider).disconnect();
    state = false;
    ref.invalidate(googleEventsProvider);
  }
}

/// Upcoming events for the connected calendar; [] when disconnected or on error.
final googleEventsProvider = FutureProvider<List<GoogleEvent>>((ref) async {
  final connected = ref.watch(googleConnectionProvider);
  if (!connected) return const [];
  return ref.read(googleServiceProvider).upcomingEvents();
});
