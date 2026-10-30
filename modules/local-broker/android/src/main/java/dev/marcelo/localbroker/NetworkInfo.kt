package dev.marcelo.localbroker

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import java.net.Inet4Address
import java.net.NetworkInterface

object NetworkInfo {
  /** IPv4 addresses of the active, non-loopback networks (Wi-Fi first), plus the hostname and its ".local" alias. */
  fun read(context: Context): Map<String, Any?> {
    val ips = LinkedHashSet<String>()
    try {
      val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
      @Suppress("DEPRECATION")
      val networks = cm.allNetworks.sortedByDescending {
        cm.getNetworkCapabilities(it)?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
      }
      for (n in networks) {
        val caps = cm.getNetworkCapabilities(n) ?: continue
        if (caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN) || caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) continue
        val props = cm.getLinkProperties(n) ?: continue
        for (la in props.linkAddresses) {
          val a = la.address
          if (a is Inet4Address && !a.isLoopbackAddress && !a.isLinkLocalAddress) a.hostAddress?.let { ips.add(it) }
        }
      }
    } catch (_: Exception) {
    }
    if (ips.isEmpty()) {
      // Fallback for hotspot/tethering interfaces that are not a "network" for this app.
      try {
        for (itf in NetworkInterface.getNetworkInterfaces()) {
          if (!itf.isUp || itf.isLoopback || itf.isVirtual) continue
          if (!(itf.name.startsWith("wlan") || itf.name.startsWith("ap") || itf.name.startsWith("swlan"))) continue
          for (a in itf.inetAddresses) {
            if (a is Inet4Address && !a.isLoopbackAddress && !a.isLinkLocalAddress) a.hostAddress?.let { ips.add(it) }
          }
        }
      } catch (_: Exception) {
      }
    }
    val hostname = usableHostname()
    return mapOf(
      "ips" to ips.toList(),
      "hostname" to hostname,
      "alias" to hostname?.let { "$it.local" },
    )
  }

  private fun usableHostname(): String? {
    val raw = try {
      val p = Runtime.getRuntime().exec(arrayOf("getprop", "net.hostname"))
      p.inputStream.bufferedReader().readText().trim()
    } catch (_: Exception) {
      ""
    }
    // Android's default is "android-<hex>", which is not resolvable by other hosts.
    if (raw.isEmpty() || raw.startsWith("android-") || raw == "localhost") return null
    if (!Regex("^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$").matches(raw)) return null
    return raw
  }
}
