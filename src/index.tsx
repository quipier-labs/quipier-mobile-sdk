// @quipier/react-native — Quipier 커뮤니티 모듈을 React Native / Expo 앱에 임베드.
//
// 공개 API:
//   - <QuipierComments />  — 네이티브 댓글 위젯 (페이지 앵커형)
//   - <QuipierFeed />      — 프로젝트 전역 피드 (트위터형 post & 답글)
//   - createClient(...)    — 직접 호출하고 싶을 때(헤드리스 RN 등)
//   - 타입: Comment, Post, ReportReason, QuipierCommentsProps, QuipierFeedProps
//
// 패스포트 연결은 react-native-webview 모달로 띄우고, 세션은
// @react-native-async-storage/async-storage 에 저장됩니다(둘 다 peer dep).

export { QuipierComments } from "./ui/QuipierComments";
export type { QuipierCommentsProps } from "./ui/QuipierComments";

export { QuipierFeed } from "./ui/QuipierFeed";
export type { QuipierFeedProps } from "./ui/QuipierFeed";

// Customization API (mirrors @quipier/sdk)
export type {
  Appearance,
  Features,
  Slots,
  SlotResult,
  QuipierCommentView,
  CommentCtx,
  BaseCtx,
  CommentActions,
  SlotHelpers,
  ResolvedTheme,
  AvatarShape,
} from "./core/customize";

export { ApiError, createClient } from "./core/client";
export type { Client, ClientConfig } from "./core/client";

export type {
  Comment,
  CreateCommentBody,
  ListCommentsResponse,
  Post,
  CreatePostBody,
  ListPostsResponse,
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
