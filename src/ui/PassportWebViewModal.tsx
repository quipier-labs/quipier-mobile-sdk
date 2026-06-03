import * as React from "react";
import { useMemo, useRef } from "react";
import {
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from "react-native";
import { JOIN_MESSAGE_TYPE } from "../core/constants";
import type { ThemePalette } from "./theme";

export interface PassportJoinResult {
  ok: boolean;
  project_id?: string;
  project_token_id?: string;
  nickname?: string;
  session_token?: string;
  expires_at?: string;
  message?: string;
}

interface Props {
  palette: ThemePalette;
  visible: boolean;
  projectId: string;
  passportAppOrigin: string;
  onClose: () => void;
  onResult: (msg: PassportJoinResult) => void;
}

// Bridge: passport (the web app) posts the join result via
//   window.opener.postMessage({type:"quipier:join:result", …}, returnOrigin)
// and then calls `window.close()` ~1.2s later. Neither works in a RN WebView:
// there is no opener, and window.close() is a no-op. We inject a shim BEFORE
// the page's JS runs that:
//   1. Fakes a `window.opener` whose `.postMessage(msg, _)` forwards to RN.
//   2. Intercepts `window.close()` and forwards a "close" signal so RN can
//      dismiss the modal.
//   3. Still listens to in-page `window.postMessage` (any future codepath).
// Passport itself needs zero changes.
const CLOSE_MESSAGE_TYPE = "quipier:close";
const INJECTED_BRIDGE = `(function() {
  if (window.__quipierBridgeInstalled) return;
  window.__quipierBridgeInstalled = true;
  function forward(payload) {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(
          typeof payload === "string" ? payload : JSON.stringify(payload)
        );
      }
    } catch (e) {}
  }

  // (1) Shim window.opener — passport calls window.opener.postMessage(result, returnOrigin).
  try {
    var openerShim = {
      postMessage: function (msg) {
        if (msg && (msg.type === ${JSON.stringify(JOIN_MESSAGE_TYPE)} || msg.type === ${JSON.stringify(CLOSE_MESSAGE_TYPE)})) {
          forward(msg);
        }
      },
    };
    // Some browsers make window.opener read-only when null. Use defineProperty
    // and fall back to direct assignment.
    try {
      Object.defineProperty(window, "opener", {
        configurable: true,
        get: function () { return openerShim; },
      });
    } catch (e) {
      try { window.opener = openerShim; } catch (e2) {}
    }
  } catch (e) {}

  // (2) Intercept window.close() so RN can dismiss the modal.
  try {
    var origClose = window.close;
    window.close = function () {
      forward({ type: ${JSON.stringify(CLOSE_MESSAGE_TYPE)} });
      try { if (origClose) origClose.call(window); } catch (e) {}
    };
  } catch (e) {}

  // (3) Catch in-page window.postMessage (kept for forward-compat).
  window.addEventListener("message", function (ev) {
    var d = ev && ev.data;
    if (d && d.type === ${JSON.stringify(JOIN_MESSAGE_TYPE)}) forward(d);
  });
  try {
    var origPost = window.postMessage;
    window.postMessage = function (msg, target) {
      if (msg && msg.type === ${JSON.stringify(JOIN_MESSAGE_TYPE)}) forward(msg);
      if (origPost) return origPost.call(this, msg, target);
    };
  } catch (e) {}

  true;
})();`;

export function PassportWebViewModal({
  palette,
  visible,
  projectId,
  passportAppOrigin,
  onClose,
  onResult,
}: Props) {
  const webviewRef = useRef<unknown>(null);

  // Lazy-require react-native-webview so apps that don't install it can still
  // import @quipier/react-native — only `visible=true` triggers the require.
  const WebView = useMemo(() => {
    if (!visible) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require("react-native-webview");
      return (mod?.WebView ?? mod?.default) as React.ComponentType<{
        ref?: React.Ref<unknown>;
        source: { uri: string };
        injectedJavaScriptBeforeContentLoaded?: string;
        injectedJavaScript?: string;
        onMessage: (event: { nativeEvent: { data: string } }) => void;
        sharedCookiesEnabled?: boolean;
        thirdPartyCookiesEnabled?: boolean;
        style?: object;
      }> | null;
    } catch {
      return null;
    }
  }, [visible]);

  const url = useMemo(() => {
    const u = new URL(passportAppOrigin + "/join");
    u.searchParams.set("project_id", projectId);
    // Native apps have no document origin — send something the passport can echo
    // back to verify the postMessage came from our embed flow.
    u.searchParams.set("return_origin", `quipier-rn://${Platform.OS}`);
    u.searchParams.set("embed", "react-native");
    // Passport web app can forward this to /v1/project-passports/join as
    // `x-quipier-client` so the project_passport row is tagged with the
    // originating platform (operator dashboard then surfaces it).
    if (Platform.OS === "ios" || Platform.OS === "android") {
      u.searchParams.set("client", Platform.OS);
    }
    return u.toString();
  }, [passportAppOrigin, projectId]);

  function handleMessage(event: { nativeEvent: { data: string } }) {
    try {
      const data = JSON.parse(event.nativeEvent.data) as PassportJoinResult & {
        type?: string;
      };
      if (data?.type === CLOSE_MESSAGE_TYPE) {
        // passport called window.close() — the 1.2s grace it gives the user
        // to read "연결 완료!". By here `onResult` already fired and saved
        // the session; just dismiss the modal.
        onClose();
        return;
      }
      if (data?.type !== JOIN_MESSAGE_TYPE) return;
      onResult(data);
    } catch {
      // ignore non-JSON / unrelated messages
    }
  }

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      presentationStyle="formSheet"
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: palette.border,
          }}
        >
          <Text style={{ color: palette.text, fontSize: 16, fontWeight: "700" }}>
            패스포트 연결
          </Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={{ color: palette.accent, fontSize: 14, fontWeight: "700" }}>
              닫기
            </Text>
          </Pressable>
        </View>
        {WebView ? (
          <WebView
            ref={webviewRef as React.Ref<unknown>}
            source={{ uri: url }}
            injectedJavaScriptBeforeContentLoaded={INJECTED_BRIDGE}
            injectedJavaScript={INJECTED_BRIDGE}
            onMessage={handleMessage}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            style={{ flex: 1, backgroundColor: palette.bg }}
          />
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <Text
              style={{
                color: palette.text,
                fontSize: 14,
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              `react-native-webview` 가 설치되어 있지 않아 패스포트 연결을 열 수 없습니다.{"\n"}
              `npm i react-native-webview` 후 다시 시도해주세요.
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
