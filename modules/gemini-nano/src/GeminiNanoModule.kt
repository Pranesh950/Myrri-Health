package com.myrri.gemini

import android.content.Context
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class GeminiNanoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("GeminiNanoModule")

    Function("isAvailable") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        try {
          val clazz = Class.forName("android.os.AICore")
          val method = clazz.getMethod("isAvailable")
          return@Function method.invoke(null) as? Boolean ?: false
        } catch (_: Exception) {
          return@Function false
        }
      }
      return@Function false
    }

    AsyncFunction("generate") { (prompt: String, systemPrompt: String) ->
      try {
        val aiCoreClass = Class.forName("android.os.AICore")
        val createMethod = aiCoreClass.getMethod("create", Context::class.java)
        val aiCore = createMethod.invoke(null, appContext.reactContext ?: return@AsyncFunction "")
        val sessionClass = Class.forName("android.os.AICoreSession")
        val createSessionMethod = aiCoreClass.getMethod("createSession", String::class.java)
        val session = createSessionMethod.invoke(aiCore, "gemini_nano")

        val generateMethod = sessionClass.getMethod("generate", String::class.java, String::class.java, Float::class.java, Int::class.java, Float::class.java)
        val result = generateMethod.invoke(session, prompt, systemPrompt, 0.7f, 512, 0.9f)

        return@AsyncFunction result?.toString() ?: ""
      } catch (e: Exception) {
        throw Exception("Gemini Nano generation failed: ${e.message}")
      }
    }
  }
}
