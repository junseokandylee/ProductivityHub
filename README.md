# Political Productivity Hub

현역 국회의원·예비후보 캠프가 선거 기간에 100K+ 유권자에게 SMS·카카오 메시지를 정확‧신속하게 발송하고 성과를 분석할 수 있는 웹 기반 허브입니다.

## 프로젝트 구조

```
/
├── frontend/          # Next.js 15 Frontend
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
├── backend/           # .NET 9 Minimal API Backend
│   ├── ProductivityHub.Api/
│   ├── ProductivityHub.sln
│   └── ...
├── vooster-docs/      # 프로젝트 문서
├── package.json       # 모노레포 루트 설정
└── README.md
```

## 기술 스택

### Frontend
- [Next.js 15](https://nextjs.org) - React 프레임워크
- [TypeScript](https://www.typescriptlang.org) - 타입 안정성
- [Tailwind CSS](https://tailwindcss.com) - 유틸리티 CSS
- [Shadcn UI](https://ui.shadcn.com) - 컴포넌트 라이브러리
- [React Query](https://tanstack.com/query/latest) - 서버 상태 관리
- [React Hook Form](https://react-hook-form.com) - 폼 관리
- [Zod](https://zod.dev) - 스키마 유효성 검증

### Backend
- [.NET 9](https://dotnet.microsoft.com) - Minimal API
- [Entity Framework Core](https://docs.microsoft.com/ef/core/) - ORM
- [MediatR](https://github.com/jbogard/MediatR) - CQRS 패턴
- [PostgreSQL 16](https://www.postgresql.org) - 데이터베이스 (리모트)
- [Redis](https://redis.io) - 캐싱 및 메시지 큐 (리모트)

## Getting Started

### 전체 개발 환경 시작

```bash
# 모든 의존성 설치
npm run install:all

# 프론트엔드와 백엔드 동시 개발 서버 실행
npm run dev
```

### 개별 서비스 실행

#### Frontend 개발 서버
```bash
npm run dev:frontend
# 브라우저에서 http://localhost:3000 확인
```

#### Backend 개발 서버
```bash
npm run dev:backend
# API는 http://localhost:5000에서 실행
```

### 빌드 및 테스트

```bash
# 전체 빌드
npm run build

# 전체 테스트
npm run test

# 코드 품질 검사
npm run lint
npm run typecheck
```

## 환경 설정

### 환경 변수 설정

루트 `.env` 파일을 생성하고 다음 변수들을 설정하세요:

```bash
# Database
DATABASE_CONNECTION_STRING="Host=your-postgres-host;Database=productivity_hub;Username=your-username;Password=your-password"

# Redis
REDIS_CONNECTION_STRING="your-redis-host:6379"

# JWT
JWT_SECRET="your-jwt-secret"
JWT_ISSUER="political-productivity-hub"
JWT_AUDIENCE="political-productivity-hub"

# SMS/Kakao API Keys
SMS_API_KEY="your-sms-api-key"
KAKAO_API_KEY="your-kakao-api-key"
```

## 주요 기능

### 연락처 허브
- CSV/Excel 업로드 (100K 레코드)
- 중복 매칭 및 자동 병합
- 태그·필터·검색 (<150ms p95)
- 커뮤니케이션 이력 타임라인

### 다채널 메시징 허브
- 통합 인박스 (SMS·카카오)
- 캠페인 발송 마법사
- 채널 우선순위·폴백
- 실시간 발송 모니터링

### 성과 분석 & 쿼터 관리
- 발송 수·성공률·열람률 대시보드
- 월간 쿼터 현황 & 하드 스톱

### 관리 & 보안
- 테넌트별 RLS
- 역할 기반 접근 제어 (Owner/Admin/Staff)
- PII 컬럼 암호화

## 사용 가능한 명령어

```bash
# 개발
npm run dev              # 전체 개발 서버 실행
npm run dev:frontend     # 프론트엔드만 실행
npm run dev:backend      # 백엔드만 실행

# 빌드
npm run build           # 전체 빌드
npm run build:frontend  # 프론트엔드 빌드
npm run build:backend   # 백엔드 빌드

# 테스트 및 품질
npm run test            # 전체 테스트
npm run lint            # 코드 스타일 검사
npm run typecheck       # 타입 검사

# 유틸리티
npm run install:all     # 모든 의존성 설치
npm run clean           # 빌드 파일 정리
```

## 개발 가이드

자세한 개발 가이드는 `vooster-docs/` 폴더의 문서들을 참고하세요:
- 아키텍처 설계
- 코딩 가이드라인
- 디자인 가이드
- 단계별 구현 가이드
