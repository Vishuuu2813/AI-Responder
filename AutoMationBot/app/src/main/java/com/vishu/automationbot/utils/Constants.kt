package com.vishu.automationbot.utils

object Constants {
    const val API_BASE_URL = "https://replypilot.vercel.app/api/"

    // WhatsApp package names
    const val WHATSAPP_PACKAGE = "com.whatsapp"
    const val WHATSAPP_BUSINESS_PACKAGE = "com.whatsapp.w4b"

    // Notification channel
    const val CHANNEL_ID = "replypilot_foreground"
    const val CHANNEL_NAME = "ReplyPilot Service"
    const val NOTIFICATION_ID = 1001

    // Preferences keys
    const val PREF_API_KEY = "api_key"
    const val PREF_IS_ENABLED = "is_enabled"
    const val PREF_USER_EMAIL = "user_email"

    // Actions
    const val ACTION_START_SERVICE = "com.vishu.automationbot.START"
    const val ACTION_STOP_SERVICE = "com.vishu.automationbot.STOP"
}
