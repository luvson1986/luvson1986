# 오늘 — 알림 서버 만들기 (무료, 약 10분)

앱이 꺼져 있어도 일정 알림이 제시간에 오게 해 주는 작은 서버예요.
Cloudflare Workers 무료 플랜으로 돌아가고, 카드 등록은 필요 없어요.
PC에서 하는 게 편해요 (폰 사파리로도 가능).

## 1. Cloudflare 가입
https://dash.cloudflare.com/sign-up 에서 이메일로 가입해요.

## 2. 저장 공간(KV) 만들기
1. 왼쪽 메뉴 **Storage & Databases → Workers KV**
2. **Create** → 이름 `today-push` → 만들기

## 3. Worker 만들기
1. 왼쪽 메뉴 **Compute (Workers) → Workers & Pages → Create → Worker**
2. 이름을 `today-push` 로 하고 **Deploy**
3. **Edit code** 를 눌러 편집기를 열고, 들어 있는 코드를 모두 지운 뒤
   이 폴더의 [`worker.js`](./worker.js) 내용을 통째로 붙여넣어요
   - 원본 보기: https://raw.githubusercontent.com/luvson1986/luvson1986/claude/personalized-assistant-app-e6gdpa/today/push-worker/worker.js
4. 오른쪽 위 **Deploy**

## 4. 연결하기
Worker 화면의 **Settings** 탭에서

- **Bindings → Add → KV namespace**
  - Variable name: `STORE` (대문자 그대로)
  - KV namespace: `today-push`
- **Trigger Events (Cron Triggers) → Add → Cron**
  - `* * * * *` (1분마다)

저장하면 끝이에요.

## 5. 앱에 주소 넣기
1. Worker 화면 위쪽의 주소(예: `https://today-push.내아이디.workers.dev`)를 복사
2. 아이폰 홈 화면의 **오늘** 앱 → 설정(톱니바퀴) → **알림 서버** 칸에 붙여넣고 **연결**
3. **테스트 알림 보내기** 를 누르고 앱을 닫아 보세요. 몇 초 안에 알림이 오면 성공이에요.

이후로는 일정 상세에서 알림(5분·10분·30분·1시간 전)을 켜 두면,
앱이 꺼져 있어도 서버가 시간에 맞춰 보내요. 오차는 1분 이내예요.

## 참고
- 무료 한도(하루 10만 요청)는 1분마다 확인해도 넉넉해요.
- 서버에는 알림 시간·일정 제목·장소만 올라가요. 메모는 올라가지 않아요.
- 앱에서 일정을 바꾸면 몇 초 안에 서버 목록도 갱신돼요. 앞으로 7일치를 올려 두니,
  일주일에 한 번은 앱을 열어 주세요.

## (선택) 실시간 비: 기상청 관측 연결
한국에 있을 때 메인 화면의 비 효과를 가장 가까운 기상청 관측소(AWS)의 강수감지·15분 강수량으로 맞춰요.

1. https://apihub.kma.go.kr 에 가입하고 로그인
2. **지상관측 → 방재기상관측(AWS)** 에서 *매분자료* API와 *지점정보* API를 사용 신청
3. 마이페이지에서 **인증키(authKey)** 복사
4. Cloudflare의 Worker 화면 → **Settings → Variables and Secrets → Add**
   - Type: `Secret` / Variable name: `KMA_KEY` / Value: 복사한 인증키 → 저장(Deploy)
5. Worker 코드를 이 폴더의 최신 [`worker.js`](./worker.js)로 다시 붙여넣고 **Deploy**

확인: 브라우저에서 아래 주소를 열어 보세요 (`내아이디` 부분은 본인 주소로).
- `https://today-push.내아이디.workers.dev/kma?lat=37.57&lon=126.98` → `"ok": true` 와 관측소 이름이 나오면 성공
- 안 되면 `.../kma/raw?what=stn` 과 `.../kma/raw?what=aws&stn=108` 화면을 캡처해서 보내 주세요 (기상청 응답 형식 확인용)
