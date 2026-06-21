package com.replypilot.services

import android.app.Notification
import android.content.Context
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.replypilot.api.ApiClient
import com.replypilot.models.IncomingMessageRequest
import com.replypilot.utils.Constants
import com.replypilot.utils.PreferencesManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class ReplyPilotNotificationService : NotificationListenerService() {

    private val TAG = "ReplyPilotNLS"
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private lateinit var prefs: PreferencesManager

    override fun onCreate() {
        super.onCreate()
        prefs = PreferencesManager(applicationContext)
        Log.d(TAG, "NotificationListenerService created")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val packageName = sbn.packageName

        // Only process WhatsApp notifications
        if (packageName != Constants.WHATSAPP_PACKAGE && packageName != Constants.WHATSAPP_BUSINESS_PACKAGE) {
            return
        }

        // Check if service is enabled
        if (!prefs.isEnabled()) return

        val apiKey = prefs.getApiKey() ?: return

        val extras = sbn.notification.extras
        val title = extras.getString(Notification.EXTRA_TITLE) ?: return
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: return

        // Skip group headers and empty messages
        if (text.isBlank() || title.isBlank()) return

        // Determine if it's a group message
        val isGroup = extras.getBoolean("android.isGroupConversation", false)
        val groupName = if (isGroup) extras.getString("android.conversationTitle") else null
        val contactName = if (isGroup) (extras.getString("android.nameSuffix") ?: title) else title
        val contactPhone = extractPhone(extras) ?: title

        val source = if (packageName == Constants.WHATSAPP_BUSINESS_PACKAGE) "whatsapp_business" else "whatsapp"

        Log.d(TAG, "WhatsApp message from: $contactName — $text")

        serviceScope.launch {
            try {
                val response = ApiClient.instance.sendIncomingMessage(
                    apiKey = apiKey,
                    request = IncomingMessageRequest(
                        contactName = contactName,
                        contactPhone = contactPhone,
                        content = text,
                        source = source,
                        isGroup = isGroup,
                        groupName = groupName
                    )
                )

                if (response.isSuccessful) {
                    val replyData = response.body()
                    val reply = replyData?.reply

                    if (!reply.isNullOrBlank()) {
                        val delayMs = replyData.delay
                        Log.d(TAG, "Got reply: $reply (delay: ${delayMs}ms)")

                        if (delayMs > 0) delay(delayMs)

                        // Send reply via notification action
                        sendReplyViaNotification(sbn, reply)
                    } else {
                        Log.d(TAG, "No reply generated: ${replyData?.reason}")
                    }
                } else {
                    Log.e(TAG, "API error: ${response.code()}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error sending message: ${e.message}")
            }
        }
    }

    private fun sendReplyViaNotification(sbn: StatusBarNotification, reply: String) {
        try {
            val actions = sbn.notification.actions ?: return

            // Find the reply action (usually the first remote input action)
            for (action in actions) {
                val remoteInputs = action.remoteInputs
                if (remoteInputs != null && remoteInputs.isNotEmpty()) {
                    val resultData = Bundle()
                    for (ri in remoteInputs) {
                        resultData.putCharSequence(ri.resultKey, reply)
                    }
                    val intent = action.actionIntent
                    try {
                        intent.send(applicationContext, 0, android.content.Intent().apply {
                            android.app.RemoteInput.addResultsToIntent(remoteInputs, this, resultData)
                        })
                        Log.d(TAG, "Reply sent successfully: $reply")
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to send reply: ${e.message}")
                    }
                    break
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "sendReplyViaNotification error: ${e.message}")
        }
    }

    private fun extractPhone(extras: Bundle): String? {
        // Try to get phone from notification extras
        return extras.getString("android.whatsapp.remote_jid")?.split("@")?.firstOrNull()
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        // Optional: track removed notifications
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "NotificationListenerService destroyed")
    }
}
