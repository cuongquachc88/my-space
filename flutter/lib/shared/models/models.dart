// Mirrors the TypeScript interfaces in extension/src/shared/messages.ts

class Note {
  final String id;
  final String title;
  final String content;
  final List<String> tags;
  final List<String> imageData; // base64 data URLs
  final DateTime createdAt;
  final DateTime updatedAt;

  const Note({
    required this.id,
    required this.title,
    required this.content,
    required this.tags,
    required this.imageData,
    required this.createdAt,
    required this.updatedAt,
  });
}

class SecretMeta {
  final String id;
  final String label;
  final List<String> tags;
  final String url;
  final String description;
  final DateTime updatedAt;

  const SecretMeta({
    required this.id,
    required this.label,
    required this.tags,
    required this.url,
    required this.description,
    required this.updatedAt,
  });
}

class SecretValue {
  final String id;
  final String label;
  final String value;
  const SecretValue({required this.id, required this.label, required this.value});
}

class Subscription {
  final String id;
  final String name;
  final double amount;
  final String currency;
  final String cycle; // monthly | yearly | weekly | one-time
  final String startDate; // yyyy-MM-dd
  final List<String> tags;
  final String notes;
  final bool active;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Subscription({
    required this.id,
    required this.name,
    required this.amount,
    required this.currency,
    required this.cycle,
    required this.startDate,
    required this.tags,
    required this.notes,
    required this.active,
    required this.createdAt,
    required this.updatedAt,
  });
}

class Bill {
  final String subId;
  final int year;
  final int month;
  final double amount;
  final String currency;
  final String notes;
  final DateTime updatedAt;

  const Bill({
    required this.subId,
    required this.year,
    required this.month,
    required this.amount,
    required this.currency,
    required this.notes,
    required this.updatedAt,
  });
}

class TodoList {
  final String id;
  final String name;
  final String color;
  final String icon;
  final DateTime createdAt;

  const TodoList({
    required this.id,
    required this.name,
    required this.color,
    required this.icon,
    required this.createdAt,
  });
}

class TodoTask {
  final String id;
  final String listId;
  final String title;
  final String note;
  final String priority; // low | medium | high
  final String? dueDate; // yyyy-MM-dd or null
  final String recurrence; // none | daily | weekly | monthly
  final bool done;
  final DateTime createdAt;
  final DateTime updatedAt;

  const TodoTask({
    required this.id,
    required this.listId,
    required this.title,
    required this.note,
    required this.priority,
    required this.dueDate,
    required this.recurrence,
    required this.done,
    required this.createdAt,
    required this.updatedAt,
  });
}

class MapStack {
  final String id;
  final String name;
  final String color;
  final String icon;
  final DateTime createdAt;

  const MapStack({
    required this.id,
    required this.name,
    required this.color,
    required this.icon,
    required this.createdAt,
  });
}

class MapPin {
  final String id;
  final String stackId;
  final String label;
  final double lat;
  final double lng;
  final String url;
  final String note;
  final String priority; // none | low | medium | high
  final String category;
  final double rating;
  final String reviewNote;
  final DateTime createdAt;

  const MapPin({
    required this.id,
    required this.stackId,
    required this.label,
    required this.lat,
    required this.lng,
    required this.url,
    required this.note,
    required this.priority,
    required this.category,
    required this.rating,
    required this.reviewNote,
    required this.createdAt,
  });
}
