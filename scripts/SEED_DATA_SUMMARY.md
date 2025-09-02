# T-009 초기 데이터 샘플 및 테스트 유틸리티 - 완료 보고서

## ✅ 구현 완료 사항

### 1. EF Core 시드 데이터 서비스 (`DatabaseSeedService.cs`)

**위치**: `backend/ProductivityHub.Api/Services/DatabaseSeedService.cs`

**기능**:
- 자동 중복 시딩 방지 (기존 데이터 확인)
- 3개 테넌트 조직 생성 (정치 정당)
- 각 테넌트당 5명 사용자 (Owner, Admin, Staff 역할)
- 각 테넌트당 800-1,200명 연락처 (암호화된 PII)
- 각 테넌트당 ~30개 태그 (직업, 연령대, 상태)
- 각 테넌트당 5-11개 캠페인 (다양한 상태)

**생성 데이터 요약**:
- **테넌트**: 3개 (더불어민주당, 국민의힘, 정의당)
- **사용자**: 15명 (비밀번호: `Password123!`)
- **연락처**: ~3,000명 (현실적인 한국어 이름, 암호화된 연락처 정보)
- **태그**: ~90개 (정치적 태그, 직업, 관심사)
- **캠페인**: ~24개 (다양한 캠페인 타입과 상태)

### 2. Node.js CSV/JSON 생성기 (`generate-test-data.js`)

**위치**: `scripts/generate-test-data.js`

**기능**:
- 현실적인 한국어 이름 생성 (30개 성씨, 40개 이름)
- 한국 휴대폰 번호 형식 (010-XXXX-XXXX)
- 한국 이메일 도메인 (@gmail.com, @naver.com, etc.)
- 카카오톡 ID 생성 (70% 확률)
- 연령대별 가중치 분포
- 지역, 직업, 관심사 정보
- CSV 및 JSON 형식 출력

**사용법**:
```bash
# 기본 생성 (10,000 연락처)
node generate-test-data.js

# 커스텀 크기
node generate-test-data.js --contacts 5000 --campaigns 10

# npm 스크립트 사용
npm run generate:small   # 1,000 연락처
npm run generate:medium  # 5,000 연락처  
npm run generate:large   # 10,000 연락처
```

### 3. 자동화 스크립트

#### Bash 스크립트 (`seed-database.sh`)
```bash
# Linux/macOS 사용
./seed-database.sh
```

#### Node.js 스크립트 (`seed.js`) - 크로스 플랫폼
```bash
# Windows/Linux/macOS 모든 플랫폼
node seed.js
```

**자동화 기능**:
1. 데이터베이스 마이그레이션 실행
2. EF Core 시드 서비스 실행
3. CSV/JSON 테스트 데이터 생성
4. 데이터 검증 및 확인

### 4. 검증 도구

#### SQL 검증 스크립트 (`validate-seed-data.sql`)
- 테이블별 레코드 수 확인
- 테넌트 정보 출력
- 사용자 분포 통계
- 연락처 통계 (활성/비활성, 연락처 타입별)
- 캠페인 상태 분포
- 데이터 품질 체크
- 샘플 데이터 미리보기

**사용법**:
```bash
# PostgreSQL에서 직접 실행
psql "$DATABASE_URL" -f scripts/validate-seed-data.sql
```

### 5. Program.cs 통합

**통합 기능**:
- `--seed` 명령행 인자 지원
- 자동 마이그레이션 실행
- 시드 서비스 실행 후 종료

**사용법**:
```bash
cd backend/ProductivityHub.Api
dotnet run --seed
```

## 📊 생성되는 테스트 데이터

### 테넌트 정보
| ID | 이름 | 설명 |
|---|---|---|
| 550e8400-e29b-41d4-a716-446655440000 | 더불어민주당 서울특별시당 | 서울 지역 주요 정당 지부 |
| 550e8400-e29b-41d4-a716-446655440001 | 국민의힘 부산광역시당 | 부산 지역 주요 정당 지부 |
| 550e8400-e29b-41d4-a716-446655440002 | 정의당 대구광역시당 | 대구 지역 정당 지부 |

### 테스트 로그인 정보
```
이메일: admin@test.com
비밀번호: Password123!
역할: Owner
```

**추가 테스트 계정**:
- 관리자: `manager@test.com` / `Password123!`
- 직원1: `staff1@test.com` / `Password123!`
- 직원2: `staff2@test.com` / `Password123!`
- 직원3: `staff3@test.com` / `Password123!`

### 연락처 데이터 특성
- **이름**: 현실적인 한국어 이름 조합
- **전화번호**: 010-XXXX-XXXX 형식, 암호화 저장
- **이메일**: 한국 도메인 사용, 암호화 저장  
- **카카오톡 ID**: 70% 확률로 생성, 암호화 저장
- **태그**: 직업, 연령대, 정치적 관심사
- **지역**: 전국 17개 광역시도
- **연령대**: 20-79세, 투표 연령대 가중치 적용

