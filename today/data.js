/* 정적 데이터: 계절 추천, 업무 영어 표현, 오프라인 예시 */

/*
 * 계절 추천
 * from / to: 'MM-DD' (연말-연초를 넘는 구간도 허용)
 * scene.type: petals | leaves | snow | lights | sun | fireflies | grass | sea | rain
 */
window.SEASONS = [
  {
    id: 'sunrise', name: '새해 해돋이', from: '12-28', to: '01-05', peak: ['12-31', '01-01'], w: 3,
    headline: '새해 첫 해를 보러 갈 시간',
    desc: '정동진, 간절곶, 호미곶이 대표 명소예요. 일출 시간 30분 전에는 도착해야 자리를 잡을 수 있어요.',
    todo: ['해돋이 명소 일출 시각 확인', '보온병에 따뜻한 차', '올해 목표 세 줄 적기'],
    scene: { type: 'lights', colors: ['#1b2a4a', '#e0875a'], accent: '#ffb27a', motif: ['🌅'] }
  },
  {
    id: 'bangeo', name: '방어', from: '11-01', to: '02-28', peak: ['12-01', '01-31'], w: 2,
    headline: '기름 오른 대방어가 제철이에요',
    desc: '수온이 내려갈수록 살이 단단하고 고소해져요. 뱃살은 회로, 머리는 구이나 조림으로.',
    todo: ['대방어 뱃살 회', '방어 머리 구이', '모슬포 방어축제 일정 보기'],
    scene: { type: 'sea', colors: ['#0f2d4a', '#3f7fa8'], accent: '#9fd3ff', motif: ['🐟', '🍣'] }
  },
  {
    id: 'snow', name: '눈꽃 산행', from: '12-15', to: '02-28', peak: ['01-05', '02-10'], w: 2,
    headline: '눈 덮인 산과 겨울 풍경',
    desc: '덕유산, 태백산, 한라산이 눈꽃 명소예요. 아이젠과 방한 장갑은 꼭 챙겨야 해요.',
    todo: ['덕유산 곤돌라 예약', '아이젠·스패츠 준비', '따뜻한 어묵탕'],
    scene: { type: 'snow', colors: ['#5b7593', '#c9d6e3'], accent: '#ffffff', motif: ['⛄', '❄️'] }
  },
  {
    id: 'strawberry', name: '딸기', from: '12-01', to: '04-30', peak: ['01-15', '03-15'], w: 2,
    headline: '겨울 딸기가 가장 달 때',
    desc: '설향, 금실, 킹스베리까지 품종별로 맛이 달라요. 호텔 딸기 뷔페도 이 시기에 열려요.',
    todo: ['딸기 품종 비교해 먹기', '딸기 따기 체험', '딸기 뷔페 예약'],
    scene: { type: 'petals', colors: ['#7a1f33', '#f08a9b'], accent: '#ffd1da', motif: ['🍓'] }
  },
  {
    id: 'smelt', name: '빙어 낚시', from: '01-01', to: '02-15', peak: ['01-10', '01-31'], w: 1,
    headline: '꽁꽁 언 호수 위 빙어 낚시',
    desc: '홍천, 인제의 빙어축제가 이맘때 열려요. 얼음 두께 공지를 확인하고 가세요.',
    todo: ['빙어축제 개최 여부 확인', '빙어 튀김', '방한화 챙기기'],
    scene: { type: 'snow', colors: ['#2f4d6b', '#9fc0d8'], accent: '#e6f4ff', motif: ['🎣'] }
  },
  {
    id: 'namul', name: '봄나물', from: '02-20', to: '04-10', peak: ['03-05', '03-31'], w: 1,
    headline: '냉이, 달래, 쑥으로 봄 입맛 깨우기',
    desc: '향이 진한 봄나물은 3월이 가장 좋아요. 냉이된장국과 달래장 비빔밥을 추천해요.',
    todo: ['냉이된장국', '달래장 비빔밥', '쑥버무리'],
    scene: { type: 'grass', colors: ['#3e5b2a', '#b8d48a'], accent: '#e6f5c8', motif: ['🌱'] }
  },
  {
    id: 'jjukkumi', name: '주꾸미', from: '03-01', to: '05-10', peak: ['03-20', '04-20'], w: 2,
    headline: '알이 꽉 찬 봄 주꾸미',
    desc: '산란기 직전이라 머리에 알이 가득해요. 서천 주꾸미축제가 3~4월에 열려요.',
    todo: ['주꾸미 샤브샤브', '주꾸미 볶음', '서천 동백꽃·주꾸미 축제'],
    scene: { type: 'sea', colors: ['#5a2a3a', '#d9826b'], accent: '#ffd0bf', motif: ['🐙'] }
  },
  {
    id: 'maehwa', name: '매화', from: '02-25', to: '03-31', peak: ['03-08', '03-22'], w: 2,
    headline: '봄을 가장 먼저 알리는 매화',
    desc: '광양 매화마을, 양산 통도사 홍매화가 유명해요. 벚꽃보다 2~3주 먼저 피어요.',
    todo: ['광양 매화축제', '통도사 홍매화', '매실차 한 잔'],
    scene: { type: 'petals', colors: ['#6b3a5a', '#f5d1e0'], accent: '#ffffff', motif: ['🌼'] }
  },
  {
    id: 'cherry', name: '벚꽃', from: '03-20', to: '04-20', peak: ['03-28', '04-10'], w: 3,
    headline: '벚꽃이 한창이에요',
    headlines: { rising: '벚꽃 개화가 시작됐어요', peak: '벚꽃이 한창이에요', fading: '벚꽃비가 내리는 끝물이에요' },
    desc: '남쪽부터 진해, 경주, 여의도 순으로 피어요. 만개 후 일주일이면 꽃비가 내려요.',
    todo: ['여의도 윤중로 산책', '석촌호수 벚꽃길', '도시락 들고 피크닉'],
    scene: { type: 'petals', colors: ['#c76b8f', '#ffe3ec'], accent: '#ffffff', motif: ['🌸'] }
  },
  {
    id: 'doda', name: '도다리쑥국', from: '03-01', to: '04-30', peak: ['03-15', '04-15'], w: 1,
    headline: '봄 도다리와 햇쑥으로 끓인 국',
    desc: '통영, 거제 쪽에서 봄마다 먹는 별미예요. 담백하고 쑥향이 진해요.',
    todo: ['도다리쑥국', '도다리 세꼬시', '통영 여행 계획'],
    scene: { type: 'sea', colors: ['#2a5a5a', '#9fd1b8'], accent: '#e2fff0', motif: ['🐟', '🌿'] }
  },
  {
    id: 'azalea', name: '철쭉', from: '04-15', to: '05-31', peak: ['04-25', '05-15'], w: 2,
    headline: '산을 분홍으로 물들이는 철쭉',
    desc: '군포 철쭉동산, 황매산, 소백산이 대표 명소예요. 5월 초가 절정이에요.',
    todo: ['군포 철쭉축제', '황매산 철쭉 산행', '봄 소풍'],
    scene: { type: 'petals', colors: ['#8c2a5e', '#f59ac6'], accent: '#ffe0f0', motif: ['🌺'] }
  },
  {
    id: 'rose', name: '장미', from: '05-10', to: '06-20', peak: ['05-20', '06-05'], w: 2,
    headline: '장미 정원이 가장 화려할 때',
    desc: '서울대공원, 중랑천 장미축제, 에버랜드 로즈가든에서 수백 종의 장미를 볼 수 있어요.',
    todo: ['중랑 서울장미축제', '저녁 산책', '꽃 사진 찍기'],
    scene: { type: 'petals', colors: ['#7a1830', '#f07a8a'], accent: '#ffd8dd', motif: ['🌹'] }
  },
  {
    id: 'hydrangea', name: '수국', from: '06-01', to: '07-20', peak: ['06-15', '07-05'], w: 2,
    headline: '장마 전후 탐스럽게 핀 수국',
    desc: '제주 휴애리, 거제 저구항, 부산 태종대가 수국 명소예요. 비 오는 날 색이 더 선명해요.',
    todo: ['수국 명소 나들이', '초당옥수수', '장마 대비 우산 점검'],
    scene: { type: 'rain', colors: ['#3b4f8a', '#a8b8f0'], accent: '#e0e6ff', motif: ['💠'] }
  },
  {
    id: 'corn', name: '초당옥수수', from: '06-01', to: '07-31', peak: ['06-15', '07-15'], w: 1,
    headline: '생으로 먹어도 단 초당옥수수',
    desc: '수확 후 당도가 빨리 떨어지니 받자마자 쪄 드세요. 전자레인지 4분이면 충분해요.',
    todo: ['초당옥수수 주문', '옥수수 버터구이', '옥수수 수염차'],
    scene: { type: 'sun', colors: ['#c98a1a', '#ffe08a'], accent: '#fff6d0', motif: ['🌽'] }
  },
  {
    id: 'firefly', name: '반딧불이', from: '05-25', to: '07-05', peak: ['06-05', '06-25'], w: 1,
    headline: '여름밤 반딧불이 보러 가기',
    desc: '무주 반딧불축제, 서울 길동생태공원에서 볼 수 있어요. 해 진 뒤 8~9시가 좋아요.',
    todo: ['반딧불이 관찰 예약', '여름밤 산책', '손전등은 빨간빛으로'],
    scene: { type: 'fireflies', colors: ['#0d1f1a', '#264a3a'], accent: '#e6ff8a', motif: ['✨'] }
  },
  {
    id: 'boknal', name: '복날 보양식', from: '07-05', to: '08-25', peak: ['07-15', '08-15'], w: 2,
    headline: '복날엔 삼계탕 한 그릇',
    desc: '초복, 중복, 말복에 맞춰 보양식을 챙겨 보세요. 인기 맛집은 점심 전에 줄이 길어요.',
    todo: ['삼계탕', '민어탕', '시원한 콩국수'],
    scene: { type: 'sun', colors: ['#b5541a', '#ffc46a'], accent: '#fff0c8', motif: ['🍲'] }
  },
  {
    id: 'beach', name: '바다 물놀이', from: '07-01', to: '08-31', peak: ['07-20', '08-15'], w: 3,
    headline: '바다로 떠나기 좋은 한여름',
    desc: '해수욕장 개장 기간을 확인하세요. 오전 10시~오후 2시 자외선은 특히 강해요.',
    todo: ['해수욕장 개장일 확인', '수박 화채', '방수팩·선크림'],
    scene: { type: 'sea', colors: ['#0a5a8a', '#6fd3e8'], accent: '#e8fbff', motif: ['🌊', '🍉'] }
  },
  {
    id: 'jeoneo', name: '전어', from: '08-20', to: '10-31', peak: ['09-01', '09-30'], w: 2,
    headline: '집 나간 며느리도 돌아온다는 가을 전어',
    desc: '9~10월 전어는 기름이 올라 고소해요. 굽는 냄새가 특히 좋아요.',
    todo: ['전어구이', '전어회 무침', '광양 전어축제'],
    scene: { type: 'sea', colors: ['#2a4a6a', '#c9a46a'], accent: '#ffe8c0', motif: ['🐟'] }
  },
  {
    id: 'daeha', name: '대하', from: '08-25', to: '11-10', peak: ['09-10', '10-10'], w: 3,
    headline: '지금은 대하 시즌',
    headlines: { rising: '대하 시즌이 시작됐어요', peak: '지금은 대하 시즌', fading: '대하 시즌이 끝나가요' },
    desc: '살이 통통하게 오른 가을 대하는 굵은 소금 위에 구우면 가장 맛있어요. 남은 머리는 버터구이로.',
    todo: ['대하 소금구이', '대하 머리 버터구이', '홍성 남당항 대하축제'],
    scene: { type: 'sea', colors: ['#7a2e1a', '#f0a070'], accent: '#ffe0c8', motif: ['🦐'] }
  },
  {
    id: 'crab', name: '가을 꽃게', from: '09-01', to: '11-15', peak: ['09-15', '10-31'], w: 2,
    headline: '살이 꽉 찬 가을 수꽃게',
    desc: '가을엔 수꽃게가 살이 가장 많아요. 쪄 먹거나 꽃게탕으로 끓여 보세요.',
    todo: ['꽃게찜', '꽃게탕', '연안부두 어시장'],
    scene: { type: 'sea', colors: ['#6a1e1e', '#e0765a'], accent: '#ffd6c8', motif: ['🦀'] }
  },
  {
    id: 'cosmos', name: '코스모스', from: '09-01', to: '10-20', peak: ['09-15', '10-05'], w: 1,
    headline: '바람에 흔들리는 코스모스 길',
    desc: '구리 한강공원, 하동 북천 코스모스축제가 대표적이에요.',
    todo: ['하동 북천 코스모스', '자전거 타기', '가을 사진 찍기'],
    scene: { type: 'petals', colors: ['#a0486a', '#f6c2d6'], accent: '#ffffff', motif: ['🌸'] }
  },
  {
    id: 'pinkmuhly', name: '핑크뮬리', from: '09-15', to: '10-31', peak: ['09-25', '10-15'], w: 1,
    headline: '분홍빛 핑크뮬리 물결',
    desc: '경주 첨성대, 양주 나리공원, 올림픽공원에서 볼 수 있어요. 해 질 녘 역광이 예뻐요.',
    todo: ['올림픽공원 들꽃마루', '경주 첨성대 산책', '노을 사진'],
    scene: { type: 'grass', colors: ['#9a4a7a', '#f2b8d4'], accent: '#ffe6f2', motif: ['🌾'] }
  },
  {
    id: 'eoksae', name: '억새', from: '09-25', to: '11-15', peak: ['10-10', '11-05'], w: 2,
    headline: '은빛 억새가 출렁이는 계절',
    desc: '하늘공원, 민둥산, 영남알프스 간월재가 억새 명소예요. 하늘공원 억새축제는 10월 중순이에요.',
    todo: ['하늘공원 억새축제', '민둥산 억새 산행', '노을 보며 산책'],
    scene: { type: 'grass', colors: ['#6a5a3a', '#e8d8a8'], accent: '#fff8e0', motif: ['🌾'] }
  },
  {
    id: 'foliage', name: '단풍', from: '10-01', to: '11-25', peak: ['10-18', '11-10'], w: 3,
    headline: '단풍이 절정이에요',
    headlines: { rising: '단풍이 남쪽으로 내려오고 있어요', peak: '단풍이 절정이에요', fading: '늦가을 단풍 끝물이에요' },
    desc: '설악산에서 시작해 하루 20~25km씩 남쪽으로 내려와요. 서울은 10월 말에서 11월 초가 절정이에요.',
    todo: ['단풍 절정 시기 확인', '내장산·설악산 단풍', '덕수궁 돌담길 산책'],
    scene: { type: 'leaves', colors: ['#7a2a14', '#f0a040'], accent: '#ffe2b0', motif: ['🍁'] }
  },
  {
    id: 'chestnut', name: '군밤·군고구마', from: '10-15', to: '12-31', peak: ['11-01', '12-15'], w: 1,
    headline: '따끈한 군고구마와 군밤',
    desc: '꿀고구마는 수확 후 2~3주 숙성하면 더 달아져요. 에어프라이어 200도 40분이면 충분해요.',
    todo: ['군고구마', '군밤', '따뜻한 유자차'],
    scene: { type: 'lights', colors: ['#3a2416', '#b8743a'], accent: '#ffd8a0', motif: ['🍠', '🌰'] }
  },
  {
    id: 'ginkgo', name: '은행나무길', from: '10-20', to: '11-25', peak: ['10-30', '11-15'], w: 2,
    headline: '노랗게 물든 은행나무길',
    desc: '아산 곡교천, 홍천 은행나무숲, 서울 성균관 명륜당이 유명해요.',
    todo: ['곡교천 은행나무길', '홍천 은행나무숲', '낙엽 밟으며 산책'],
    scene: { type: 'leaves', colors: ['#8a6a10', '#f5d84a'], accent: '#fff6c0', motif: ['🍂'] }
  },
  {
    id: 'oyster', name: '굴·김장', from: '11-01', to: '02-28', peak: ['11-20', '12-20'], w: 2,
    headline: '김장철, 굴보쌈 먹는 날',
    desc: '찬바람이 불면 굴이 통통해져요. 김장하는 날엔 굴보쌈이 빠질 수 없어요.',
    todo: ['굴보쌈', '굴국밥', '통영 굴 주문'],
    scene: { type: 'sea', colors: ['#2a3a4a', '#a8b8c8'], accent: '#f0f6ff', motif: ['🦪', '🥬'] }
  },
  {
    id: 'gwamegi', name: '과메기', from: '11-15', to: '02-15', peak: ['12-01', '01-15'], w: 1,
    headline: '찬바람에 꾸덕하게 마른 과메기',
    desc: '포항 구룡포 과메기가 유명해요. 김, 미역, 쪽파, 마늘과 함께 싸 드세요.',
    todo: ['과메기 한 상', '구룡포 여행', '배추쌈 준비'],
    scene: { type: 'sea', colors: ['#1a2a3a', '#5a7a9a'], accent: '#d8e8f8', motif: ['🐟'] }
  },
  {
    id: 'christmas', name: '연말 조명', from: '12-01', to: '12-27', peak: ['12-15', '12-25'], w: 3,
    headline: '도시가 반짝이는 연말',
    desc: '명동, 청계천, 롯데월드몰의 크리스마스 장식이 화려해요. 연말 모임 예약은 일찍 하세요.',
    todo: ['크리스마스 마켓', '연말 모임 장소 예약', '올해 회고 쓰기'],
    scene: { type: 'lights', colors: ['#14243a', '#3a5a7a'], accent: '#ffe08a', motif: ['🎄'] }
  },
  {
    id: 'gyul', name: '귤', from: '11-01', to: '02-28', peak: ['11-20', '01-15'], w: 1,
    headline: '겨울엔 귤 한 박스',
    desc: '노지 감귤은 11월부터, 한라봉과 천혜향은 1~2월이 제철이에요.',
    todo: ['노지 감귤 주문', '귤 따기 체험', '한라봉 맛보기'],
    scene: { type: 'snow', colors: ['#b8641a', '#ffc070'], accent: '#fff2d8', motif: ['🍊'] }
  }
];

