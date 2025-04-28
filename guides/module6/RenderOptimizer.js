/**
 * @class RenderOptimizer
 * @description 트리 뷰 컴포넌트의 렌더링 성능을 최적화하는 도구
 * 레이아웃 스래싱 방지, 렌더링 배치 처리, 애니메이션 최적화 등의 기능을 제공합니다.
 */
class RenderOptimizer {
  /**
   * @constructor
   * @param {Object} options - 렌더링 최적화 옵션
   * @param {boolean} options.useRAF - requestAnimationFrame 사용 여부 (기본값: true)
   * @param {boolean} options.batchDOMUpdates - DOM 업데이트 배치 처리 여부 (기본값: true)
   * @param {boolean} options.useCompositionLayers - 컴포지션 레이어 최적화 사용 여부 (기본값: true)
   * @param {number} options.renderThreshold - 렌더링 임계값 (ms, 기본값: 16)
   */
  constructor(options = {}) {
    this.options = Object.assign({
      useRAF: true,
      batchDOMUpdates: true,
      useCompositionLayers: true,
      renderThreshold: 16 // 60fps에 해당하는 프레임 시간
    }, options);
    
    // 내부 상태
    this.pendingUpdates = new Map();
    this.pendingReads = [];
    this.pendingWrites = [];
    this.updateScheduled = false;
    this.frameId = null;
    this.lastRenderTime = 0;
    
    // 통계
    this.stats = {
      frameCount: 0,
      batchedUpdates: 0,
      skippedFrames: 0,
      totalRenderTime: 0,
      renders: []
    };
    
    // DOM 변경 관찰자
    this.observer = null;
    
    // 성능 측정 활성화 (개발 모드)
    this.measurePerformance = true;
  }
  
  /**
   * 요소의 DOM 읽기 작업을 큐에 추가합니다.
   * @param {Function} readFn - DOM 값을 읽는 함수
   * @returns {Promise} 읽기 작업 결과를 담은 Promise
   */
  read(readFn) {
    return new Promise(resolve => {
      this.pendingReads.push(() => {
        const result = readFn();
        resolve(result);
      });
      
      this._scheduleUpdate();
    });
  }
  
  /**
   * 요소의 DOM 쓰기 작업을 큐에 추가합니다.
   * @param {Function} writeFn - DOM을 수정하는 함수
   * @returns {Promise} 쓰기 작업 완료를 알리는 Promise
   */
  write(writeFn) {
    return new Promise(resolve => {
      this.pendingWrites.push(() => {
        writeFn();
        resolve();
      });
      
      this._scheduleUpdate();
    });
  }
  
  /**
   * 특정 요소에 대한 DOM 업데이트를 큐에 추가합니다.
   * @param {HTMLElement} element - 업데이트할 DOM 요소
   * @param {Object} updates - 적용할 업데이트 내용
   * @returns {RenderOptimizer} 메서드 체이닝을 위한 this
   */
  updateElement(element, updates) {
    if (!element || !(element instanceof HTMLElement)) return this;
    
    if (!this.pendingUpdates.has(element)) {
      this.pendingUpdates.set(element, {});
    }
    
    // 기존 업데이트와 새 업데이트 병합
    const currentUpdates = this.pendingUpdates.get(element);
    
    // 속성 업데이트 병합
    if (updates.attributes) {
      if (!currentUpdates.attributes) {
        currentUpdates.attributes = {};
      }
      Object.assign(currentUpdates.attributes, updates.attributes);
    }
    
    // 스타일 업데이트 병합
    if (updates.styles) {
      if (!currentUpdates.styles) {
        currentUpdates.styles = {};
      }
      Object.assign(currentUpdates.styles, updates.styles);
    }
    
    // 클래스 업데이트 처리
    if (updates.addClass) {
      if (!currentUpdates.addClass) {
        currentUpdates.addClass = new Set();
      }
      
      if (Array.isArray(updates.addClass)) {
        updates.addClass.forEach(cls => currentUpdates.addClass.add(cls));
      } else {
        currentUpdates.addClass.add(updates.addClass);
      }
    }
    
    if (updates.removeClass) {
      if (!currentUpdates.removeClass) {
        currentUpdates.removeClass = new Set();
      }
      
      if (Array.isArray(updates.removeClass)) {
        updates.removeClass.forEach(cls => currentUpdates.removeClass.add(cls));
      } else {
        currentUpdates.removeClass.add(updates.removeClass);
      }
    }
    
    // 텍스트 또는 HTML 내용 업데이트 (마지막 설정 값으로 덮어쓰기)
    if (updates.textContent !== undefined) {
      currentUpdates.textContent = updates.textContent;
    }
    
    if (updates.innerHTML !== undefined) {
      currentUpdates.innerHTML = updates.innerHTML;
    }
    
    this._scheduleUpdate();
    
    return this;
  }
  
