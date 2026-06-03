export const LIMITS = {
  COMMENT_CONTENT_MAX: 2000,
  COMMENT_CONTENT_MIN: 1,
  NICKNAME_MAX: 32,
  LIST_COMMENTS_DEFAULT: 20,
  LIST_COMMENTS_MAX: 100,
} as const;

export const HEADERS = {
  API_KEY: "x-quipier-key",
  AUTHORIZATION: "authorization",
} as const;

export const DEFAULT_API_BASE = "https://api.quipier.com";
export const DEFAULT_PASSPORT_APP_ORIGIN = "https://passport.quipier.com";

/** postMessage type the passport WebView posts back when /join completes. */
export const JOIN_MESSAGE_TYPE = "quipier:join:result";
