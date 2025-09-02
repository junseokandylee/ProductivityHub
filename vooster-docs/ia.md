# Political Productivity Hub Information Architecture (IA)

## 1. Site Map (사이트맵)

```
Political Productivity Hub
├── 홈 대시보드 (/)
│   ├── 전체 통계 개요
│   ├── 최근 캠페인 현황
│   ├── 실시간 알림 센터
│   └── 쿼터 사용량 현황
├── 연락처 관리 (/contacts)
│   ├── 연락처 목록 (/contacts)
│   │   ├── 검색 및 필터링
│   │   ├── 태그 관리
│   │   └── 일괄 작업
│   ├── 연락처 가져오기 (/contacts/import)
│   │   ├── CSV/Excel 업로드
│   │   ├── 중복 검토 및 병합
│   │   └── 가져오기 결과
│   ├── 연락처 내보내기 (/contacts/export)
│   └── 연락처 상세 (/contacts/:id)
│       ├── 기본 정보 편집
│       ├── 커뮤니케이션 이력
│       └── 태그 및 메모
├── 캠페인 관리 (/campaigns)
│   ├── 캠페인 목록 (/campaigns)
│   │   ├── 상태별 탭 (작성중, 발송중, 완료)
│   │   ├── 캠페인 검색
│   │   └── 빠른 액션
│   ├── 캠페인 생성 (/campaigns/create)
│   │   ├── 1단계: 대상 선택
│   │   ├── 2단계: 메시지 작성
│   │   ├── 3단계: 채널 설정
│   │   └── 4단계: 검토 및 발송
│   ├── 캠페인 상세 (/campaigns/:id)
│   │   ├── 기본 정보
│   │   ├── 발송 현황
│   │   └── 성과 분석
│   └── 캠페인 분석 (/campaigns/:id/analytics)
│       ├── 전달률 분석
│       ├── 열람/클릭률 통계
│       └── 비용 및 쿼터 사용량
├── 통합 인박스 (/inbox)
│   ├── 대화 목록 (/inbox)
│   │   ├── 채널별 필터 (SMS, 카카오)
│   │   ├── 읽음/안읽음 상태
│   │   └── 검색 기능
│   ├── 대화 상세 (/inbox/:conversationId)
│   │   ├── 메시지 히스토리
│   │   ├── 답장 패널
│   │   └── 연락처 정보
│   └── 자동 응답 설정 (/inbox/auto-reply)
├── 리포트 및 분석 (/reports)
│   ├── 월간 요약 리포트 (/reports/monthly)
│   ├── 캠페인 성과 비교 (/reports/campaigns)
│   ├── 연락처 통계 (/reports/contacts)
│   └── 비용 및 쿼터 분석 (/reports/quota)
├── 설정 (/settings)
│   ├── 조직 정보 (/settings/organization)
│   ├── 채널 설정 (/settings/channels)
│   │   ├── SMS 설정
│   │   └── 카카오 비즈니스 설정
│   ├── 사용자 및 권한 (/settings/users)
│   │   ├── 팀원 초대
│   │   ├── 역할 관리
│   │   └── 권한 설정
│   ├── 쿼터 관리 (/settings/quota)
│   └── 보안 설정 (/settings/security)
├── 도움말 (/help)
│   ├── 사용 가이드 (/help/guide)
│   ├── 자주 묻는 질문 (/help/faq)
│   ├── 문의하기 (/help/contact)
│   └── 튜토리얼 (/help/tutorial)
└── 인증 (/auth)
    ├── 로그인 (/auth/login)
    ├── 회원가입 (/auth/signup)
    ├── 비밀번호 재설정 (/auth/reset-password)
    └── 이메일 인증 (/auth/verify-email)
```

## 2. User Flow (사용자 흐름)

### **핵심 작업 1: 첫 캠페인 발송**
1. 사용자가 대시보드에서 '새 캠페인' 버튼 클릭
2. 캠페인 생성 마법사 1단계로 이동 (/campaigns/create)
3. 대상 선택: 기존 연락처 그룹 선택 또는 새로운 필터 조건 설정
4. 2단계: 메시지 작성 및 개인화 변수 설정
5. 3단계: 채널 우선순위 설정 (SMS → 카카오)
6. 4단계: 예상 비용 확인 및 발송 승인
7. 캠페인 상세 페이지로 리다이렉트되어 실시간 발송 현황 모니터링
8. 발송 완료 후 성과 분석 페이지에서 결과 확인

### **핵심 작업 2: 연락처 대량 업로드 및 중복 제거**
1. 연락처 관리 메뉴에서 '가져오기' 클릭 (/contacts/import)
2. CSV/Excel 파일을 드래그 앤 드롭으로 업로드
3. 업로드 진행 상황을 프로그레스바로 확인
4. 시스템이 자동으로 중복 연락처 검출 및 병합 제안
5. 중복 제거 결과 검토 모달에서 병합 규칙 확인
6. '병합 실행' 버튼 클릭하여 최종 적용
7. 연락처 목록으로 리다이렉트되어 새로 추가된 연락처 확인

