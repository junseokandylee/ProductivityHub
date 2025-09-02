# 테스트 데이터 생성 및 시딩 도구

정치 생산성 허브를 위한 더미 데이터 생성 및 데이터베이스 시딩 유틸리티입니다.

## 📋 개요

이 디렉토리는 개발 및 테스트를 위한 현실적인 한국어 데이터를 생성하고 데이터베이스에 시딩하는 도구들을 포함합니다.

## 🛠 포함된 도구

### 1. EF Core 시드 서비스 (`DatabaseSeedService.cs`)
- **위치**: `../backend/ProductivityHub.Api/Services/DatabaseSeedService.cs`
- **기능**: Entity Framework Core를 사용한 데이터베이스 직접 시딩
- **데이터**: 테넌트, 사용자, 연락처, 캠페인, 태그
- **사용법**: `dotnet run --seed`

### 2. Node.js 데이터 생성기 (`generate-test-data.js`)
- **기능**: CSV 및 JSON 형식의 테스트 데이터 파일 생성
- **특징**: 
  - 현실적인 한국어 이름 및 데이터
  - 다양한 연령대, 직업, 관심사
  - 정치적 태그 및 카테고리
  - 암호화된 PII 데이터 시뮬레이션

### 3. 자동화 스크립트
- **Bash 스크립트**: `seed-database.sh` (Linux/macOS)
- **Node.js 스크립트**: `seed.js` (크로스 플랫폼)

## 🚀 사용법

### 빠른 시작 (권장)

```bash
# 전체 시딩 프로세스 실행
./seed-database.sh

# 또는 Node.js 스크립트 사용
node seed.js
```

### 개별 도구 사용

#### 1. EF Core 직접 시딩
```bash
cd ../backend/ProductivityHub.Api
dotnet ef database update  # 마이그레이션 적용
dotnet run --seed          # 데이터 시딩
```

#### 2. CSV/JSON 데이터 생성
```bash
# 의존성 설치
npm install

# 기본 데이터 생성 (10,000 연락처, 20 캠페인)
node generate-test-data.js

# 사용자 정의 크기
node generate-test-data.js --contacts 5000 --campaigns 10

# 특정 형식만 생성
node generate-test-data.js --format csv
node generate-test-data.js --format json

# 다양한 크기 프리셋
npm run generate:small   # 1,000 연락처
npm run generate:medium  # 5,000 연락처  
npm run generate:large   # 10,000 연락처
```

## 📊 생성되는 데이터

### EF Core 시딩 데이터

#### 테넌트 (3개)
- 더불어민주당 서울특별시당
- 국민의힘 부산광역시당
- 정의당 대구광역시당

#### 사용자 (각 테넌트당 5명)
- **Owner**: 김철수 (kim.chulsoo.더불어민주당@party.kr)
- **Admin**: 이영희
- **Staff**: 박민수, 정수연, 최현우
- **비밀번호**: `Password123!` (모든 사용자)

#### 연락처 (각 테넌트당 800-1,200명)
- 현실적인 한국어 이름 (성씨 30개, 이름 40개)
- 휴대폰 번호 (010-XXXX-XXXX 형식)
- 이메일 주소 (다양한 한국 도메인)
- 카카오톡 ID (70% 확률로 생성)
- 암호화된 PII 데이터
- 연령대별 가중치 분포
- 지역, 직업, 관심사 정보

#### 태그 (각 테넌트당 ~30개)
- 직업: VIP, 후원자, 당원, 자원봉사자, 언론인, 공무원, 기업인
- 연령대: 청년, 시니어
- 특성: 여성, 장애인, 농어민, 상인, 교육관계자, 의료진
- 상태: 1차 접촉, 2차 접촉, 관심 있음, 적극 지지

#### 캠페인 (각 테넌트당 5-11개)
- 신년 인사 캠페인
- 정책 설명회 안내
- 당원 모집 캠페인
- 지역 현안 설문
- 선거 홍보 메시지
- 다양한 상태: Draft, Queued, Processing, Sending, Completed

### CSV/JSON 테스트 데이터

