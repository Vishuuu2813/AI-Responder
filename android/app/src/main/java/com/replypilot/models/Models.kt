package com.replypilot.models

data class IncomingMessageRequest(
    val contactName: String,
    val contactPhone: String,
    val content: String,
    val source: String,       // "whatsapp" or "whatsapp_business"
    val isGroup: Boolean = false,
    val groupName: String? = null
)

data class ReplyResponse(
    val reply: String?,
    val delay: Long = 0,
    val replyMode: String = "none",
    val reason: String? = null
)

data class LoginRequest(
    val email: String,
    val password: String
)

data class AuthResponse(
    val token: String?,
    val apiKey: String?,
    val user: UserData?,
    val error: String? = null
)

data class UserData(
    val id: String,
    val name: String,
    val email: String,
    val role: String
)
