package com.replypilot.ui

import android.app.ActivityManager
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.text.TextUtils
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.replypilot.services.ReplyForegroundService
import com.replypilot.utils.Constants
import com.replypilot.utils.PreferencesManager

class MainActivity : AppCompatActivity() {

    private lateinit var prefs: PreferencesManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = PreferencesManager(this)
        setContentView(createLayout())
    }

    override fun onResume() {
        super.onResume()
        updateUI()
    }

    private fun createLayout(): View {
        // Programmatic layout for simplicity
        val layout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(48, 80, 48, 48)
            setBackgroundColor(0xFF0A0A0F.toInt())
        }

        // Title
        val title = android.widget.TextView(this).apply {
            text = "✈️ ReplyPilot"
            textSize = 28f
            setTextColor(0xFF6366F1.toInt())
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            setPadding(0, 0, 0, 8)
        }
        layout.addView(title)

        val subtitle = android.widget.TextView(this).apply {
            text = "Your Intelligent Auto Reply Assistant"
            textSize = 14f
            setTextColor(0xFF94A3B8.toInt())
            setPadding(0, 0, 0, 40)
        }
        layout.addView(subtitle)

        // API Key input
        val apiKeyLabel = android.widget.TextView(this).apply { text = "API Key"; textSize = 13f; setTextColor(0xFF94A3B8.toInt()); setPadding(0, 0, 0, 8) }
        layout.addView(apiKeyLabel)

        val apiKeyInput = android.widget.EditText(this).apply {
            hint = "Enter your ReplyPilot API key"
            setText(prefs.getApiKey() ?: "")
            setTextColor(0xFFF8FAFC.toInt())
            setHintTextColor(0xFF64748B.toInt())
            setBackgroundColor(0xFF161622.toInt())
            setPadding(20, 16, 20, 16)
            id = android.R.id.edit
        }
        layout.addView(apiKeyInput, android.widget.LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = 24 })

        // Save API Key button
        val saveBtn = android.widget.Button(this).apply {
            text = "Save API Key"
            setBackgroundColor(0xFF6366F1.toInt())
            setTextColor(0xFFFFFFFF.toInt())
            textSize = 14f
            setPadding(0, 16, 0, 16)
        }
        saveBtn.setOnClickListener {
            val key = apiKeyInput.text.toString().trim()
            if (key.isNotEmpty()) {
                prefs.saveApiKey(key)
                Toast.makeText(this, "API Key saved!", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, "Please enter your API key", Toast.LENGTH_SHORT).show()
            }
        }
        layout.addView(saveBtn, android.widget.LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = 32 })

        // Notification Permission button
        val notifBtn = android.widget.Button(this).apply {
            text = "1. Grant Notification Access"
            setBackgroundColor(0xFF1E1E2E.toInt())
            setTextColor(0xFFF8FAFC.toInt())
            textSize = 13f
            setPadding(0, 14, 0, 14)
        }
        notifBtn.setOnClickListener { openNotificationSettings() }
        layout.addView(notifBtn, android.widget.LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = 12 })

        // Battery optimization button
        val batteryBtn = android.widget.Button(this).apply {
            text = "2. Disable Battery Optimization"
            setBackgroundColor(0xFF1E1E2E.toInt())
            setTextColor(0xFFF8FAFC.toInt())
            textSize = 13f
            setPadding(0, 14, 0, 14)
        }
        batteryBtn.setOnClickListener { requestBatteryOptimizationExemption() }
        layout.addView(batteryBtn, android.widget.LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = 32 })

        // Start/Stop toggle
        val toggleBtn = android.widget.Button(this).apply {
            id = 0x1234
            text = if (prefs.isEnabled()) "🟢 Auto-Reply is ON — Tap to Stop" else "🔴 Auto-Reply is OFF — Tap to Start"
            setBackgroundColor(if (prefs.isEnabled()) 0xFF10B981.toInt() else 0xFFEF4444.toInt())
            setTextColor(0xFFFFFFFF.toInt())
            textSize = 14f
            setPadding(0, 18, 0, 18)
        }
        toggleBtn.setOnClickListener {
            val newState = !prefs.isEnabled()
            prefs.setEnabled(newState)
            if (newState) {
                startForegroundService(Intent(this, ReplyForegroundService::class.java))
                Toast.makeText(this, "Auto-reply started!", Toast.LENGTH_SHORT).show()
            } else {
                stopService(Intent(this, ReplyForegroundService::class.java))
                Toast.makeText(this, "Auto-reply stopped.", Toast.LENGTH_SHORT).show()
            }
            updateUI()
        }
        layout.addView(toggleBtn, android.widget.LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = 24 })

        // Status
        val statusText = android.widget.TextView(this).apply {
            id = 0x1235
            text = getStatusText()
            textSize = 12f
            setTextColor(0xFF64748B.toInt())
            gravity = android.view.Gravity.CENTER
        }
        layout.addView(statusText)

        // Get API key link
        val linkText = android.widget.TextView(this).apply {
            text = "Get your API key at replypilot.vercel.app/dashboard/settings"
            textSize = 11f
            setTextColor(0xFF6366F1.toInt())
            gravity = android.view.Gravity.CENTER
            setPadding(0, 24, 0, 0)
        }
        linkText.setOnClickListener { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://replypilot.vercel.app"))) }
        layout.addView(linkText)

        return android.widget.ScrollView(this).apply { addView(layout) }
    }

    private fun updateUI() {
        // Refresh button states
    }

    private fun getStatusText(): String {
        val notifAccess = isNotificationServiceEnabled()
        val apiKey = prefs.getApiKey() != null
        return buildString {
            append(if (notifAccess) "✅" else "❌"); append(" Notification Access\n")
            append(if (apiKey) "✅" else "❌"); append(" API Key\n")
            append(if (prefs.isEnabled()) "✅" else "❌"); append(" Auto-Reply Active")
        }
    }

    private fun isNotificationServiceEnabled(): Boolean {
        val flat = Settings.Secure.getString(contentResolver, "enabled_notification_listeners")
        if (!TextUtils.isEmpty(flat)) {
            val names = flat.split(":").toTypedArray()
            for (name in names) {
                val cn = ComponentName.unflattenFromString(name)
                if (cn != null && TextUtils.equals(packageName, cn.packageName)) return true
            }
        }
        return false
    }

    private fun openNotificationSettings() {
        startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
    }

    private fun requestBatteryOptimizationExemption() {
        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
        intent.data = Uri.parse("package:$packageName")
        startActivity(intent)
    }
}
