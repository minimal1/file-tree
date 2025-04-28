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

  /**
   * 패시브 스크롤 이벤트 리스너 설정
   * 터치/휠 이벤트의 성능 향상
   * 
   * @param {HTMLElement} element - 이벤트를 연결할 요소
   * @param {string} eventName - 이벤트 이름 (예: 'scroll', 'wheel')
   * @param {Function} handler - 이벤트 핸들러
   * @param {Object} options - 추가 옵션
   */
  static addPassiveEventListener(element, eventName, handler, options = {}) {
    const defaultOptions = {
      passive: true,
      ...options
    };
    
    element.addEventListener(eventName, handler, defaultOptions);
    
    // 제거 함수 반환
    return () => {
      element.removeEventListener(eventName, handler, defaultOptions);
    };
  }

  /**
   * 스크롤 위치에 따른 가시성 계산
   * 
   * @param {HTMLElement} element - 확인할 요소
   * @param {HTMLElement} container - 스크롤 컨테이너 (기본값: window)
   * @param {number} offset - 추가 오프셋 (기본값: 0)
   * @returns {boolean} 요소가 보이는지 여부
   */
  static isElementInViewport(element, container = null, offset = 0) {
    const rect = element.getBoundingClientRect();
    
    if (container) {
      const containerRect = container.getBoundingClientRect();
      
      return (
        rect.top <= (containerRect.bottom + offset) &&
        rect.bottom >= (containerRect.top - offset)
      );
    }
    
    return (
      rect.top <= (window.innerHeight + offset) &&
      rect.bottom >= (0 - offset)
    );
  }

  /**
   * 스크롤 위치 추적 유틸리티
   * 스크롤 방향과 위치를 추적
   */
  static createScrollTracker(element = window) {
    let lastScrollTop = element === window ? window.pageYOffset : element.scrollTop;
    let scrollDirection = 'none';
    
    const getScrollInfo = () => ({
      position: element === window ? window.pageYOffset : element.scrollTop,
      direction: scrollDirection
    });
    
    const handleScroll = () => {
      const st = element === window ? window.pageYOffset : element.scrollTop;
      
      if (st > lastScrollTop) {
        scrollDirection = 'down';
      } else if (st < lastScrollTop) {
        scrollDirection = 'up';
      }
      
      lastScrollTop = st;
    };
    
    // 스크롤 이벤트 리스너 등록
    const removeListener = ScrollOptimizations.addPassiveEventListener(
      element, 
      'scroll', 
      ScrollOptimizations.throttle(handleScroll, 100)
    );
    
    // API 반환
    return {
      getScrollInfo,
      removeListener
    };
  }

  /**
   * 스크롤 위치 기반 지연 로딩 구현
   * 
   * @param {Function} loadCallback - 로드 시 호출할 콜백
   * @param {number} offset - 미리 로드할 오프셋
   * @returns {Object} 지연 로딩 컨트롤러
   */
  static createLazyLoader(loadCallback, offset = 200) {
    let isLoading = false;
    let hasMore = true;
    
    const checkAndLoad = () => {
      if (isLoading || !hasMore) return;
      
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const clientHeight = window.innerHeight || document.documentElement.clientHeight;
      
      // 스크롤이 하단에 가까워지면 추가 데이터 로드
      if (scrollTop + clientHeight + offset >= scrollHeight) {
        isLoading = true;
        
        Promise.resolve(loadCallback())
          .then(result => {
            isLoading = false;
            
            // 로드할 항목이 더 없으면 hasMore 플래그 설정
            if (result === false) {
              hasMore = false;
            }
          })
          .catch(() => {
            isLoading = false;
          });
      }
    };
    
    // 쓰로틀링된 스크롤 핸들러 등록
    const throttledCheck = ScrollOptimizations.throttle(checkAndLoad, 200);
    const removeListener = ScrollOptimizations.addPassiveEventListener(
      window,
      'scroll',
      throttledCheck
    );
    
    // 처음 한 번 체크 (초기 화면에 컨텐츠가 적을 경우)
    setTimeout(checkAndLoad, 100);
    
    // API 반환
    return {
      check: checkAndLoad,
      setHasMore: (value) => { hasMore = !!value; },
      destroy: removeListener
    };
  }
}
