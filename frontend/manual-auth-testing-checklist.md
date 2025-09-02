# Manual Authentication Testing Checklist

## Quick Testing Guide for Authentication Flows

### Pre-requisites
- Frontend server running on `http://localhost:3000`
- Backend API server running
- Test browser with developer tools access

---

## 🔐 Login Page Testing (`/auth/login`)

### Basic Functionality
- [ ] **Page loads correctly** - Logo, title "정치생산성허브", login form visible
- [ ] **Email field validation**
  - [ ] Empty email shows: "올바른 이메일 주소를 입력해주세요"
  - [ ] Invalid email format shows same error
  - [ ] Valid email accepted
- [ ] **Password field validation**
  - [ ] Empty password shows: "비밀번호는 최소 6자 이상이어야 합니다"
  - [ ] Short password (< 6 chars) shows same error
  - [ ] Valid password accepted
- [ ] **Password visibility toggle**
  - [ ] Click eye icon to show/hide password
  - [ ] Field type changes between "password" and "text"
- [ ] **Remember me checkbox** - Can be checked/unchecked
- [ ] **Submit button** - Shows loading state during submission

### Navigation Links
- [ ] **"비밀번호 찾기"** links to `/auth/reset-password`
- [ ] **"회원가입"** links to `/auth/signup`
- [ ] **Footer links** (이용약관, 개인정보처리방침) work

### SSO Options
- [ ] **Google 로그인 버튼** present and clickable
- [ ] **카카오 로그인 버튼** present and clickable

### Error Handling
- [ ] **Server errors** display in red alert box
- [ ] **Network errors** handled gracefully
- [ ] **URL error parameters** display correctly:
  - `?error=unauthorized` → "로그인이 필요한 페이지입니다"
  - `?error=expired` → "세션이 만료되었습니다"

---

## 📝 Signup Page Testing (`/auth/signup`)

### Tab Navigation
- [ ] **"초대 코드" tab** active by default
- [ ] **"신규 조직" tab** switches correctly
- [ ] **Tab content** changes appropriately

### Invite Code Signup Tab
- [ ] **Invite code field** - Required, shows error if empty
- [ ] **Name field** - Min 2 characters validation
- [ ] **Email field** - Email format validation
- [ ] **Password field** - Min 8 characters validation
- [ ] **Confirm password** - Must match password
- [ ] **Terms checkboxes** - Both required, show links
- [ ] **Submit button** shows "가입 중..." when loading

### Organization Signup Tab
- [ ] **Organization name** - Min 2 characters required
- [ ] **Organization type dropdown** - Shows 3 options with descriptions
- [ ] **Contact name** - Min 2 characters validation
- [ ] **Email** - Format validation
- [ ] **Phone number** - Min 10 characters validation
- [ ] **Password fields** - Same validation as invite tab
- [ ] **Terms agreement** - Required checkboxes
- [ ] **Marketing checkbox** - Optional

### Special Features
- [ ] **Auto-fill from URL**: `/auth/signup?invite=TEST123` fills invite code
- [ ] **Tab auto-switch**: URL with invite parameter switches to invite tab

---

## 🔑 Reset Password Testing (`/auth/reset-password`)

### Request Reset State
- [ ] **Email field** - Format validation required
- [ ] **"재설정 링크 보내기" button** - Shows loading state
- [ ] **Pre-fill from URL**: `?email=test@example.com` fills email field

### Email Sent State
- [ ] **Confirmation message** displays email address
- [ ] **"다시 전송하기" button** available
- [ ] **"로그인으로 돌아가기" button** works

### Reset Form State (with token)
- [ ] **URL with token**: `?token=abc123` shows reset form
- [ ] **New password field** - Min 8 characters
- [ ] **Confirm password** - Must match
- [ ] **Password requirements** info displayed
- [ ] **Toggle password visibility** works on both fields
- [ ] **"비밀번호 변경" button** shows loading state

---

## 📧 Email Verification Testing (`/auth/verify-email`)

### Loading State
- [ ] **Spinner animation** shows during verification
- [ ] **Email address** displayed if provided in URL
- [ ] **"계정을 활성화하고 있습니다..."** message

### Success State
- [ ] **Green checkmark** and success message
- [ ] **Auto-redirect countdown** (3 seconds)
- [ ] **Success toast** notification appears

### Error States
- [ ] **No parameters** → Shows "유효하지 않은 인증 링크입니다"
- [ ] **Invalid token** → Shows error state with resend option
- [ ] **Expired token** → Shows "링크 만료됨" message

### Resend Functionality
- [ ] **Countdown timer** (60 seconds) before resend enabled
- [ ] **"새 인증 링크 받기" button** works after countdown
- [ ] **Loading state** during resend request

---

## 🔗 Deep-Link Parameter Testing

### Test URLs to Verify
1. **Login with next**: `/auth/login?next=/dashboard/analytics`
2. **Signup with next**: `/auth/signup?next=/contacts&invite=TEST123`
3. **Reset with next**: `/auth/reset-password?next=/settings&email=test@example.com`

