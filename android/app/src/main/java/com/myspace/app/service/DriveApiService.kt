package com.myspace.app.service

import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.*

/** Retrofit interface for Google Drive REST API v3. */
interface DriveApiService {

    /** List files in appDataFolder matching the backup filename. */
    @GET("drive/v3/files")
    suspend fun listFiles(
        @Header("Authorization") bearer: String,
        @Query("spaces") spaces: String = "appDataFolder",
        @Query("q") query: String = "name='myspace-backup.json'",
        @Query("fields") fields: String = "files(id,name,modifiedTime)"
    ): DriveFileListResponse

    /** Create a new file via multipart upload. */
    @Multipart
    @POST("upload/drive/v3/files")
    suspend fun createFile(
        @Header("Authorization") bearer: String,
        @Query("uploadType") uploadType: String = "multipart",
        @Part metadata: MultipartBody.Part,
        @Part media: MultipartBody.Part
    ): DriveFile

    /** Update an existing file via multipart upload. */
    @Multipart
    @PATCH("upload/drive/v3/files/{fileId}")
    suspend fun updateFile(
        @Header("Authorization") bearer: String,
        @Path("fileId") fileId: String,
        @Query("uploadType") uploadType: String = "multipart",
        @Part metadata: MultipartBody.Part,
        @Part media: MultipartBody.Part
    ): DriveFile

    /** Download file content. */
    @GET("drive/v3/files/{fileId}")
    suspend fun downloadFile(
        @Header("Authorization") bearer: String,
        @Path("fileId") fileId: String,
        @Query("alt") alt: String = "media"
    ): Response<ResponseBody>
}

data class DriveFileListResponse(
    val files: List<DriveFile> = emptyList()
)

data class DriveFile(
    val id: String = "",
    val name: String = "",
    val modifiedTime: String = ""
)
