# VSCode 파일 트리 구현 마스터 과정

<div align="center">
  <img src="https://raw.githubusercontent.com/microsoft/vscode-docs/main/images/code-navigation/explorer-view.png" alt="VSCode Explorer" width="300">
  <p><em>VSCode 파일 탐색기에서 영감을 받은 고성능 트리 구현하기</em></p>
</div>

## 🌟 소개

이 레포지토리는 VSCode의 파일 탐색기와 같은 고성능 트리 컴포넌트를 바닥부터 구현하는 단계별 학습 과정을 제공합니다. 단순한 트리 UI를 넘어, 가상화(virtualization), 검색, 필터링, 키보드 내비게이션 등 고급 기능을 구현하여 실제 프로덕션 환경에서 사용할 수 있는 컴포넌트를 만들 것입니다.

**이 과정은 다음과 같은 분들에게 적합합니다:**

- 프론트엔드 컴포넌트의 내부 동작 원리를 깊게 이해하고 싶은 개발자
- UI 라이브러리에만 의존하지 않고 맞춤형 고성능 컴포넌트를 구현하고 싶은 개발자
- 대용량 데이터를 처리하는 인터페이스 최적화에 관심 있는 개발자

## 📋 학습 목표

이 커리큘럼을 완료하면 다음을 할 수 있게 됩니다:

- 계층적 데이터 구조의 효율적인 렌더링 및 관리 방법 이해
- 대용량 데이터셋을 위한 가상화 기술 구현
- 복잡한 사용자 상호작용(키보드 내비게이션, 드래그 앤 드롭) 처리
- 고급 상태 관리 및 이벤트 시스템 설계
- 성능 병목 현상 식별 및 최적화 방법 습득

## 🛠️ 기술 스택

이 과정에서는 다음 기술들을 사용합니다:

- **바닐라 JavaScript / TypeScript**: 핵심 개념과 동작 원리 이해
- **DOM API**: 직접적인 DOM 조작을 통한 성능 최적화
- **선택적 프레임워크 통합**: React, Vue, Angular 등과 통합하는 방법
- **성능 분석 도구**: Chrome DevTools, React Profiler 등을 통한 성능 진단

## 💬 AI 피드백 시스템

이 커리큘럼을 진행하면서 AI(Claude)를 활용하여 효과적인 피드백을 받는 방법을 안내합니다. 코드 리뷰, 개념 설명, 성능 최적화 등 다양한 측면에서 도움을 받을 수 있습니다.

**[AI 기반 학습 피드백 시스템](FEEDBACK.md)** 문서를 참조하여 학습 과정에서 효과적으로 피드백을 요청하고 받는 방법을 알아보세요.

## 🚀 커리큘럼 개요

### 🔍 방법론

각 모듈은 다음과 같은 접근 방식으로 진행됩니다:

1. **이론 학습**: 구현할 기능의 배경 개념 이해
2. **단계별 구현**: 기초부터 시작하여 점진적으로 고급 기능으로 확장
3. **성능 테스트**: 구현한 코드의 성능 측정 및 개선
4. **통합 테스트**: 이전 모듈과의 통합으로 완성도 향상

### 📚 모듈 구성

---

## 모듈 1: 기본 트리 구조 구현 (1주)

### 학습 목표

- 트리 데이터 구조의 기본 개념 이해
- 계층적 데이터를 DOM으로 표현하는 방법 습득
- 기초적인 확장/축소 기능 구현

### 핵심 개념

- 트리 데이터 모델 설계
- DOM 요소와 데이터 모델 간의 매핑
- 이벤트 위임(Event Delegation) 패턴 활용

### 과제

1. **기본 데이터 모델 설계**
   - 파일 및 폴더를 표현할 수 있는 클래스/인터페이스 정의
   - TreeNode, TreeItem 등의 기본 구조 설계

2. **정적 트리 렌더링 구현**
   - 주어진 데이터 구조를 HTML로 렌더링하는 함수 작성
   - 폴더/파일 구분 및 아이콘 표시

3. **기본 상호작용 추가**
   - 클릭으로 폴더 확장/축소 기능 구현
   - 선택 상태 관리 (단일 항목 선택)

### 실습 프로젝트

샘플 파일 시스템 데이터로 기본 트리 표시하기:

```javascript
const fileSystem = [
  {
    name: 'src',
    type: 'folder',
    children: [
      { name: 'index.js', type: 'file' },
      { name: 'styles.css', type: 'file' },
      {
        name: 'components',
        type: 'folder',
        children: [
          { name: 'Button.js', type: 'file' },
          { name: 'Modal.js', type: 'file' }
        ]
      }
    ]
  },
  { name: 'package.json', type: 'file' },
  { name: 'README.md', type: 'file' }
];
```

