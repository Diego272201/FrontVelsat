import { useEffect, useState } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

export default function useFingerprint() {
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    const loadFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        setFingerprint(result.visitorId);
        console.log("✅ visitorId generado:", result.visitorId);
      } catch (error) {
        console.error("❌ Error generando fingerprint:", error);
      }
    };

    loadFingerprint();
  }, []);

  return fingerprint;
}
