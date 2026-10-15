export type CategoryId = 'all' | 'martial' | 'fantasy' | 'romance' | 'mystery' | 'sf' | 'daily';
export type WeekdayId = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type Chapter = {
  id: string;
  number: number;
  title: string;
  publishedAt: string;
  price: number;
  words: number;
  content: string[];
};

export type Novel = {
  id: string;
  title: string;
  author: string;
  category: Exclude<CategoryId, 'all'>;
  categoryLabel: string;
  tagline: string;
  description: string;
  color: string;
  accent: string;
  badge?: string;
  rating: number;
  readers: string;
  likes: number;
  dislikes: number;
  tags: string[];
  status: '연재중' | '완결';
  schedule: string;
  days: WeekdayId[];
  chapters: Chapter[];
};

export type CommunityPost = {
  id: string;
  category: Exclude<CategoryId, 'all'>;
  categoryLabel: string;
  title: string;
  body: string;
  author: string;
  createdAt: string;
  views: number;
  comments: number;
  likes: number;
  pinned?: boolean;
};

export const categories: { id: CategoryId; label: string; symbol: string; description: string }[] = [
  { id: 'all', label: '전체', symbol: '✦', description: '모든 이야기' },
  { id: 'martial', label: '무협', symbol: '劍', description: '강호와 협객' },
  { id: 'fantasy', label: '판타지', symbol: '◈', description: '마법과 모험' },
  { id: 'romance', label: '로맨스', symbol: '♡', description: '설렘과 관계' },
  { id: 'mystery', label: '미스터리', symbol: '？', description: '비밀과 추리' },
  { id: 'sf', label: 'SF', symbol: '◉', description: '미래와 우주' },
  { id: 'daily', label: '일상', symbol: '☕', description: '우리 곁의 이야기' },
];

export const weekdays: { id: WeekdayId; label: string }[] = [
  { id: 'mon', label: '월' },
  { id: 'tue', label: '화' },
  { id: 'wed', label: '수' },
  { id: 'thu', label: '목' },
  { id: 'fri', label: '금' },
  { id: 'sat', label: '토' },
  { id: 'sun', label: '일' },
];

const ashChapter1 = [
  '비가 사흘째 내리던 날, 진무혁은 죽은 사부의 편지를 받았다.',
  '봉투에는 발신지도, 날짜도 없었다. 다만 앞면에 먹이 번진 두 글자가 적혀 있었다. 귀환. 이미 십 년 전에 흙이 된 사람이 보낸 말치고는 지나치게 단정했다.',
  '무혁은 객잔의 낡은 창문을 밀어 열었다. 빗물 냄새 사이로 쇠 비린내가 섞여 들어왔다. 골목 끝, 검은 삿갓을 눌러쓴 사내 셋이 그의 방을 올려다보고 있었다.',
  '“편지는 잘 받으셨습니까.”',
  '문밖에서 목소리가 들렸다. 발소리는 없었다. 무혁은 편지를 촛불 위에 가져갔다. 종이는 타지 않았다. 대신 숨어 있던 붉은 글씨가 천천히 떠올랐다.',
  '달이 차기 전에 천문곡으로 와라. 네가 기억하는 죽음은 모두 거짓이다.',
  '창밖의 사내들이 동시에 칼을 뽑았다. 객잔 아래층의 웃음소리가 뚝 끊겼다. 무혁은 오래 묶어 두었던 검의 매듭을 풀었다.',
  '십 년 동안 단 한 번도 꺼내지 않은 검이었다. 칼집에서 한 치가 드러나자 방 안의 촛불이 옆으로 누웠다.',
  '“들어오시오.” 무혁이 말했다. “나도 물을 것이 많으니.”',
  '문이 안쪽으로 폭발하듯 부서졌다. 그러나 첫 번째 사내가 본 것은 빈방이었다. 두 번째 사내는 천장에서 떨어지는 빗방울을 보았고, 세 번째 사내는 자신의 칼이 반으로 잘린 뒤에야 무혁이 이미 등 뒤에 서 있다는 것을 알았다.',
  '무혁은 피 한 방울 묻지 않은 검을 다시 넣었다. 편지는 탁자 위에서 스스로 접혀 한 마리 종이학이 되었다. 그리고 북쪽을 향해 날개를 펼쳤다.',
  '천문곡. 살아 돌아온 사람은 없고, 죽은 자만 편지를 보낸다는 곳.',
  '그날 밤, 진무혁은 강호에서 사라진 지 십 년 만에 다시 길을 나섰다.',
];