### 확장 과제

- 다양한 파일 타입에 따른 아이콘 처리
- 트리 항목의 스타일링 개선 (hover, 선택 상태 등)

### 참고 자료

- [JavaScript Data Structures: Tree](https://www.geeksforgeeks.org/implementation-binary-search-tree-javascript/)
- [DOM 이벤트 위임 패턴](https://javascript.info/event-delegation)

---

## 모듈 2: 이벤트 시스템 및 상태 관리 (1주)

### 학습 목표

- 견고한 이벤트 시스템 설계 및 구현
- 복잡한 상태 관리 패턴 이해
- 이벤트 버블링과 캡처링을 활용한 최적화

### 핵심 개념

- Observer 패턴 구현
- 상태 변경 감지 및 최소 DOM 업데이트
- 이벤트 전파 제어

### 과제

1. **커스텀 이벤트 시스템 구현**
   - EventEmitter 클래스 설계 및 구현
   - 트리 상태 변경에 대한 이벤트 정의 (확장, 축소, 선택 등)

2. **상태 관리 메커니즘 개발**
   - 트리 상태를 캡슐화하는 클래스/객체 설계
   - 상태 변경 시 필요한 최소 DOM 업데이트 구현

3. **복잡한 상호작용 처리**
   - 다중 선택 기능 구현 (Ctrl/Shift 키 조합)
   - 컨텍스트 메뉴 (우클릭) 지원

### 실습 프로젝트

트리 컴포넌트 내부에서 사용할 완전한 이벤트 시스템 구현:

```javascript
class TreeEventSystem {
  constructor() {
    this.listeners = new Map();
  }

  on(eventName, callback) {
    // 이벤트 리스너 등록 구현
  }

  off(eventName, callback) {
    // 이벤트 리스너 제거 구현
  }

  emit(eventName, data) {
    // 이벤트 발생 및 리스너 호출 구현
  }
}
```

### 확장 과제

- 이벤트 버스를 통한 컴포넌트 간 통신 구현
- 상태 변경 히스토리 관리 (undo/redo 기능의 기반)

### 참고 자료

- [Observer 패턴 구현](https://refactoring.guru/design-patterns/observer/javascript/example)
- [브라우저 이벤트 심화](https://developer.mozilla.org/en-US/docs/Web/API/Event)

---

## 모듈 3: 가상화(Virtualization) 구현 (2주)

### 학습 목표

- 대용량 데이터 처리를 위한 가상화 기술 이해
- 뷰포트 계산 및 효율적인 DOM 재사용 방법 습득
- 스크롤 성능 최적화

### 핵심 개념

- 윈도우 가상화(windowing) 기법
- DOM 풀링(pooling) 및 재사용
- 스크롤 이벤트 처리 최적화

### 과제

1. **가상 스크롤 구현**
   - 현재 뷰포트에 보이는 항목만 렌더링하는 메커니즘 구현
   - 스크롤 위치에 따른 표시 항목 계산

2. **DOM 요소 재사용**
   - 요소 풀(pool) 관리 시스템 구현
   - 효율적인 DOM 노드 생성 및 재활용

3. **스크롤 성능 최적화**
   - 스크롤 이벤트 쓰로틀링/디바운싱 구현
   - 스크롤 중 렌더링 최적화

### 실습 프로젝트

대용량 데이터 처리를 위한 가상화 레이어 구현:

```javascript
class VirtualScroller {
  constructor(containerElement, itemHeight, totalItems, renderCallback) {
    this.container = containerElement;
    this.itemHeight = itemHeight;
    this.totalItems = totalItems;
    this.renderItem = renderCallback;
    
    // 가시 영역 계산 및 초기 렌더링 구현
    // 스크롤 이벤트 핸들러 구현
  }

  updateVisibleItems() {
    // 현재 보이는 항목 계산 및 렌더링
  }

  // DOM 요소 풀 관리 메서드 구현
}
```

### 테스트 데이터

5,000개 이상의 파일/폴더를 포함하는 대용량 데이터셋 생성:

```javascript
function generateLargeFileSystem(depth = 3, filesPerFolder = 20, foldersPerFolder = 5) {
  // 재귀적으로 대용량 파일 시스템 구조 생성
}
```

### 확장 과제

- 지연 로딩(lazy loading) 구현으로 필요할 때만 자식 항목 로드
- 다양한 높이의 트리 항목 지원

### 참고 자료

- [React Virtualized 소스 코드](https://github.com/bvaughn/react-virtualized)
- [가상 스크롤링 메커니즘 심화](https://medium.com/ingeniouslysimple/building-a-virtualized-list-from-scratch-9225e8bec120)

---

## 모듈 4: 고급 사용자 상호작용 (1주)

### 학습 목표

- 키보드 내비게이션 구현 방법 습득
- 드래그 앤 드롭 메커니즘 이해 및 구현
- 접근성(accessibility) 고려사항 파악

### 핵심 개념

- 키보드 이벤트 처리
- 드래그 앤 드롭 API 활용
- ARIA 속성 및 키보드 포커스 관리

### 과제

1. **키보드 내비게이션 구현**
   - 화살표 키로 항목 간 이동
   - Enter로 선택/확장/축소
   - 홈/엔드 키로 처음/마지막 항목 이동

2. **드래그 앤 드롭 지원**
   - 항목 드래그 가능하도록 설정
   - 드롭 영역 하이라이트 및 유효성 검사
   - 드래그 앤 드롭 작업 완료 처리

3. **접근성 향상**
   - 적절한 ARIA 역할 및 속성 추가
   - 포커스 관리 및 키보드 트랩 처리

### 실습 프로젝트

키보드 내비게이션 관리자 구현:

```javascript
class TreeKeyboardNavigator {
  constructor(treeView) {
    this.treeView = treeView;
    this.currentFocusIndex = -1;
    
    // 키보드 이벤트 리스너 설정
  }

  handleKeyDown(event) {
    // 다양한 키 입력에 대한 처리 구현
    switch(event.key) {
      case 'ArrowDown':
        this.moveDown();
        break;
      case 'ArrowUp':
        this.moveUp();
        break;
      case 'ArrowRight':
        this.expandCurrentItem();
        break;
      // 기타 키 처리...
    }
  }
  
  // 다양한 키보드 내비게이션 메서드 구현
}
```

### 확장 과제

- 선택 모드 구현 (범위 선택, 다중 선택)
- 잘라내기/복사/붙여넣기 작업 지원

### 참고 자료

- [HTML 드래그 앤 드롭 API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
- [WAI-ARIA 지침](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/)

---

## 모듈 5: 검색 및 필터링 (1주)

### 학습 목표

- 효율적인 트리 구조 검색 알고리즘 이해
- 실시간 필터링 구현
- 검색 결과 하이라이팅 및 내비게이션

### 핵심 개념

- 깊이 우선 탐색(DFS) 및 너비 우선 탐색(BFS)
- 검색 인덱싱 및 캐싱
- 텍스트 하이라이팅 기법

### 과제

1. **검색 기능 구현**
   - 트리 구조 내 텍스트 검색 알고리즘 구현
   - 검색 결과 수집 및 저장

2. **필터링 메커니즘 개발**
   - 조건에 맞는 항목만 표시하는 필터 구현
   - 필터 조건 조합 지원 (AND, OR 등)

3. **검색 UI 개선**
   - 검색 결과 하이라이팅
   - 검색 결과 간 이동 기능 구현

### 실습 프로젝트

트리 검색 엔진 구현:

```javascript
class TreeSearchEngine {
  constructor(treeData) {
    this.treeData = treeData;
    this.searchIndex = this.buildSearchIndex();
  }

  buildSearchIndex() {
    // 검색 성능 향상을 위한 인덱스 구축
  }

  search(query) {
    // 검색 쿼리를 처리하여 결과 반환
  }

  filter(predicate) {
    // 조건에 맞는 항목만 필터링
  }

  highlightMatches(node, query) {
    // 검색어와 일치하는 텍스트 하이라이팅
  }
}
```

### 확장 과제

- 퍼지 검색(fuzzy search) 구현
- 정규식 검색 지원
- 검색 기록 관리

### 참고 자료

- [트리 구조에서의 검색 알고리즘](https://www.geeksforgeeks.org/search-algorithms-in-javascript/)
- [텍스트 하이라이팅 기법](https://markjs.io/)

---

## 모듈 6: 성능 최적화 (1주)

### 학습 목표

- 성능 병목 현상 식별 및 진단 방법 습득
- 메모리 사용량 최적화 기법 학습
- 렌더링 성능 향상 방법 습득

### 핵심 개념

- 성능 프로파일링
- 메모리 누수 방지
- 렌더링 최적화 패턴

### 과제

1. **성능 진단 및 측정**
   - Chrome DevTools를 활용한 성능 프로파일링
   - 메모리 사용량 모니터링
   - FPS(Frames Per Second) 측정

2. **메모리 최적화**
   - 불필요한 객체 참조 제거
   - 이벤트 리스너 정리
   - 메모리 풀링 기법 적용

3. **렌더링 최적화**
   - 레이아웃 스래싱(thrashing) 방지
   - requestAnimationFrame 활용
   - CSS 애니메이션 최적화

### 실습 프로젝트

성능 모니터링 및 최적화 모듈 구현:

```javascript
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      renderTime: [],
      memoryUsage: [],
      fps: []
    };
  }

  startMeasure(label) {
    // 성능 측정 시작
  }

  endMeasure(label) {
    // 성능 측정 종료 및 결과 기록
  }

  generateReport() {
    // 성능 보고서 생성
  }
}
```

### 확장 과제

- Web Workers를 활용한 계산 부하 분산
- IndexedDB를 활용한 대용량 데이터 캐싱
- 컴포넌트 지연 로딩(lazy loading) 구현

### 참고 자료

- [Chrome DevTools 성능 분석](https://developers.google.com/web/tools/chrome-devtools/evaluate-performance)
- [JavaScript 성능 최적화 팁](https://web.dev/fast/)

---

## 모듈 7: 최종 프로젝트 - 실제 파일 시스템 연결 (2주)

### 학습 목표

- 이전 모듈에서 구현한 모든 기능을 통합
- 백엔드 API와 연동하여 실제 파일 시스템 탐색
- 완성된 컴포넌트의 문서화 및 테스트

### 핵심 개념

- API 통합
- 비동기 데이터 로딩
- 에러 처리 및 예외 상황 관리

### 과제

1. **API 연동 레이어 구현**
   - 파일 시스템 데이터를 가져오는 API 클라이언트 구현
   - 비동기 데이터 로딩 및 오류 처리

2. **파일 작업 기능 구현**
   - 파일/폴더 생성, 삭제, 이름 변경 기능
   - 파일 업로드/다운로드 지원

3. **통합 및 최종 테스트**
   - 모든 구현 기능 통합
   - 다양한 환경에서의 테스트
   - 사용자 피드백 수집 및 개선

### 실습 프로젝트

완전한 파일 브라우저 애플리케이션 구현:

```javascript
class FileExplorer {
  constructor(containerElement, apiClient) {
    this.container = containerElement;
    this.api = apiClient;
    this.treeView = new TreeView();
    this.virtualScroller = new VirtualScroller();
    this.searchEngine = new TreeSearchEngine();
    this.keyboardNavigator = new TreeKeyboardNavigator();
    
    // 모든 구성 요소 초기화 및 통합
  }

  async initialize() {
    // 루트 디렉토리 로드 및 초기 UI 설정
  }

  // 파일 작업 메서드 구현
  // 에러 처리 및 사용자 피드백 구현
}
```

### 확장 과제

- 파일 미리보기 기능 구현
- 파일 변경 감지 및 자동 새로고침
- 사용자 설정 및 기본 설정 관리

### 참고 자료

- [Fetch API를 활용한 네트워크 요청](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [에러 처리 패턴](https://www.codementor.io/@jamesugbanu/how-to-develop-error-handling-pattern-in-javascript-lvbjbivkl)
- [VS Code 파일 탐색기 소스 코드](https://github.com/microsoft/vscode/tree/main/src/vs/workbench/contrib/files/browser)

---

## 🏆 최종 목표

이 커리큘럼을 완료하면 다음과 같은 기능을 갖춘 고성능 파일 트리 컴포넌트를 구현할 수 있게 됩니다:

- **성능**: 수만 개의 파일/폴더를 부드럽게 표시
- **기능성**: 키보드 내비게이션, 드래그 앤 드롭, 컨텍스트 메뉴 지원
- **검색**: 빠른 파일 검색 및 필터링
- **확장성**: 커스텀 파일 작업 및 이벤트 처리
- **접근성**: 키보드만으로도 완전히 사용 가능한 인터페이스

## 📊 평가 방법

각 모듈의 과제를 완료한 후에는 다음 기준으로 평가합니다:

1. **기능 구현 완성도**: 요구사항을 모두 충족하는가?
2. **코드 품질**: 코드가 깔끔하고 유지보수하기 쉬운가?
3. **성능**: 대용량 데이터에서도 성능이 유지되는가?
4. **사용성**: 직관적이고 사용하기 쉬운 인터페이스인가?
5. **문서화**: 코드와 API가 잘 문서화되어 있는가?

## 🤝 기여하기

이 레포지토리는 학습 목적으로 만들어졌으며, 개선 제안이나 버그 수정은 언제나 환영합니다. 풀 리퀘스트나 이슈를 통해 기여해 주세요.

## 📜 라이센스

MIT 라이센스로 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

<p align="center">
  <strong>행복한 코딩 되세요! 🚀</strong>
</p>