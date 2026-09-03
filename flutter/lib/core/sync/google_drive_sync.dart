import 'dart:convert';
import 'dart:typed_data';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:extension_google_sign_in_as_googleapis_auth/extension_google_sign_in_as_googleapis_auth.dart';
import 'package:googleapis/drive/v3.dart' as drive;
import '../crypto/vault.dart';

// Mirrors the service worker sync logic:
// - Uses Google Drive App Data folder
// - Backup file: 'keyvault-backup.json'
// - Encrypts entire DB export with vault key before upload

const _backupFileName = 'keyvault-backup.json';

final _googleSignIn = GoogleSignIn(
  scopes: [
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ],
);

class SyncUserInfo {
  final String email;
  final String? avatar;
  const SyncUserInfo({required this.email, this.avatar});
}

Future<SyncUserInfo?> getSyncUserInfo() async {
  final account = _googleSignIn.currentUser;
  if (account == null) return null;
  return SyncUserInfo(email: account.email, avatar: account.photoUrl);
}

Future<SyncUserInfo> connectSync() async {
  final account = await _googleSignIn.signIn();
  if (account == null) throw Exception('Sign-in cancelled');
  return SyncUserInfo(email: account.email, avatar: account.photoUrl);
}

Future<void> disconnectSync() async {
  await _googleSignIn.signOut();
}

Future<drive.DriveApi> _driveApi() async {
  final client = await _googleSignIn.authenticatedClient();
  if (client == null) throw Exception('Not signed in');
  return drive.DriveApi(client);
}

// Returns the Drive file ID of the backup, or null if not found
Future<String?> _findBackupFileId(drive.DriveApi api) async {
  final result = await api.files.list(
    spaces: 'appDataFolder',
    q: "name = '$_backupFileName'",
    $fields: 'files(id)',
  );
  return result.files?.firstOrNull?.id;
}

// Push: encrypt all data and upload to Drive app data folder
Future<void> syncPush(Map<String, dynamic> allData) async {
  if (isVaultLocked) throw StateError('Vault is locked');

  final plaintext = jsonEncode(allData);
  final encrypted = encryptVault(plaintext);
  final payload = jsonEncode({
    'ciphertext': encrypted['ciphertext'],
    'iv': encrypted['iv'],
    'version': 1,
  });

  final api = await _driveApi();
  final existingId = await _findBackupFileId(api);

  final media = drive.Media(
    Stream.value(utf8.encode(payload)),
    utf8.encode(payload).length,
    contentType: 'application/json',
  );

  if (existingId != null) {
    await api.files.update(
      drive.File(),
      existingId,
      uploadMedia: media,
    );
  } else {
    final file = drive.File()
      ..name = _backupFileName
      ..parents = ['appDataFolder'];
    await api.files.create(file, uploadMedia: media);
  }
}

// Pull: download and decrypt backup; returns decrypted JSON or null
// If the backup was encrypted with a different password, pass that password
// and its salt to re-encrypt under the current vault key.
Future<Map<String, dynamic>?> syncPull({
  String? backupPassword,
  List<int>? backupSalt,
}) async {
  final api = await _driveApi();
  final fileId = await _findBackupFileId(api);
  if (fileId == null) return null;

  final media = await api.files.get(
    fileId,
    downloadOptions: drive.DownloadOptions.fullMedia,
  ) as drive.Media;

  final chunks = <int>[];
  await for (final chunk in media.stream) {
    chunks.addAll(chunk);
  }
  final raw = jsonDecode(utf8.decode(chunks)) as Map<String, dynamic>;
  final ciphertext = raw['ciphertext'] as String;
  final iv = raw['iv'] as String;

  String plaintext;
  if (backupPassword != null && backupSalt != null) {
    final key = await deriveKey(backupPassword, Uint8List.fromList(backupSalt));
    plaintext = await decryptVaultWithKey(ciphertext, iv, key);
  } else {
    plaintext = decryptVault(ciphertext, iv);
  }

  return jsonDecode(plaintext) as Map<String, dynamic>;
}
