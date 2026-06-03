# @quipier/react-native

Quipier 댓글을 **React Native / Expo** 앱에 임베드하는 네이티브 컴포넌트.
웹 SDK(`@quipier/sdk`)와 동일한 Quipier 백엔드(`api.quipier.com`)를 사용합니다.

> 🧪 **v0.1 — 베타**. 핵심 댓글 흐름(목록/작성/좋아요/답글/수정/삭제/신고) + 패스포트 WebView 연결까지 동작합니다. 폼/모달 폴리시는 계속 다듬을 예정.

## 설치

```bash
npm i @quipier/react-native react-native-webview @react-native-async-storage/async-storage
# Expo
npx expo install react-native-webview @react-native-async-storage/async-storage
```

`react-native-webview`(패스포트 연결)와 `@react-native-async-storage/async-storage`(세션 영속화)는 peer dependency입니다. AsyncStorage가 없으면 **세션이 콜드스타트마다 초기화**됩니다(앱은 계속 동작). WebView가 없으면 패스포트 연결 모달이 안내 문구를 표시합니다.

## 사용

```tsx
import { QuipierComments } from "@quipier/react-native";

export function PostScreen() {
  return (
    <QuipierComments
      apiKey="qp_YOUR_PUBLISHABLE_KEY"
      projectId="YOUR_PROJECT_ID"
      pageId="/posts/my-post"
    />
  );
}
```

### Props

| prop                  | 기본값                          | 설명 |
| --------------------- | ------------------------------- | ---- |
| `apiKey`              | —                               | 프로젝트 publishable key (`qp_…`) |
| `projectId`           | —                               | 프로젝트 ID |
| `pageId`              | —                               | 페이지 식별자 (보통 라우트 경로) |
| `apiBase`             | `https://api.quipier.com`       | API 서버 베이스 URL |
| `passportAppOrigin`   | `https://passport.quipier.com`  | 패스포트 웹 앱 origin |
| `theme`               | `"auto"`                        | `"light" \| "dark" \| "auto"` (auto = OS 색상 모드) |
| `dateFormat`          | `"relative"`                    | `"relative"`(3분 전) / `"absolute"` |
| `maxDepth`            | `2`                             | 1 = 답글 비활성, 2 = 답글 활성 |
| `sort`                | `"top"`                         | 기본 정렬: 인기순 / 최신순 |
| `onComment`           | —                               | 새 댓글 작성 콜백 |

## 설계

- **공유**: `src/core/{client,types,storage,helpers,constants}.ts` — 웹 SDK와 같은 `api.quipier.com` 호출, 같은 트리 빌더/정렬 로직.
- **네이티브 UI**: `src/ui/*` — `FlatList`/`TextInput`/`Pressable` 기반. 광고 인앱 브라우저 의존 없음.
- **세션**: `@react-native-async-storage/async-storage` 비동기 KV. 미설치 시 in-memory fallback.
- **패스포트 연결**: `react-native-webview` 모달로 `passport.quipier.com/join` 열고, 페이지가 던지는 `window.postMessage({type:"quipier:join:result", …})` 를 RN 브릿지로 가로채 세션 저장.

## 로컬 개발

```bash
nvm use            # .nvmrc → Node 24
npm install
npm run typecheck
```

`example/` Expo 앱은 다음 단계(예정). 그 전까지는 호스트 앱에 `npm link` 또는 yalc 로 붙여 실기기 검증.