### **핵심 작업 3: 실시간 캠페인 모니터링 및 대응**
1. 발송 중인 캠페인의 상세 페이지 접속 (/campaigns/:id)
2. 실시간 대시보드에서 발송률, 성공률, 실패율 모니터링
3. 실패율 급상승 알림 Toast 메시지 확인
4. '실패 상세보기' 클릭하여 오류 원인 분석
5. 문제가 있는 연락처를 필터링하여 별도 처리
6. 필요시 캠페인 일시정지 또는 중단
7. 문제 해결 후 재발송 또는 후속 조치 실행

## 3. Navigation Structure (네비게이션 구조)

### **전역 네비게이션 (GNB)**
- **헤더 네비게이션** (상단 고정)
  - 로고 및 서비스명 (좌측)
  - 브레드크럼 (중앙)
  - 알림 아이콘 + 사용자 프로필 (우측)

### **주 네비게이션 (사이드바)**
- **대시보드** - 홈 아이콘
- **연락처** - 주소록 아이콘
  - 연락처 목록
  - 가져오기/내보내기
- **캠페인** - 메시지 아이콘
  - 캠페인 목록
  - 새 캠페인 생성
- **인박스** - 받은편지함 아이콘
- **리포트** - 차트 아이콘
- **설정** - 톱니바퀴 아이콘

### **로컬 네비게이션 (LNB)**
- 각 섹션 내 탭 네비게이션
- 필터 및 정렬 옵션
- 빠른 액션 버튼들

### **푸터 네비게이션**
- 도움말 링크
- 개인정보처리방침
- 서비스 이용약관
- 고객지원 연락처

## 4. Page Hierarchy (페이지 계층 구조)

```
/ (Depth 1)
├── /contacts (Depth 1)
│   ├── /contacts/import (Depth 2)
│   ├── /contacts/export (Depth 2)
│   └── /contacts/:id (Depth 2)
├── /campaigns (Depth 1)
│   ├── /campaigns/create (Depth 2)
│   ├── /campaigns/:id (Depth 2)
│   └── /campaigns/:id/analytics (Depth 3)
├── /inbox (Depth 1)
│   ├── /inbox/:conversationId (Depth 2)
│   └── /inbox/auto-reply (Depth 2)
├── /reports (Depth 1)
│   ├── /reports/monthly (Depth 2)
│   ├── /reports/campaigns (Depth 2)
│   ├── /reports/contacts (Depth 2)
│   └── /reports/quota (Depth 2)
├── /settings (Depth 1)
│   ├── /settings/organization (Depth 2)
│   ├── /settings/channels (Depth 2)
│   ├── /settings/users (Depth 2)
│   ├── /settings/quota (Depth 2)
│   └── /settings/security (Depth 2)
├── /help (Depth 1)
│   ├── /help/guide (Depth 2)
│   ├── /help/faq (Depth 2)
│   ├── /help/contact (Depth 2)
│   └── /help/tutorial (Depth 2)
└── /auth (Depth 1)
    ├── /auth/login (Depth 2)
    ├── /auth/signup (Depth 2)
    ├── /auth/reset-password (Depth 2)
    └── /auth/verify-email (Depth 2)
```

## 5. Content Organization (콘텐츠 구성)

| 페이지 | 주요 콘텐츠 요소 |
|---|---|
| **홈 대시보드** | KPI 카드 (발송량, 성공률, 쿼터), 최근 캠페인 테이블, 실시간 알림 리스트, 빠른 액션 버튼 |
| **연락처 목록** | 검색바, 필터 패널, 연락처 데이터 테이블, 페이지네이션, 일괄 작업 툴바 |
| **연락처 가져오기** | 파일 업로드 영역, 진행 상황 표시, 중복 검토 결과 테이블, 병합 옵션 설정 |
| **캠페인 목록** | 상태별 탭, 캠페인 카드 그리드, 검색 및 필터, 새 캠페인 생성 버튼 |
| **캠페인 생성** | 단계별 진행 표시기, 폼 입력 영역, 미리보기 패널, 이전/다음 네비게이션 |
| **캠페인 상세** | 캠페인 정보 헤더, 실시간 통계 차트, 발송 로그 테이블, 액션 버튼 그룹 |
| **캠페인 분석** | 성과 지표 대시보드, 시간별 차트, A/B 테스트 결과, 내보내기 옵션 |
| **통합 인박스** | 대화 목록 사이드바, 메시지 스레드 뷰, 답장 작성 패널, 연락처 정보 |
| **월간 리포트** | 요약 통계, 트렌드 차트, 성과 비교 테이블, PDF 다운로드 버튼 |
| **조직 설정** | 조직 정보 폼, 멤버 관리 테이블, 역할 권한 매트릭스, 초대 링크 생성 |

## 6. Interaction Patterns (인터랙션 패턴)

### **확인 모달**
- 중요한 액션 (발송, 삭제, 대량 수정) 시 2단계 확인
- 예상 결과 및 영향 범위 명시
- 취소/확인 버튼 제공