#### 크기별 데이터셋
- **Small**: 1,000 연락처, 5 캠페인
- **Medium**: 5,000 연락처, 15 캠페인
- **Large**: 10,000 연락처, 25 캠페인

#### 파일 구조
```
test-data/
├── small/
│   ├── contacts.csv
│   ├── contacts.json
│   ├── campaigns.csv
│   ├── campaigns.json
│   └── combined-data.json
├── medium/
└── large/
```

## 🔧 커스터마이징

### 데이터 양 조정
```javascript
// generate-test-data.js 상단 설정 수정
const DEFAULT_CONTACTS_COUNT = 10000;  // 기본 연락처 수
```

### 한국어 이름 추가
```javascript
const koreanNames = {
    lastNames: ['김', '이', '박', '최', ...],  // 성씨 추가
    firstNames: {
        male: ['민수', '철수', ...],           // 남성 이름 추가
        female: ['영희', '수연', ...]          // 여성 이름 추가
    }
};
```

### 새로운 태그 카테고리
```csharp
// DatabaseSeedService.cs의 CreateTagsAsync 메서드에서
var tagNames = new[]
{
    "VIP", "후원자", "당원", // 기존 태그들
    "새로운태그1", "새로운태그2"  // 추가 태그들
};
```

## 🧪 테스트 및 검증

### 데이터 검증 쿼리
```sql
-- 시딩된 데이터 확인
SELECT 'tenants' as table_name, COUNT(*) as count FROM tenants
UNION ALL
SELECT 'users' as table_name, COUNT(*) as count FROM users  
UNION ALL
SELECT 'contacts' as table_name, COUNT(*) as count FROM contacts
UNION ALL
SELECT 'campaigns' as table_name, COUNT(*) as count FROM campaigns
UNION ALL
SELECT 'tags' as table_name, COUNT(*) as count FROM tags;
```

### 연락처 태그 분포 확인
```sql
-- 태그별 연락처 수
SELECT t.name, COUNT(ct.contact_id) as contact_count
FROM tags t
LEFT JOIN contact_tags ct ON t.id = ct.tag_id
GROUP BY t.name
ORDER BY contact_count DESC;
```

## 📝 로그 및 디버깅

### 시딩 로그 확인
```bash
# EF Core 시딩 로그
dotnet run --seed --verbosity diagnostic

# CSV 생성 진행상황
node generate-test-data.js --contacts 50000  # 대용량 데이터 시 진행상황 표시
```

### 일반적인 문제 해결

#### 1. 데이터베이스 연결 오류
```bash
# 환경변수 확인
echo $DATABASE_URL
echo $ConnectionStrings__DefaultConnection
```

#### 2. 중복 시딩 방지
- `DatabaseSeedService`는 자동으로 기존 데이터를 확인하고 건너뜁니다
- 강제로 재시딩하려면 데이터베이스를 초기화하세요

#### 3. 메모리 부족
```bash
# Node.js 힙 메모리 증가
node --max-old-space-size=4096 generate-test-data.js --contacts 100000
```

## 🔐 보안 고려사항

- **PII 데이터**: 연락처의 전화번호, 이메일, 카카오ID는 데모용 암호화됩니다
- **비밀번호**: 모든 테스트 사용자는 동일한 해시된 비밀번호를 사용합니다
- **테스트 전용**: 이 도구들은 개발/테스트 환경에서만 사용하세요

## 📈 성능 최적화

### 대용량 데이터 생성
- 10만 개 이상의 연락처 생성 시 배치 처리 사용
- 메모리 사용량 모니터링
- 데이터베이스 연결 풀 크기 조정

### 인덱스 최적화
- 시딩 후 데이터베이스 분석 통계 업데이트: `ANALYZE;`
- 인덱스 사용률 확인: `pg_stat_user_indexes`

## 🤝 기여하기

새로운 데이터 타입이나 개선사항을 추가하려면:

1. 기존 패턴을 따르세요
2. 한국어 현지화를 유지하세요  
3. 테스트 데이터의 현실성을 확인하세요
4. 성능 영향을 고려하세요

---

**참고**: 이 도구들은 개발 및 테스트 목적으로만 사용하며, 프로덕션 환경에서는 사용하지 마세요.