  /**
   * 업데이트 실행을 스케줄링합니다.
   * @private
   */
  _scheduleUpdate() {
    if (this.updateScheduled) return;
    
    this.updateScheduled = true;
    
    if (this.options.useRAF) {
      // requestAnimationFrame 사용하여 다음 프레임에 업데이트
      this.frameId = requestAnimationFrame(this._processUpdates.bind(this));
    } else {
      // 마이크로태스크로 즉시 실행
      Promise.resolve().then(this._processUpdates.bind(this));
    }
  }
  
  /**
   * 스케줄링된 모든 업데이트를 처리합니다.
   * @param {number} timestamp - 현재 타임스탬프 (requestAnimationFrame 사용 시)
   * @private
   */
  _processUpdates(timestamp) {
    this.updateScheduled = false;
    
    // 렌더링 시간이 임계값을 초과하면 프레임 스킵
    if (timestamp - this.lastRenderTime < this.options.renderThreshold) {
      // 다음 프레임에 다시 시도
      this.frameId = requestAnimationFrame(this._processUpdates.bind(this));
      this.stats.skippedFrames++;
      return;
    }
    
    // 성능 측정 시작
    let startTime;
    if (this.measurePerformance) {
      startTime = performance.now();
      this.stats.frameCount++;
    }
    
    // 1. 모든 읽기 작업 수행 (레이아웃 강제 동기화 방지)
    while (this.pendingReads.length > 0) {
      const readFn = this.pendingReads.shift();
      readFn();
    }
    
    // 배치 업데이트 수 카운트
    const updateCount = this.pendingUpdates.size + this.pendingWrites.length;
    
    // 2. 배치 처리된 DOM 업데이트 적용
    if (this.options.batchDOMUpdates) {
      this._applyBatchedUpdates();
    } else {
      this._applyIndividualUpdates();
    }
    
    // 3. 나머지 쓰기 작업 수행
    while (this.pendingWrites.length > 0) {
      const writeFn = this.pendingWrites.shift();
      writeFn();
    }
    
    // 성능 측정 종료
    if (this.measurePerformance) {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // 통계 업데이트
      this.stats.totalRenderTime += renderTime;
      this.stats.batchedUpdates += updateCount;
      this.stats.renders.push({
        timestamp,
        renderTime,
        updateCount
      });
      
      // 최대 100개 렌더링 기록 유지
      if (this.stats.renders.length > 100) {
        this.stats.renders.shift();
      }
      
      // 성능 로깅 (100 프레임마다)
      if (this.stats.frameCount % 100 === 0) {
        console.log(`[RenderOptimizer] 성능 통계:`,
          `평균 렌더링 시간: ${this.getAverageRenderTime().toFixed(2)}ms,`,
          `업데이트: ${this.stats.batchedUpdates},`,
          `스킵된 프레임: ${this.stats.skippedFrames}`
        );
      }
    }
    
    // 렌더링 시간 기록
    this.lastRenderTime = timestamp;
    
    // 대기 중인 업데이트가 있으면 다음 프레임 스케줄링
    if (this.pendingReads.length > 0 || this.pendingWrites.length > 0 || this.pendingUpdates.size > 0) {
      this.frameId = requestAnimationFrame(this._processUpdates.bind(this));
      this.updateScheduled = true;
    }
  }
  
