/**
 * @class MemoryManager
 * @description 트리 뷰 컴포넌트의 메모리 사용을 최적화하는 도구
 * 객체 풀링, 참조 관리, 메모리 누수 방지 등의 기능을 제공합니다.
 */
class MemoryManager {
  /**
   * @constructor
   * @param {Object} options - 메모리 관리 옵션
   * @param {number} options.nodePoolSize - 노드 객체 풀 크기 (기본값: 100)
   * @param {number} options.domPoolSize - DOM 요소 풀 크기 (기본값: 50)
   * @param {number} options.gcInterval - 가비지 컬렉션 간격 (ms, 기본값: 30000)
   * @param {boolean} options.enablePooling - 객체 풀링 활성화 여부 (기본값: true)
   */
  constructor(options = {}) {
    this.options = Object.assign({
      nodePoolSize: 100,
      domPoolSize: 50,
      gcInterval: 30000,
      enablePooling: true
    }, options);
    
    // 객체 풀
    this.nodePool = [];
    this.domPool = new Map();
    
    // 참조 추적
    this.references = new WeakMap();
    this.eventListeners = new Map();
    this.domReferences = new Map();
    
    // 메모리 사용 통계
    this.stats = {
      createdNodes: 0,
      reusedNodes: 0,
      createdDomElements: 0,
      reusedDomElements: 0,
      pendingDisposal: 0,
      activeReferences: 0,
      gcRuns: 0,
      lastGC: 0
    };
    
    // 가비지 컬렉션 타이머
    this.gcTimer = null;
    
    // 풀링 활성화 상태면 초기 풀 생성
    if (this.options.enablePooling) {
      this._initializePools();
      this._startGCTimer();
    }
  }
  
  /**
   * 객체 풀을 초기화합니다.
   * @private
   */
  _initializePools() {
    // 노드 객체 풀 초기화
    for (let i = 0; i < this.options.nodePoolSize; i++) {
      this.nodePool.push(this._createEmptyNodeObject());
    }
    
    // DOM 요소 유형별 풀 초기화
    const elementTypes = ['div', 'span', 'li', 'ul'];
    
    elementTypes.forEach(type => {
      const elements = [];
      
      for (let i = 0; i < this.options.domPoolSize; i++) {
        elements.push(document.createElement(type));
      }
      
      this.domPool.set(type, elements);
    });
    
    console.log('[MemoryManager] Object pools initialized');
  }
  
  /**
   * 주기적인 가비지 컬렉션 타이머를 시작합니다.
   * @private
   */
  _startGCTimer() {
    // 이미 실행 중인 타이머가 있으면 정리
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
    }
    
    // 새 타이머 설정
    this.gcTimer = setInterval(() => {
      this.runGarbageCollection();
    }, this.options.gcInterval);
    
