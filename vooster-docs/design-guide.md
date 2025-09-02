# Political Productivity Hub Design Guide

## 1. Overall Mood (전체적인 무드)

정치 캠페인의 **전문성과 신뢰성**을 핵심으로 하는 미션 크리티컬한 업무 도구입니다. 100K+ 유권자에게 정확하고 신속한 메시지 전달이라는 중대한 책임을 다루므로, **안정감 있는 전문가용 대시보드** 컨셉을 채택합니다.

- **키워드**: 신뢰성, 정확성, 효율성, 전문성
- **감성**: 차분하면서도 긴장감 있는 업무 환경
- **톤앤매너**: 깔끔하고 체계적이며 데이터 중심적

## 2. Reference Service (참조 서비스)

- **Name**: Mailchimp Dashboard
- **Description**: 이메일 마케팅 캠페인 관리 및 분석 플랫폼
- **Design Mood**: 전문적이면서도 직관적인 데이터 시각화, 깔끔한 정보 계층구조
- **Primary Color**: #007C89 (Deep Teal)
- **Secondary Color**: #FFE01B (Yellow Accent)

정치 캠페인의 특성상 Mailchimp의 마케팅 도구적 접근보다는 더욱 신중하고 안정적인 느낌으로 조정합니다.

## 3. Color & Gradient (색상 & 그라데이션)

- **Primary Color**: #1E40AF (Deep Blue) - 신뢰성과 안정성을 상징
- **Secondary Color**: #059669 (Emerald Green) - 성공과 진행 상태를 나타냄
- **Accent Color**: #DC2626 (Red) - 경고 및 중요 알림용
- **Warning Color**: #D97706 (Amber) - 주의사항 표시
- **Neutral Gray**: #6B7280 (Cool Gray) - 텍스트 및 보조 요소
- **Background**: #F8FAFC (Light Gray) - 깔끔한 배경
- **Surface**: #FFFFFF (White) - 카드 및 패널 배경

**Mood**: 차분한 Cool 톤, 낮은 채도로 집중력 향상
**Color Usage**: 
- Primary (버튼, 링크, 중요 액션)
- Secondary (진행률, 성공 상태)
- Accent (알림, 에러, 긴급 액션)
- Neutral (일반 텍스트, 구분선, 비활성 요소)

## 4. Typography & Font (타이포그래피 & 폰트)

- **Heading 1**: Pretendard Bold, 32px, Letter-spacing: -0.02em
- **Heading 2**: Pretendard SemiBold, 24px, Letter-spacing: -0.01em
- **Heading 3**: Pretendard SemiBold, 20px, Letter-spacing: -0.01em
- **Body Large**: Pretendard Regular, 16px, Line-height: 1.6
- **Body**: Pretendard Regular, 14px, Line-height: 1.5
- **Caption**: Pretendard Medium, 12px, Letter-spacing: 0.01em
- **Button Text**: Pretendard SemiBold, 14px

한국어 가독성이 뛰어난 Pretendard 폰트를 사용하여 대량의 데이터와 텍스트 정보를 명확하게 전달합니다.

## 5. Layout & Structure (레이아웃 & 구조)

**Grid System**: 12컬럼 그리드 시스템
- **Container Max-width**: 1440px
- **Gutter**: 24px
- **Margin**: 32px (Desktop), 16px (Mobile)

**Layout Principles**:
- **좌측 네비게이션**: 고정형 사이드바 (240px)
- **메인 컨텐츠**: 유동적 너비, 최대 3컬럼 구성
- **헤더**: 64px 고정 높이, 브레드크럼 및 사용자 정보
- **카드 기반 구성**: 8px 라운드 코너, 1px 보더, 4px 그림자

## 6. Visual Style (비주얼 스타일)

**아이콘**: 
- Lucide React 아이콘 세트 사용
- 16px, 20px, 24px 사이즈
- 1.5px 스트로크 두께
- 일관된 라운드 스타일

**이미지**: 
- 실제 데이터 시각화 우선
- 일러스트레이션 최소화
- 차트는 Chart.js 기반 깔끔한 스타일

**그림자**: 
- 카드: 0 1px 3px rgba(0,0,0,0.1)
- 드롭다운: 0 4px 6px rgba(0,0,0,0.1)
- 모달: 0 20px 25px rgba(0,0,0,0.1)

## 7. UX Guide (UX 가이드)

**타겟 사용자**: 전문가 (캠페인 스태프)
**핵심 UX 원칙**:

1. **오류 방지 우선**: 중요한 액션 전 확인 단계 필수
2. **실시간 피드백**: 진행 상황과 결과를 즉시 표시
3. **데이터 투명성**: 모든 수치와 상태를 명확히 공개
4. **효율적 워크플로우**: 최소 클릭으로 핵심 작업 완료
5. **에러 복구**: 문제 발생 시 즉시 해결 방안 제시

**인터랙션 패턴**:
- 위험한 액션은 2단계 확인 (발송, 삭제 등)
- 로딩 상태는 프로그레스바로 명확히 표시
- 성공/실패 결과는 Toast 메시지로 즉시 알림

## 8. UI Component Guide (UI 컴포넌트 가이드)

### 버튼
- **Primary Button**: 파란색 배경, 흰색 텍스트, 8px 라운드
- **Secondary Button**: 흰색 배경, 파란색 보더, 파란색 텍스트
- **Danger Button**: 빨간색 배경, 흰색 텍스트 (삭제, 중단 액션용)
- **크기**: Small (32px), Medium (40px), Large (48px)

### 입력 필드
- **높이**: 40px
- **보더**: 1px solid #D1D5DB
- **포커스**: 2px 파란색 아웃라인
- **라운드**: 6px
- **레이블**: 상단 배치, 12px 캡션 스타일

### 카드
- **배경**: 흰색
- **보더**: 1px solid #E5E7EB
- **라운드**: 8px
- **패딩**: 24px
- **그림자**: 0 1px 3px rgba(0,0,0,0.1)

### 네비게이션
- **사이드바**: 240px 너비, 다크 블루 배경
- **메뉴 아이템**: 40px 높이, 호버 시 배경 변경
- **액티브 상태**: 좌측 4px 파란색 인디케이터

### 데이터 테이블
- **헤더**: 회색 배경, 볼드 텍스트
- **행 높이**: 48px
- **구분선**: 1px solid #F3F4F6
- **호버**: 연한 회색 배경
- **정렬**: 화살표 아이콘으로 방향 표시

### 모달
- **오버레이**: rgba(0,0,0,0.5)
- **컨테이너**: 최대 600px 너비, 중앙 정렬
- **헤더**: 24px 제목, X 버튼 우측 상단
- **버튼 영역**: 우측 정렬, 16px 간격

### 알림 (Toast)
- **성공**: 초록색 좌측 보더, 체크 아이콘
- **에러**: 빨간색 좌측 보더, 경고 아이콘
- **정보**: 파란색 좌측 보더, 정보 아이콘
- **위치**: 우측 상단, 4초 자동 사라짐