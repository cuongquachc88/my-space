import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/db/database.dart';
import '../../core/sync/google_drive_sync.dart';
import '../../shared/theme/app_theme.dart';

// db functions imported from database.dart

class _LogLine {
  final String text;
  final Color color;
  _LogLine(this.text, this.color);
}

class SyncScreen extends ConsumerStatefulWidget {
  const SyncScreen({super.key});

  @override
  ConsumerState<SyncScreen> createState() => _SyncScreenState();
}

class _SyncScreenState extends ConsumerState<SyncScreen> {
  SyncUserInfo? _user;
  List<_LogLine> _log = [];
  bool _running = false;
  final _scrollCtrl = ScrollController();

  

  @override
  void initState() {
    super.initState();
    _checkUser();
  }

  @override
  void dispose() { _scrollCtrl.dispose(); super.dispose(); }

  Future<void> _checkUser() async {
    final info = await getSyncUserInfo();
    if (mounted) setState(() => _user = info);
  }

  void _addLog(String text, Color color) {
    setState(() => _log.add(_LogLine(text, color)));
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(_scrollCtrl.position.maxScrollExtent,
            duration: const Duration(milliseconds: 200), curve: Curves.easeOut);
      }
    });
  }

  Future<void> _connect() async {
    setState(() => _running = true);
    _addLog('Connecting to Google…', AppColors.sync);
    try {
      final info = await connectSync();
      setState(() => _user = info);
      _addLog('Signed in as ${info.email}', AppColors.success);
    } catch (e) {
      _addLog('Connection failed: $e', AppColors.error);
    }
    setState(() => _running = false);
  }

  Future<void> _disconnect() async {
    await disconnectSync();
    setState(() { _user = null; _log = []; });
  }

  Future<void> _push() async {
    setState(() { _running = true; _log = []; });
    _addLog('Exporting database…', AppColors.sync);
    try {
      final data = await exportAll();
      _addLog('Encrypting data…', AppColors.sync);
      await syncPush(data);
      _addLog('Upload complete!', AppColors.success);
    } catch (e) {
      _addLog('Push failed: $e', AppColors.error);
    }
    setState(() => _running = false);
  }

  Future<void> _pull() async {
    setState(() { _running = true; _log = []; });
    _addLog('Downloading backup…', AppColors.sync);
    try {
      final data = await syncPull();
      if (data == null) {
        _addLog('No backup found in Drive.', AppColors.keyvault);
      } else {
        _addLog('Decrypted backup successfully.', AppColors.success);
        _addLog('Note: manual import into DB not yet implemented.', AppColors.textSecondary);
      }
    } catch (e) {
      _addLog('Pull failed: $e', AppColors.error);
    }
    setState(() => _running = false);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                const Text('Sync',
                    style: TextStyle(color: AppColors.textPrimary, fontSize: 18, fontWeight: FontWeight.w700)),
                const Spacer(),
                if (_user != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.success.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.success.withOpacity(0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.circle, size: 6, color: AppColors.success),
                        const SizedBox(width: 4),
                        Text(_user!.email,
                            style: const TextStyle(color: AppColors.success, fontSize: 10)),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: _user == null
              ? SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _running ? null : _connect,
                    icon: const Icon(Icons.login, size: 16),
                    label: const Text('Connect Google Account'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.sync,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                )
              : Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _running ? null : _push,
                        icon: const Icon(Icons.upload, size: 16),
                        label: const Text('Push'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.sync.withOpacity(0.2),
                          foregroundColor: AppColors.sync,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _running ? null : _pull,
                        icon: const Icon(Icons.download, size: 16),
                        label: const Text('Pull'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.sync.withOpacity(0.2),
                          foregroundColor: AppColors.sync,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    TextButton(
                      onPressed: _disconnect,
                      child: const Text('Disconnect',
                          style: TextStyle(color: AppColors.textDim, fontSize: 12)),
                    ),
                  ],
                ),
        ),
        const SizedBox(height: 16),
        Expanded(
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF0A0E14),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text('Log',
                        style: TextStyle(color: AppColors.textDim, fontSize: 11, fontFamily: 'monospace')),
                    const Spacer(),
                    if (_running)
                      const SizedBox(width: 12, height: 12,
                          child: CircularProgressIndicator(strokeWidth: 1.5, color: AppColors.sync)),
                  ],
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: ListView.builder(
                    controller: _scrollCtrl,
                    itemCount: _log.length,
                    itemBuilder: (ctx, i) {
                      final line = _log[i];
                      final now = DateTime.now();
                      final ts = '${now.hour.toString().padLeft(2,'0')}:'
                          '${now.minute.toString().padLeft(2,'0')}:'
                          '${now.second.toString().padLeft(2,'0')}';
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: RichText(
                          text: TextSpan(
                            children: [
                              TextSpan(
                                text: '$ts  ',
                                style: const TextStyle(color: AppColors.textDim, fontSize: 11, fontFamily: 'monospace'),
                              ),
                              TextSpan(
                                text: line.text,
                                style: TextStyle(color: line.color, fontSize: 11, fontFamily: 'monospace'),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }
}