/*
 * 계절 우선순위
 * - 다가오는 중(rising): 절정이 가까울수록 점수 상승 (가중치의 55~95%)
 * - 절정(peak): 가중치 100%
 * - 끝물(fading): 가중치의 50%에서 0으로 감소
 * w(가중치)는 전국적인 관심도: 3 대표 시즌, 2 주요, 1 소소한 제철
 */
(function () {
  function doy(md) { var p = md.split('-'); return Math.floor((Date.UTC(2001, +p[0] - 1, +p[1]) - Date.UTC(2001, 0, 1)) / 864e5); }
  // from 기준으로 연속된 날짜축에 올림 (연말-연초를 넘는 구간 처리)
  function lift(x, base) { return x < base ? x + 365 : x; }
  window.seasonPhase = function (s, date) {
    var from = doy(s.from), to = lift(doy(s.to), from);
    var ps = lift(doy(s.peak[0]), from), pe = lift(doy(s.peak[1]), ps);
    var t = lift(Math.floor((Date.UTC(2001, date.getMonth(), date.getDate()) - Date.UTC(2001, 0, 1)) / 864e5), from);
    if (t > to) return null;
    if (t < ps) {
      var d = ps - t, win = Math.max(ps - from, 1);
      return { phase: 'rising', label: '다가오는 중', score: s.w * (0.55 + 0.4 * (1 - d / win)), days: d };
    }
    if (t <= pe) return { phase: 'peak', label: '절정', score: s.w, days: 0 };
    var rem = to - t, fw = Math.max(to - pe, 1);
    return { phase: 'fading', label: '끝물', score: s.w * 0.5 * (rem / fw), days: -(t - pe) };
  };
  window.rankSeasons = function (date, list) {
    return (list || window.SEASONS)
      .map(function (s) { var p = window.seasonPhase(s, date); return p && { s: s, p: p }; })
      .filter(Boolean)
      // 절정인 시즌이 항상 먼저 → 다가오는 중 → 끝물. 같은 단계 안에서는 점수(관심도·가까움) 순
      .sort(function (a, b) { return (PHASE_RANK[a.p.phase] - PHASE_RANK[b.p.phase]) || (b.p.score - a.p.score); });
  };
  var PHASE_RANK = { peak: 0, rising: 1, fading: 2 };
})();

