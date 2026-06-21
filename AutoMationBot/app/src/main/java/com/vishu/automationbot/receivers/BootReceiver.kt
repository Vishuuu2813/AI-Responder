package com.vishu.automationbot.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.vishu.automationbot.services.ReplyForegroundService
import com.vishu.automationbot.utils.PreferencesManager

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON") {
            val prefs = PreferencesManager(context)
            if (prefs.isEnabled()) {
                context.startForegroundService(Intent(context, ReplyForegroundService::class.java))
            }
        }
    }
}