### Verification Steps
- [ ] **Parameter preserved** in page URL
- [ ] **Links maintain parameter**: Click between auth pages
- [ ] **Form submissions preserve**: Submit forms with errors
- [ ] **SSO buttons include**: Check href attributes or click handlers

### Test Next Parameter Values
- [ ] **Simple path**: `/dashboard`
- [ ] **Path with query**: `/analytics?tab=overview`
- [ ] **Complex URL**: `/reports?start=2024-01-01&end=2024-12-31&type=campaign`
- [ ] **Security test**: `javascript:alert(1)` should NOT execute

---

## 📱 Responsive Design Testing

### Viewport Tests
- [ ] **Mobile (375px width)**:
  - All elements visible and usable
  - Touch targets minimum 44px
  - No horizontal scrolling
  - Forms stack vertically
- [ ] **Tablet (768px width)**:
  - Optimal layout utilization
  - Comfortable spacing
  - Good readability
- [ ] **Desktop (1920px width)**:
  - Centered layout
  - Proper max-width constraints
  - Good use of whitespace

### Zoom Testing
- [ ] **50% zoom** - Everything remains legible
- [ ] **150% zoom** - No layout breaking
- [ ] **200% zoom** - Core functionality accessible

---

## ♿ Accessibility Testing

### Keyboard Navigation
- [ ] **Tab order** logical through form elements
- [ ] **Focus indicators** visible on all interactive elements
- [ ] **Enter key** submits forms
- [ ] **Escape key** dismisses any modals/dropdowns
- [ ] **Skip links** if present

### Screen Reader Testing
- [ ] **Form labels** properly associated with inputs
- [ ] **Error messages** announced when they appear
- [ ] **Loading states** communicated to screen readers
- [ ] **Landmarks** properly defined (main, form, etc.)

### Visual Accessibility
- [ ] **Color contrast** sufficient for text/background combinations
- [ ] **Focus indicators** have sufficient contrast
- [ ] **Error states** not communicated by color alone
- [ ] **Icons** have text alternatives

---

## 🇰🇷 Korean Localization Testing

### Text Display
- [ ] **All labels** display in Korean
- [ ] **Error messages** in Korean with proper grammar
- [ ] **Button text** in Korean
- [ ] **Help text** and instructions in Korean
- [ ] **Toast notifications** in Korean

### Input Testing
- [ ] **Korean text input** in name fields works correctly
- [ ] **Korean organization names** accepted and stored properly
- [ ] **Mixed Korean/English** in email fields handled correctly
- [ ] **IME (Input Method Editor)** compatibility

### Cultural Appropriateness
- [ ] **Formal language** (존댓말) used appropriately
- [ ] **Cultural context** appropriate for Korean users
- [ ] **Date/time formats** if any displayed

---

## 🔒 Security Testing

### Input Security
- [ ] **XSS prevention**: Try `<script>alert('xss')</script>` in form fields
- [ ] **SQL injection**: Try `'; DROP TABLE users; --` in text fields
- [ ] **URL parameter sanitization**: Malicious next parameters handled

### Data Exposure
- [ ] **Password not visible** in DOM when hidden
- [ ] **Sensitive data** not logged to console
- [ ] **Network requests** don't expose passwords in plain text
- [ ] **Error messages** don't reveal system information

---

## 🚀 Performance Testing

### Page Load
- [ ] **Initial page load** < 3 seconds
- [ ] **Form interactions** responsive (< 100ms feedback)
- [ ] **Navigation between pages** smooth
- [ ] **No memory leaks** during extended use

### Network Handling
- [ ] **Offline behavior** graceful (show appropriate message)
- [ ] **Slow network** doesn't break functionality
- [ ] **Request retries** for transient failures

---

## 📝 Test Results Template

```
Test Date: ___________
Tester: ______________
Browser: _____________
Device: ______________

✅ PASSED TESTS:
- [ ] Login page functionality
- [ ] Signup page functionality
- [ ] Reset password flow
- [ ] Email verification
- [ ] Deep-link preservation
- [ ] Responsive design
- [ ] Accessibility
- [ ] Korean localization
- [ ] Security measures
- [ ] Performance

❌ FAILED TESTS:
(List any failures with details)

🟡 ISSUES FOUND:
(List any minor issues or improvements)

NOTES:
(Any additional observations)
```

---

## 🔧 Developer Tools Testing

### Console Checks
- [ ] **No JavaScript errors** in console
- [ ] **No network request failures** (except expected auth failures)
- [ ] **No accessibility warnings** (use axe-core browser extension)
- [ ] **Performance timing** reasonable (use Lighthouse)

### Network Tab Verification
- [ ] **Form submissions** use correct HTTP methods
- [ ] **Request headers** include necessary authentication
- [ ] **Response handling** appropriate for different status codes
- [ ] **Request payloads** properly formatted

This checklist should be executed in different browsers (Chrome, Firefox, Safari, Edge) and on different devices for comprehensive coverage.