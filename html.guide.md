# [프로젝트 이름] 디자인 구현 프롬프트

이 프롬프트를 사용하여 HTML/CSS로 된 웹 애플리리케이션 UI를 생성하십시오. 최종 결과물은 제공된 이미지의 레이아웃, 아이콘 및 텍스트를 정확하게 복제해야 합니다.

## HTML 구조 (Semantic HTML 사용)

*   `**<div class="phone-frame">**`: 전체 스마트폰 모형을 감싸는 div.
    *   `**<div class="screen">**`: 스마트폰 내부 화면을 감싸는 div.
        *   `**<div class="top-status-bar">**`: 시간, 배터리 아이콘 등.
        *   `**<header class="main-header">**`: 날짜, 제목, 캘린더 아이콘.
        *   `**<nav class="calendar-nav">**`: 캘린더 뷰.
            *   `**<ul class="calendar-grid">**`: 날짜 동그라미 목록.
        *   `**<main class="main-content">**`: 루틴 그리드 영역.
            *   `**<div class="routine-grid">**`: 3x3 루틴 카드 목록.
                *   `**<div class="routine-card">**`: 개별 루틴 카드.
                    *   `**<p class="routine-time">**` (일부 카드에만).
                    *   `**<p class="routine-text">**` (일부 카드에만).
                    *   `**<img class="routine-icon" />**`.
                    *   `**<div class="checkmark-popup">**` (일부 카드에만).
        *   `**<footer class="bottom-nav">**`: 하단 내비게이션 바.
            *   `**<ul class="nav-links">**`: 아이콘 목록.

## CSS 스타일링 가이드

1.  **레이아웃:**
    *   Flexbox 및 Grid 레이아웃을 적극 활용하여 정확한 그리드를 구현하십시오.
    *   `phone-frame`은 중앙에 배치하고, `screen`은 overflow를 숨겨 내부 스크롤을 방지하십시오.
    *   `routine-grid`는 `grid-template-columns: repeat(3, 1fr)`를 사용하십시오.

2.  **색상 및 변수 (사용자 지정 예정):**
    *   **중요:** 색상 코드를 직접 사용하지 말고, CSS 사용자 지정 속성(변수)을 사용하여 나중에 쉽게 변경할 수 있도록 하십시오. 예: `--color-main-text`, `--color-accent`, `--color-card-bg-1`.
    *   텍스트 및 테두리: 짙은 회색/검정.
    *   강조색: 녹색.
    *   카드 배경: 파스텔 톤.

3.  **아이콘:**
    *   모든 아이콘은 SVG로 구현하거나 SVG 아이콘 폰트를 사용하십시오.
    *   이미지에 있는 일본어 텍스트는 정확하게 유지하십시오.

4.  **세부사항:**
    *   날짜 동그라미의 테두리와 배경색을 구분하십시오.
    *   체크마크 팝업의 위치와 스타일을 정확히 복제하십시오.
    *   그리드 선의 굵기를 짙게 설정하십시오.

5.  **상호작용:**
    *   현재 이미지는 정적이지만, 나중에 상호작용(예: 호버 효과)을 추가할 수 있도록 클래스를 정의하십시오.

---

## 이미지 분석 세부사항 (텍스트 및 아이콘):

**Top Status Bar:**
*   19:02 (시간)
*   [SVG] Cellular, WiFi, Battery 아이콘

**Main Header:**
*   17. 2025 (날짜)
*   **MY TURN** (제목)
*   [SVG] 캘린더 아이콘
*   [SVG] ?, 설정 아이콘

**Calendar Nav:**
*   [SVG] 요일 약어 (月~日)
*   날짜: 8 (흰색/짙은 테두리), 9 (흰색/짙은 테두리), 10 (녹색/흰색 테두리), 11 (녹색/흰색 테두리, 파란색 점), 12 (흰색/옅은 테두리), 13 (흰색/옅은 테두리), 14 (흰색/옅은 테두리)

**Main Content (Routine Grid - 3x3):**
*   [SVG] 1x1: "9시에 일어나기" (알람 아이콘, 체크마크 팝업)
*   [SVG] 1x2: "침대 정리하기" (침대 아이콘, 체크마크 팝업)
*   [SVG] 1x3: "비타민/보충제 먹기" (알약 병 아이콘)
*   [SVG] 2x1: "가벼운 스트레칭" (요가 자세 아이콘)
*   [SVG] 2x2: "점심" (그릇/샐러드 아이콘, 체크마크 팝업)
*   [SVG] 2x3: "커피 타임 즐기기" (커피 잔 아이콘, 체크마크 팝업)
*   [SVG] 3x1: "공부하기!" (노트북 아이콘)
*   [SVG] 3x2: "저녁 산책" (나무 아이콘)
*   [SVG] 3x3: "게임하기!" (게임 패드 아이콘)

**Bottom Nav:**
*   [SVG] 홈, 체크리스트, 통계, 프로필 아이콘