import 'dart:convert';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config.dart';

/// Thin wrapper over Supabase auth — email/password, Google OAuth (PKCE),
/// password reset, and JWT role/tier decoding. Matches the desktop flow.
class AuthService {
  AuthService(this._client);
  final SupabaseClient _client;

  SupabaseClient get client => _client;
  Session? get session => _client.auth.currentSession;
  User? get user => _client.auth.currentUser;
  bool get isSignedIn => session != null;

  Stream<AuthState> get onAuthStateChange => _client.auth.onAuthStateChange;

  Future<AuthResponse> signIn(String email, String password) {
    return _client.auth.signInWithPassword(email: email.trim(), password: password);
  }

  Future<AuthResponse> signUp(String email, String password) {
    return _client.auth.signUp(
      email: email.trim(),
      password: password,
      emailRedirectTo: QConfig.authCallback,
    );
  }

  Future<bool> signInWithGoogle() {
    return _client.auth.signInWithOAuth(
      OAuthProvider.google,
      redirectTo: QConfig.authCallback,
      authScreenLaunchMode: LaunchMode.externalApplication,
    );
  }

  Future<void> resetPassword(String email) {
    return _client.auth.resetPasswordForEmail(email.trim(), redirectTo: QConfig.authCallback);
  }

  Future<void> signOut() => _client.auth.signOut();

  // --- JWT claims -----------------------------------------------------------

  Map<String, dynamic>? _claims() {
    final token = session?.accessToken;
    if (token == null) return null;
    try {
      final part = token.split('.')[1];
      final norm = base64.normalize(part.replaceAll('-', '+').replaceAll('_', '/'));
      return jsonDecode(utf8.decode(base64.decode(norm))) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  List<String> get roles {
    final c = _claims();
    final raw = c?['app_metadata']?['roles'] ?? c?['roles'];
    return raw is List ? raw.whereType<String>().toList() : const [];
  }

  String get tier {
    final c = _claims();
    final t = c?['app_metadata']?['tier'] ?? c?['tier'];
    return (t == 'monthly' || t == 'annual' || t == 'lifetime') ? t as String : 'free';
  }

  bool get isPro => tier != 'free';
}
