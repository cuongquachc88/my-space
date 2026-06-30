# Password generator

The password generator creates cryptographically random passwords with configurable length and character sets. It runs entirely client-side with no network calls, using the platform's secure random number generator.

## How it works

### Chrome extension

`generatePassword.ts` uses `crypto.getRandomValues` (Web Crypto API) as its randomness source, which is the browser's CSPRNG. The algorithm:

1. Collect enabled character sets (uppercase, lowercase, digits, symbols).
2. Guarantee at least one character from each enabled set by picking one random char from each.
3. Fill the remaining length with random chars from the combined alphabet.
4. Fisher-Yates shuffle the result so the guaranteed characters aren't always at the front.

This approach ensures every enabled character class appears in the output while maintaining uniform distribution after shuffling. If no character set is selected, or if the length is less than the number of enabled sets, an error is thrown.

`GeneratorView` provides the UI:

- **Length slider**: 8 to 64 characters, default 20. Changing the slider regenerates immediately via `useEffect`.
- **Character set toggles**: ABC (uppercase), abc (lowercase), 123 (digits), !@# (symbols). Each toggle has its own accent color. At least one must be enabled.
- **Strength meter**: calculates entropy in bits as `log2(charsetSize) * length` and classifies it as Weak (<40 bits, red), Fair (<60 bits, amber), Strong (<80 bits, green), or Very Strong (>=80 bits, indigo). The progress bar fills proportionally to 128 bits.
- **Regenerate and Copy**: regenerate produces a new password with the same settings; copy writes to `navigator.clipboard` with a 1.5s "Copied!" confirmation.

### Android

`GeneratorScreen` is functionally similar but with notable implementation differences:

- **Randomness source**: uses Kotlin's `pool.random()` (which internally uses `java.util.Random` / `ThreadLocalRandom`), not a cryptographic RNG. This is a weaker randomness guarantee than Chrome's `crypto.getRandomValues`.
- **No guaranteed character inclusion**: the Android version simply picks `length` random characters from the combined pool without ensuring at least one from each enabled set, and without Fisher-Yates shuffling.
- **No strength meter**: there is no entropy calculation or strength label.
- **Lowercase always on**: lowercase letters are always included in the pool (the `LOWER` set is unconditionally prepended). The toggles only control uppercase, digits, and symbols. There is no lowercase toggle.
- **UI**: Material 3 cards with a Slider (8-64, 55 steps), Switch toggles for character sets, and Copy/Regenerate buttons using `LocalClipboardManager`.

### Character sets

| Set | Characters | Size |
|-----|-----------|------|
| Uppercase | `ABCDEFGHIJKLMNOPQRSTUVWXYZ` | 26 |
| Lowercase | `abcdefghijklmnopqrstuvwxyz` | 26 |
| Digits | `0123456789` | 10 |
| Symbols (Chrome) | `!@#$%^&*()_+-=[]{}\|;:,.<>?` | 28 |
| Symbols (Android) | `!@#$%^&*()-_=+[]{}\|;:,.<>?` | 28 |

## Key source files

| File | Description |
|------|-------------|
| `chrome-extension/src/lib/generatePassword.ts` | CSPRNG-based password generation with guaranteed charset inclusion and Fisher-Yates shuffle |
| `chrome-extension/src/sidepanel/views/GeneratorView.tsx` | Chrome generator UI with strength meter and charset toggles |
| `android/app/src/main/java/com/myspace/app/ui/screens/GeneratorScreen.kt` | Android generator UI with inline `generatePassword` function |

## Cross-links

- [Secret vault](./secret-vault.md) - generated passwords can be stored as vault secrets
- [Chrome extension](../applications/chrome-extension.md) - extension architecture overview
