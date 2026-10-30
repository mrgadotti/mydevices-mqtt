package dev.marcelo.localbroker

import android.os.Handler
import android.os.Looper
import android.os.Process
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class LocalBrokerModule : Module() {
  private var runner: BrokerRunner? = null

  private val context get() = appContext.reactContext ?: throw IllegalStateException("No React context")

  override fun definition() = ModuleDefinition {
    Name("LocalBroker")

    Events("onExit", "onLog")

    AsyncFunction("start") { port: Int, promise: Promise ->
      try {
        synchronized(this@LocalBrokerModule) {
          val current = runner
          if (current != null && current.port == port && current.isRunning()) {
            promise.resolve(null)
            return@AsyncFunction
          }
          current?.stop()
          val r = BrokerRunner(
            context.applicationContext,
            port,
            onLog = { line -> sendEvent("onLog", mapOf("line" to line)) },
            onExit = { code, restarting -> sendEvent("onExit", mapOf("code" to code, "restarting" to restarting)) },
          )
          runner = r
          r.start()
        }
        promise.resolve(null)
      } catch (e: Exception) {
        promise.reject("ERR_LOCAL_BROKER_START", e.message ?: "Could not start the broker", e)
      }
    }

    AsyncFunction("stop") {
      synchronized(this@LocalBrokerModule) {
        runner?.stop()
        runner = null
      }
    }

    Function("isRunning") { runner?.isRunning() ?: false }

    // Ends the app completely: the broker, the activity and the process (the foreground service lives in it).
    Function("quit") {
      synchronized(this@LocalBrokerModule) {
        runner?.stop()
        runner = null
      }
      appContext.currentActivity?.finishAndRemoveTask()
      Handler(Looper.getMainLooper()).postDelayed({ Process.killProcess(Process.myPid()) }, 300)
    }

    Function("getNetworkInfo") { NetworkInfo.read(context) }

    OnDestroy {
      runner?.stop()
      runner = null
    }
  }
}
