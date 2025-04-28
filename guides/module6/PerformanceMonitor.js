/**
 * @class PerformanceMonitor
 * @description 트리 뷰 컴포넌트의 성능을 측정하고 분석하는 도구
 * 렌더링 시간, 메모리 사용량, FPS 등 다양한 성능 지표를 측정합니다.
 */
class PerformanceMonitor {
  /**
   * @constructor
   * @param {Object} options - 모니터링 옵션
   * @param {boolean} options.autoStart - 자동 측정 시작 여부 (기본값: false)
   * @param {number} options.sampleInterval - 샘플링 간격 (ms, 기본값: 1000)
   * @param {number} options.maxSamples - 최대 샘플 수 (기본값: 60)
   * @param {Function} options.onReport - 측정 보고서 생성 시 콜백
   */
  constructor(options = {}) {
    this.options = Object.assign({
      autoStart: false,
      sampleInterval: 1000,
      maxSamples: 60,
      onReport: null
    }, options);
    
    // 성능 측정 지표
    this.metrics = {
      renderTime: [],        // 렌더링 시간 (ms)
      memoryUsage: [],       // 메모리 사용량 (MB)
      fps: [],               // FPS (Frames Per Second)
      domOperations: [],     // DOM 조작 횟수
      nodeCount: [],         // 노드 개수
      eventCount: [],        // 이벤트 발생 횟수
      timers: new Map(),     // 개별 측정 타이머
      marks: new Map(),      // 성능 마크 (Performance API)
      measures: new Map()    // 성능 측정 (Performance API)
    };
    
    // 측정 상태
    this.isRunning = false;
    this.frameCounter = 0;
    this.lastFrameTime = 0;
    this.domOpCounter = 0;
    this.eventCounter = 0;
    this.sampleTimer = null;
    this.frameTimer = null;
    this.creationTime = performance.now();
    
    // DOM Mutation 감지
    this.setupMutationObserver();
    
    // 자동 시작 설정
    if (this.options.autoStart) {
      this.start();
    }
  }
  
  /**
   * 성능 측정을 시작합니다.
   * @returns {PerformanceMonitor} 메서드 체이닝을 위한 this
   */
  start() {
    if (this.isRunning) return this;
    
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.resetCounters();
    
    // FPS 측정을 위한 프레임 카운터
    this.frameTimer = requestAnimationFrame(this._measureFPS.bind(this));
    
    // 주기적인 샘플링
    this.sampleTimer = setInterval(() => {
      this._takeSample();
    }, this.options.sampleInterval);
    
    // 로그 출력
    console.log('[PerformanceMonitor] 성능 측정 시작');
    
    return this;
  }
  
  /**
   * 성능 측정을 중지합니다.
   * @returns {PerformanceMonitor} 메서드 체이닝을 위한 this
   */
  stop() {
    if (!this.isRunning) return this;
    
    this.isRunning = false;
    
    // 타이머 정리
    if (this.frameTimer) {
      cancelAnimationFrame(this.frameTimer);
      this.frameTimer = null;
    }
    
    if (this.sampleTimer) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
    }
    
    // 최종 샘플링
    this._takeSample();
    
    // 로그 출력
    console.log('[PerformanceMonitor] 성능 측정 중지');
    
    // 보고서 생성 콜백 호출
    if (this.options.onReport && typeof this.options.onReport === 'function') {
      this.options.onReport(this.generateReport());
    }
    