const ashChapter2 = [
  '천문곡으로 가는 길목에는 이름 없는 주막이 하나 있었다.',
  '주인은 눈이 보이지 않는 노파였다. 무혁이 문턱을 넘자 노파는 잔을 둘 내려놓았다. 한 잔은 그를 위한 것이고, 다른 한 잔은 아직 오지 않은 손님을 위한 것처럼 보였다.',
  '“늦었구나, 막내야.”',
  '무혁의 손이 검자루에 닿았다. 사부만이 그를 막내라고 불렀다. 노파는 텅 빈 눈으로 웃었다.',
  '“칼부터 잡는 버릇은 그대로구나. 네 사부가 그 버릇 때문에 네가 오래 살 거라고 했지.”',
  '주막 밖에서 말발굽 소리가 멈췄다. 검은 우의를 입은 여인이 들어와 두 번째 잔을 집었다. 그녀의 허리에는 황실 금위대의 패가 달려 있었다.',
  '“진무혁, 당신을 살인 혐의로 체포하겠습니다.” 여인이 술을 단숨에 비웠다. “십 년 전에 죽은 열두 명을 오늘 아침에 살해한 혐의입니다.”',
  '말이 되지 않는 죄명이었다. 하지만 무혁은 웃지 않았다. 편지를 보낸 죽은 자가 하나라면 우연이라 할 수 있었다. 열둘이라면 누군가 강호의 무덤을 통째로 열고 있는 셈이었다.',
  '노파가 마지막으로 말했다. “천문이 열리면, 먼저 죽은 자가 산 자의 이름을 빼앗는다.”',
];

const ashChapter3 = [
  '새벽의 산길에는 발자국이 열세 줄이었다. 무혁과 금위대 여인, 그리고 보이지 않는 열한 명의 동행.',
  '여인은 자신을 서린이라 소개했다. 그녀는 사건 기록을 펼쳤다. 사망자들은 모두 십 년 전 천문곡 토벌대였다.',
  '기록의 마지막 장에서 무혁은 자신의 이름을 발견했다. 사망 일시는 어제, 사인은 심장 관통.',
  '그 순간 등 뒤에서 칼이 들어왔다. 기록과 정확히 같은 궤적이었다.',
  '무혁은 반 걸음 비켜섰다. 칼끝이 옷깃을 찢었다. 공격자는 자신의 얼굴을 하고 있었다.',
  '“이제 네 이름은 내 것이다.” 가짜 무혁이 웃었다.',
  '산 아래에서 종소리가 울렸다. 한 번, 두 번, 그리고 죽은 사람의 수만큼 열두 번.',
];

function compactChapters(prefix: string, titles: string[]): Chapter[] {
  return titles.map((title, index) => ({
    id: `${prefix}-${index + 1}`,
    number: index + 1,
    title,
    publishedAt: `2026.10.${String(12 - index).padStart(2, '0')}`,
    price: index === 0 ? 0 : 3,
    words: 4200 + index * 180,
    content: index === 0 ? ashChapter1 : index === 1 ? ashChapter2 : ashChapter3,
  }));
}