/*
 * 은행 프로덕트 UI/UX 디자이너를 위한 업무 영어
 * key: 문장에서 강조할 핵심 표현
 */
window.PHRASES = [
  { en: "Let's align on the user flow before we jump into the visuals.", key: 'align on', ko: '비주얼 작업에 들어가기 전에 사용자 흐름부터 맞춰요.', when: '디자인 킥오프 회의를 시작할 때' },
  { en: 'Could you walk me through the edge cases for failed transfers?', key: 'walk me through', ko: '이체 실패 시 예외 케이스를 하나씩 설명해 주실 수 있을까요?', when: '개발자나 기획자에게 시나리오를 확인할 때' },
  { en: 'This screen has too much cognitive load for first-time users.', key: 'cognitive load', ko: '이 화면은 처음 쓰는 사용자에게 인지 부담이 너무 커요.', when: '디자인 리뷰에서 문제를 짚을 때' },
  { en: 'We should surface the fee before the user confirms the payment.', key: 'surface', ko: '사용자가 결제를 확정하기 전에 수수료를 보여줘야 해요.', when: '금융 서비스의 투명성을 강조할 때' },
  { en: "Let's take this offline and sync after the stand-up.", key: 'take this offline', ko: '이건 따로 얘기하고 스탠드업 끝나고 맞춰봐요.', when: '회의가 길어질 때 정리하며' },
  { en: 'The drop-off rate spikes at the identity verification step.', key: 'drop-off rate', ko: '본인 인증 단계에서 이탈률이 급증해요.', when: '퍼널 데이터를 공유할 때' },
  { en: 'Can we get a quick sanity check from the compliance team?', key: 'sanity check', ko: '컴플라이언스 팀에 간단히 확인받을 수 있을까요?', when: '규제 관련 문구나 화면을 검토할 때' },
  { en: 'I’d like to propose an alternative that reduces the number of taps.', key: 'propose an alternative', ko: '탭 횟수를 줄이는 대안을 제안하고 싶어요.', when: '다른 안을 부드럽게 꺼낼 때' },
  { en: 'Let’s keep the error message actionable, not just descriptive.', key: 'actionable', ko: '오류 메시지는 상황 설명만이 아니라 해결 방법을 알려줘야 해요.', when: 'UX 라이팅을 리뷰할 때' },
  { en: 'This component isn’t in our design system yet, so let’s flag it.', key: 'flag it', ko: '이 컴포넌트는 아직 디자인 시스템에 없으니 표시해 둬요.', when: '디자인 시스템을 관리할 때' },
  { en: 'What’s the success metric for this feature?', key: 'success metric', ko: '이 기능의 성공 지표는 뭔가요?', when: '요구사항을 받을 때' },
  { en: 'We need to meet WCAG AA contrast for all text on this page.', key: 'meet WCAG AA', ko: '이 페이지의 모든 텍스트는 WCAG AA 명도 대비를 충족해야 해요.', when: '접근성 기준을 공유할 때' },
  { en: 'I’ll share the prototype by end of day for async feedback.', key: 'async feedback', ko: '오늘 퇴근 전까지 프로토타입 공유할게요. 편하실 때 피드백 주세요.', when: '작업 공유 일정을 알릴 때' },
  { en: 'Let’s not over-engineer this for the MVP.', key: 'over-engineer', ko: 'MVP에서는 너무 복잡하게 만들지 말아요.', when: '범위를 줄이자고 제안할 때' },
  { en: 'The onboarding feels a bit friction-heavy. Can we defer the KYC step?', key: 'defer', ko: '온보딩이 좀 번거로워요. 고객확인 단계를 뒤로 미룰 수 있을까요?', when: '가입 흐름 개선을 논의할 때' },
  { en: 'Users don’t read; they scan. Let’s front-load the key information.', key: 'front-load', ko: '사용자는 읽지 않고 훑어봐요. 핵심 정보를 앞에 둬요.', when: '정보 구조를 설계할 때' },
  { en: 'Could you elaborate on what you mean by “more premium”?', key: 'elaborate on', ko: '“더 고급스럽게”가 어떤 의미인지 조금 더 설명해 주시겠어요?', when: '모호한 피드백을 구체화할 때' },
  { en: 'Let’s A/B test both versions and let the data decide.', key: 'let the data decide', ko: '두 안을 A/B 테스트하고 데이터로 결정해요.', when: '의견이 갈릴 때' },
  { en: 'I hear your concern. Here’s the rationale behind this decision.', key: 'rationale', ko: '우려하시는 부분 이해해요. 이렇게 결정한 근거는 이래요.', when: '디자인 결정을 설명할 때' },
  { en: 'We have a hard deadline because of the regulatory change.', key: 'hard deadline', ko: '규제 변경 때문에 마감일을 미룰 수 없어요.', when: '일정의 중요성을 설명할 때' },
  { en: 'The balance should be the hero element on this screen.', key: 'hero element', ko: '이 화면에서는 잔액이 가장 눈에 띄는 요소여야 해요.', when: '시각적 위계를 정할 때' },
  { en: 'Let’s add a confirmation step to prevent accidental transfers.', key: 'prevent accidental', ko: '실수로 이체하는 걸 막기 위해 확인 단계를 추가해요.', when: '오류 방지 설계를 제안할 때' },
  { en: 'Are we good to hand this off to development?', key: 'hand this off', ko: '이제 개발팀에 넘겨도 될까요?', when: '디자인 핸드오프 직전에' },
  { en: 'I’ll annotate the specs so the interaction states are clear.', key: 'annotate', ko: '인터랙션 상태가 잘 보이도록 스펙에 설명을 달아 둘게요.', when: '핸드오프 문서를 준비할 때' },
  { en: 'Let’s circle back on this once we have the usability test results.', key: 'circle back', ko: '사용성 테스트 결과가 나오면 다시 얘기해요.', when: '결정을 잠시 미룰 때' },
  { en: 'Five out of eight participants missed the “Transfer limit” link.', key: 'participants', ko: '참가자 여덟 명 중 다섯 명이 “이체 한도” 링크를 못 찾았어요.', when: '사용성 테스트 결과를 보고할 때' },
  { en: 'This pattern is consistent with what users expect from other banking apps.', key: 'consistent with', ko: '이 패턴은 사용자가 다른 은행 앱에서 기대하는 방식과 같아요.', when: '익숙한 패턴을 근거로 들 때' },
  { en: 'Can we push back on this requirement? It hurts the user experience.', key: 'push back on', ko: '이 요구사항은 다시 검토해 볼 수 있을까요? 사용자 경험을 해쳐요.', when: '요구사항에 반대 의견을 낼 때' },
  { en: 'Let’s prioritize the fixes by impact and effort.', key: 'by impact and effort', ko: '영향도와 공수를 기준으로 수정 사항의 우선순위를 정해요.', when: '백로그를 정리할 때' },
  { en: 'Just a heads-up: the copy is still pending legal review.', key: 'heads-up', ko: '미리 알려드리면, 문구는 아직 법무 검토 중이에요.', when: '상태를 공유할 때' },
  { en: 'Thanks for the feedback. I’ll iterate on it and share v2 tomorrow.', key: 'iterate on', ko: '피드백 감사해요. 수정해서 내일 2차안 공유할게요.', when: '피드백을 받은 뒤' },
  { en: 'We’re seeing a lot of support tickets about this screen.', key: 'support tickets', ko: '이 화면에 대한 고객 문의가 많이 들어오고 있어요.', when: '개선 근거를 제시할 때' },
  { en: 'Let’s design for the worst case: slow network and an expired session.', key: 'design for the worst case', ko: '최악의 경우를 기준으로 설계해요. 느린 네트워크에 세션 만료까지.', when: '예외 상황 설계를 논의할 때' },
  { en: 'Can you give me a ballpark estimate for this change?', key: 'ballpark estimate', ko: '이 변경에 대략 얼마나 걸릴지 알려줄 수 있어요?', when: '개발 공수를 물을 때' },
  { en: 'The empty state is a missed opportunity to guide the user.', key: 'empty state', ko: '빈 화면은 사용자를 안내할 좋은 기회인데 놓치고 있어요.', when: '디테일을 개선할 때' },
  { en: 'I’m on the same page with you on the overall direction.', key: 'on the same page', ko: '전체 방향에 대해서는 저도 같은 생각이에요.', when: '동의를 표현할 때' },
  { en: 'Let’s make sure the amount input supports thousand separators.', key: 'thousand separators', ko: '금액 입력에 천 단위 구분 기호가 들어가도록 해요.', when: '금융 입력 폼을 설계할 때' },
  { en: 'That’s out of scope for this sprint, but let’s add it to the backlog.', key: 'out of scope', ko: '이번 스프린트 범위는 아니지만 백로그에 넣어 둬요.', when: '범위를 관리할 때' },
  { en: 'Could you loop in the security team on the biometric login flow?', key: 'loop in', ko: '생체 인증 로그인 흐름에 보안팀도 참여시켜 주실 수 있을까요?', when: '관련자를 끌어들일 때' },
  { en: 'Let’s reduce the steps from six to three without losing any safeguards.', key: 'safeguards', ko: '안전장치는 유지하면서 단계를 여섯 개에서 세 개로 줄여요.', when: '편의성과 보안의 균형을 논의할 때' },
  { en: 'What problem are we actually trying to solve here?', key: 'trying to solve', ko: '우리가 여기서 실제로 해결하려는 문제가 뭔가요?', when: '논의가 해결책에만 쏠릴 때' },
  { en: 'I’ll put together a quick journey map for the loan application.', key: 'journey map', ko: '대출 신청 과정의 고객 여정 지도를 빠르게 만들어 볼게요.', when: '리서치 산출물을 제안할 때' }
];

