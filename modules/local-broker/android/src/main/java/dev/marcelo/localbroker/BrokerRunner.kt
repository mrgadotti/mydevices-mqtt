package dev.marcelo.localbroker

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.net.wifi.WifiManager
import java.io.File

/** Runs the Mosquitto executable (packaged as libmosquitto_exec.so) as a child process and keeps it alive. */
class BrokerRunner(
  private val context: Context,
  val port: Int,
  private val onLog: (String) -> Unit,
  private val onExit: (Int, Boolean) -> Unit,
) {
  @Volatile private var process: Process? = null
  @Volatile private var stopped = true
  private var supervisor: Thread? = null
  private var wifiLock: WifiManager.WifiLock? = null
  private var multicastLock: WifiManager.MulticastLock? = null
  private var nsdListener: NsdManager.RegistrationListener? = null

  fun isRunning(): Boolean = !stopped && (process?.isAlive == true)

  @Synchronized
  fun start() {
    if (!stopped) return
    val exe = File(context.applicationInfo.nativeLibraryDir, "libmosquitto_exec.so")
    if (!exe.exists()) throw IllegalStateException("Broker binary not found: ${exe.path}")
    val conf = File(context.filesDir, "mosquitto.conf")
    conf.writeText(
      "listener $port 0.0.0.0\n" +
        "allow_anonymous true\n" +
        "persistence false\n" +
        "log_dest stderr\n",
    )
    stopped = false
    // First launch synchronously so that a bad binary/port surfaces as a start() rejection.
    launch(exe, conf)
    Thread.sleep(300)
    if (process?.isAlive != true) {
      val code = process?.exitValue() ?: -1
      stopped = true
      throw IllegalStateException("Broker exited immediately (code $code); is port $port in use?")
    }
    acquireLocks()
    advertise()
    supervisor = Thread({ supervise(exe, conf) }, "local-broker-supervisor").also {
      it.isDaemon = true
      it.start()
    }
  }

  @Synchronized
  fun stop() {
    stopped = true
    process?.destroy()
    val p = process
    if (p != null) {
      try {
        if (!p.waitFor(1500, java.util.concurrent.TimeUnit.MILLISECONDS)) p.destroyForcibly()
      } catch (_: Exception) {
      }
    }
    process = null
    supervisor?.interrupt()
    supervisor = null
    unadvertise()
    releaseLocks()
  }

  private fun launch(exe: File, conf: File) {
    val pb = ProcessBuilder(exe.path, "-c", conf.path)
    pb.redirectErrorStream(true)
    val p = pb.start()
    process = p
    Thread({
      try {
        p.inputStream.bufferedReader().forEachLine { onLog(it) }
      } catch (_: Exception) {
      }
    }, "local-broker-log").also { it.isDaemon = true; it.start() }
  }

  private fun supervise(exe: File, conf: File) {
    var backoff = 1000L
    try {
      while (!stopped) {
        val p = process ?: break
        val started = System.currentTimeMillis()
        val code = p.waitFor()
        if (stopped) break
        val restarting = true
        onExit(code, restarting)
        if (System.currentTimeMillis() - started > 30_000) backoff = 1000L
        Thread.sleep(backoff)
        backoff = minOf(backoff * 2, 30_000L)
        if (stopped) break
        try {
          launch(exe, conf)
        } catch (e: Exception) {
          onLog("restart failed: ${e.message}")
          // keep looping: process is the dead one, waitFor returns at once and backs off again
        }
      }
    } catch (_: InterruptedException) {
    }
  }

  private fun acquireLocks() {
    try {
      val wm = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
      @Suppress("DEPRECATION")
      wifiLock = wm.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "mqttiot:broker").apply {
        setReferenceCounted(false)
        acquire()
      }
      multicastLock = wm.createMulticastLock("mqttiot:broker").apply {
        setReferenceCounted(false)
        acquire()
      }
    } catch (_: Exception) {
    }
  }

  private fun releaseLocks() {
    try { wifiLock?.takeIf { it.isHeld }?.release() } catch (_: Exception) {}
    try { multicastLock?.takeIf { it.isHeld }?.release() } catch (_: Exception) {}
    wifiLock = null
    multicastLock = null
  }

  private fun advertise() {
    try {
      val nsd = context.getSystemService(Context.NSD_SERVICE) as NsdManager
      val info = NsdServiceInfo().apply {
        serviceName = "myDevice MQTT"
        serviceType = "_mqtt._tcp"
        port = this@BrokerRunner.port
      }
      val l = object : NsdManager.RegistrationListener {
        override fun onServiceRegistered(i: NsdServiceInfo) {}
        override fun onRegistrationFailed(i: NsdServiceInfo, e: Int) {}
        override fun onServiceUnregistered(i: NsdServiceInfo) {}
        override fun onUnregistrationFailed(i: NsdServiceInfo, e: Int) {}
      }
      nsd.registerService(info, NsdManager.PROTOCOL_DNS_SD, l)
      nsdListener = l
    } catch (_: Exception) {
    }
  }

  private fun unadvertise() {
    val l = nsdListener ?: return
    nsdListener = null
    try {
      (context.getSystemService(Context.NSD_SERVICE) as NsdManager).unregisterService(l)
    } catch (_: Exception) {
    }
  }
}
