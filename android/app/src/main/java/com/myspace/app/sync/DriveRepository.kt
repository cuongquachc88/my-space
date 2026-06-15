package com.myspace.app.sync

import android.content.Context
import android.util.Base64
import com.google.gson.Gson
import com.myspace.app.crypto.CryptoManager
import com.myspace.app.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

private const val DRIVE_FILES = "https://www.googleapis.com/drive/v3/files"
private const val DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files"
private const val BACKUP_NAME = "keyvault-backup.json"

data class DriveExport(
    val notes: List<NoteEntity>,
    val secrets: List<SecretEntity>,
    val subscriptions: List<SubscriptionEntity>,
)

class DriveRepository(private val context: Context, private val db: AppDatabase) {
    private val client = OkHttpClient()
    private val gson   = Gson()
    private val prefs  = context.getSharedPreferences("myspace_sync", Context.MODE_PRIVATE)

    private fun fileId() = prefs.getString("drive_file_id", null)
    private fun setFileId(id: String) = prefs.edit().putString("drive_file_id", id).apply()

    private suspend fun findFileId(token: String): String? {
        fileId()?.let { return it }
        val url = "$DRIVE_FILES?spaces=appDataFolder&q=name+%3D+'$BACKUP_NAME'&fields=files(id)"
        val req = Request.Builder().url(url).header("Authorization", "Bearer $token").build()
        val body = withContext(Dispatchers.IO) { client.newCall(req).execute().body?.string() } ?: return null
        val files = JSONObject(body).getJSONArray("files")
        if (files.length() > 0) {
            val id = files.getJSONObject(0).getString("id")
            setFileId(id)
            return id
        }
        return null
    }

    suspend fun push(token: String): Result<String> = runCatching {
        val notes = db.noteDao().getAll()
        val secrets = db.secretDao().getAll()
        val subs = db.subscriptionDao().getAll()
        val plaintext = gson.toJson(DriveExport(notes, secrets, subs))
        val (ciphertext, iv) = CryptoManager.encrypt(plaintext)
        val payload = gson.toJson(mapOf("ciphertext" to ciphertext, "iv" to iv))

        val boundary = "myspace_boundary"
        val metadata = """{"name":"$BACKUP_NAME","parents":${if (fileId() == null) """["appDataFolder"]""" else "null"}}"""
        val multipart = "--$boundary\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n$metadata\r\n--$boundary\r\nContent-Type: application/json\r\n\r\n$payload\r\n--$boundary--"

        val existingId = findFileId(token)
        val url = if (existingId != null) "$DRIVE_UPLOAD/$existingId?uploadType=multipart" else "$DRIVE_UPLOAD?uploadType=multipart"
        val method = if (existingId != null) "PATCH" else "POST"

        val req = Request.Builder()
            .url(url)
            .method(method, multipart.toRequestBody("multipart/related; boundary=$boundary".toMediaType()))
            .header("Authorization", "Bearer $token")
            .build()

        val resp = withContext(Dispatchers.IO) { client.newCall(req).execute() }
        val respBody = resp.body?.string() ?: throw Exception("Empty response")
        val newId = JSONObject(respBody).getString("id")
        setFileId(newId)
        newId
    }

    suspend fun pull(token: String): Result<DriveExport> = runCatching {
        val id = findFileId(token) ?: throw Exception("No backup found — push first")
        val req = Request.Builder()
            .url("$DRIVE_FILES/$id?alt=media")
            .header("Authorization", "Bearer $token")
            .build()
        val text = withContext(Dispatchers.IO) { client.newCall(req).execute().body?.string() }
            ?.takeIf { it.isNotBlank() } ?: throw Exception("No data on Drive")

        val json = JSONObject(text)
        val plaintext = CryptoManager.decrypt(json.getString("ciphertext"), json.getString("iv"))
        val export = gson.fromJson(plaintext, DriveExport::class.java)

        db.noteDao().deleteAll()
        export.notes.forEach { db.noteDao().upsert(it) }
        db.secretDao().deleteAll()
        export.secrets.forEach { db.secretDao().upsert(it) }
        db.subscriptionDao().deleteAll()
        export.subscriptions.forEach { db.subscriptionDao().upsert(it) }

        export
    }
}
