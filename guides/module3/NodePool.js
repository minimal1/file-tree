/**
 * NodePool 클래스
 * DOM 요소 재사용을 위한 풀링 시스템
 * 렌더링 성능 향상을 위해 DOM 요소를 재활용
 */
class NodePool {
  /**
   * @param {string} nodeType - 생성할 DOM 요소 타입 (기본: 'li')
   * @param {number} initialSize - 풀의 초기 크기 (기본: 50)
   * @param {number} growthFactor - 확장 시 증가 비율 (기본: 1.5)
   */
  constructor(nodeType = 'li', initialSize = 50, growthFactor = 1.5) {
    this.nodeType = nodeType;
    this.growthFactor = growthFactor;
    this.pool = [];
    this.activeNodes = new Set(); // 현재 사용 중인 노드들
    
    // 초기 풀 생성
    this.initialize(initialSize);
  }

  /**
   * 풀 초기화 및 DOM 요소 생성
   * @param {number} size - 생성할 요소 개수
   */
  initialize(size) {
    for (let i = 0; i < size; i++) {
      const element = document.createElement(this.nodeType);
      element._pooled = true; // 풀에서 관리되는 요소임을 표시
      this.pool.push(element);
    }
    
    console.log(`NodePool initialized with ${size} ${this.nodeType} elements`);
  }

  /**
   * 풀에서 요소 가져오기
   * @returns {HTMLElement} 풀에서 가져온 DOM 요소
   */
  acquire() {
    // 풀이 비어있으면 확장
    if (this.pool.length === 0) {
      this.expand();
    }
    
    // 풀에서 요소 꺼내기
    const element = this.pool.pop();
    
    // 사용 중인 요소 추적
    this.activeNodes.add(element);
    
    return element;
  }

  /**
   * 사용이 끝난 요소를 풀에 반환
   * @param {HTMLElement} element - 반환할 DOM 요소
   */
  release(element) {
    // 이미 풀에 있거나 풀에서 관리되지 않는 요소면 무시
    if (!element || !element._pooled || this.pool.includes(element)) {
      return;
    }
    
    // 요소 초기화 (내용, 이벤트 리스너 등 제거)
    this.resetElement(element);
    
    // 풀에 반환
    this.pool.push(element);
    
    // 사용 중인 요소 목록에서 제거
    this.activeNodes.delete(element);
  }

  /**
   * 모든 활성 요소를 풀로 반환
   */
  releaseAll() {
    this.activeNodes.forEach(element => {
      this.release(element);
    });
    
    this.activeNodes.clear();
  }

  /**
   * 풀 크기 확장
   */
  expand() {
    const currentSize = this.pool.length + this.activeNodes.size;
    const newElements = Math.ceil(currentSize * this.growthFactor) - currentSize;
    
    console.log(`NodePool expanding: Creating ${newElements} new elements`);
    this.initialize(newElements);
  }

  /**
   * 요소를 초기 상태로 재설정
   * @param {HTMLElement} element - 초기화할 요소
   */
  resetElement(element) {
    // 내용 비우기
    element.innerHTML = '';
    
    // 모든 속성 제거 (class, id, data-* 등)
    Array.from(element.attributes).forEach(attr => {
      if (attr.name !== '_pooled') { // 내부 추적용 속성은 유지
        element.removeAttribute(attr.name);
      }
    });
    
    // 스타일 초기화
    element.removeAttribute('style');
    
    // 클래스 제거
    element.className = '';
    
    return element;
  }

  /**
   * 풀 상태 정보 반환
   * @returns {Object} 풀 상태 정보
   */
  getStats() {
    return {
      available: this.pool.length,
      active: this.activeNodes.size,
      total: this.pool.length + this.activeNodes.size
    };
  }
}
