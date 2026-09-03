import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'shared/theme/app_theme.dart';
import 'core/crypto/vault.dart';
import 'features/notes/notes_screen.dart';
import 'features/keyvault/keyvault_screen.dart';
import 'features/generator/generator_screen.dart';
import 'features/subscriptions/subscriptions_screen.dart';
import 'features/reports/reports_screen.dart';
import 'features/map_pins/map_pins_screen.dart';
import 'features/todo/todo_screen.dart';
import 'features/sync/sync_screen.dart';
import 'features/settings/settings_screen.dart';
import 'shared/widgets/vault_gate.dart';

// ── Navigation items ───────────────────────────────────────────────────────

enum AppTab {
  notes,
  keyvault,
  generator,
  subscriptions,
  reports,
  mapPins,
  todo,
  sync,
  settings,
}

const _tabMeta = {
  AppTab.notes:         _TabMeta('Notes',         Icons.sticky_note_2_outlined, AppColors.notes),
  AppTab.keyvault:      _TabMeta('Keyvault',       Icons.shield_outlined,        AppColors.keyvault),
  AppTab.generator:     _TabMeta('Generator',      Icons.key_outlined,           AppColors.generator),
  AppTab.subscriptions: _TabMeta('Subscriptions',  Icons.credit_card_outlined,   AppColors.subscriptions),
  AppTab.reports:       _TabMeta('Reports',         Icons.bar_chart_outlined,     AppColors.reports),
  AppTab.mapPins:       _TabMeta('Map Pins',        Icons.location_on_outlined,   AppColors.mapPins),
  AppTab.todo:          _TabMeta('Tasks',           Icons.check_box_outlined,     AppColors.todo),
  AppTab.sync:          _TabMeta('Sync',            Icons.sync_outlined,          AppColors.sync),
  AppTab.settings:      _TabMeta('Settings',        Icons.settings_outlined,      AppColors.settings),
};

class _TabMeta {
  final String label;
  final IconData icon;
  final Color color;
  const _TabMeta(this.label, this.icon, this.color);
}

// Tabs that require vault unlock (mirrors GATED_VIEWS in extension)
const _gatedTabs = {
  AppTab.notes,
  AppTab.keyvault,
  AppTab.subscriptions,
  AppTab.reports,
  AppTab.sync,
  AppTab.settings,
  AppTab.mapPins,
};

// ── Root app ───────────────────────────────────────────────────────────────

class MySpaceApp extends StatelessWidget {
  const MySpaceApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'My SPACE',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      home: const _AppShell(),
    );
  }
}

// ── App shell with bottom nav ──────────────────────────────────────────────

class _AppShell extends ConsumerStatefulWidget {
  const _AppShell();

  @override
  ConsumerState<_AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<_AppShell> {
  AppTab _activeTab = AppTab.notes;

  @override
  Widget build(BuildContext context) {
    final meta = _tabMeta[_activeTab]!;
    final isGated = _gatedTabs.contains(_activeTab);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Glow background
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: 200,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.topLeft,
                  radius: 1.2,
                  colors: [
                    meta.color.withOpacity(0.15),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          // Content
          Column(
            children: [
              Expanded(
                child: isGated
                    ? VaultGate(child: _buildScreen(_activeTab))
                    : _buildScreen(_activeTab),
              ),
              _BottomNav(
                active: _activeTab,
                onTap: (tab) => setState(() => _activeTab = tab),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildScreen(AppTab tab) {
    switch (tab) {
      case AppTab.notes:         return const NotesScreen();
      case AppTab.keyvault:      return const KeyvaultScreen();
      case AppTab.generator:     return const GeneratorScreen();
      case AppTab.subscriptions: return SubscriptionsScreen(onGoReports: () => setState(() => _activeTab = AppTab.reports));
      case AppTab.reports:       return ReportsScreen(onBack: () => setState(() => _activeTab = AppTab.subscriptions));
      case AppTab.mapPins:       return const MapPinsScreen();
      case AppTab.todo:          return const TodoScreen();
      case AppTab.sync:          return const SyncScreen();
      case AppTab.settings:      return SettingsScreen(onLock: () => setState(() {}));
    }
  }
}

// ── Bottom navigation bar ──────────────────────────────────────────────────

class _BottomNav extends StatelessWidget {
  final AppTab active;
  final ValueChanged<AppTab> onTap;

  const _BottomNav({required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 56,
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: AppTab.values.map((tab) {
                final meta = _tabMeta[tab]!;
                final isActive = tab == active;
                return GestureDetector(
                  onTap: () => onTap(tab),
                  behavior: HitTestBehavior.opaque,
                  child: Container(
                    width: 60,
                    alignment: Alignment.center,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          meta.icon,
                          size: 22,
                          color: isActive ? meta.color : AppColors.textDim,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          meta.label,
                          style: TextStyle(
                            fontSize: 9,
                            color: isActive ? meta.color : AppColors.textDim,
                            fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (isActive)
                          Container(
                            margin: const EdgeInsets.only(top: 2),
                            width: 16,
                            height: 2,
                            decoration: BoxDecoration(
                              color: meta.color,
                              borderRadius: BorderRadius.circular(1),
                            ),
                          ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
      ),
    );
  }
}
