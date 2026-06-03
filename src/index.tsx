// @quipier/react-native — Quipier 댓글을 React Native / Expo 앱에 임베드.
//
// 공개 API:
//   - <QuipierComments />  — 네이티브 댓글 위젯
//   - createClient(...)    — 직접 호출하고 싶을 때(헤드리스 RN 등)
//   - 타입: Comment, ReportReason, QuipierCommentsProps
//
// 패스포트 연결은 react-native-webview 모달로 띄우고, 세션은
// @react-native-async-storage/async-storage 에 저장됩니다(둘 다 peer dep).

export { QuipierComments } from "./ui/QuipierComments";
export type { QuipierCommentsProps } from "./ui/QuipierComments";

export { ApiError, createClient } from "./core/client";
export type { Client, ClientConfig } from "./core/client";

export type {
  Comment,
  CreateCommentBody,
  ListCommentsResponse,
  ReportReason,
} from "./core/types";

export { LIMITS, HEADERS } from "./core/constants";

export type { ProjectSession } from "./core/storage";
export {
  loadProjectSession,
  saveProjectSession,
  clearProjectSession,
  setSessionStorage,
} from "./core/storage";