  /**
   * 배치 처리된 DOM 업데이트를 적용합니다.
   * @private
   */
  _applyBatchedUpdates() {
    if (this.pendingUpdates.size === 0) return;
    
    // 모든 스타일 읽기 작업 실행 (강제 레이아웃 방지)
    // DOM 업데이트를 분리하여 레이아웃 스래싱 방지
    
    // 1. 모든 속성 업데이트
    this.pendingUpdates.forEach((updates, element) => {
      // 속성 업데이트
      if (updates.attributes) {
        Object.entries(updates.attributes).forEach(([attr, value]) => {
          if (value === null || value === undefined) {
            element.removeAttribute(attr);
          } else {
            element.setAttribute(attr, value);
          }
        });
      }
    });
    
    // 2. 모든 클래스 업데이트
    this.pendingUpdates.forEach((updates, element) => {
      // 클래스 추가
      if (updates.addClass && updates.addClass.size > 0) {
        element.classList.add(...updates.addClass);
      }
      
      // 클래스 제거
      if (updates.removeClass && updates.removeClass.size > 0) {
        element.classList.remove(...updates.removeClass);
      }
    });
    
    // 3. 모든 스타일 업데이트
    this.pendingUpdates.forEach((updates, element) => {
      // 스타일 업데이트
      if (updates.styles) {
        Object.entries(updates.styles).forEach(([prop, value]) => {
          element.style[prop] = value;
        });
      }
    });
    
    // 4. 모든 내용 업데이트 (강제 레이아웃 발생)
    this.pendingUpdates.forEach((updates, element) => {
      // 텍스트 내용 업데이트
      if (updates.textContent !== undefined) {
        element.textContent = updates.textContent;
      }
      
      // HTML 내용 업데이트
      if (updates.innerHTML !== undefined) {
        element.innerHTML = updates.innerHTML;
      }
    });
    
    // 업데이트 큐 비우기
    this.pendingUpdates.clear();
  }
  
  /**
   * 개별 DOM 업데이트를 적용합니다. (배치 처리 비활성화 시)
   * @private
   */
  _applyIndividualUpdates() {
    this.pendingUpdates.forEach((updates, element) => {
      // 속성 업데이트
      if (updates.attributes) {
        Object.entries(updates.attributes).forEach(([attr, value]) => {
          if (value === null || value === undefined) {
            element.removeAttribute(attr);
          } else {
            element.setAttribute(attr, value);
          }
        });
      }
      
      // 클래스 추가
      if (updates.addClass && updates.addClass.size > 0) {
        element.classList.add(...updates.addClass);
      }
      
      // 클래스 제거
      if (updates.removeClass && updates.removeClass.size > 0) {
        element.classList.remove(...updates.removeClass);
      }
      
      // 스타일 업데이트
      if (updates.styles) {
        Object.entries(updates.styles).forEach(([prop, value]) => {
          element.style[prop] = value;
        });
      }
      
      // 텍스트 내용 업데이트
      if (updates.textContent !== undefined) {
        element.textContent = updates.textContent;
      }
      
      // HTML 내용 업데이트
      if (updates.innerHTML !== undefined) {
        element.innerHTML = updates.innerHTML;
      }
    });
    
    // 업데이트 큐 비우기
    this.pendingUpdates.clear();
  }
  
  /**
   * 요소에 컴포지션 레이어 최적화를 적용합니다.
   * @param {HTMLElement} element - 최적화할 DOM 요소
   * @returns {RenderOptimizer} 메서드 체이닝을 위한 this
   */
  promoteToLayer(element) {
    if (!this.options.useCompositionLayers || !element) return this;
    
    // 컴포지션 레이어로 승격하여 GPU 가속 활용
    this.updateElement(element, {
      styles: {
        transform: 'translateZ(0)',
        willChange: 'transform'
      }
    });
    
    return this;
  }
  
  /**
   * 요소의 컴포지션 레이어 최적화를 제거합니다.
   * @param {HTMLElement} element - 최적화를 제거할 DOM 요소
   * @returns {RenderOptimizer} 메서드 체이닝을 위한 this
   */
  demoteFromLayer(element) {
    if (!element) return this;
    
    this.updateElement(element, {
      styles: {
        transform: '',
        willChange: 'auto'
      }
    });
    
    return this;
  }
  
