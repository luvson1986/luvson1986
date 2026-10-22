/* 오늘 — 영어 모드
   설정에서 English를 고르면 화면의 한국어 문구를 영어로 바꿔요.
   - 고정 문구: 아래 사전(한국어 → 영어)으로 그대로 바꿔요
   - 숫자가 들어간 문구: PATTERNS 규칙으로 바꿔요
   - 내가 적은 일정·체크리스트·메모 같은 내용은 건드리지 않아요 (NO_TR 영역) */
(function () {
  var lang = 'ko';
  try { lang = (JSON.parse(localStorage.getItem('pa:settings') || '{}').lang) || 'ko'; } catch (e) { /* 무시 */ }
  window.LANG = lang;
  window.IS_EN = lang === 'en';
  if (lang === 'en') document.documentElement.lang = 'en';

  var D = {
    // ---- 공통 ----
    '오늘': 'Today', '내일': 'Tomorrow', '어제': 'Yesterday', '지금': 'Now', '삭제': 'Delete', '저장': 'Save', '취소': 'Cancel',
    '추가': 'Add', '편집': 'Edit', '완료': 'Done', '✓ 완료': '✓ Done', '연결': 'Connect', '다시 연결': 'Reconnect', '복사': 'Copy',
    '전체': 'All', '전체보기': 'See all', '끄기': 'Off', '이름': 'Name', '제목': 'Title', '날짜': 'Date', '장소': 'Place', '메모': 'Memo',
    '시작': 'Start', '끝': 'End', '알림': 'Reminder', '카테고리': 'Category', '중요도': 'Priority', '듣기': 'Listen', '이모지': 'Emoji',
    '‹ 이전': '‹ Prev', '다음 ›': 'Next ›', '미정': 'TBD', '시간 미정': 'No time', '제목 없음': 'Untitled', '불러오는 중…': 'Loading…',
    '저장 중…': 'Saving…', '저장했어요.': 'Saved.', '연결하는 중…': 'Connecting…',

    // ---- 메인 상단 ----
    '오늘의 날씨와 계절': "Today's weather and season", '설정 열기': 'Open settings', '한 줄 메모': 'One-line note',
    '한 줄 메모 편집': 'Edit note', '오늘 나에게 하고 싶은 말': 'A note to yourself today', '날씨 불러오는 중': 'Loading weather',
    '날씨 자세히 보기': 'Weather details', '시즌 캘린더 열기': 'Open season calendar', '이 시기의 다른 시즌': 'Other seasons now',
    '지금과 다음 일정': 'Now and next', '이전 일정': 'Previous event', '다음 일정': 'Next event', '좋은 하루예요': 'Have a good day',
    '늦은 밤이에요': "It's late", '좋은 아침이에요': 'Good morning', '점심 맛있게 드세요': 'Enjoy your lunch', '오후도 힘내세요': 'Have a great afternoon',
    '오늘 하루 수고했어요': 'Great work today', '편안한 밤 보내세요': 'Have a restful night',
    '메모를 저장했어요': 'Note saved', '메모를 지웠어요': 'Note cleared',
    '지금 할 일': 'To do now', '다음 할 일': 'Up next',
    '오늘 할 일을 모두 마쳤어요. 수고했어요! 🎉': 'All done for today. Nice work! 🎉',
    '오늘은 예정된 일정이 없어요. 여유로운 하루 보내세요': 'Nothing scheduled today. Enjoy a relaxed day',
    '해외': 'Abroad', '절정': 'Peak', '제철': 'In season', '제철 아님': 'Off season', '다른 시기': 'Other times',

    // ---- 섹션 ----
    '오늘 일정': "Today's schedule", '내일 일정': "Tomorrow's schedule", '어제 일정': "Yesterday's schedule", '일정': 'Schedule',
    '체크리스트': 'Checklists', '날씨 · 옷차림': 'Weather · Outfit', '관심 소식': 'News', '오늘의 관심 소식': "Today's news", '업무 영어': 'Work English',
    '오늘의 업무 영어': "Today's work English", '공부한 표현': 'Studied phrases', '공부한 표현 ›': 'Studied phrases ›',
    '다가오는 일정': 'Upcoming', '다가오는 일정 보기': 'See upcoming', '이전 날': 'Previous day', '다음 날': 'Next day',
    '일정 추가': 'Add event', '일정 자세히 추가': 'Add event with details', '빠르게 추가': 'Quick add', '빠른 추가': 'Quick add',
    '예시 일정이에요. 첫 일정을 추가하면 사라져요.': 'These are sample events. They disappear when you add your first one.',
    '예시 지우기': 'Clear samples', '이 날은 일정이 없어요. 오른쪽 위 + 로 추가하세요.': 'No events this day. Tap + at the top right to add one.',
    '앞으로 예정된 일정이 없어요.': 'No upcoming events.',
    '하이픈(-)으로 나누면 여러 개, 앞의 숫자 4자리는 시간, 끝에 !를 붙이면 중요 일정이에요.': 'Split with hyphens (-) for several. A leading 4-digit number is the time; end with ! for important.',
    '1000피티-출근-1900피부과': '1000gym-commute-1900doctor',
    '현재 시각': 'Current time', '끌어서 옮기기': 'Drag to move', '예시': 'Sample',
    '체크리스트 묶음 추가': 'Add checklist', '체크리스트가 없어요. 오른쪽 위 + 로 "이번 달 꼭 할 일" 같은 묶음을 만들어 보세요.': 'No checklists yet. Tap + at the top right to create one, like "Must-dos this month".',
    '예시 목록이에요. 제목과 항목을 눌러 고치거나 지우세요.': 'These are sample lists. Tap a title or item to edit or delete it.',
    '+ 항목 추가': '+ Add item', '항목': 'Item', '항목 삭제': 'Delete item', '목록 제목': 'List title', '새 목록': 'New list',
    '예시 목록을 지웠어요': 'Sample lists cleared', '이번 달 꼭 할 일': 'Must-dos this month', '올해 목표': 'Goals this year',
    '입기': 'Wear', '챙기기': 'Bring', '옷차림 룰': 'Outfit rules', '시간별 예보': 'Hourly forecast', '일주일 날씨': '7-day forecast',
    '위치 변경': 'Change location', '현재 위치': 'Current location', '현재 위치 (자동)': 'Current location (auto)',
    '도시 검색': 'Search city', '도시 검색 (예: 판교, 부산, 도쿄)': 'Search a city (e.g. Pangyo, Busan, Tokyo)', '도시 검색 (예: 판교, 부산)': 'Search a city (e.g. Pangyo, Busan)',
    '예시 날씨': 'Sample weather', '날씨 서버에 연결하지 못해 예시를 보여줘요': "Couldn't reach the weather server, showing sample data",
    '뉴스': 'News', '영상': 'Videos', '인스타그램': 'Instagram', '관심사 필터': 'Interest filter', '소식 종류': 'Type',
    '오늘 올라온 관심사 소식이 아직 없어요.': 'No news for your interests yet today.', '오늘 올라온 소식이 아직 없어요.': 'Nothing posted yet today.',
    '오늘 올라온 기사 중 여러 매체가 함께 다룬 순서예요.': "Today's articles, ranked by how many outlets covered them.",
    '오늘 올라온 영상을 조회수 순으로 모았어요.': "Today's videos, by views.",
    '영상을 불러오지 못해 유튜브 검색으로 연결해요. 설정에 유튜브 API 키를 넣으면 오늘 영상을 조회수 순으로 보여줘요.': "Couldn't load videos, linking to YouTube search instead. Add a YouTube API key in Settings to see today's videos by views.",
    '인스타그램은 게시물을 가져올 공개 방법이 없어 해시태그 페이지로 연결해요.': "Instagram has no public way to fetch posts, so this links to hashtag pages.",
    '뉴스 서버에 연결하지 못해 예시를 보여드려요. 링크를 누르면 실제 검색 결과로 이동해요.': "Couldn't reach the news server, showing samples. Links open real search results.",
    'YouTube 검색 · 조회수순': 'YouTube search · by views',
    '표현 검색': 'Search phrases', '영어나 한글로 검색 (예: feedback, 일정)': 'Search in English or Korean (e.g. feedback)',
    '이 브라우저는 음성 듣기를 지원하지 않아요': "This browser doesn't support speech", '문장을 선택했어요. 복사해서 쓰세요': 'Sentence selected. Copy it to use',
    '복사했어요': 'Copied',

    // ---- 시즌 ----
    '시즌 캘린더': 'Season calendar', '시즌 추가': 'Add season', '캘린더': 'Calendar', '목록·편집': 'List · Edit', '보기 방식': 'View',
    '전국 기준 날짜예요. 위치를 받아오면 지역에 맞게 바뀌어요.': 'Nationwide dates. They adjust to your region once location is available.',
    '오늘 기준 순서예요. 배경에는 항상 오늘 가장 높은 순위 시즌이 나와요.': "Ordered for today. The background always shows today's top season.",
    '숨긴 시즌': 'Hidden seasons', '다시 보기': 'Show', '숨기기': 'Hide', '내가 추가': 'Mine',
    '지금 시기에 해당하는 시즌이 없어요.': 'No seasons right now.',
    '이름과 시작·끝 날짜를 입력해 주세요.': 'Please enter a name and start/end dates.',
    '연도는 상관없어요. 매년 같은 날짜로 반복돼요.': 'Year doesn’t matter. It repeats on the same dates every year.',
    '절정 시작 (선택)': 'Peak start (optional)', '절정 끝 (선택)': 'Peak end (optional)', '키워드 (쉼표로 구분)': 'Keywords (comma-separated)',
    '배경 효과': 'Background effect', '꽃잎': 'Petals', '낙엽': 'Leaves', '눈': 'Snow', '비': 'Rain', '바다·물방울': 'Sea', '햇살': 'Sunlight',
    '불빛': 'Lights', '반딧불': 'Fireflies', '풀·억새': 'Grass', '예: 방어회': 'e.g. Yellowtail sashimi', '대방어 뱃살, 모슬포 축제': 'Yellowtail belly, Moseulpo festival',
    '● 소소한 제철': '● Small treat', '●● 챙기면 좋음': '●● Worth it', '●●● 꼭 챙길 시즌': '●●● Must-do season',

    // ---- 날씨 ----
    '맑음': 'Clear', '대체로 맑음': 'Mostly clear', '구름 조금': 'Partly cloudy', '흐림': 'Cloudy', '안개': 'Fog', '짙은 안개': 'Dense fog',
    '약한 이슬비': 'Light drizzle', '이슬비': 'Drizzle', '강한 이슬비': 'Heavy drizzle', '어는 이슬비': 'Freezing drizzle',
    '약한 비': 'Light rain', '어는 비': 'Freezing rain', '강한 비': 'Heavy rain', '강한 어는 비': 'Heavy freezing rain',
    '약한 눈': 'Light snow', '폭설': 'Heavy snow', '싸락눈': 'Snow grains', '소나기': 'Showers', '강한 소나기': 'Heavy showers',
    '눈 소나기': 'Snow showers', '강한 눈 소나기': 'Heavy snow showers', '뇌우': 'Thunderstorm', '우박 동반 뇌우': 'Thunderstorm with hail',
    '강한 우박 뇌우': 'Severe hailstorm', '알 수 없음': 'Unknown', '서울특별시': 'Seoul', '대한민국': 'South Korea',

    // ---- 옷차림 ----
    '한여름': 'Midsummer', '여름': 'Summer', '초여름': 'Early summer', '봄가을': 'Spring/Fall', '환절기': 'In-between', '초겨울': 'Early winter',
    '겨울': 'Winter', '한겨울': 'Deep winter', '반팔': 'T-shirt', '나시': 'Tank top', '반바지': 'Shorts', '샌들': 'Sandals',
    '얇은 가디건': 'Light cardigan', '외투 없는 긴팔': 'Long sleeves', '얇은 외투 걸친 반팔': 'T-shirt + light jacket', '스카프': 'Scarf',
    '가디건': 'Cardigan', '자켓': 'Jacket', '트렌치코트': 'Trench coat', '긴팔': 'Long sleeves', '스타킹': 'Tights', '얇은 코트': 'Light coat',
    '얇은 패딩': 'Light puffer', '두꺼운 가디건': 'Thick cardigan', '가죽점퍼': 'Leather jacket', '얇은 니트': 'Light knit', '숄 가디건': 'Shawl cardigan',
    '스카프/얇은 목도리': 'Light muffler', '무스탕': 'Shearling jacket', '겨울니트': 'Winter knit', '부츠': 'Boots', '코트': 'Coat', '패딩': 'Puffer',
    '퍼': 'Fur', '목도리': 'Muffler', '두꺼운 스타킹': 'Thick tights', '구간 이름': 'Band name', '그보다 추울 때': 'Colder than that',
    '° 이상': '° or above', '기준 기온': 'Threshold', '구간 삭제': 'Delete band', '옷': 'Clothes', '+아이템': '+Items', '쉼표로 구분': 'Comma-separated',
    '목도리, 부츠…': 'Muffler, boots…', '새 구간': 'New band', '+ 구간 추가': '+ Add band', '기본값으로': 'Reset', '옷차림 룰을 저장했어요': 'Outfit rules saved',
    '출근(10시) 기온이 기준 이상인 첫 구간의 옷과 + 아이템을 보여줘요. 퇴근(20시)이 더 추운 구간이면 그 구간의 + 아이템을 방한템으로, 낮이 많이 더우면 쿨링템을 더해요. 쉼표로 구분해요.': 'Shows clothes and + items from the first band at or above the 10am temperature. If 8pm falls in a colder band, its + items are added for warmth; if midday is much hotter, cooling items are added. Separate with commas.',
    '+벗기 쉬운 겉옷': '+Easy-off layer', '+손풍기': '+Handheld fan', '미끄럼 방지 신발': 'Non-slip shoes', '눈 소식이 있어요': 'Snow expected',
    '장우산': 'Umbrella', '접이식 우산': 'Folding umbrella', 'KF94 마스크': 'KF94 mask', '마스크': 'Mask', '먼지 나쁨': 'Bad air', '먼지 보통': 'Moderate air',
    '선글라스': 'Sunglasses', '자외선이 강하거나 햇빛이 쨍해요': 'Strong UV or bright sun', '모자': 'Hat', '바람막이': 'Windbreaker', '핫팩': 'Hand warmer',
    '특별히 없어요': 'Nothing special',

    // ---- 일정 상세 ----
    '제목 고치기': 'Edit title', '날짜·시간 고치기': 'Edit date & time', '시간 정하기': 'Set time', '종료 (선택)': 'End (optional)',
    '장소, 도시(영문)': 'Place, city', '예: 강남역 스타벅스': 'e.g. Starbucks Gangnam Stn', '예: Ichiran Shibuya, Tokyo': 'e.g. Ichiran Shibuya, Tokyo',
    '장소 추가': 'Add place', '구글맵': 'Google Maps', '네이버 지도': 'Naver Map', '네이버 지도에서 확인 ›': 'Open in Naver Map ›', '구글맵에서 확인 ›': 'Open in Google Maps ›',
    '중요 표시': 'Important', '중요 일정': 'Important', '빨간 글씨로 눈에 띄게 보여줘요': 'Shown in red to stand out', '카테고리 선택': 'Choose category',
    '내 캘린더에 추가': 'Add to my calendar', 'Google 캘린더': 'Google Calendar', 'iPhone 캘린더': 'iPhone Calendar', '웹·안드로이드': 'Web · Android',
    '.ics 파일로 추가': 'Add via .ics file', '텍스트 복사': 'Copy text', '메신저에 붙여넣기': 'Paste into chat',
    '회의 안건, 준비물, 회고를 적어 두세요': 'Agenda, things to bring, notes', '준비할 것, 논의할 내용': 'Things to prepare or discuss',
    '입력하면 자동으로 저장돼요.': 'Saves automatically as you type.', '끄면 시간 없이 그날 맨 뒤에 쌓여요': 'If off, it goes to the end of the day without a time',
    '10분 전': '10 min before', '1시간 전': '1 hour before', '30분 전': '30 min before', '5분 전': '5 min before',
    '일정 수정': 'Edit event', '수정 저장': 'Save changes', '예: 송금 플로우 디자인 리뷰': 'e.g. Transfer flow design review',
    '제목을 고쳤어요': 'Title updated', '날짜·시간을 고쳤어요': 'Date & time updated', '장소를 고쳤어요': 'Place updated', '장소를 지웠어요': 'Place removed',
    '시간을 정하면 알림을 받을 수 있어요.': 'Set a time to get a reminder.',
    '알림이 꺼져 있어요. 아이폰 설정 → 알림 → 오늘에서 허용해 주세요.': 'Notifications are off. Allow them in iPhone Settings → Notifications → 오늘.',
    '이 브라우저는 알림을 지원하지 않아요. 홈 화면에 추가한 앱에서 써 주세요.': "This browser doesn't support notifications. Use the app from your Home Screen.",
    '앱이 꺼져 있으면 울리지 않을 수 있어요. 확실하게 받으려면 아래 iPhone 캘린더로도 추가하세요.': 'May not ring while the app is closed. To be sure, also add it to iPhone Calendar below.',
    '알림을 받으려면 먼저 허용해 주세요.': 'Allow notifications first.', '알림 허용하기': 'Allow notifications', '곧 시작': 'Starting soon', '알림을 껐어요': 'Reminder off',
    '시작 시간을 입력하거나 "시간 정하기"를 꺼 주세요': 'Enter a start time or turn off "Set time"', '시작 시간을 입력하거나 "시간 정하기"를 꺼 주세요.': 'Enter a start time or turn off "Set time".',
    '종료 시간은 시작 시간보다 늦어야 해요': 'End time must be after start time', '종료 시간은 시작 시간보다 늦어야 해요.': 'End time must be after start time.',
    '일정 이름을 입력해 주세요.': 'Please enter a title.', '날짜를 선택해 주세요.': 'Please choose a date.', '종료 시간을 쓰려면 시작 시간도 입력해 주세요.': 'Enter a start time to use an end time.',
    '일정을 수정했어요': 'Event updated', '일정을 추가했어요': 'Event added', '한 번 더 누르면 삭제돼요': 'Tap again to delete', '일정을 삭제했어요': 'Event deleted',
    '일정을 복사했어요': 'Event copied', '중요 일정으로 표시했어요': 'Marked important', '중요 표시를 뺐어요': 'Unmarked important', '완료를 취소했어요': 'Marked not done',
    '예시 일정을 지웠어요': 'Sample events cleared', '복사할 수 없는 환경이에요. 직접 선택해서 복사해 주세요': "Can't copy here. Please select and copy manually",
    '일정 카테고리': 'Event categories', '새 카테고리 (예: 스터디)': 'New category (e.g. Study)', '새 카테고리 색': 'New category color', '새 카테고리 이름': 'New category name',
    '카테고리 이름': 'Category name', '카테고리는 하나 이상 있어야 해요': 'You need at least one category',
    "색을 눌러 바꾸고, 이름을 눌러 고칠 수 있어요. ↑↓로 순서를 바꾸면 범례와 선택 목록에 그대로 반영돼요. 맨 위 카테고리는 빠른 추가의 기본값이에요. 삭제한 카테고리의 일정은 '기타'(회색)로 보여요.": "Tap a color to change it, or a name to edit it. Reorder with ↑↓. The top category is the default for quick add. Events in a deleted category show as 'Other' (gray).",
    '회의': 'Meeting', '집중 업무': 'Focus work', '개인': 'Personal', '운동·건강': 'Health', '기타': 'Other', '기본': 'Default',
    '데이트': 'Date', '집안일': 'Chores', '운동': 'Workout', '업무': 'Work', '약속': 'Plans', '여행': 'Travel',

    // ---- 설정 ----
    '내 설정': 'Settings', '예: 지은': 'e.g. Jieun', '관심사': 'Interests', '입력 후 Enter (예: 디자인 시스템)': 'Type and press Enter (e.g. design systems)',
    '관심사마다 최근 7일 뉴스와 영상을 모아요.': 'Collects news and videos from the last 7 days for each interest.', '날씨 지역': 'Weather location',
    '일주일 날씨에서 날짜를 누르면': 'Tapping a day in the 7-day forecast', '아이폰 기본 날씨 앱 열기': 'Opens iPhone Weather', "'날씨날씨' 단축어 실행": "Runs the '날씨날씨' shortcut",
    '날씨날씨': '날씨날씨', "'날씨날씨'로 열려면 단축어 앱에서 [앱 열기 → 날씨날씨] 동작 하나로 된 단축어를 만들고 이름을": "To open 날씨날씨, create a Shortcut with a single [Open App → 날씨날씨] action and name it", '로 저장하세요.': '.', '유튜브 API 키 (선택)': 'YouTube API key (optional)',
    '넣으면 관심사별 최신 영상을 더 안정적으로 가져와요. Google Cloud 콘솔에서 YouTube Data API v3 키를 무료로 만들 수 있어요.': 'Makes fetching the latest videos more reliable. You can create a free YouTube Data API v3 key in the Google Cloud console.',
    '섹션 순서': 'Section order', '위아래 버튼을 누르면 바로 바뀌어요. 맨 위 날씨·계절 영역은 고정이에요.': 'Drag to reorder. The weather & season area at the top stays fixed.',
    '데이터 백업': 'Backup', '백업 파일 만들기': 'Create backup file', '백업 불러오기': 'Restore backup',
    '일정·체크리스트·메모·설정은 이 폰에만 저장돼요. 폰을 바꾸거나 앱을 지우기 전에 백업 파일을 만들어 두세요.': 'Events, checklists, notes and settings live only on this phone. Make a backup before switching phones or deleting the app.',
    '알림 서버': 'Reminder server', '연결하면 앱이 꺼져 있어도 일정 알림이 제시간에 와요.': 'Once connected, reminders arrive on time even when the app is closed.',
    '✅ 연결됨 · 앱이 꺼져 있어도 일정 알림이 제시간에 와요.': '✅ Connected · reminders arrive on time even when the app is closed.',
    '테스트 알림 보내기': 'Send test notification', '구독이 풀렸어요. 다시 연결해 주세요.': 'Subscription expired. Please reconnect.',
    'https:// 로 시작하는 서버 주소를 넣어 주세요.': 'Enter a server address starting with https://.',
    '이 화면에서는 푸시를 쓸 수 없어요. 홈 화면에 추가한 앱에서 연결해 주세요.': "Push isn't available here. Connect from the Home Screen app.",
    '서버에 연결하지 못했어요. 주소를 확인해 주세요.': "Couldn't reach the server. Check the address.", '알림 서버에 연결했어요': 'Connected to reminder server',
    '연결하지 못했어요.': "Couldn't connect.", '서버에 연결하지 못했어요': "Couldn't reach the server", '테스트 알림을 보냈어요. 앱을 닫고 기다려 보세요.': 'Test sent. Close the app and wait.',
    '관심사는 8개까지 등록할 수 있어요': 'You can add up to 8 interests', '설정을 저장했어요': 'Settings saved', '현재 위치 날씨로 바꿨어요': 'Switched to current location',
    '검색 결과가 없어요. 다른 이름으로 찾아보세요.': 'No results. Try another name.', '지역 검색 서버에 연결하지 못했어요.': "Couldn't reach the location search server.",
    '내 위치 자동 (실패 시 서울특별시)': 'My location, automatic (Seoul if unavailable)', '백업을 불러왔어요. 다시 여는 중…': 'Backup restored. Reopening…',
    '오늘 앱 백업 파일이 아니에요. 파일을 다시 확인해 주세요': "That isn't a 오늘 backup file. Please check the file",
    '언어': 'Language', '한국어': '한국어', 'English': 'English', '언어를 바꾸면 앱을 다시 열어요.': 'Changing the language reopens the app.',
    // 예시 데이터
    '데일리 스탠드업': 'Daily stand-up', '어제 한 일 / 오늘 할 일 / 막힌 것': 'Yesterday / today / blockers', '출근': 'Commute',
    '디자인 리뷰: 대출 신청 화면': 'Design review: loan application', '12층 회의실': 'Room 12F', '필라테스': 'Pilates', '피티': 'PT session',
    '친구 점심': 'Lunch with a friend', '장보기': 'Groceries', '세탁소': 'Dry cleaner', '공과금 납부': 'Pay bills', '영화': 'Movie', '조식': 'Breakfast', '마사지': 'Massage',
    '연말정산 서류 미리 챙기기': 'Prep year-end tax papers', '디자인 시스템 버튼 컴포넌트 정리': 'Tidy design-system buttons', '건강검진 예약': 'Book a health check-up',
    '영어로 디자인 리뷰 진행하기': 'Run a design review in English', '포트폴리오 업데이트': 'Update portfolio', '책 12권 읽기': 'Read 12 books',
    '하프 마라톤 완주': 'Finish a half marathon', 'UX 리서치 강의 수료': 'Complete a UX research course', '예시 뉴스': 'Sample news',
    '환율 계산기': 'Currency converter', '현지 금액': 'Local amount', '원화 금액': 'Amount in KRW', '원 KRW': '₩ KRW', '환율 불러오는 중': 'Loading rate', '통화 바꾸기': 'Swap currencies', '지우기': 'Backspace', '부호 바꾸기': 'Plus/minus',
    'UX 디자인': 'UX design', '핀테크': 'Fintech', '디지털 금융': 'Digital finance', 'AI 서비스': 'AI services'
  };

  var W = { '일': 'Sun', '월': 'Mon', '화': 'Tue', '수': 'Wed', '목': 'Thu', '금': 'Fri', '토': 'Sat' };
  var WL = { '일': 'Sunday', '월': 'Monday', '화': 'Tuesday', '수': 'Wednesday', '목': 'Thursday', '금': 'Friday', '토': 'Saturday' };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var hm = function (h, m) { return (h ? h + 'h' : '') + (h && m ? ' ' : '') + (m ? m + 'm' : ''); };
  // 숫자가 섞인 문구
  var P = [
    [/^(\d+)월 (\d+)일 ([일월화수목금토])요일$/, function (_, m, d, w) { return WL[w] + ', ' + MON[m - 1] + ' ' + d; }],
    [/^(\d+)월 (\d+)일 \(([일월화수목금토])\)(.*)$/, function (_, m, d, w, rest) { return W[w] + ', ' + MON[m - 1] + ' ' + d + tr(rest); }],
    [/^(\d+)월 (\d+)일 일정$/, function (_, m, d) { return MON[m - 1] + ' ' + d; }],
    [/^(\d+)\/(\d+) \(([일월화수목금토])\)$/, function (_, m, d, w) { return W[w] + ' ' + m + '/' + d; }],
    [/^(\d+)\/(\d+) ([일월화수목금토])$/, function (_, m, d, w) { return W[w] + ' ' + m + '/' + d; }],
    [/^(\d+(?:\/\d+)?)([일월화수목금토])$/, function (_, d, w) { return d + ' ' + W[w]; }],
    [/^([일월화수목금토])요일$/, function (_, w) { return WL[w]; }],
    [/^(\d+)시$/, function (_, h) { return (+h % 12 || 12) + (+h < 12 ? 'am' : 'pm'); }],
    [/^(?:(\d+)시간)? ?(?:(\d+)분)? 후$/, function (_, h, m) { return 'in ' + hm(+h || 0, +m || 0); }],
    [/^(?:(\d+)시간)? ?(?:(\d+)분)? 남음$/, function (_, h, m) { return hm(+h || 0, +m || 0) + ' left'; }],
    [/^(?:(\d+)시간)? ?(?:(\d+)분)?째$/, function (_, h, m) { return hm(+h || 0, +m || 0) + ' in'; }],
    [/^(\d+)분 전$/, function (_, n) { return n + 'm ago'; }], [/^(\d+)시간 전$/, function (_, n) { return n + 'h ago'; }], [/^(\d+)일 전$/, function (_, n) { return n + 'd ago'; }],
    [/^(\d+)분 후 시작$/, function (_, n) { return 'Starts in ' + n + ' min'; }],
    [/^(\d+)시간 후 시작$/, function (_, n) { return 'Starts in ' + n + ' h'; }],
    [/^(\d+)일 후$/, function (_, n) { return 'in ' + n + ' days'; }],
    [/^절정까지 (\d+)일$/, function (_, n) { return n + ' days to peak'; }],
    [/^(\d+)일 후 시작$/, function (_, n) { return 'starts in ' + n + ' days'; }], [/^오늘 시작$/, function () { return 'starts today'; }],
    [/^진행 중$/, function () { return 'Now'; }], [/^다음$/, function () { return 'Next'; }],
    [/^체감 (-?\d+°)$/, function (_, t) { return 'Feels ' + t; }],
    [/^비 (\d+%)$/, function (_, p) { return 'Rain ' + p; }],
    [/^(\d+)개 매체 보도$/, function (_, n) { return n + ' outlets'; }],
    [/^조회 (.+)$/, function (_, n) { return n + ' views'; }],
    [/^([\d.]+)만회$/, function (_, n) { return Math.round(n * 10) + 'K'; }], [/^([\d.]+)천회$/, function (_, n) { return n + 'K'; }], [/^(\d+)회$/, function (_, n) { return n; }],
    [/^(\d+)개 일정을 추가했어요$/, function (_, n) { return n + (n === '1' ? ' event' : ' events') + ' added'; }],
    [/^시작 (.+) 전에 알려드릴게요$/, function (_, x) { return 'Reminder ' + tr(x) + ' before start'; }],
    [/^(\d+)분$/, function (_, n) { return n + ' min'; }], [/^1시간$/, function () { return '1 hour'; }],
    [/^출근 (\d+)시 (-?\d+°)$/, function (_, h, t) { return 'Commute ' + h + 'h ' + t; }],
    [/^퇴근 (\d+)시 (-?\d+)° 대비$/, function (_, h, t) { return 'For ' + t + '° at ' + h + 'h'; }],
    [/^낮 (-?\d+)° 대비$/, function (_, t) { return 'For ' + t + '° midday'; }],
    [/^미세 (\d+) · 초미세 (\d+)㎍\/㎥$/, function (_, a, b) { return 'PM10 ' + a + ' · PM2.5 ' + b + '㎍/㎥'; }], [/^초미세 (\d+)㎍\/㎥$/, function (_, b) { return 'PM2.5 ' + b + '㎍/㎥'; }],
    [/^(.+) 한 겹$/, function (_, x) { return tr(x) + ' layer'; }],
    [/^현재: (.+)$/, function (_, x) { return 'Now: ' + tr(x); }],
    [/^(.+) 날씨로 바꿨어요$/, function (_, x) { return 'Switched to ' + x; }],
    [/^(.+) 위로$/, function (_, x) { return 'Move ' + x + ' up'; }], [/^(.+) 아래로$/, function (_, x) { return 'Move ' + x + ' down'; }],
    [/^(.+) 끌어서 순서 바꾸기$/, function (_, x) { return 'Drag ' + x + ' to reorder'; }],
    [/^(.+) 펼치기$/, function (_, x) { return 'Expand ' + x; }], [/^(.+) 접기$/, function (_, x) { return 'Collapse ' + x; }],
    [/^(.+) 목록 삭제$/, function (_, x) { return 'Delete list ' + x; }], [/^(.+)에 항목 추가$/, function (_, x) { return 'Add item to ' + x; }],
    [/^(.+) 완료 취소$/, function (_, x) { return 'Undo done: ' + x; }], [/^(.+) 완료$/, function (_, x) { return 'Done: ' + x; }],
    [/^(.+) 삭제$/, function (_, x) { return 'Delete ' + x; }], [/^(.+) 색$/, function (_, x) { return x + ' color'; }],
    [/^“(.+)” 완료!$/, function (_, x) { return '“' + x + '” done!'; }], [/^“(.+)” 모두 완료했어요$/, function (_, x) { return 'All done in “' + x + '”'; }],
    [/^“(.+)” 목록을 삭제했어요$/, function (_, x) { return 'Deleted “' + x + '”'; }], [/^“(.+)” 카테고리를 추가했어요$/, function (_, x) { return 'Added category “' + x + '”'; }],
    [/^“(.+)” 삭제\?$/, function (_, x) { return 'Delete “' + x + '”?'; }], [/^“(.+)”에 맞는 표현이 없어요\.$/, function (_, x) { return 'No phrases for “' + x + '”.'; }],
    [/^카테고리를 (.+)\(으\)로 바꿨어요$/, function (_, x) { return 'Category changed to ' + x; }],
    [/^(.+) 시즌을 숨겼어요$/, function (_, x) { return 'Hid ' + x; }], [/^(.+) 시즌을 다시 보여줘요$/, function (_, x) { return 'Showing ' + x + ' again'; }],
    [/^(.+) 시즌을 삭제했어요$/, function (_, x) { return 'Deleted ' + x; }], [/^(.+) 시즌을 추가했어요$/, function (_, x) { return 'Added ' + x; }],
    [/^(.+) 기준으로 꽃·단풍 날짜를 맞췄어요$/, function (_, x) { return 'Bloom and foliage dates adjusted for ' + tr(x); }],
    [/^최근 30일이 평년보다 (.+)$/, function (_, x) { return 'last 30 days ' + ({ '비슷해요': 'near normal', '따뜻해요': 'warmer than normal', '추워요': 'colder than normal' }[x] || x); }],
    [/^(.+)에서 확인 ›$/, function (_, x) { return 'Open in ' + tr(x) + ' ›'; }],
    [/^오늘 인기 영상$/, function () { return "Today's popular videos"; }], [/^(.+) 오늘 인기 영상$/, function (_, x) { return x + " · today's popular videos"; }],
    [/^(.+)님$/, function (_, x) { return x; }],
    [/^📍 (.+)$/, function (_, x) { return '📍 ' + tr(x); }],
    [/^\+(.+)$/, function (_, x) { return '+' + tr(x); }]
  ];

  function tr(s) {
    if (!window.IS_EN || !s || !/[가-힣]/.test(s)) return s;
    var lead = s.match(/^\s*/)[0], tail = s.match(/\s*$/)[0], core = s.trim();
    if (D.hasOwnProperty(core)) return lead + D[core] + tail;
    for (var i = 0; i < P.length; i++) {
      if (P[i][0].test(core)) {
        var fn = P[i][1];
        // 괄호로 잡은 이름(카테고리·목록 이름 등)도 사전에 있으면 같이 바꿔요
        return lead + core.replace(P[i][0], function () {
          var a = Array.prototype.slice.call(arguments, 0, -2).map(function (x, j) { return j && typeof x === 'string' && /[가-힣]/.test(x) && D.hasOwnProperty(x) ? D[x] : x; });
          return fn.apply(null, a);
        }) + tail;
      }
    }
    // ' · ' 로 이어 붙인 문구는 조각마다
    if (core.indexOf(' · ') > 0) return lead + core.split(' · ').map(function (x) { return tr(x); }).join(' · ') + tail;
    if (/, /.test(core) && core.indexOf('님, ') > 0) { var p = core.split('님, '); return lead + tr(p[1]) + ', ' + p[0] + tail; }
    return s;
  }
  window.tr = tr;
  window.I18N_EN = D;

  if (!window.IS_EN) return;

  // 내가 적은 내용은 번역하지 않아요
  var NO_TR = '.tl-title, .tl-memo, .nn-title, .dl-item, .cl-text, .cl-title, #dt-title, #dt-place-text, .hero-greet.has-note, .n-title, .n-src, .en-phrase, .en-text, [translate="no"], .city-results, textarea';
  var ATTRS = ['placeholder', 'aria-label', 'title'];
  // 예시 데이터(.is-sample 안)는 내용이어도 번역해요
  function skip(el) { return el && el.closest && el.closest(NO_TR) && !el.closest('.is-sample, .ph-add'); }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (!skip(root.parentElement)) { var v = tr(root.nodeValue); if (v !== root.nodeValue) root.nodeValue = v; } return; }
    if (root.tagName === 'TEXTAREA' && root.closest('.is-sample')) { var tv = tr(root.value); if (tv !== root.value) root.value = tv; }
    if (root.nodeType !== 1 || root.tagName === 'SCRIPT' || root.tagName === 'STYLE') return;
    ATTRS.forEach(function (a) { var v = root.getAttribute(a); if (v && /[가-힣]/.test(v)) { var t = tr(v); if (t !== v) root.setAttribute(a, t); } });
    if (root.tagName === 'INPUT' && (root.type === 'button' || root.type === 'submit')) root.value = tr(root.value);
    for (var c = root.firstChild; c; c = c.nextSibling) walk(c);
  }
  window.trDom = walk;
  function start() {
    document.title = 'Today';
    walk(document.body);
    new MutationObserver(function (list) {
      list.forEach(function (m) {
        if (m.type === 'characterData') walk(m.target);
        else if (m.type === 'attributes') walk(m.target);
        else m.addedNodes.forEach(walk);
      });
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