export const novels: Novel[] = [
  {
    id: 'ash-sword', title: '재가 된 검', author: '해무', category: 'martial', categoryLabel: '무협',
    tagline: '죽은 사부의 편지가 강호를 다시 열었다',
    description: '십 년 전 천문곡에서 모든 것을 잃은 진무혁. 죽은 사부에게서 날아온 한 통의 편지를 따라, 지워진 이름과 뒤바뀐 죽음의 진실을 추적한다.',
    color: '#29241f', accent: '#df6046', badge: '오늘 1위', rating: 4.9, readers: '12.8만', likes: 8421, dislikes: 123,
    tags: ['정통무협', '복수', '미스터리'], status: '연재중', schedule: '매주 월·수·금', days: ['mon', 'wed', 'fri'],
    chapters: compactChapters('ash', ['죽은 자의 편지', '이름 없는 주막', '열세 번째 발자국']),
  },
  {
    id: 'winter-orbit', title: '겨울 궤도의 편지', author: '유성우', category: 'sf', categoryLabel: 'SF',
    tagline: '지구가 보낸 마지막 메시지가 80년 늦게 도착했다',
    description: '목성 궤도 정거장의 통신사 윤서는 멸망한 지구에서 계속 도착하는 편지 속에서 살아 있는 한 사람의 신호를 발견한다.',
    color: '#1c2838', accent: '#85b6d9', badge: '독점', rating: 4.8, readers: '8.4만', likes: 6102, dislikes: 88,
    tags: ['우주', '휴먼드라마', '미스터리'], status: '연재중', schedule: '매주 화·토', days: ['tue', 'sat'],
    chapters: compactChapters('winter', ['80년 늦은 안부', '유령 주파수', '푸른 별의 목소리']),
  },
  {
    id: 'monster-cafe', title: '괴물들의 심야 카페', author: '모과차', category: 'fantasy', categoryLabel: '판타지',
    tagline: '자정이 지나면 손님은 사람이 아니다',
    description: '폐업 직전의 카페를 물려받은 소담. 그런데 자정부터 새벽 네 시까지, 인간이 아닌 손님들의 고민 상담이 시작된다.',
    color: '#26342b', accent: '#d5ad65', badge: '급상승', rating: 4.9, readers: '9.1만', likes: 7022, dislikes: 64,
    tags: ['힐링', '도시판타지', '요리'], status: '연재중', schedule: '매일 연재', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    chapters: compactChapters('cafe', ['어서 오세요, 인간은 처음이죠?', '울지 못하는 도깨비', '보름달 한 스푼']),
  },
  {
    id: 'our-temperature', title: '우리 사이의 온도', author: '서하진', category: 'romance', categoryLabel: '로맨스',
    tagline: '헤어진 연인과 한집에서 겨울을 나게 됐다',
    description: '보일러가 고장 난 오래된 한옥. 건축가 다온은 리모델링 현장에서 7년 전 헤어진 연인 재하와 다시 만난다.',
    color: '#513737', accent: '#f0a597', rating: 4.7, readers: '6.7만', likes: 4892, dislikes: 152,
    tags: ['재회', '현대로맨스', '동거'], status: '완결', schedule: '총 84화', days: [],
    chapters: compactChapters('temp', ['영하 8도의 재회', '두 개의 머그컵', '녹지 않는 마음']),
  },
  {
    id: 'missing-floor', title: '사라진 13층', author: '흑연', category: 'mystery', categoryLabel: '미스터리',
    tagline: '엘리베이터에는 없는 층, 그곳에서 전화가 왔다',
    description: '신입 경비원 지후는 매일 새벽 3시 13분, 존재하지 않는 13층에서 내려오는 호출을 받는다.',
    color: '#302c35', accent: '#b49ad5', badge: '완결 임박', rating: 4.8, readers: '7.9만', likes: 5780, dislikes: 96,
    tags: ['추리', '오컬트', '밀실'], status: '연재중', schedule: '매주 목·일', days: ['thu', 'sun'],
    chapters: compactChapters('floor', ['없는 층의 호출', 'CCTV 속의 나', '13호 열쇠']),
  },
  {
    id: 'laundry', title: '수요일의 세탁소', author: '여름밤', category: 'daily', categoryLabel: '일상',
    tagline: '지워지지 않는 얼룩에는 사연이 있다',
    description: '오래된 동네 세탁소를 운영하는 은재. 매주 수요일마다 옷과 함께 비밀을 맡기는 손님들이 찾아온다.',
    color: '#36515a', accent: '#e9c976', rating: 4.9, readers: '5.5만', likes: 4591, dislikes: 31,
    tags: ['힐링', '옴니버스', '가족'], status: '연재중', schedule: '매주 수요일', days: ['wed'],
    chapters: compactChapters('laundry', ['빨간 코트의 주인', '주머니 속 영수증', '비 오는 날의 셔츠']),
  },
];

export const communityPosts: CommunityPost[] = [
  { id: 'p1', category: 'martial', categoryLabel: '무협', title: '입문자에게 추천할 정통무협 세 작품', body: '무협을 처음 읽는 분들이 세계관 용어에 막히지 않도록 진입 장벽이 낮은 작품 위주로 골라봤습니다.', author: '청풍독자', createdAt: '12분 전', views: 184, comments: 23, likes: 51, pinned: true },
  { id: 'p2', category: 'fantasy', categoryLabel: '판타지', title: '괴물들의 심야 카페 32화 복선 발견한 것 같아요', body: '초반에 나온 깨진 찻잔이 이번 화의 달 그림자랑 연결되는 것 같은데 다들 어떻게 보셨나요?', author: '별가루', createdAt: '28분 전', views: 311, comments: 47, likes: 89 },
  { id: 'p3', category: 'romance', categoryLabel: '로맨스', title: '재하가 그 말을 한 진짜 이유', body: '단순한 오해가 아니라 다온을 보호하려고 일부러 밀어낸 것 같습니다. 41화 대사를 다시 보면 보여요.', author: '겨울라떼', createdAt: '1시간 전', views: 267, comments: 31, likes: 72 },
  { id: 'p4', category: 'mystery', categoryLabel: '미스터리', title: '사라진 13층 범인 추리 — 스포일러 주의', body: '관리소장이 아니라 CCTV에 한 번도 정면으로 찍히지 않은 택배기사가 핵심 인물일 가능성이 큽니다.', author: '검은우산', createdAt: '2시간 전', views: 502, comments: 66, likes: 104 },
  { id: 'p5', category: 'sf', categoryLabel: 'SF', title: '현실적인 우주 통신 묘사가 좋네요', body: '빛의 속도 지연을 단순 장치가 아니라 관계의 핵심 갈등으로 쓴 점이 인상적입니다.', author: '궤도수정', createdAt: '3시간 전', views: 144, comments: 18, likes: 45 },
  { id: 'p6', category: 'daily', categoryLabel: '일상', title: '오늘 위로받은 한 문장 나눠요', body: '수요일의 세탁소에서 “얼룩은 사라져도 그날의 마음은 남는다”는 문장이 오래 남았습니다.', author: '느린산책', createdAt: '5시간 전', views: 207, comments: 39, likes: 96 },
];

export function getNovel(id: string | undefined) {
  return novels.find((novel) => novel.id === id);
}

export function getCategoryLabel(id: CategoryId) {
  return categories.find((category) => category.id === id)?.label ?? '전체';
}