/* 네트워크가 막혔을 때 보여줄 예시 */
window.SAMPLE_WEATHER = {
  place: '서울',
  current: { temperature_2m: 16, apparent_temperature: 15, relative_humidity_2m: 58, weather_code: 1, wind_speed_10m: 2.4 },
  daily: {
    temperature_2m_max: [21, 19, 18, 20, 22, 17, 15, 16], temperature_2m_min: [10, 9, 8, 9, 11, 9, 6, 5],
    apparent_temperature_max: [20, 18, 17, 19, 21, 15, 13, 14], apparent_temperature_min: [8, 7, 6, 7, 9, 7, 3, 2],
    precipitation_probability_max: [10, 40, 70, 20, 0, 60, 30, 10], snowfall_sum: [0, 0, 0, 0, 0, 0, 0, 0],
    uv_index_max: [4.5, 3.8, 2.1, 4.0, 4.6, 2.5, 3.9, 4.2],
    weather_code: [1, 3, 61, 2, 0, 80, 3, 1], sunrise: [], sunset: []
  },
  todayTemps: [10, 10, 9, 9, 9, 10, 11, 13, 15, 17, 19, 20, 21, 21, 20, 19, 17, 15, 14, 13, 12, 11, 11, 10],
  hourlyFrom: function (startHour) {
    var temps = this.todayTemps;
    var out = [];
    for (var i = 0; i < 12; i++) {
      var h = (startHour + i) % 24;
      out.push({ hour: h, temp: temps[h], pop: h > 15 ? 10 : 0, code: h >= 7 && h <= 17 ? 1 : 0 });
    }
    return out;
  },
  air: { pm10: 32, pm2_5: 14 }
};

