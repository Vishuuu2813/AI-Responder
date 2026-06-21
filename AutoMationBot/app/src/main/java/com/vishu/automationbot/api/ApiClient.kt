package com.vishu.automationbot.api

import com.vishu.automationbot.models.IncomingMessageRequest
import com.vishu.automationbot.models.ReplyResponse
import com.vishu.automationbot.utils.Constants
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST
import java.util.concurrent.TimeUnit

interface ReplyPilotApi {
    @POST("messages/incoming")
    suspend fun sendIncomingMessage(
        @Header("x-api-key") apiKey: String,
        @Body request: IncomingMessageRequest
    ): Response<ReplyResponse>
}

object ApiClient {
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    val instance: ReplyPilotApi by lazy {
        Retrofit.Builder()
            .baseUrl(Constants.API_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ReplyPilotApi::class.java)
    }
}
