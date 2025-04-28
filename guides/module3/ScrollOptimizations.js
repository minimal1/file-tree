/**
 * 스크롤 최적화 유틸리티
 * 스크롤 이벤트 처리를 최적화하는 다양한 기법 제공
 */
class ScrollOptimizations {
  /**
   * 함수 디바운싱
   * 연속된 호출에서 마지막 호출만 실행되도록 함
   * 
   * @param {Function} func - 실행할 함수
   * @param {number} wait - 대기 시간(밀리초)
   * @returns {Function} 디바운싱된 함수
   */
  static debounce(func, wait = 100) {
    let timeout;
    
    return function(...args) {
      const context = this;
      
      clearTimeout(timeout);
      
      timeout = setTimeout(() => {
        func.apply(context, args);
      }, wait);
    };
  }

  /**
   * 함수 쓰로틀링
   * 일정 시간 간격으로 최대 한 번만 실행되도록 함
   * 
   * @param {Function} func - 실행할 함수
   * @param {number} limit - 실행 간격(밀리초)
   * @returns {Function} 쓰로틀링된 함수
   */
  static throttle(func, limit = 100) {
    let inThrottle = false;
    
    return function(...args) {
      const context = this;
      
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  }

  /**
   * requestAnimationFrame을 사용한 최적화
   * 브라우저의 리페인트 타이밍에 맞춰 함수 실행
   * 
   * @param {Function} func - 실행할 함수
   * @returns {Function} RAF로 최적화된 함수
   */
  static rAF(func) {
    let ticking = false;
    
    return function(...args) {
      const context = this;
      
      if (!ticking) {
        requestAnimationFrame(() => {
          func.apply(context, args);
          ticking = false;
        });
        
        ticking = true;
      }
    };
  }
}