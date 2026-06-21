package com.replypilot.utils

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class PreferencesManager(private val context: Context) {

    private val prefs: SharedPreferences by lazy {
        try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            EncryptedSharedPreferences.create(
                context,
                "replypilot_secure_prefs",
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            // Fallback to normal prefs
            context.getSharedPreferences("replypilot_prefs", Context.MODE_PRIVATE)
        }
    }

    fun saveApiKey(apiKey: String) = prefs.edit().putString(Constants.PREF_API_KEY, apiKey).apply()
    fun getApiKey(): String? = prefs.getString(Constants.PREF_API_KEY, null)

    fun setEnabled(enabled: Boolean) = prefs.edit().putBoolean(Constants.PREF_IS_ENABLED, enabled).apply()
    fun isEnabled(): Boolean = prefs.getBoolean(Constants.PREF_IS_ENABLED, false)

    fun saveEmail(email: String) = prefs.edit().putString(Constants.PREF_USER_EMAIL, email).apply()
    fun getEmail(): String? = prefs.getString(Constants.PREF_USER_EMAIL, null)

    fun clear() = prefs.edit().clear().apply()
}
