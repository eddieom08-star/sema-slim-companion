import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";

/**
 * Debug panel for viewing logs on mobile
 * Access by shaking device or tapping screen 5 times
 */
export function DebugPanel() {
  const [visible, setVisible] = useState(false);
  const [logs, setLogs] = useState<string>("");
  const [tapCount, setTapCount] = useState(0);
  const isMobile = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!isMobile) return;

    let tapTimeout: NodeJS.Timeout;

    const handleTap = () => {
      setTapCount((prev) => {
        const newCount = prev + 1;

        // Reset after 2 seconds
        clearTimeout(tapTimeout);
        tapTimeout = setTimeout(() => setTapCount(0), 2000);

        // Show debug panel after 5 taps
        if (newCount >= 5) {
          setVisible(true);
          setTapCount(0);
        }

        return newCount;
      });
    };

    window.addEventListener("click", handleTap);
    return () => {
      window.removeEventListener("click", handleTap);
      clearTimeout(tapTimeout);
    };
  }, [isMobile]);

  useEffect(() => {
    if (visible && isMobile) {
      // Retrieve logs
      const storedLogs = localStorage.getItem("semaslim_debug_logs");
      if (storedLogs) {
        try {
          const parsed = JSON.parse(storedLogs);
          setLogs(parsed.join("\n"));
        } catch {
          setLogs("Error loading logs");
        }
      } else {
        setLogs("No logs available");
      }
    }
  }, [visible, isMobile]);

  if (!isMobile || !visible) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 overflow-auto p-4 font-mono text-xs">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white font-bold text-lg">Debug Logs</h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              const fresh = localStorage.getItem("semaslim_debug_logs");
              if (fresh) {
                const parsed = JSON.parse(fresh);
                setLogs(parsed.join("\n"));
              }
            }}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              localStorage.removeItem("semaslim_debug_logs");
              setLogs("Logs cleared");
            }}
          >
            Clear
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setVisible(false)}>
            Close
          </Button>
        </div>
      </div>
      <pre className="text-green-400 whitespace-pre-wrap break-words">
        {logs}
      </pre>
    </div>
  );
}
