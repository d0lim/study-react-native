# Grow Farm Service - PoC Design Spec

## Overview

올팜 스타일의 식물 키우기 서비스. 사용자가 식물을 키우고, 수확한 열매로 재화를 모아 상점에서 아이템을 교환하는 구조. 바이럴 초대 시스템과 광고 기반 수익화를 포함한다.

## Core Loop

```
씨앗 심기 → 성장 (실시간 + 행동 가속) → 수확 → 랜덤 열매 획득 → 재화 적립 → 상점 교환 → 다시 심기
```

### 성장 모델

- **혼합형**: 실시간으로 천천히 성장 + 사용자 행동으로 가속
- **성장 단계**: 씨앗 → 새싹 → 성장 → 개화 → 열매 (5단계)
- **소요 시간**: 행동 없이 ~24시간, 적극 행동 시 ~6시간 (조정 가능)
- **식물 종류**: PoC에서는 1종류

### 행동

| 행동 | 조건 | 효과 |
|------|------|------|
| 물주기 | 보상형 광고 시청 | 성장 +1시간 가속 |
| 비료 주기 | 보상형 광고 시청 | 성장 +3시간 가속 |

### 수확

- 열매 단계 도달 시 수확 가능
- 서버에서 열매 종류와 가치를 랜덤 결정
- 열매 등급: 일반 / 희귀 / 전설
- 수확 후 새 씨앗 심기 가능

### 성장 계산 공식 (서버)

```
경과시간 = (현재시각 - 심은시각) + 누적가속시간
현재단계 = 경과시간에 해당하는 단계
```

## Viral / Invite System

### 흐름

```
초대자가 공유 링크 생성 → 친구가 링크 클릭 → 앱 설치/실행 → 초대 코드 자동 인식 → 양쪽에 즉시 보너스 지급
```

### 구현

- Expo Router 딥링크 처리 (`expo-linking`)
- 링크 형태: `https://app.example.com/invite/{inviteCode}`
- Supabase Edge Function에서 초대 코드 검증 + 보너스 지급
- 중복 초대 방지: 1인당 1회만 수령
- 보너스: 재화, 부스트, 또는 특별 아이템 (밸런싱 시 결정)

## Shop / Reward System

### 가상 재화

- 열매 수확 시 등급에 따라 재화 적립
  - 일반: 10, 희귀: 50, 전설: 200 (조정 가능)
- 서버에서 잔액 관리, 클라이언트는 조회만

### 상점 아이템 (PoC)

| 카테고리 | 예시 |
|----------|------|
| 화분 스킨 | 식물 화분 외형 변경 |
| 배경 스킨 | 화면 배경 변경 |

### 교환 흐름

```
상점 진입 → 아이템 선택 → 재화 차감 (서버 검증) → 아이템 적용
```

### 향후 확장

- 기프티콘/쿠폰 교환 카테고리 추가

## Technical Architecture

### Client — React Native + Expo SDK 54

- **라우팅**: Expo Router (파일 기반)
- **화면**: 메인(식물), 상점, 내 아이템, 초대
- **식물 시각화**: 단계별 이미지 교체 (애니메이션은 PoC 후 고도화)
- **광고**: `react-native-google-mobile-ads` (보상형 광고)

### Server — Supabase

- **Auth**: 소셜 로그인 (Google / Apple)

#### Database Schema

| 테이블 | 용도 | 주요 컬럼 |
|--------|------|-----------|
| `users` | 유저 정보 | id, balance (재화 잔액), created_at |
| `plants` | 현재 식물 상태 | id, user_id, planted_at, boost_seconds, stage, harvested |
| `harvests` | 수확 이력 | id, user_id, plant_id, fruit_type, grade, reward_amount, created_at |
| `items` | 보유 아이템 | id, user_id, item_type, item_id, created_at |
| `invites` | 초대 코드 | id, inviter_id, invite_code, used_by, used_at |

#### Edge Functions

| Function | 역할 |
|----------|------|
| `water` | 물주기 — 광고 시청 검증 + boost_seconds 증가 |
| `fertilize` | 비료 주기 — 광고 시청 검증 + boost_seconds 증가 |
| `harvest` | 성장 완료 확인 + 랜덤 열매 결정 + 재화 적립 |
| `purchase` | 재화 차감 + 아이템 지급 |
| `invite` | 초대 코드 검증 + 양쪽 보너스 지급 |
| `get-plant-status` | 현재 성장 상태 계산 반환 |

### Architecture Approach

- **서버 중심**: 핵심 로직(성장 계산, 수확, 재화, 교환)을 모두 서버에서 처리
- **이유**: 재화가 실제 리워드로 이어지므로 치팅 방지 필수
- **클라이언트**: 상태 표시 + 액션 트리거만 담당

## Monetization

- **보상형 광고 (Rewarded Ads)**: 물주기/비료 주기 시 광고 시청 필수
- 향후 확장: 부스트 광고, 부활 광고, 바이럴 연계 광고

## PoC Scope

### 포함

- 식물 1종 키우기 (5단계 성장)
- 실시간 + 행동 가속 성장 모델
- 보상형 광고 → 물주기/비료 주기
- 수확 → 랜덤 열매 → 재화 적립
- 상점 (화분/배경 스킨)
- 딥링크 초대 + 즉시 보너스 지급
- Supabase Auth (소셜 로그인)

### 미포함 (향후 확장)

- 성장 애니메이션 고도화
- 식물 종류 추가
- 기프티콘/쿠폰 연동
- 부스트/부활 광고
- 푸시 알림
