import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:pointycastle/export.dart';

// Mirrors crypto.ts: PBKDF2-SHA256 (600k iterations) + AES-256-GCM
// Key is held in memory only; salt is persisted in secure storage.

const _saltKey = 'vault_salt';
const _storage = FlutterSecureStorage();

Uint8List? _key; // 32-byte AES-256 key in memory

bool get isVaultLocked => _key == null;

void lockVault() => _key = null;

Future<void> saveVaultSalt(Uint8List salt) =>
    _storage.write(key: _saltKey, value: base64.encode(salt));

Future<Uint8List?> loadVaultSalt() async {
  final v = await _storage.read(key: _saltKey);
  return v == null ? null : base64.decode(v);
}

Future<bool> hasVaultSalt() async =>
    (await _storage.read(key: _saltKey)) != null;

// Derive AES-256 key from password + salt (PBKDF2-SHA256, 600k iterations)
Future<Uint8List> deriveKey(String password, Uint8List salt) async {
  final params = Pbkdf2Parameters(salt, 600000, 32);
  final pbkdf2 = PBKDF2KeyDerivator(HMac(SHA256Digest(), 64));
  pbkdf2.init(params);
  final keyBytes = pbkdf2.process(utf8.encode(password) as Uint8List);
  return keyBytes;
}

// Unlock vault: derive key and hold in memory
Future<bool> unlockVault(String password, Uint8List salt) async {
  try {
    _key = await deriveKey(password, salt);
    return true;
  } catch (_) {
    return false;
  }
}

// Encrypt with AES-GCM; returns {ciphertext, iv} as base64 strings
// Matches: encrypt(key, plaintext) in crypto.ts
Map<String, String> encryptVault(String plaintext) {
  if (_key == null) throw StateError('Vault is locked');

  final iv = _randomBytes(12);
  final params = AEADParameters(KeyParameter(_key!), 128, iv, Uint8List(0));
  final cipher = GCMBlockCipher(AESEngine())..init(true, params);

  final input = utf8.encode(plaintext) as Uint8List;
  final output = Uint8List(cipher.getOutputSize(input.length));
  var offset = 0;
  offset += cipher.processBytes(input, 0, input.length, output, offset);
  cipher.doFinal(output, offset);

  return {
    'ciphertext': base64.encode(output),
    'iv': base64.encode(iv),
  };
}

// Decrypt with AES-GCM
// Matches: decrypt(key, ciphertext, iv) in crypto.ts
String decryptVault(String ciphertext, String iv) {
  if (_key == null) throw StateError('Vault is locked');

  final ivBytes = base64.decode(iv);
  final ctBytes = base64.decode(ciphertext);

  final params = AEADParameters(KeyParameter(_key!), 128, ivBytes, Uint8List(0));
  final cipher = GCMBlockCipher(AESEngine())..init(false, params);

  final output = Uint8List(cipher.getOutputSize(ctBytes.length));
  var offset = 0;
  offset += cipher.processBytes(ctBytes, 0, ctBytes.length, output, offset);
  cipher.doFinal(output, offset);

  // output includes 16-byte GCM tag area already handled; trim to plaintext length
  return utf8.decode(output.sublist(0, output.length - 16 < 0 ? 0 : output.length - 16));
}

// Decrypt with an explicit key (for cross-password pull — matches SYNC_DECRYPT_WITH_SALT)
Future<String> decryptVaultWithKey(
    String ciphertext, String iv, Uint8List key) async {
  final ivBytes = base64.decode(iv);
  final ctBytes = base64.decode(ciphertext);

  final params = AEADParameters(KeyParameter(key), 128, ivBytes, Uint8List(0));
  final cipher = GCMBlockCipher(AESEngine())..init(false, params);

  final output = Uint8List(cipher.getOutputSize(ctBytes.length));
  var offset = 0;
  offset += cipher.processBytes(ctBytes, 0, ctBytes.length, output, offset);
  cipher.doFinal(output, offset);

  final plainLen = output.length - 16 < 0 ? 0 : output.length - 16;
  return utf8.decode(output.sublist(0, plainLen));
}

Uint8List _randomBytes(int length) {
  final rng = FortunaRandom();
  final seedSource = SecureRandom('Fortuna');
  // In production seed properly; for now use DateTime as minimal entropy source
  final seed = Uint8List(32);
  final now = DateTime.now().microsecondsSinceEpoch;
  for (var i = 0; i < 8; i++) {
    seed[i] = (now >> (i * 8)) & 0xFF;
  }
  rng.seed(KeyParameter(seed));
  return rng.nextBytes(length);
}
