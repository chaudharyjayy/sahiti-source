import { useCallback, useEffect, useRef, useState } from "react";

export type UserPosition = {
  lat: number;
  lng: number;
  /** Metres of uncertainty reported by the device. */
  accuracy: number;
};

function describeError(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location permission was denied. Allow it in your browser settings to see your position.";
    case error.POSITION_UNAVAILABLE:
      return "Your position could not be determined right now.";
    case error.TIMEOUT:
      return "Finding your position took too long. Try again.";
    default:
      return "Location is unavailable on this device.";
  }
}

/**
 * One-shot geolocation, deliberately not a continuous watch: on a map that is
 * mostly read-only, a stream of updates drains battery and makes the view jump
 * around while the person is trying to read it.
 */
export function useGeolocation() {
  const [supported, setSupported] = useState(false);
  const [position, setPosition] = useState<UserPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    // Reset on every mount: in StrictMode the effect runs, cleans up and runs
    // again, so without this the callback would stay permanently disabled.
    mountedRef.current = true;
    setSupported(typeof navigator !== "undefined" && "geolocation" in navigator);
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setError("This browser cannot share your location.");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (result) => {
        if (!mountedRef.current) return;
        setPosition({
          lat: result.coords.latitude,
          lng: result.coords.longitude,
          accuracy: result.coords.accuracy,
        });
        setLoading(false);
      },
      (failure) => {
        if (!mountedRef.current) return;
        setError(describeError(failure));
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }, []);

  const clear = useCallback(() => {
    setPosition(null);
    setError(null);
  }, []);

  return { supported, position, loading, error, locate, clear };
}
