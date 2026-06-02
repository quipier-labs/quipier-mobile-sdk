# @quipier/react-native

Quipier 댓글을 **React Native / Expo** 앱에 임베드하는 네이티브 컴포넌트.
웹 SDK(`@quipier/sdk`)와 동일한 Quipier 백엔드(`api.quipier.com`)를 사용합니다.

> 🚧 **개발 중** — 골격 단계. 코어(API 클라이언트/타입) → RN UI → 패스포트 WebView 연결 순으로 채워집니다.

## 설치 (예정)

```bash
npm i @quipier/react-native react-native-webview @react-native-async-storage/async-storage
```

`react-native-webview`(패스포트 연결)와 `@react-native-async-storage/async-storage`(세션 저장)는 peer dependency입니다.

## 사용 (예정)

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

## 설계

- **공유**: API 클라이언트 + 타입 (웹 SDK와 동일한 `api.quipier.com` 호출)
- **네이티브**: `FlatList`/`TextInput`/`Pressable` 기반 UI, `AsyncStorage` 세션
- **패스포트 연결**: `react-native-webview` 모달로 `passport.quipier.com/join` → 결과를 RN으로 전달

## 로컬 개발

```bash
nvm use            # .nvmrc → Node 24
npm install
npm run typecheck
# example/ 의 Expo 앱으로 실기기 테스트 (예정)
```
