import 'package:flutter/material.dart';

class AppColors {
  static const background = Color(0xFF0D1117);
  static const surface = Color(0xFF161B22);
  static const border = Color(0x1AFFFFFF);
  static const textPrimary = Color(0xCCFFFFFF);
  static const textSecondary = Color(0x66FFFFFF);
  static const textDim = Color(0x40FFFFFF);

  // Accent per feature (matches extension glow colors)
  static const notes = Color(0xFF6366F1);          // indigo
  static const keyvault = Color(0xFFF59E0B);        // amber
  static const generator = Color(0xFFA78BFA);       // violet
  static const subscriptions = Color(0xFF34D399);   // emerald
  static const reports = Color(0xFFF472B6);         // pink
  static const sync = Color(0xFF3B82F6);            // blue
  static const settings = Color(0xFF3B82F6);        // blue
  static const mapPins = Color(0xFFFB923C);         // orange
  static const todo = Color(0xFF38BDF8);            // sky

  static const error = Color(0xFFEF4444);
  static const success = Color(0xFF22C55E);
}

ThemeData buildAppTheme() {
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: AppColors.background,
    colorScheme: const ColorScheme.dark(
      surface: AppColors.surface,
      primary: AppColors.keyvault,
      error: AppColors.error,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.background,
      foregroundColor: AppColors.textPrimary,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: AppColors.textPrimary,
        fontSize: 17,
        fontWeight: FontWeight.w600,
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0x12FFFFFF),
      hintStyle: const TextStyle(color: AppColors.textDim, fontSize: 14),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0x40FFFFFF)),
      ),
    ),
    textTheme: const TextTheme(
      bodyMedium: TextStyle(color: AppColors.textPrimary, fontSize: 14),
      bodySmall: TextStyle(color: AppColors.textSecondary, fontSize: 12),
      labelSmall: TextStyle(color: AppColors.textDim, fontSize: 11),
    ),
    dividerColor: AppColors.border,
  );
}
