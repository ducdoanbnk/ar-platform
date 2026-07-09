# LINE LIFF Fallback — Research Notes

**Date:** 2026-07-06
**Status:** RESOLVED 2026-07-09 — see BAO-CAO-TUONG-THICH-LIFF-WEBAR.md

> **Update 2026-07-09** — the two open questions below now have official answers:
>
> 1. **LINE MINI App is NOT a camera fallback.** LINE docs state a MINI App
>    "runs as a LIFF app" — same LIFF browser, same WKWebView/Android WebView,
>    same getUserMedia path. (Source: developers.line.biz/en/docs/line-mini-app/develop/web-to-mini-app/)
> 2. **`openExternalBrowser=1` does not work on LIFF apps** — LINE documents
>    the parameter as working for all URLs "except for on LIFF apps". The
>    ARStage fallback button was fixed to use `liff.openWindow({external: true})`
>    instead. (Source: developers.line.biz/en/docs/line-login/using-line-url-scheme/)
>
> The core conclusion of this note stands: manual code entry + GPS are the
> only guaranteed fallbacks for camera failure.

---

## Open Research Point: Fallback Effectiveness

### The Question

When LINE LIFF camera fails, does switching to WebView camera (`getUserMedia()`) actually work?

### Why This Matters

The proposed fallback hierarchy assumes:

```
liff.scanCodeV2() fail  ->  getUserMedia()  ->  manual code
```

But both `liff.scanCodeV2()` and `getUserMedia()` access the **camera** on the device. If the camera fails on a specific device, both may fail.

The difference is:
- `liff.scanCodeV2()` uses the **LINE app** camera module
- `getUserMedia()` uses the **WebView** camera module

These are different code paths in the LINE app. But they both ultimately access the same hardware camera sensor.

### Possible Scenarios

| Scenario | liff.scanCodeV2() | getUserMedia() | Fallback works? |
|---|---|---|---|
| Camera sensor broken | Fail | Fail | No |
| Camera permission denied | Fail | Fail | No |
| LINE app camera bug on this OS version | Fail | May work | Yes |
| WebView camera bug on this OS version | May work | Fail | Yes |
| Both stable | Work | Work | Yes |

### Conclusion

Fallback between `scanCodeV2()` and `getUserMedia()` is **not guaranteed** to work. It may work on some devices/OS versions but fail on others.

### Implication for Fallback Strategy

The only fallback that is **guaranteed** to work when camera-based methods fail is:
- **Manual code entry** — requires no camera at all
- **GPS check** — uses GPS sensor, not camera
- **Switching task type entirely** — not switching camera method

### What This Means for the Proposal

The current proposal assumes external browser fallback is the "last resort." But external browser also uses `getUserMedia()` — the same WebView camera that may have failed in LINE LIFF.

If the camera is genuinely broken or blocked on the device, **no camera-based fallback will work** regardless of whether it is in LINE LIFF or external browser.

The only real last resort is:
- Manual code entry
- GPS check (if GPS works)
- LINE MINI App (if it has a different camera implementation)

### Open Question

Does LINE MINI App use the same WebView camera as LINE LIFF, or does it have a different camera implementation?

If LINE MINI App uses a different camera module, it could be a genuine fallback path when LINE LIFF camera fails.

This needs to be verified with LINE documentation or testing.

---

## Summary of Findings

| Fallback Path | Mechanism | Guaranteed to Work? | Notes |
|---|---|---|---|
| scanCodeV2 -> getUserMedia (same environment) | Different code paths, same sensor | **Not guaranteed** | Depends on why scanCodeV2 failed |
| LINE LIFF -> external browser (camera) | Same getUserMedia in different browser | **Not guaranteed** | Same WebView camera failure mode |
| Any camera -> manual code | No camera needed | **Guaranteed** | Always works if user can type |
| Any camera -> GPS | Different sensor | **Guaranteed** | GPS and camera are independent |
| LINE LIFF camera fail -> LINE MINI App | Different app with different camera module? | **Unknown** | Needs verification |

---

## Recommendation

1. **Do not present external browser as a guaranteed fallback** for camera-based failures. It uses the same WebView camera that may have failed.

2. **Treat manual code and GPS as the real fallback** for camera-based failures.

3. **Research LINE MINI App camera implementation** to determine if it is a genuine fallback path or the same WebView failure mode.

4. **Update the fallback proposal** to reflect this finding.