### **실시간 업데이트**
- 캠페인 발송 현황의 실시간 차트 갱신
- WebSocket 기반 라이브 데이터 스트리밍
- 상태 변경 시 Toast 알림

### **프로그레스 인디케이터**
- 파일 업로드 진행률 표시
- 대량 작업 처리 상황 모니터링
- 예상 완료 시간 표시

### **무한 스크롤**
- 연락처 목록, 메시지 히스토리에서 활용
- 성능 최적화를 위한 가상 스크롤링 적용

### **드래그 앤 드롭**
- 파일 업로드 인터페이스
- 캠페인 순서 변경
- 태그 할당 및 해제

### **툴팁 및 도움말**
- 복잡한 기능에 대한 컨텍스트 도움말
- 에러 메시지에 해결 방안 제시
- 단축키 안내

## 7. URL Structure (URL 구조)

### **일반 리소스**
- 목록: `/{resource-name}`
- 상세: `/{resource-name}/{id}`
- 생성: `/{resource-name}/create`
- 편집: `/{resource-name}/{id}/edit`

### **중첩 리소스**
- 하위 리소스: `/{parent}/{parent-id}/{child}`
- 관계 리소스: `/{parent}/{parent-id}/{child}/{child-id}`

### **액션 기반**
- 특정 작업: `/{resource}/{id}/{action}`
- 예시: `/campaigns/123/analytics`, `/contacts/import`

### **SEO 최적화**
- 한글 슬러그 지원: `/help/사용가이드`
- 카테고리 구분: `/reports/monthly`, `/settings/channels`
- 쿼리 파라미터 활용: `/contacts?tag=vip&region=seoul`

## 8. Component Hierarchy (컴포넌트 계층 구조)

### **전역 컴포넌트**
- **AppLayout**: 전체 레이아웃 래퍼
  - **Header**: 상단 네비게이션 바
    - **Logo**: 서비스 로고 및 제목
    - **Breadcrumb**: 현재 위치 표시
    - **UserMenu**: 사용자 프로필 드롭다운
    - **NotificationBell**: 알림 아이콘 및 팝오버
  - **Sidebar**: 좌측 주 네비게이션
    - **NavItem**: 개별 메뉴 항목
    - **NavGroup**: 메뉴 그룹화
  - **MainContent**: 메인 콘텐츠 영역
  - **Footer**: 하단 정보 및 링크

### **페이지별 주요 컴포넌트**

#### **대시보드 페이지**
- **StatsCard**: KPI 통계 카드
- **RecentCampaignsTable**: 최근 캠페인 테이블
- **AlertsList**: 알림 목록
- **QuotaProgress**: 쿼터 사용량 진행바

#### **연락처 관리 페이지**
- **ContactsTable**: 연락처 데이터 테이블
  - **ContactRow**: 개별 연락처 행
  - **BulkActionBar**: 일괄 작업 도구모음
- **SearchAndFilter**: 검색 및 필터 패널
  - **SearchInput**: 검색 입력 필드
  - **FilterDropdown**: 필터 드롭다운
  - **TagFilter**: 태그 필터링
- **ImportWizard**: 연락처 가져오기 마법사
  - **FileUpload**: 파일 업로드 컴포넌트
  - **DuplicateReview**: 중복 검토 테이블
  - **MergeOptions**: 병합 옵션 설정

#### **캠페인 관리 페이지**
- **CampaignCard**: 캠페인 카드
- **CampaignWizard**: 캠페인 생성 마법사
  - **AudienceSelector**: 대상 선택기
  - **MessageComposer**: 메시지 작성기
  - **ChannelSettings**: 채널 설정
  - **ReviewPanel**: 검토 패널
- **CampaignAnalytics**: 캠페인 분석 대시보드
  - **DeliveryChart**: 전달률 차트
  - **EngagementMetrics**: 참여도 지표
  - **CostBreakdown**: 비용 분석

#### **인박스 페이지**
- **ConversationsList**: 대화 목록
  - **ConversationItem**: 개별 대화 항목
- **MessageThread**: 메시지 스레드
  - **MessageBubble**: 개별 메시지 말풍선
- **ReplyPanel**: 답장 작성 패널
- **ContactInfo**: 연락처 정보 사이드바

### **공통 UI 컴포넌트**
- **Button**: 기본 버튼 (Primary, Secondary, Danger)
- **Input**: 입력 필드 (Text, Email, Tel, Password)
- **Select**: 드롭다운 선택기
- **Modal**: 모달 다이얼로그
- **Toast**: 알림 메시지
- **DataTable**: 데이터 테이블
  - **TableHeader**: 테이블 헤더
  - **TableRow**: 테이블 행
  - **TableCell**: 테이블 셀
  - **Pagination**: 페이지네이션
- **Card**: 카드 컨테이너
- **Badge**: 상태 표시 뱃지
- **ProgressBar**: 진행률 표시바
- **Chart**: 차트 컴포넌트 (Line, Bar, Pie)
- **DatePicker**: 날짜 선택기
- **FileUpload**: 파일 업로드
- **LoadingSpinner**: 로딩 스피너
- **EmptyState**: 빈 상태 표시