window.SAMPLE_NEWS = [
  { title: '시중은행, 고령층 위한 큰 글씨 간편 앱 확대', source: '예시 뉴스', outlets: 14, interest: '디지털 금융', date: null, image: '', link: 'https://news.google.com/search?q=' + encodeURIComponent('디지털 금융') + '&hl=ko&gl=KR&ceid=KR:ko' },
  { title: '생성형 AI가 바꾸는 프로덕트 디자인 워크플로', source: '예시 뉴스', outlets: 9, interest: 'UX 디자인', date: null, image: '', link: 'https://news.google.com/search?q=' + encodeURIComponent('UX 디자인') + '&hl=ko&gl=KR&ceid=KR:ko' },
  { title: '오픈뱅킹 3년, 핀테크 앱 이용자 경험은 어떻게 달라졌나', source: '예시 뉴스', outlets: 6, interest: '핀테크', date: null, image: '', link: 'https://news.google.com/search?q=' + encodeURIComponent('핀테크') + '&hl=ko&gl=KR&ceid=KR:ko' }
];

/* 해외에 있을 때: 나라별 여행 키워드 (국가 코드 ISO 3166-1) */
window.TRAVEL = {
  JP: { name: '일본', kw: ['라멘·스시', '편의점 디저트', '온천', '돈키호테 쇼핑', '이자카야'] },
  CN: { name: '중국', kw: ['훠궈', '딤섬', '야시장', '알리페이 결제', '고궁 산책'] },
  TW: { name: '대만', kw: ['우육면', '버블티', '야시장', '지우펀', '펑리수'] },
  HK: { name: '홍콩', kw: ['딤섬', '에그타르트', '빅토리아 피크', '야경', '밀크티'] },
  MO: { name: '마카오', kw: ['에그타르트', '세나도 광장', '야경', '포르투갈 요리'] },
  TH: { name: '태국', kw: ['팟타이', '타이 마사지', '야시장', '망고 스티키라이스', '루프탑 바'] },
  VN: { name: '베트남', kw: ['쌀국수', '반미', '코코넛 커피', '마사지', '야시장'] },
  PH: { name: '필리핀', kw: ['호핑 투어', '망고', '스노클링', '선셋'] },
  SG: { name: '싱가포르', kw: ['칠리크랩', '호커센터', '마리나 베이', '카야 토스트'] },
  MY: { name: '말레이시아', kw: ['나시르막', '페트로나스 타워', '야시장', '두리안'] },
  ID: { name: '인도네시아', kw: ['나시고렝', '발리 스파', '서핑', '라이스 테라스'] },
  US: { name: '미국', kw: ['브런치', '아울렛 쇼핑', '스테이크', '팁 계산', '국립공원'] },
  GU: { name: '괌', kw: ['투몬 비치', '스노클링', '아울렛 쇼핑', '선셋 바비큐'] },
  MP: { name: '사이판', kw: ['마나가하섬', '스노클링', '선셋', '스테이크'] },
  CA: { name: '캐나다', kw: ['메이플 시럽', '팀홀튼', '호수 산책', '푸틴'] },
  GB: { name: '영국', kw: ['애프터눈 티', '피시앤칩스', '뮤지컬', '펍', '박물관'] },
  FR: { name: '프랑스', kw: ['크루아상', '와인', '미술관', '마카롱', '센강 산책'] },
  IT: { name: '이탈리아', kw: ['젤라토', '파스타', '에스프레소', '성당', '와이너리'] },
  ES: { name: '스페인', kw: ['타파스', '빠에야', '추로스', '가우디 건축', '플라멩코'] },
  PT: { name: '포르투갈', kw: ['에그타르트', '포트와인', '트램', '노을 전망대'] },
  DE: { name: '독일', kw: ['맥주', '소시지', '크리스마스 마켓', '성 투어'] },
  CH: { name: '스위스', kw: ['퐁뒤', '산악열차', '호수 산책', '초콜릿'] },
  AT: { name: '오스트리아', kw: ['자허토르테', '클래식 공연', '비엔나 커피', '궁전'] },
  CZ: { name: '체코', kw: ['맥주', '꼴레뇨', '구시가지', '야경'] },
  NL: { name: '네덜란드', kw: ['운하 산책', '자전거', '미술관', '치즈'] },
  TR: { name: '튀르키예', kw: ['케밥', '터키 디저트', '열기구', '그랜드 바자르'] },
  AE: { name: '아랍에미리트', kw: ['사막 사파리', '부르즈 할리파', '쇼핑몰', '데이츠'] },
  AU: { name: '호주', kw: ['플랫화이트', '브런치', '해변', '오페라하우스'] },
  NZ: { name: '뉴질랜드', kw: ['호수 트레킹', '양고기', '와이너리', '별 보기'] }
};

