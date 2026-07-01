import { PhraseItem } from "./types";

export interface PhraseCategory {
  id: string;
  name: string;
  icon: string;
  phrases: PhraseItem[];
}

export const TRAVEL_PHRASE_CATEGORIES: PhraseCategory[] = [
  {
    id: "greetings",
    name: "기본 회화 (Greetings)",
    icon: "🤝",
    phrases: [
      {
        id: "g1",
        category: "greetings",
        korean: "안녕하세요. (보통 아침/낮)",
        japanese: "こんにちは",
        pronunciation: "곤니치와",
        explanation: "가장 보편적인 낮 인사말입니다. 밝게 웃으며 목례와 함께 말해 보세요."
      },
      {
        id: "g2",
        category: "greetings",
        korean: "감사합니다.",
        japanese: "ありがとうございます",
        pronunciation: "아리가토- 고자이마스",
        explanation: "상점, 식당, 공항 등에서 친절에 보답할 때 가장 소중한 일상어입니다."
      },
      {
        id: "g3",
        category: "greetings",
        korean: "실례합니다. / 저기요.",
        japanese: "すみません",
        pronunciation: "스미마셍",
        explanation: "점원을 부를 때, 사람이 가득 찬 지하철을 지나갈 때, 길을 물어볼 때 만능으로 사용되는 가장 중요한 대화문입니다."
      },
      {
        id: "g4",
        category: "greetings",
        korean: "아니요, 괜찮습니다. (거절할 때)",
        japanese: "いいえ、結構です",
        pronunciation: "이-에, 켓코-데스",
        explanation: "길거리 권유나 불필요한 일회용품 제공을 예의 바르게 거절할 때 제격입니다."
      },
      {
        id: "g5",
        category: "greetings",
        korean: "부탁합니다 / 주세요.",
        japanese: "お願いします",
        pronunciation: "오네가이시마스",
        explanation: "어떤 물건이나 서비스를 전적으로 요청할 때 끝에 붙이면 공손함이 배가 됩니다."
      }
    ]
  },
  {
    id: "dining",
    name: "식당 (Dining)",
    icon: "🍽️",
    phrases: [
      {
        id: "d1",
        category: "dining",
        korean: "몇 명인가요? 에 대한 대답 (2명입니다)",
        japanese: "二人です",
        pronunciation: "후타리데스",
        explanation: "인원 수 세기: 1명(히토리), 2명(후타리), 3명(산닌), 4명(요닌). 식당 입장할 때 손가락과 함께 쓰세요."
      },
      {
        id: "d2",
        category: "dining",
        korean: "영어/한국어 메뉴판이 있나요?",
        japanese: "英語か韓国語のメニューはありますか？",
        pronunciation: "에-고카 칸코쿠고노 메뉴-와 아리마스카?",
        explanation: "많은 맛집에 번역된 메뉴판이 구비되어 있으므로 주문 전 미리 물어보기 좋습니다."
      },
      {
        id: "d3",
        category: "dining",
        korean: "이것으로 주세요. (메뉴를 짚으며)",
        japanese: "これをお願いします",
        pronunciation: "코레오 오네가이시마스",
        explanation: "메뉴판에서 원하는 음식을 손가락으로 가리키며 부르는 아주 간편한 주문법입니다."
      },
      {
        id: "d4",
        category: "dining",
        korean: "이거 매운가요?",
        japanese: "これは辛いですか？",
        pronunciation: "코레와 카라이데스카?",
        explanation: "일본 요리는 때로 한국인 입맛에 전혀 안 매울 수 있으나, 매운 것을 주의하고자 할 때 유용합니다."
      },
      {
        id: "d5",
        category: "dining",
        korean: "잘 먹었습니다. (계산하고 나갈 때)",
        japanese: "ごちそうさまでした",
        pronunciation: "고치소-사마데시타",
        explanation: "가게를 나가면서 주방장이나 점원에게 인사를 건네면 정중한 한국인 관광객 이미지를 남길 수 있습니다."
      },
      {
        id: "d6",
        category: "dining",
        korean: "계산 부탁드립니다.",
        japanese: "お会計をお願いします",
        pronunciation: "오카이케-오 오네가이시마스",
        explanation: "자리에서 혹은 카운터에서 계산을 요청할 때 말하세요."
      }
    ]
  },
  {
    id: "transit",
    name: "교통 (Transit)",
    icon: "🚇",
    phrases: [
      {
        id: "t1",
        category: "transit",
        korean: "~역은 어떻게 가나요?",
        japanese: "〜駅はどう行けばいいですか？",
        pronunciation: "~에키와 도- 이케바 이-데스카?",
        explanation: "길을 잃었을 때 역 근처 행인에게 여쭤보기 쉬운 정형 대화문입니다."
      },
      {
        id: "t2",
        category: "transit",
        korean: "이 열차는 ~로 가나요?",
        japanese: "この電車は〜に行きますか？",
        pronunciation: "코노 덴샤와 ~니 이키마스카?",
        explanation: "일본 전철은 급행, 완행, 노선별 환승 등이 다소 복잡하니 승강장에 오르는 사람에게 더블체크 하세요."
      },
      {
        id: "t3",
        category: "transit",
        korean: "얼마인가요?",
        japanese: "いくらですか？",
        pronunciation: "이쿠라데스카?",
        explanation: "가장 보편적인 가격 질문입니다. 버스 요금이나 티켓 구매 시 물어보세요."
      },
      {
        id: "t4",
        category: "transit",
        korean: "버스는 어디서 타나요?",
        japanese: "バスはどこで乗りますか？",
        pronunciation: "바스오와 도코데 노리마스카?",
        explanation: "대부분의 관광지(교토, 홋카이도 등)에서 버스 정류장을 찾을 때 편리합니다."
      }
    ]
  },
  {
    id: "shopping",
    name: "쇼핑 (Shopping)",
    icon: "🛍️",
    phrases: [
      {
        id: "s1",
        category: "shopping",
        korean: "면세(텍스프리) 되나요?",
        japanese: "免税はできますか？",
        pronunciation: "멘제-와 데키마스카?",
        explanation: "일본 쇼핑시 5,000엔 이상 구입했을 경우, 소지한 여권으로 10% 소비세를 환급받을 수 있습니다."
      },
      {
        id: "s2",
        category: "shopping",
        korean: "카드 결제 가능한가요?",
        japanese: "クレジットカードは使えますか？",
        pronunciation: "쿠레짓토카-도와 츠카에마스카?",
        explanation: "소도시나 재래시장에는 여전히 현금 전용인 매장이 많아 결제 전 사전 확인이 중요합니다."
      },
      {
        id: "s3",
        category: "shopping",
        korean: "새 제품으로 있나요?",
        japanese: "新しい在庫はありますか？",
        pronunciation: "아타라시- 자이코와 아리마스카?",
        explanation: "디스플레이 제품 대신 새 제품이나 미개봉 재고를 요청할 때 사용합니다."
      },
      {
        id: "s4",
        category: "shopping",
        korean: "좀 더 둘러볼게요. (상점 구경 중)",
        japanese: "もう少し見てみます",
        pronunciation: "모-스코시 미테미마스",
        explanation: "점원이 따라다니며 권유할 때 부드럽게 사양할 수 있습니다."
      }
    ]
  },
  {
    id: "lodging",
    name: "숙소 (Lodging)",
    icon: "🏨",
    phrases: [
      {
        id: "l1",
        category: "lodging",
        korean: "체크인 부탁드립니다.",
        japanese: "チェックインをお願いします",
        pronunciation: "첵쿠인오 오네가이시마스",
        explanation: "부킹 확인 코드나 스마트폰 화면, 여권을 건네며 호텔 직원에 말해보세요."
      },
      {
        id: "l2",
        category: "lodging",
        korean: "체크아웃 후에 짐을 맡겨둘 수 있나요?",
        japanese: "チェックアウトの後に荷物を預けられますか？",
        pronunciation: "첵쿠아우토노 아토니 니모츠오 아즈케라레마스카?",
        explanation: "마지막 날 비행기 탑승시간 전까지 가벼운 손으로 시내 관광을 하고 싶을 때 요긴합니다."
      },
      {
        id: "l3",
        category: "lodging",
        korean: "Wi-Fi 비밀번호는 무엇인가요?",
        japanese: "Wi-Fiのパスワードは何ですか？",
        pronunciation: "와이파이노 파스와-도와 난데스카?",
        explanation: "객실 내부에 안내가 안 써져 있거나 프런트 가이드 데스크에 질문할 때 씁니다."
      }
    ]
  },
  {
    id: "emergency",
    name: "응급 상황 (Emergency)",
    icon: "🚨",
    phrases: [
      {
        id: "e1",
        category: "emergency",
        korean: "아픕니다/몸 상태가 안 좋습니다.",
        japanese: "気分が悪いです",
        pronunciation: "키분가 와루이데스",
        explanation: "갑작스러운 감기, 복통, 멀미가 찾아와 주변이나 약국에 증상을 호소할 때 쓰입니다."
      },
      {
        id: "e2",
        category: "emergency",
        korean: "도와주세요! 도움이 필요합니다.",
        japanese: "助けてください！",
        pronunciation: "타스케테 쿠다사이!",
        explanation: "여권을 잃어버렸거나 급한 도움 요청을 길거리 경찰관(코반, 交番)이나 행인에게 소리칠 때 쓰입니다."
      },
      {
        id: "e3",
        category: "emergency",
        korean: "가까운 약국/병원이 어디인가요?",
        japanese: "近くに薬局や病院はありますか？",
        pronunciation: "치카쿠니 얏쿄쿠야 뵤-인와 아리마스카?",
        explanation: "약(쿠스리)을 시급히 구매하거나 응급 소동이 있을 상황에 주위에 구조를 구하기 최고입니다."
      }
    ]
  }
];
