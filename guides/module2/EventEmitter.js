/**
 * 이벤트 에미터 클래스
 * Observer 패턴으로 이벤트 기반 통신 구현
 */
class EventEmitter {
  constructor() {
    // 이벤트 이름을 키로, 리스너 배열을 값으로 가지는 맵
    this.listeners = new Map();
  }

  /**
   * 이벤트 리스너 등록
   * @param {string} eventName - 이벤트 이름
   * @param {Function} listener - 이벤트 핸들러 함수
   * @returns {Function} - 리스너 제거를 위한 함수
   */
  on(eventName, listener) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    
    const eventListeners = this.listeners.get(eventName);
    eventListeners.push(listener);
    
    // 리스너 제거를 위한 함수 반환 (구독 취소에 사용)
    return () => this.off(eventName, listener);
  }

  /**
   * 등록된 이벤트 리스너 제거
   * @param {string} eventName - 이벤트 이름
   * @param {Function} listenerToRemove - 제거할 리스너
   */
  off(eventName, listenerToRemove) {
    if (!this.listeners.has(eventName)) {
      return;
    }
    
    const eventListeners = this.listeners.get(eventName);
    const index = eventListeners.indexOf(listenerToRemove);
    
    if (index !== -1) {
      eventListeners.splice(index, 1);
      
      // 리스너가 없으면 맵에서 이벤트 키 제거
      if (eventListeners.length === 0) {
        this.listeners.delete(eventName);
      }
    }
  }

  /**
   * 한 번만 실행되는 이벤트 리스너 등록
   * @param {string} eventName - 이벤트 이름
   * @param {Function} listener - 이벤트 핸들러 함수
   * @returns {Function} - 리스너 제거를 위한 함수
   */
  once(eventName, listener) {
    const onceWrapper = (...args) => {
      listener(...args);
      this.off(eventName, onceWrapper);
    };
    
    return this.on(eventName, onceWrapper);
  }

  /**
   * 이벤트 발생 및 리스너 호출
   * @param {string} eventName - 발생시킬 이벤트 이름
   * @param {...any} args - 리스너에 전달할 인자들
   * @returns {boolean} - 리스너가 호출되었는지 여부
   */
  emit(eventName, ...args) {
    if (!this.listeners.has(eventName)) {
      return false;
    }
    
    const eventListeners = this.listeners.get(eventName);
    eventListeners.forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for "${eventName}":`, error);
      }
    });
    
    return true;
  }

  /**
   * 특정 이벤트의 리스너 개수 반환
   * @param {string} eventName - 이벤트 이름
   * @returns {number} - 리스너 개수
   */
  listenerCount(eventName) {
    if (!this.listeners.has(eventName)) {
      return 0;
    }
    
    return this.listeners.get(eventName).length;
  }

  /**
   * 모든 이벤트 리스너 제거
   * @param {string} [eventName] - 선택적 이벤트 이름, 생략 시 모든 이벤트의 리스너 제거
   */
  removeAllListeners(eventName) {
    if (eventName) {
      this.listeners.delete(eventName);
    } else {
      this.listeners.clear();
    }
  }
}