/* 해외 도시별 요즘 여행자들이 많이 찾는 키워드 (좌표 반경 안이면 이 도시로 판단)
   실시간 트렌드는 무료로 받을 방법이 없어 최근 인기 기준으로 직접 정리했어요. */
window.TRAVEL_CITIES = [
  { name: '도쿄', lat: 35.68, lon: 139.76, r: 60, kw: ['팀랩 보더리스', '시부야 스카이', '아자부다이 힐스'] },
  { name: '오사카', lat: 34.69, lon: 135.50, r: 35, kw: ['닌텐도 월드', '그랑 그린 오사카', '구로몬 시장'] },
  { name: '교토', lat: 35.01, lon: 135.77, r: 25, kw: ['아라시야마 새벽 산책', '말차 디저트', '기모노 체험'] },
  { name: '후쿠오카', lat: 33.59, lon: 130.40, r: 35, kw: ['나카스 야타이', '모츠나베', '다자이후'] },
  { name: '삿포로', lat: 43.06, lon: 141.35, r: 40, kw: ['수프카레', '오타루 운하', '징기스칸'] },
  { name: '오키나와', lat: 26.33, lon: 127.80, r: 80, kw: ['츄라우미 수족관', '해안 드라이브', '블루씰 아이스크림'] },
  { name: '타이베이', lat: 25.04, lon: 121.56, r: 35, kw: ['융캉제 망고빙수', '지우펀 야경', '타이베이 101'] },
  { name: '방콕', lat: 13.75, lon: 100.50, r: 45, kw: ['쩟페어 야시장', '루프탑 바', '아이콘시암'] },
  { name: '치앙마이', lat: 18.79, lon: 98.99, r: 35, kw: ['님만해민 카페', '코끼리 보호소', '선데이 마켓'] },
  { name: '푸껫', lat: 7.88, lon: 98.39, r: 45, kw: ['피피섬 투어', '올드타운 산책', '빅붓다 전망'] },
  { name: '다낭', lat: 16.05, lon: 108.20, r: 40, kw: ['바나힐 골든브릿지', '미케 비치', '호이안 야경'] },
  { name: '나트랑', lat: 12.24, lon: 109.19, r: 35, kw: ['빈원더스', '머드 스파', '호핑 투어'] },
  { name: '호치민', lat: 10.78, lon: 106.70, r: 40, kw: ['코코넛 커피', '벤탄 시장', '사이공 강 야경'] },
  { name: '하노이', lat: 21.03, lon: 105.85, r: 40, kw: ['기찻길 카페', '분짜', '호안끼엠 호수'] },
  { name: '푸꾸옥', lat: 10.22, lon: 103.96, r: 45, kw: ['혼텀 케이블카', '선셋 타운', '야시장'] },
  { name: '세부', lat: 10.32, lon: 123.89, r: 60, kw: ['오슬롭 고래상어', '캐녀닝', '호핑 투어'] },
  { name: '싱가포르', lat: 1.35, lon: 103.82, r: 40, kw: ['쥬얼 창이', '가든스 바이 더 베이', '칠리크랩'] },
  { name: '홍콩', lat: 22.30, lon: 114.17, r: 35, kw: ['딤섬 브런치', '피크 트램', '침사추이 야경'] },
  { name: '마카오', lat: 22.17, lon: 113.55, r: 15, kw: ['에그타르트', '세나도 광장', '코타이 쇼'] },
  { name: '상하이', lat: 31.23, lon: 121.47, r: 50, kw: ['와이탄 야경', '우캉루 산책', '샤오룽바오'] },
  { name: '베이징', lat: 39.90, lon: 116.40, r: 60, kw: ['만리장성', '자금성', '베이징덕'] },
  { name: '발리', lat: -8.50, lon: 115.20, r: 70, kw: ['우붓 정글 스윙', '비치클럽', '라이스 테라스'] },
  { name: '괌', lat: 13.47, lon: 144.78, r: 40, kw: ['투몬 비치', '사랑의 절벽', '아울렛 쇼핑'] },
  { name: '사이판', lat: 15.19, lon: 145.75, r: 30, kw: ['마나가하섬', '그로토 다이빙', '선셋 크루즈'] },
  { name: '호놀룰루', lat: 21.31, lon: -157.86, r: 50, kw: ['와이키키', '다이아몬드 헤드', '포케'] },
  { name: '파리', lat: 48.86, lon: 2.35, r: 40, kw: ['센강 피크닉', '마레 지구 빈티지', '크루아상 맛집'] },
  { name: '런던', lat: 51.51, lon: -0.13, r: 45, kw: ['스카이 가든', '버로우 마켓', '노팅힐'] },
  { name: '로마', lat: 41.90, lon: 12.50, r: 35, kw: ['트레비 분수', '젤라토', '콜로세움 야간투어'] },
  { name: '바르셀로나', lat: 41.39, lon: 2.17, r: 35, kw: ['사그라다 파밀리아', '벙커 전망대', '타파스 바'] },
  { name: '뉴욕', lat: 40.71, lon: -74.01, r: 50, kw: ['서밋 원 밴더빌트', '리틀 아일랜드', '베이글'] },
  { name: 'LA', lat: 34.05, lon: -118.24, r: 70, kw: ['그리피스 천문대', '산타모니카', '인앤아웃'] },
  { name: '시드니', lat: -33.87, lon: 151.21, r: 50, kw: ['본다이 해안 산책', '오페라하우스', '플랫화이트'] }
];