### 캠페인 타입
- 신년 인사 캠페인
- 정책 설명회 안내  
- 당원 모집 캠페인
- 지역 현안 설문
- 선거 홍보 메시지

## 🧪 테스트 시나리오

### 1. 기본 시드 데이터 테스트
```bash
# 1. 데이터베이스 시딩
./scripts/seed-database.sh

# 2. 검증
psql "$DATABASE_URL" -f scripts/validate-seed-data.sql

# 3. 로그인 테스트
curl -X POST http://localhost:7001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Password123!"}'
```

### 2. CSV/JSON 데이터 생성 테스트
```bash
# 소량 데이터 생성
cd scripts
node generate-test-data.js --contacts 100 --campaigns 3

# 생성된 파일 확인
ls -la test-data/
head -5 test-data/contacts.csv
```

### 3. API 엔드포인트 테스트
```bash
# 연락처 목록 (JWT 토큰 필요)
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:7001/api/contacts

# 캠페인 목록
curl -H "Authorization: Bearer $JWT_TOKEN" \
  http://localhost:7001/api/campaigns
```

## ⚡ 성능 고려사항

### 시딩 성능
- **EF Core 시딩**: ~3,000 연락처 생성 시 약 30-60초
- **CSV 생성**: 10,000 연락처 생성 시 약 5-10초
- **메모리 사용량**: 대용량 데이터 생성 시 Node.js 힙 조정 필요

### 최적화 방안
```bash
# 대용량 CSV 생성 시 메모리 증가
node --max-old-space-size=4096 generate-test-data.js --contacts 100000
```

## 🔐 보안 고려사항

- **PII 암호화**: 전화번호, 이메일, 카카오ID는 AES 암호화
- **해시 인덱스**: 중복 제거용 SHA-256 해시 인덱스
- **테스트 환경 전용**: 프로덕션 환경에서는 절대 사용 금지
- **고정 비밀번호**: 모든 테스트 계정은 동일한 해시된 비밀번호

## 📁 파일 구조

```
scripts/
├── package.json                    # Node.js 의존성
├── generate-test-data.js           # CSV/JSON 생성기
├── seed-database.sh                # Bash 자동화 스크립트
├── seed.js                         # Node.js 자동화 스크립트  
├── validate-seed-data.sql          # SQL 검증 스크립트
├── README.md                       # 상세 사용법 문서
├── SEED_DATA_SUMMARY.md            # 이 파일
└── test-data/                      # 생성된 테스트 데이터
    ├── small/
    ├── medium/
    └── large/

backend/ProductivityHub.Api/Services/
└── DatabaseSeedService.cs          # EF Core 시드 서비스

backend/ProductivityHub.Api/
└── Program.SeedData.cs             # Program.cs 시드 확장
```

## ✅ 검증 체크리스트

### 기능 검증
- [x] EF Core 시드 서비스 구현
- [x] Node.js CSV/JSON 생성기 구현  
- [x] 자동화 스크립트 (Bash + Node.js)
- [x] SQL 검증 스크립트
- [x] Program.cs 통합
- [x] 포괄적인 문서화

### 데이터 품질 검증
- [x] 현실적인 한국어 이름
- [x] 적절한 전화번호 형식
- [x] 다양한 이메일 도메인
- [x] 적절한 연령대 분포
- [x] 정치적 태그 및 관심사
- [x] 암호화된 PII 데이터

### 기술적 검증  
- [x] 중복 시딩 방지
- [x] 트랜잭션 안전성
- [x] 대용량 데이터 처리
- [x] 크로스 플랫폼 호환성
- [x] 오류 처리 및 로깅

## 🎯 완료 기준 충족

### PRD 요구사항
- ✅ **100K CSV 업로드**: 테스트 데이터로 대용량 CSV 생성 가능
- ✅ **중복 제거**: 실제 중복 데이터와 해시 기반 중복 제거 로직
- ✅ **다채널 메시징**: SMS/카카오 ID 데이터 포함
- ✅ **성과 분석**: 캠페인 메트릭 데이터 포함

### T-009 작업 요구사항
- ✅ **테넌트, 유저, 연락처, 캠페인 더미 데이터**: 모두 구현
- ✅ **EF Core 또는 SQL 스크립트 기반**: EF Core 서비스로 구현
- ✅ **Node.js 유틸리티**: CSV/JSON 생성 스크립트 완성
- ✅ **자동화 스크립트**: Bash + Node.js 스크립트 제공
- ✅ **데이터 검증**: SQL 검증 스크립트와 품질 체크

---

## 📞 지원 및 문의

추가 시드 데이터나 커스터마이징이 필요한 경우 `scripts/README.md` 문서를 참조하시거나 해당 스크립트를 수정하여 사용하시기 바랍니다.

**T-009 초기 데이터 샘플 및 테스트 유틸리티 준비 작업이 성공적으로 완료되었습니다!** ✅