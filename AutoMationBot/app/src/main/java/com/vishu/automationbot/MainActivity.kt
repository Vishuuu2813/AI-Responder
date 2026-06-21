package com.vishu.automationbot

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.text.TextUtils
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.vishu.automationbot.services.ReplyForegroundService
import com.vishu.automationbot.ui.theme.AutoMationBotTheme
import com.vishu.automationbot.utils.PreferencesManager

class MainActivity : ComponentActivity() {

    private lateinit var prefs: PreferencesManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = PreferencesManager(this)
        enableEdgeToEdge()
        setContent {
            AutoMationBotTheme(darkTheme = true, dynamicColor = false) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFF0A0A0F)
                ) {
                    MainScreen(prefs = prefs, activity = this)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(prefs: PreferencesManager, activity: ComponentActivity) {
    val context = LocalContext.current
    val focusManager = LocalFocusManager.current

    var apiKey by remember { mutableStateOf(prefs.getApiKey() ?: "") }
    var isEnabled by remember { mutableStateOf(prefs.isEnabled()) }
    var hasNotifAccess by remember { mutableStateOf(isNotificationServiceEnabled(context)) }

    // Periodically check permissions
    LaunchedEffect(Unit) {
        while (true) {
            hasNotifAccess = isNotificationServiceEnabled(context)
            kotlinx.coroutines.delay(1000)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
            .statusBarsPadding()
            .navigationBarsPadding(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(24.dp))

        // Title
        Text(
            text = "✈️ ReplyPilot",
            fontSize = 32.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF6366F1),
            fontFamily = FontFamily.SansSerif
        )
        Text(
            text = "Your Intelligent Auto Reply Assistant",
            fontSize = 14.sp,
            color = Color(0xFF94A3B8),
            modifier = Modifier.padding(top = 4.dp, bottom = 32.dp)
        )

        // API Key Section
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFF13131A), RoundedCornerShape(16.dp))
                .padding(16.dp)
        ) {
            Text(
                text = "API Key",
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color(0xFF94A3B8),
                modifier = Modifier.padding(bottom = 8.dp)
            )

            OutlinedTextField(
                value = apiKey,
                onValueChange = { apiKey = it },
                placeholder = { Text("Enter your ReplyPilot API Key", color = Color(0xFF64748B)) },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                modifier = Modifier.fillMaxWidth(),
                colors = TextFieldDefaults.outlinedTextFieldColors(
                    focusedBorderColor = Color(0xFF6366F1),
                    unfocusedBorderColor = Color(0xFF2E2E38),
                    containerColor = Color(0xFF1C1C24)
                ),
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(modifier = Modifier.height(12.dp))

            Button(
                onClick = {
                    val key = apiKey.trim()
                    if (key.isNotEmpty()) {
                        prefs.saveApiKey(key)
                        Toast.makeText(context, "API Key saved!", Toast.LENGTH_SHORT).show()
                        focusManager.clearFocus()
                    } else {
                        Toast.makeText(context, "Please enter a valid API key", Toast.LENGTH_SHORT).show()
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Save API Key", color = Color.White, fontWeight = FontWeight.Bold)
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Steps & Checklist Section
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFF13131A), RoundedCornerShape(16.dp))
                .padding(16.dp)
        ) {
            Text(
                text = "Required Permissions",
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            // Step 1: Notification Access
            PermissionRow(
                title = "1. Grant Notification Access",
                description = "Required to intercept incoming WhatsApp messages",
                isGranted = hasNotifAccess,
                onClick = {
                    context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                }
            )

            Divider(color = Color(0xFF2E2E38), modifier = Modifier.padding(vertical = 12.dp))

            // Step 2: Battery Optimization
            PermissionRow(
                title = "2. Disable Battery Optimization",
                description = "Keeps ReplyPilot running reliably in background",
                isGranted = false, // Always offer to configure
                onClick = {
                    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:${context.packageName}")
                    }
                    context.startActivity(intent)
                }
            )
        }

        Spacer(modifier = Modifier.height(32.dp))

        // Master Toggle Button
        val buttonColor = if (isEnabled) Color(0xFF10B981) else Color(0xFFEF4444)
        Button(
            onClick = {
                if (prefs.getApiKey().isNullOrEmpty()) {
                    Toast.makeText(context, "Save API Key first", Toast.LENGTH_SHORT).show()
                    return@Button
                }
                if (!isNotificationServiceEnabled(context)) {
                    Toast.makeText(context, "Enable notification permission first", Toast.LENGTH_SHORT).show()
                    return@Button
                }

                val newState = !isEnabled
                prefs.setEnabled(newState)
                isEnabled = newState

                val serviceIntent = Intent(context, ReplyForegroundService::class.java)
                if (newState) {
                    context.startForegroundService(serviceIntent)
                    Toast.makeText(context, "Auto-Reply started!", Toast.LENGTH_SHORT).show()
                } else {
                    context.stopService(serviceIntent)
                    Toast.makeText(context, "Auto-Reply stopped.", Toast.LENGTH_SHORT).show()
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            colors = ButtonDefaults.buttonColors(containerColor = buttonColor),
            shape = RoundedCornerShape(14.dp)
        ) {
            Text(
                text = if (isEnabled) "🟢 Auto-Reply is ON — Tap to Stop" else "🔴 Auto-Reply is OFF — Tap to Start",
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
        }

        Spacer(modifier = Modifier.weight(1f))

        // Get key link
        Text(
            text = "Get your API key at replypilot.vercel.app",
            fontSize = 12.sp,
            color = Color(0xFF6366F1),
            textDecoration = TextDecoration.Underline,
            modifier = Modifier
                .clickable {
                    val urlIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://replypilot.vercel.app"))
                    context.startActivity(urlIntent)
                }
                .padding(bottom = 16.dp)
        )
    }
}

@Composable
fun PermissionRow(
    title: String,
    description: String,
    isGranted: Boolean,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(text = title, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
            Text(text = description, fontSize = 11.sp, color = Color(0xFF64748B))
        }
        Text(
            text = if (isGranted) "Granted ✓" else "Configure ➔",
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = if (isGranted) Color(0xFF10B981) else Color(0xFFf59e0b),
            modifier = Modifier
                .background(
                    if (isGranted) Color(0xFF10B981).copy(alpha = 0.15f) else Color(0xFFf59e0b).copy(alpha = 0.15f),
                    RoundedCornerShape(100)
                )
                .padding(horizontal = 10.dp, vertical = 4.dp)
        )
    }
}

private fun isNotificationServiceEnabled(context: Context): Boolean {
    val flat = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
    if (!TextUtils.isEmpty(flat)) {
        val names = flat.split(":").toTypedArray()
        for (name in names) {
            val cn = ComponentName.unflattenFromString(name)
            if (cn != null && TextUtils.equals(context.packageName, cn.packageName)) return true
        }
    }
    return false
}