    console.log(`[MemoryManager] Garbage collection timer started (interval: ${this.options.gcInterval}ms)`);
  }
  
  /**
   * 가비지 컬렉션을 실행합니다.
   * @returns {Object} 가비지 컬렉션 결과
   */
  runGarbageCollection() {
    console.time('Garbage Collection');
    
    // 통계 기록용 변수
    let releasedNodeCount = 0;
    let releasedDomElementCount = 0;
    let releasedEventListenerCount = 0;
    
    // 1. 참조가 없는 DOM 요소의 이벤트 리스너 정리
    this.eventListeners.forEach((listeners, element) => {
      // 문서에 연결되지 않은 요소 확인
      if (!document.contains(element) && !this.domReferences.has(element)) {
        // 모든 이벤트 리스너 제거
        listeners.forEach(({ type, handler, options }) => {
          element.removeEventListener(type, handler, options);
          releasedEventListenerCount++;
        });
        
        // 이벤트 리스너 맵에서 제거
        this.eventListeners.delete(element);
      }
    });
    
    // 2. 사용되지 않는 DOM 요소를 풀로 반환
    this.domReferences.forEach((refCount, element) => {
      if (refCount <= 0) {
        const tagName = element.tagName.toLowerCase();
        
        // 요소 초기화
        this._resetDOMElement(element);
        
        // 풀에 반환
        if (this.domPool.has(tagName)) {
          const pool = this.domPool.get(tagName);
          if (pool.length < this.options.domPoolSize * 2) {
            pool.push(element);
          }
        }
        
        // 참조 카운트 정리
        this.domReferences.delete(element);
        releasedDomElementCount++;
      }
    });
    
    // 3. 노드 풀이 너무 크면 크기 조정
    if (this.nodePool.length > this.options.nodePoolSize * 2) {
      const excessNodes = this.nodePool.length - this.options.nodePoolSize;
      this.nodePool.splice(0, excessNodes);
      releasedNodeCount += excessNodes;
    }
    
    // 통계 업데이트
    this.stats.gcRuns++;
    this.stats.lastGC = Date.now();
    this.stats.pendingDisposal -= (releasedNodeCount + releasedDomElementCount);
    this.stats.activeReferences = this.domReferences.size;
    
    console.timeEnd('Garbage Collection');
    
    // 로그 출력
    console.log(`[MemoryManager] GC completed: ${releasedNodeCount} nodes, ${releasedDomElementCount} DOM elements, ${releasedEventListenerCount} event listeners released`);
    
    return {
      releasedNodes: releasedNodeCount,
      releasedDomElements: releasedDomElementCount,
      releasedEventListeners: releasedEventListenerCount
    };
  }
  
  /**
   * 트리 노드 객체를 생성하거나 재사용합니다.
   * @param {Object} initialData - 초기화할 데이터
   * @returns {Object} 새 트리 노드 객체 또는 풀에서 재사용된 객체
   */
  createTreeNode(initialData = {}) {
    let node;
    
    // 객체 풀링이 활성화되고 풀에 사용 가능한 노드가 있는 경우
    if (this.options.enablePooling && this.nodePool.length > 0) {
      // 풀에서 객체 가져오기
      node = this.nodePool.pop();
      this.stats.reusedNodes++;
    } else {
      // 새 객체 생성
      node = this._createEmptyNodeObject();
      this.stats.createdNodes++;
    }
    
    // 데이터로 초기화
    Object.assign(node, initialData);
    
    // 자식 배열이 없으면 초기화
    if (node.type === 'folder' && !Array.isArray(node.children)) {
      node.children = [];
    }
    
    // 참조 카운트 설정
    this.references.set(node, { refCount: 1, createdAt: Date.now() });
    
    return node;
  }
  
  /**
   * 새로운 빈 노드 객체를 생성합니다.
   * @returns {Object} 기본 필드가 있는 빈 노드 객체
   * @private
   */
  _createEmptyNodeObject() {
    return {
      id: '',
      name: '',
      type: '',
      path: '',
      expanded: false,
      children: null
    };
  }
  
  /**
   * DOM 요소를 생성하거나 재사용합니다.
   * @param {string} tagName - 요소 태그명
   * @param {Object} options - 요소 속성 및 스타일
   * @returns {HTMLElement} 새 DOM 요소 또는 풀에서 재사용된 요소
   */
  createDOMElement(tagName, options = {}) {
    tagName = tagName.toLowerCase();
    let element;
    
    // 객체 풀링이 활성화되고 해당 유형의 풀이 있는 경우
    if (this.options.enablePooling && this.domPool.has(tagName) && this.domPool.get(tagName).length > 0) {
      // 풀에서 요소 가져오기
      element = this.domPool.get(tagName).pop();
      this.stats.reusedDomElements++;
    } else {
      // 새 요소 생성
      element = document.createElement(tagName);
      this.stats.createdDomElements++;
    }
    
    // 요소 초기화
    this._resetDOMElement(element);
    
    // 속성 설정
    if (options.attributes) {
      Object.entries(options.attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }
    
    // 클래스 추가
    if (options.className) {
      if (Array.isArray(options.className)) {
        element.classList.add(...options.className);
      } else {
        element.className = options.className;
      }
    }
    
    // 스타일 설정
    if (options.style) {
      Object.assign(element.style, options.style);
    }
    
    // 텍스트 내용 설정
    if (options.textContent !== undefined) {
      element.textContent = options.textContent;
    }
    
    // HTML 내용 설정
    if (options.innerHTML !== undefined) {
      element.innerHTML = options.innerHTML;
    }
    
    // 참조 카운트 설정
    this.domReferences.set(element, 1);
    
    return element;
  }
  
  /**
   * DOM 요소를 초기화합니다.
   * @param {HTMLElement} element - 초기화할 DOM 요소
   * @private
   */
  _resetDOMElement(element) {
    // 속성 제거
    while (element.attributes.length > 0) {
      element.removeAttribute(element.attributes[0].name);
    }
    
    // 클래스 제거
    element.className = '';
    
    // 스타일 초기화
    element.removeAttribute('style');
    
    // 내용 비우기
    element.textContent = '';
    
    // 자식 요소 제거
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
    
    // 이벤트 리스너 정리
    if (this.eventListeners.has(element)) {
      const listeners = this.eventListeners.get(element);
      listeners.forEach(({ type, handler, options }) => {
        element.removeEventListener(type, handler, options);
      });
      this.eventListeners.delete(element);
    }
  }
  
  /**
   * 트리 노드 객체를 풀로 반환합니다.
   * @param {Object} node - 반환할 노드 객체
   * @returns {boolean} 성공 여부
   */
  releaseTreeNode(node) {
    if (!node) return false;
    
    // 참조 정보 가져오기
    const ref = this.references.get(node);
    
    if (!ref) return false;
    
    // 참조 카운트 감소
    ref.refCount--;
    
    // 참조가 남아있으면 아직 해제하지 않음
    if (ref.refCount > 0) return true;
    
    // 노드 자식들 재귀적으로 해제
    if (node.type === 'folder' && Array.isArray(node.children)) {
      node.children.forEach(child => this.releaseTreeNode(child));
      node.children = [];
    }
    
    // 노드 데이터 초기화
    Object.keys(node).forEach(key => {
      if (typeof node[key] !== 'function') {
        if (typeof node[key] === 'boolean') {
          node[key] = false;
        } else if (typeof node[key] === 'number') {
          node[key] = 0;
        } else if (typeof node[key] === 'string') {
          node[key] = '';
        } else if (Array.isArray(node[key])) {
          node[key] = null;
        } else if (typeof node[key] === 'object') {
          node[key] = null;
        }
      }
    });
    
    // 노드 풀링이 활성화된 경우에만 풀에 반환
    if (this.options.enablePooling) {
      this.nodePool.push(node);
    }
    
    // 참조 정보 삭제
    this.references.delete(node);
    
    this.stats.pendingDisposal++;
    
    return true;
  }
  
  /**
   * DOM 요소 참조 카운트를 증가시킵니다.
   * @param {HTMLElement} element - 참조 카운트를 증가시킬 DOM 요소
   * @returns {number} 새 참조 카운트
   */
  retainDOMElement(element) {
    if (!element || !(element instanceof HTMLElement)) return 0;
    
    const currentCount = this.domReferences.get(element) || 0;
    const newCount = currentCount + 1;
    this.domReferences.set(element, newCount);
    
    return newCount;
  }
  
  /**
   * DOM 요소 참조 카운트를 감소시킵니다.
   * @param {HTMLElement} element - 참조 카운트를 감소시킬 DOM 요소
   * @returns {number} 새 참조 카운트
   */
  releaseDOMElement(element) {
    if (!element || !(element instanceof HTMLElement)) return 0;
    
    const currentCount = this.domReferences.get(element) || 0;
    
    if (currentCount <= 0) return 0;
    
    const newCount = currentCount - 1;
    this.domReferences.set(element, newCount);
    
    // 참조 카운트가 0이 되면 다음 GC에서 처리될 수 있도록 표시
    if (newCount === 0) {
      this.stats.pendingDisposal++;
    }
    
    return newCount;
  }
  
  /**
   * 이벤트 리스너 등록을 추적합니다.
   * @param {HTMLElement} element - 리스너를 등록할 DOM 요소
   * @param {string} eventType - 이벤트 유형
   * @param {Function} handler - 이벤트 핸들러
   * @param {Object} options - 이벤트 리스너 옵션
   */
  trackEventListener(element, eventType, handler, options = {}) {
    if (!element || !(element instanceof HTMLElement)) return;
    
    // 요소에 대한 리스너 배열 초기화
    if (!this.eventListeners.has(element)) {
      this.eventListeners.set(element, []);
    }
    
    // 리스너 정보 추가
    const listeners = this.eventListeners.get(element);
    listeners.push({
      type: eventType,
      handler,
      options
    });
    
    // 실제로 이벤트 리스너 등록
    element.addEventListener(eventType, handler, options);
    
    // 참조 카운트가 없는 경우 추가
    if (!this.domReferences.has(element)) {
      this.domReferences.set(element, 1);
    }
  }
  
  /**
   * 이벤트 리스너 등록을 해제합니다.
   * @param {HTMLElement} element - 리스너를 해제할 DOM 요소
   * @param {string} eventType - 이벤트 유형
   * @param {Function} handler - 이벤트 핸들러
   * @param {Object} options - 이벤트 리스너 옵션
   * @returns {boolean} 성공 여부
   */
  removeEventListener(element, eventType, handler, options = {}) {
    if (!element || !(element instanceof HTMLElement)) return false;
    
    if (!this.eventListeners.has(element)) return false;
    
    const listeners = this.eventListeners.get(element);
    const index = listeners.findIndex(l => 
      l.type === eventType && l.handler === handler
    );
    
    if (index === -1) return false;
    
    // 리스너 배열에서 제거
    listeners.splice(index, 1);
    
    // 실제로 이벤트 리스너 해제
    element.removeEventListener(eventType, handler, options);
    
    // 리스너가 없으면 맵에서 해당 요소 제거
    if (listeners.length === 0) {
      this.eventListeners.delete(element);
    }
    
    return true;
  }
  
  /**
   * 요소의 모든 이벤트 리스너를 제거합니다.
   * @param {HTMLElement} element - 리스너를 모두 해제할 DOM 요소
   * @returns {number} 제거된 리스너 수
   */
  removeAllEventListeners(element) {
    if (!element || !(element instanceof HTMLElement)) return 0;
    
    if (!this.eventListeners.has(element)) return 0;
    
    const listeners = this.eventListeners.get(element);
    const count = listeners.length;
    
    // 모든 리스너 해제
    listeners.forEach(({ type, handler, options }) => {
      element.removeEventListener(type, handler, options);
    });
    
    // 맵에서 제거
    this.eventListeners.delete(element);
    
    return count;
  }
  
  /**
   * DOM 트리를 정리하고 분리합니다.
   * @param {HTMLElement} rootElement - 정리할 루트 요소
   * @returns {number} 정리된 요소 수
   */
  detachDOMTree(rootElement) {
    if (!rootElement || !(rootElement instanceof HTMLElement)) return 0;
    
    let count = 0;
    
    // 요소의 이벤트 리스너 제거
    count += this.removeAllEventListeners(rootElement);
    
    // 참조 카운트 0으로 설정
    this.domReferences.set(rootElement, 0);
    
    // 자식 요소 재귀적 처리
    Array.from(rootElement.children).forEach(child => {
      count += this.detachDOMTree(child);
    });
    
    // 요소 내용 제거
    rootElement.innerHTML = '';
    
    this.stats.pendingDisposal++;
    
    return count + 1; // 현재 요소 포함
  }
  
  /**
   * 메모리 관리 통계를 반환합니다.
   * @returns {Object} 메모리 관리 통계
   */
  getStats() {
    // 현재 �� 크기 정보 추가
    const currentStats = { ...this.stats };
    
    currentStats.nodePoolSize = this.nodePool.length;
    
    // DOM 풀 크기 계산
    let totalDomPoolSize = 0;
    this.domPool.forEach(pool => {
      totalDomPoolSize += pool.length;
    });
    currentStats.domPoolSize = totalDomPoolSize;
    
    // 이벤트 리스너 수 계산
    let totalEventListeners = 0;
    this.eventListeners.forEach(listeners => {
      totalEventListeners += listeners.length;
    });
    currentStats.eventListenerCount = totalEventListeners;
    
    // 활성 DOM 참조 수
    currentStats.activeDomReferences = this.domReferences.size;
    
    return currentStats;
  }
  
  /**
   * 리소스를 정리하고 메모리 관리자를 종료합니다.
   */
  dispose() {
    // GC 타이머 정지
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }
    
    // 객체 풀 정리
    this.nodePool = [];
    this.domPool.clear();
    
    // 이벤트 리스너 정리
    this.eventListeners.forEach((listeners, element) => {
      listeners.forEach(({ type, handler, options }) => {
        element.removeEventListener(type, handler, options);
      });
    });
    
    this.eventListeners.clear();
    this.domReferences.clear();
    
    console.log('[MemoryManager] Disposed all resources');
  }
}

// 외부 사용을 위해 export
export default MemoryManager;