export function getAuthErrorMessage(error) {
  if (error?.code === "auth/popup-closed-by-user") {
    return "Google sign-in was cancelled.";
  }
  if (error?.code === "auth/popup-blocked") {
    return "Your browser blocked the Google sign-in popup.";
  }
  if (error?.code === "auth/network-request-failed") {
    return "Network error. Check your connection and try again.";
  }
  return error?.message || "Google sign-in failed. Please try again.";
}