    return this;
  }
  
  /**
   * 특정 작업의 실행 시간 측정을 시작합니다.
   * @param {string} label - 측정 라벨
   * @returns {PerformanceMonitor} 메서드 체이닝을 위한 this
   */
  startMeasure(label) {
    if (!this.isRunning) return this;
    
    // 이미 같은 라벨로 측정 중인 경우 종료
    if (this.metrics.timers.has(label)) {
      this.endMeasure(label);
    }
    
    // 시작 시간 기록
    this.metrics.timers.set(label, performance.now());
    
    // Performance API 마크 추가
    try {
      performance.mark(`${label}-start`);
    } catch (e) {
      console.warn(`[PerformanceMonitor] Performance API error: ${e.message}`);
    }
    
    return this;
  }
  
  /**
   * 특정 작업의 실행 시간 측정을 종료합니다.
   * @param {string} label - 측정 라벨
   * @returns {number|null} 측정 시간 (ms) 또는 측정 실패 시 null
   */
  endMeasure(label) {
    if (!this.isRunning || !this.metrics.timers.has(label)) {
      return null;
    }
    
    const startTime = this.metrics.timers.get(label);
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Performance API 측정
    try {
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);
      
      // 측정 결과 저장
      if (!this.metrics.measures.has(label)) {
        this.metrics.measures.set(label, []);
      }
      
      const measures = this.metrics.measures.get(label);
      measures.push(duration);
      
      // 최대 샘플 수 제한
      if (measures.length > this.options.maxSamples) {
        measures.shift();
      }
    } catch (e) {
      console.warn(`[PerformanceMonitor] Performance API error: ${e.message}`);
    }
    
    // 타이머 정리
    this.metrics.timers.delete(label);
    
    return duration;
  }
  
  /**
   * DOM 조작 작업을 기록합니다.
   * @param {string} operation - 작업 유형 (예: 'create', 'update', 'delete')
   * @param {number} count - 변경된 노드 수 (기본값: 1)
   * @returns {PerformanceMonitor} 메서드 체이닝을 위한 this
   */
  logDOMOperation(operation, count = 1) {
    if (!this.isRunning) return this;
    
    this.domOpCounter += count;
    
    return this;
  }
  
  /**
   * 이벤트 발생을 기록합니다.
   * @param {string} eventType - 이벤트 유형
   * @returns {PerformanceMonitor} 메서드 체이닝을 위한 this
   */
  logEvent(eventType) {
    if (!this.isRunning) return this;
    
    this.eventCounter++;
    
    return this;
  }
  
  /**
   * 트리 노드 수를 기록합니다.
   * @param {number} count - 현재 트리 노드 수
   * @returns {PerformanceMonitor} 메서드 체이닝을 위한 this
   */
  setNodeCount(count) {
    if (!this.isRunning) return this;
    
    // 다음 샘플링에서 저장될 노드 수
    this._currentNodeCount = count;
    
    return this;
  }
  
  /**
   * 모든 측정 카운터를 초기화합니다.
   * @private
   */
  resetCounters() {
    this.frameCounter = 0;
    this.domOpCounter = 0;
    this.eventCounter = 0;
    this._currentNodeCount = 0;
  }
  
  /**
   * 샘플링을 수행합니다.
   * @private
   */
  _takeSample() {
    // 메모리 사용량 측정
    let memoryUsage = 0;
    if (window.performance && window.performance.memory) {
      // Chrome 전용 메모리 측정 API
      memoryUsage = Math.round(window.performance.memory.usedJSHeapSize / (1024 * 1024));
    }
    
    // 현재 FPS 계산 (마지막 간격 동안의 프레임 수)
    const fps = Math.round(this.frameCounter / (this.options.sampleInterval / 1000));
    
    // 측정 지표 저장
    this.metrics.memoryUsage.push(memoryUsage);
    this.metrics.fps.push(fps);
    this.metrics.domOperations.push(this.domOpCounter);
    this.metrics.nodeCount.push(this._currentNodeCount);
    this.metrics.eventCount.push(this.eventCounter);
    
    // 최대 샘플 수 제한
    if (this.metrics.memoryUsage.length > this.options.maxSamples) {
      this.metrics.memoryUsage.shift();
      this.metrics.fps.shift();
      this.metrics.domOperations.shift();
      this.metrics.nodeCount.shift();
      this.metrics.eventCount.shift();
    }
    
    // 카운터 초기화
    this.resetCounters();
  }
  
  /**
   * FPS 측정을 위한 프레임 카운팅
   * @param {number} timestamp - 현재 타임스탬프
   * @private
   */
  _measureFPS(timestamp) {
    // 프레임 카운터 증가
    this.frameCounter++;
    
    // 다음 프레임 요청
    if (this.isRunning) {
      this.frameTimer = requestAnimationFrame(this._measureFPS.bind(this));
    }
  }
  
  /**
   * MutationObserver 설정 (DOM 변경 감지)
   * @private
   */
  setupMutationObserver() {
    // MutationObserver API 지원 확인
    if (!window.MutationObserver) return;
    
    this.observer = new MutationObserver((mutations) => {
      if (!this.isRunning) return;
      
      // 변경된 노드 수 집계
      let addedNodes = 0;
      let removedNodes = 0;
      
      mutations.forEach(mutation => {
        addedNodes += mutation.addedNodes.length;
        removedNodes += mutation.removedNodes.length;
      });
      
      // DOM 조작 작업 기록
      this.logDOMOperation('mutation', addedNodes + removedNodes);
    });
  }
  
  /**
   * 특정 DOM 요소의 변경 감지를 시작합니다.
   * @param {HTMLElement} target - 관찰할 DOM 요소
   * @returns {PerformanceMonitor} 메서드 체이닝을 위한 this
   */
  observeDOM(target) {
    if (!this.observer || !target) return this;
    
    // 관찰 설정
    this.observer.observe(target, {
      childList: true,       // 자식 요소 추가/제거 감지
      subtree: true,         // 하위 트리 변경 감지
      attributes: true,      // 속성 변경 감지
      characterData: true    // 텍스트 변경 감지
    });
    
    return this;
  }
  
  /**
   * DOM 변경 감지를 중지합니다.
   * @returns {PerformanceMonitor} 메서드 체이닝을 위한 this
   */
  disconnectObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    return this;
  }
  
  /**
   * 성능 보고서를 생성합니다.
   * @returns {Object} 성능 측정 보고서
   */
  generateReport() {
    // 측정 통계 계산
    const calculateStats = (values) => {
      if (!values || values.length === 0) return { avg: 0, min: 0, max: 0 };
      
      const sum = values.reduce((acc, val) => acc + val, 0);
      const avg = Math.round((sum / values.length) * 100) / 100;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      return { avg, min, max };
    };
    
    // 성능 마크 및 측정 결과 수집
    const measureStats = {};
    this.metrics.measures.forEach((values, label) => {
      measureStats[label] = calculateStats(values);
    });
    
    // 총 실행 시간
    const totalRuntime = Math.round(performance.now() - this.creationTime);
    
    // 보고서 생성
    return {
      summary: {
        totalRuntime: totalRuntime,
        samples: this.metrics.fps.length,
        sampleInterval: this.options.sampleInterval
      },
      fps: calculateStats(this.metrics.fps),
      memory: calculateStats(this.metrics.memoryUsage),
      domOperations: calculateStats(this.metrics.domOperations),
      nodeCount: calculateStats(this.metrics.nodeCount),
      eventCount: calculateStats(this.metrics.eventCount),
      measures: measureStats,
      raw: {
        fps: [...this.metrics.fps],
        memory: [...this.metrics.memoryUsage],
        domOperations: [...this.metrics.domOperations],
        nodeCount: [...this.metrics.nodeCount],
        eventCount: [...this.metrics.eventCount]
      }
    };
  }
  
  /**
   * 성능 측정 결과를 콘솔에 출력합니다.
   * @param {boolean} detailed - 상세 정보 포함 여부
   * @returns {PerformanceMonitor} 메서드 체이닝을 위한 this
   */
  logReport(detailed = false) {
    const report = this.generateReport();
    
    console.group('📊 성능 측정 보고서');
    console.log(`📈 총 실행 시간: ${report.summary.totalRuntime}ms (${(report.summary.totalRuntime / 1000).toFixed(2)}초)`);
    console.log(`🔄 샘플 수: ${report.summary.samples} (간격: ${report.summary.sampleInterval}ms)`);
    console.log(`⚡ FPS: 평균 ${report.fps.avg}, 최소 ${report.fps.min}, 최대 ${report.fps.max}`);
    console.log(`💾 메모리 사용량: 평균 ${report.memory.avg}MB, 최소 ${report.memory.min}MB, 최대 ${report.memory.max}MB`);
    console.log(`🧱 DOM 조작: 평균 ${report.domOperations.avg}, 총 ${report.domOperations.avg * report.summary.samples}`);
    console.log(`🌲 노드 수: 평균 ${report.nodeCount.avg}, 최대 ${report.nodeCount.max}`);
    
    // 개별 측정 결과
    if (detailed) {
      console.group('⏱️ 개별 측정 결과');
      Object.entries(report.measures).forEach(([label, stats]) => {
        console.log(`${label}: 평균 ${stats.avg.toFixed(2)}ms, 최소 ${stats.min.toFixed(2)}ms, 최대 ${stats.max.toFixed(2)}ms`);
      });
      console.groupEnd();
      
      // 원시 데이터 로깅
      console.group('📉 시계열 데이터');
      console.log('FPS:', report.raw.fps);
      console.log('메모리(MB):', report.raw.memory);
      console.log('DOM 조작:', report.raw.domOperations);
      console.log('노드 수:', report.raw.nodeCount);
      console.groupEnd();
    }
    
    console.groupEnd();
    
    return this;
  }
  
  /**
   * 특정 라벨의 측정 결과를 반환합니다.
   * @param {string} label - 측정 라벨
   * @returns {Object|null} 측정 통계 또는 없는 경우 null
   */
  getMeasureStats(label) {
    if (!this.metrics.measures.has(label)) {
      return null;
    }
    
    const values = this.metrics.measures.get(label);
    
    if (values.length === 0) {
      return null;
    }
    
    const sum = values.reduce((acc, val) => acc + val, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    return {
      label,
      avg,
      min,
      max,
      samples: values.length,
      values: [...values]
    };
  }
  
  /**
   * 모든 측정 데이터를 초기화합니다.
   * @returns {PerformanceMonitor} 메서드 체이닝을 위한 this
   */
  reset() {
    // 측정 중인 경우 중지
    if (this.isRunning) {
      this.stop();
    }
    
    // 모든 지표 초기화
    this.metrics.renderTime = [];
    this.metrics.memoryUsage = [];
    this.metrics.fps = [];
    this.metrics.domOperations = [];
    this.metrics.nodeCount = [];
    this.metrics.eventCount = [];
    this.metrics.timers.clear();
    this.metrics.marks.clear();
    this.metrics.measures.clear();
    
    // 카운터 초기화
    this.resetCounters();
    
    // Performance API 마크 정리
    try {
      performance.clearMarks();
      performance.clearMeasures();
    } catch (e) {
      console.warn(`[PerformanceMonitor] Performance API error: ${e.message}`);
    }
    
    // 생성 시간 재설정
    this.creationTime = performance.now();
    
    return this;
  }
}

// 외부 사용을 위해 export
export default PerformanceMonitor;