/* 시즌 날짜 자동 보정 (국내)
   기본 날짜는 기준 지점(refLat·refElev) 기준이고, 현재 위치와 올해 기온으로 옮겨요.
   - latRate: 위도 1° 북쪽일 때 늦어지는 일수 (단풍처럼 북쪽이 빠르면 음수)
   - elevRate: 해발 100m 높을 때 늦어지는 일수 (단풍은 음수)
   - tempRate: 최근 30일이 평년보다 1°C 따뜻할 때 늦어지는 일수 (봄꽃은 음수 = 빨라짐)
   - peakDays: 한 지역에서 절정이 이어지는 기간 (전국 범위였던 절정을 이 길이로 좁혀요)
   경험식이라 며칠 정도 오차가 있을 수 있어요. */
window.SEASON_ADAPT = {
  maehwa:    { refLat: 35.0, refElev: 50, latRate: 4,    elevRate: 1.5,  tempRate: -3,  peakDays: 12 },
  cherry:    { refLat: 36.5, refElev: 50, latRate: 3,    elevRate: 2,    tempRate: -3,  peakDays: 8 },
  azalea:    { refLat: 36.5, refElev: 50, latRate: 3,    elevRate: 2,    tempRate: -2.5, peakDays: 14 },
  rose:      { refLat: 36.5, refElev: 50, latRate: 2,    elevRate: 1,    tempRate: -2,  peakDays: 16 },
  hydrangea: { refLat: 35.0, refElev: 50, latRate: 3,    elevRate: 1,    tempRate: -2,  peakDays: 16 },
  cosmos:    { refLat: 36.5, refElev: 50, latRate: -1.5, elevRate: -1,   tempRate: 1,   peakDays: 14 },
  pinkmuhly: { refLat: 36.5, refElev: 50, latRate: -1.5, elevRate: -1,   tempRate: 1,   peakDays: 16 },
  eoksae:    { refLat: 36.5, refElev: 50, latRate: -2,   elevRate: -1.5, tempRate: 1,   peakDays: 18 },
  foliage:   { refLat: 38.75, refElev: 50, latRate: -3.2, elevRate: -1.5, tempRate: 2.5, peakDays: 12 },
  ginkgo:    { refLat: 37.5, refElev: 50, latRate: -3,   elevRate: -1,   tempRate: 2,   peakDays: 10 }
};
(function () {
  function doy(md) { var p = md.split('-'); return Math.round((Date.UTC(2001, +p[0] - 1, +p[1]) - Date.UTC(2001, 0, 1)) / 864e5); }
  function md(n) { var d = new Date(Date.UTC(2001, 0, 1) + (((Math.round(n) % 365) + 365) % 365) * 864e5); return String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); }
  function lift(x, base) { return x < base ? x + 365 : x; }
  // ctx: { lat, elev, anomaly(°C, 최근 30일 - 평년), today(Date) }
  window.adaptSeason = function (s, ctx) {
    var a = window.SEASON_ADAPT[s.id];
    if (!a || !ctx || ctx.lat == null) return s;
    var shift = (ctx.lat - a.refLat) * a.latRate + ((ctx.elev || 0) - a.refElev) / 100 * a.elevRate;
    // 올해 기온은 시즌 직전·도중일 때만 의미가 있어요
    var from = doy(s.from), to = lift(doy(s.to), from);
    if (ctx.anomaly != null && ctx.today) {
      var t = lift(Math.round((Date.UTC(2001, ctx.today.getMonth(), ctx.today.getDate()) - Date.UTC(2001, 0, 1)) / 864e5), from - 60);
      if (t >= from - 60 && t <= to) shift += ctx.anomaly * a.tempRate;
    }
    shift = Math.max(-20, Math.min(20, shift));
    var ps = lift(doy(s.peak[0]), from), pe = lift(doy(s.peak[1]), ps);
    var center = (ps + pe) / 2 + shift, half = Math.min((pe - ps) / 2, a.peakDays / 2);
    var copy = Object.assign({}, s);
    copy.from = md(from + shift); copy.to = md(to + shift);
    copy.peak = [md(center - half), md(center + half)];
    copy.shift = Math.round(shift);
    return copy;
  };
})();

