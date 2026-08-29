package com.myspace.app.service

import android.util.Base64
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.myspace.app.crypto.VaultCrypto
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import javax.inject.Inject
import javax.inject.Singleton

private const val BACKUP_FILENAME = "myspace-backup.json"

/**
 * Orchestrates Google Drive backup/restore using the same encrypted JSON format
 * as the Chrome extension. The inner payload is AES-GCM encrypted with the vault key.
 *
 * Backup envelope (what Drive stores):
 * { "salt": "<base64>", "iv": "<base64>", "ciphertext": "<base64>" }
 */
@Singleton
class SyncRepository @Inject constructor(
    private val driveApi: DriveApiService,
    private val exporter: DatabaseExporter,
    private val crypto: VaultCrypto
) {
    private val gson = Gson()

    // -------------------------------------------------------------------------
    // Upload (push)
    // -------------------------------------------------------------------------

    /**
     * @param accessToken  Bearer token obtained via OAuth
     * @param salt         The vault salt stored in DataStore (needed to rebuild envelope)
     */
    suspend fun push(accessToken: String, salt: ByteArray) {
        val bearer = "Bearer $accessToken"

        // 1. Export all data to plaintext JSON
        val plainJson = exporter.exportToJson()

        // 2. Encrypt with vault key
        val encResult = crypto.encrypt(plainJson)

        // 3. Build envelope JSON
        val envelope = JsonObject().apply {
            addProperty("salt",       Base64.encodeToString(salt, Base64.NO_WRAP))
            addProperty("iv",         encResult.iv)
            addProperty("ciphertext", encResult.ciphertext)
        }
        val envelopeJson = gson.toJson(envelope)

        // 4. Find existing file or create
        val existing = driveApi.listFiles(bearer).files.firstOrNull()

        val metadataPart = buildMetadataPart(BACKUP_FILENAME)
        val mediaPart    = buildMediaPart(envelopeJson)

        if (existing == null) {
            driveApi.createFile(bearer, metadata = metadataPart, media = mediaPart)
        } else {
            driveApi.updateFile(bearer, fileId = existing.id, metadata = metadataPart, media = mediaPart)
        }
    }

    // -------------------------------------------------------------------------
    // Download (pull)
    // -------------------------------------------------------------------------

    suspend fun pull(accessToken: String) {
        val bearer = "Bearer $accessToken"

        // 1. Find the backup file
        val file = driveApi.listFiles(bearer).files.firstOrNull()
            ?: error("No backup found on Drive")

        // 2. Download content
        val response = driveApi.downloadFile(bearer, file.id)
        val body = response.body() ?: error("Empty response from Drive")
        val envelopeJson = body.string()

        // 3. Parse envelope
        val envelope = gson.fromJson(envelopeJson, JsonObject::class.java)
        val salt       = Base64.decode(envelope["salt"].asString, Base64.NO_WRAP)
        val iv         = envelope["iv"].asString
        val ciphertext = envelope["ciphertext"].asString

        // 4. Derive key from current password using stored salt and decrypt
        //    The vault must already be unlocked — we use the current vault key.
        val plainJson = crypto.decrypt(ciphertext, iv)

        // 5. Import into Room
        exporter.importFromJson(plainJson)
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private fun buildMetadataPart(filename: String): MultipartBody.Part {
        val metadataJson = """{"name":"$filename","parents":["appDataFolder"]}"""
        val body = metadataJson.toRequestBody("application/json".toMediaType())
        return MultipartBody.Part.createFormData("metadata", null, body)
    }

    private fun buildMediaPart(content: String): MultipartBody.Part {
        val body = content.toRequestBody("application/json".toMediaType())
        return MultipartBody.Part.createFormData("media", null, body)
    }
}
