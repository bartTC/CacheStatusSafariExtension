# Known Issues

## Safari webRequest API Limitations

### External Link Navigation

**Issue:** When opening a link from an external application (e.g., clicking a URL in a text file, email, or another app), Safari does not fire `webRequest` events for the main document request.

**Impact:** The extension cannot capture HTTP response headers for pages opened via external links. The popup will display "Reload page to capture cache status" in these cases.

**Workaround:** Reload the page to capture headers. The reload request will properly trigger webRequest events.

**Technical Details:**
- `webNavigation.onBeforeNavigate` fires correctly
- `webNavigation.onCompleted` fires correctly
- `webRequest.onBeforeRequest` does NOT fire
- `webRequest.onHeadersReceived` does NOT fire
- `webRequest.onCompleted` fires but without prior header events

This appears to be a Safari-specific limitation where the browser bypasses the webRequest API for navigations initiated outside Safari.

### Related Safari webRequest Issues

Safari's webRequest API has several known misalignments with Chrome and Firefox:

1. **Navigation events missing** - Events don't fire for entering URLs in the address bar or navigating from the Start Page
2. **Binary request bodies** - Request-side events are suppressed for requests with raw/binary payloads
3. **Redirect handling** - `onHeadersReceived` not called for 302 redirect intermediate URLs
4. **Manifest V3** - Safari dropped webRequest support in MV3, requiring MV2 with `persistent: true`

### References

- [Apple Developer Forums - webRequest & webNavigation API behavior](https://developer.apple.com/forums/thread/735111)
- [Apple Developer Forums - webRequest.headersReceived redirect bug](https://developer.apple.com/forums/thread/660763)
- [MDN - Safari dropped webRequest in Manifest V3](https://github.com/mdn/browser-compat-data/issues/24571)

### Reporting to Apple

If you encounter this issue, consider filing a bug report via [Apple Feedback Assistant](https://feedbackassistant.apple.com) to help prioritize a fix.