/* 해외: 나라 국기에 어울리는 배경 (흰 글씨가 읽히도록 짙은 톤) [위, 아래, 강조] */
window.FLAG_COLORS = {
  JP: ['#6e0a1b', '#bc002d', '#ffffff'], CN: ['#7a0a0a', '#de2910', '#ffde00'], TW: ['#0b1f6b', '#b5101f', '#ffffff'],
  HK: ['#7f0d18', '#de2910', '#ffffff'], MO: ['#005c48', '#00876a', '#ffffff'], TH: ['#2d2a4a', '#a51931', '#f4f5f8'],
  VN: ['#8a0d12', '#da251d', '#ffcd00'], PH: ['#0038a8', '#ce1126', '#fcd116'], SG: ['#8f0c18', '#ef3340', '#ffffff'],
  MY: ['#010066', '#cc0001', '#ffcc00'], ID: ['#8a0a12', '#ce1126', '#ffffff'], US: ['#0a3161', '#b31942', '#ffffff'],
  GU: ['#0e2a6b', '#2654a8', '#c8102e'], MP: ['#0a3c8c', '#2f6fd1', '#ffffff'], CA: ['#8f0d17', '#d80621', '#ffffff'],
  GB: ['#012169', '#c8102e', '#ffffff'], FR: ['#002395', '#ed2939', '#ffffff'], IT: ['#00592f', '#cd212a', '#ffffff'],
  ES: ['#aa151b', '#b8860b', '#f1bf00'], PT: ['#005500', '#c00000', '#ffe000'], DE: ['#1a1a1a', '#c00000', '#ffce00'],
  CH: ['#9e0018', '#da291c', '#ffffff'], AT: ['#8a0d1f', '#c8102e', '#ffffff'], CZ: ['#11457e', '#d7141a', '#ffffff'],
  NL: ['#21468b', '#ae1c28', '#ffffff'], TR: ['#8f0b16', '#e30a17', '#ffffff'], AE: ['#00602a', '#1a1a1a', '#ff0000'],
  AU: ['#00006b', '#1b3fa0', '#e4002b'], NZ: ['#00247d', '#a8122a', '#ffffff']
};