  /**
   * 모든 보류 중인 업데이트를 즉시 적용합니다.
   * @returns {RenderOptimizer} 메서드 체이닝을 위한 this
   */
  flushUpdates() {
    // 예약된 프레임 취소
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    
    // 모든 읽기 및 쓰기 작업 처리
    this._processUpdates(performance.now());
    
    return this;
  }
  
  /**
   * 특정 코드 블록의 실행 시간을 측정합니다.
   * @param {Function} callback - 측정할 코드 블록
   * @param {string} label - 측정 라벨
   * @returns {number} 실행 시간 (ms)
   */
  measureExecutionTime(callback, label = 'Execution') {
    const startTime = performance.now();
    const result = callback();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`[RenderOptimizer] ${label} 시간: ${duration.toFixed(2)}ms`);
    
    return result;
  }
  
  /**
   * 평균 렌더링 시간을 계산합니다.
   * @returns {number} 평균 렌더링 시간 (ms)
   */
  getAverageRenderTime() {
    if (this.stats.renders.length === 0) return 0;
    
    const sum = this.stats.renders.reduce((acc, data) => acc + data.renderTime, 0);
    return sum / this.stats.renders.length;
  }
  
  /**
   * 렌더링 성능 통계를 반환합니다.
   * @returns {Object} 성능 통계 객체
   */
  getPerformanceStats() {
    const avgRenderTime = this.getAverageRenderTime();
    
    // 최근 렌더링 시간 추이 (시간 순 정렬)
    const recentRenderTimes = this.stats.renders
      .slice(-10)
      .map(data => data.renderTime);
    
    return {
      frameCount: this.stats.frameCount,
      averageRenderTime: avgRenderTime,
      totalRenderTime: this.stats.totalRenderTime,
      skippedFrames: this.stats.skippedFrames,
      batchedUpdates: this.stats.batchedUpdates,
      recentRenderTimes,
      renderRate: avgRenderTime > 0 ? (1000 / avgRenderTime) : 0
    };
  }
  
  /**
   * 주기적인 성능 측정을 시작합니다.
   * @param {number} interval - 측정 간격 (ms, 기본값: 5000)
   * @param {Function} callback - 측정 결과 콜백
   * @returns {number} 타이머 ID
   */
  startPerformanceMonitoring(interval = 5000, callback) {
    // 성능 측정 활성화
    this.measurePerformance = true;
    
    // 정기적으로 성능 통계 수집 및 로깅
    const timerId = setInterval(() => {
      const stats = this.getPerformanceStats();
      
      if (callback && typeof callback === 'function') {
        callback(stats);
      } else {
        console.log('[RenderOptimizer] 성능 모니터링:', stats);
      }
    }, interval);
    
    return timerId;
  }
  
  /**
   * DOM 변경 관찰을 설정합니다.
   * @param {HTMLElement} target - 관찰할 DOM 요소
   * @param {Function} callback - 변경 감지 콜백
   * @returns {RenderOptimizer} 메서드 체이닝을 위한 this
   */
  observeDOMChanges(target, callback) {
    if (!window.MutationObserver || !target) return this;
    
    // 기존 관찰자 정리
    if (this.observer) {
      this.observer.disconnect();
    }
    
    // 새 관찰자 설정
    this.observer = new MutationObserver(mutations => {
      if (callback && typeof callback === 'function') {
        callback(mutations);
      }
    });
    
    // 관찰 시작
    this.observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });
    
    return this;
  }
  
  /**
   * DOM 변경 관찰을 중지합니다.
   * @returns {RenderOptimizer} 메서드 체이닝을 위한 this
   */
  stopObservingDOMChanges() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    return this;
  }
  
  /**
   * 리소스를 정리하고 최적화기를 비활성화합니다.
   */
  dispose() {
    // 예약된 프레임 취소
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    
    // 관찰자 정리
    this.stopObservingDOMChanges();
    
    // 큐 비우기
    this.pendingReads = [];
    this.pendingWrites = [];
    this.pendingUpdates.clear();
    
    // 상태 초기화
    this.updateScheduled = false;
    
    console.log('[RenderOptimizer] Resources disposed');
  }
}

// 외부 사용을 위해 export
export default RenderOptimizer;