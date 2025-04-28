/**
 * @class FilterManager
 * @description 파일 트리 필터링 기능을 관리하는 클래스
 * 다양한 필터 조건을 조합하고 적용하는 기능을 제공합니다.
 */
class FilterManager {
  /**
   * @constructor
   * @param {Object} options - 필터 매니저 옵션
   * @param {boolean} options.hideFilteredNodes - 필터링된 노드를 숨길지 여부 (기본값: true)
   * @param {boolean} options.autoExpandMatches - 일치하는 노드의 부모를 자동으로 펼칠지 여부 (기본값: true)
   */
  constructor(options = {}) {
    this.options = Object.assign({
      hideFilteredNodes: true,
      autoExpandMatches: true
    }, options);
    
    // 활성화된 필터 목록
    this.activeFilters = new Map();
    
    // 필터 조합 모드 (AND 또는 OR)
    this.filterCombineMode = 'AND';
    
    // 내장 필터 유형
    this.builtInFilters = {
      // 파일 타입 필터 (파일/폴더)
      type: (value) => {
        return (node) => node.type === value;
      },
      
      // 파일 확장자 필터
      extension: (value) => {
        const extensions = Array.isArray(value) ? value : [value];
        
        return (node) => {
          if (node.type !== 'file') return false;
          
          const matches = node.name.match(/\.([^.]+)$/);
          const extension = matches ? matches[1].toLowerCase() : '';
          
          return extensions.includes(extension);
        };
      },
      
      // 이름 포함 필터
      nameContains: (value, caseSensitive = false) => {
        const searchText = caseSensitive ? value : value.toLowerCase();
        
        return (node) => {
          const nodeName = caseSensitive ? node.name : node.name.toLowerCase();
          return nodeName.includes(searchText);
        };
      },
      
      // 정규식 필터
      regex: (pattern, flags = 'i') => {
        try {
          const regex = new RegExp(pattern, flags);
          return (node) => regex.test(node.name);
        } catch (e) {
          console.error('정규식 필터 오류:', e);
          return () => true; // 오류 시 모든 노드를 통과
        }
      },
      
      // 경로 필터
      path: (value, caseSensitive = false) => {
        const searchPath = caseSensitive ? value : value.toLowerCase();
        
        return (node) => {
          if (!node.path) return false;
          
          const nodePath = caseSensitive ? node.path : node.path.toLowerCase();
          return nodePath.includes(searchPath);
        };
      },
      
      // 수정 날짜 필터 (before, after, between 지원)
      date: (value) => {
        if (typeof value === 'object') {
          const { before, after, between } = value;
          
          return (node) => {
            if (!node.modifiedDate) return false;
            
            const nodeDate = new Date(node.modifiedDate);
            
            if (between && Array.isArray(between) && between.length === 2) {
              const startDate = new Date(between[0]);
              const endDate = new Date(between[1]);
              return nodeDate >= startDate && nodeDate <= endDate;
            }
            
            if (before) {
              const beforeDate = new Date(before);
              if (nodeDate > beforeDate) return false;
            }
            
            if (after) {
              const afterDate = new Date(after);
              if (nodeDate < afterDate) return false;
            }
            
            return true;
          };
        }
        
        // 단일 날짜 필터 (정확히 일치)
        const dateValue = new Date(value);
        return (node) => {
          if (!node.modifiedDate) return false;
          
          const nodeDate = new Date(node.modifiedDate);
          return nodeDate.toDateString() === dateValue.toDateString();
        };
      },
      
      // 크기 필터 (파일 크기)
      size: (value) => {
        if (typeof value === 'object') {
          const { min, max } = value;
          
          return (node) => {
            if (!node.size || node.type !== 'file') return false;
            
            if (min !== undefined && node.size < min) return false;
            if (max !== undefined && node.size > max) return false;
            
            return true;
          };
        }
        
        // 정확한 크기 일치
        return (node) => {
          if (!node.size || node.type !== 'file') return false;
          return node.size === value;
        };
      }
    };
    
    // 필터링 결과 캐시
    this.resultCache = new Map();
  }
  
  /**
   * 새 필터를 추가합니다.
   * @param {string} filterId - 필터 ID
   * @param {function|string} filter - 필터 함수 또는 내장 필터 이름
   * @param {*} value - 필터 값 (내장 필터인 경우)
   * @returns {FilterManager} 메서드 체이닝을 위한 this
   */
  addFilter(filterId, filter, value) {
    let filterFn;
    
    if (typeof filter === 'function') {
      // 직접 필터 함수 사용
      filterFn = filter;
    } else if (typeof filter === 'string' && this.builtInFilters[filter]) {
      // 내장 필터 사용
      filterFn = this.builtInFilters[filter](value);
    } else {
      console.error(`알 수 없는 필터: ${filter}`);
      return this;
    }
    
    this.activeFilters.set(filterId, filterFn);
    this.clearCache();
    
    return this;
  }
  
  /**
   * 필터를 제거합니다.
   * @param {string} filterId - 제거할 필터 ID
   * @returns {FilterManager} 메서드 체이닝을 위한 this
   */
  removeFilter(filterId) {
    if (this.activeFilters.has(filterId)) {
      this.activeFilters.delete(filterId);
      this.clearCache();
    }
    
    return this;
  }
  
  /**
   * 모든 필터를 제거합니다.
   * @returns {FilterManager} 메서드 체이닝을 위한 this
   */
  clearFilters() {
    this.activeFilters.clear();
    this.clearCache();
    
    return this;
  }
  
  /**
   * 필터 캐시를 지웁니다.
   */
  clearCache() {
    this.resultCache.clear();
  }
  
  /**
   * 필터 조합 모드를 설정합니다.
   * @param {string} mode - 조합 모드 ('AND' 또는 'OR')
   * @returns {FilterManager} 메서드 체이닝을 위한 this
   */
  setCombineMode(mode) {
    if (mode === 'AND' || mode === 'OR') {
      this.filterCombineMode = mode;
      this.clearCache();
    } else {
      console.error(`유효하지 않은 필터 조합 모드: ${mode}. 'AND' 또는 'OR'만 사용 가능합니다.`);
    }
    
    return this;
  }
  
  /**
   * 노드에 모든 활성 필터를 적용합니다.
   * @param {Object} node - 필터링할 노드
   * @returns {boolean} 노드가 필터 조건을 만족하는지 여부
   */
  applyFilters(node) {
    // 캐시 확인
    const cacheKey = node.id || JSON.stringify(node);
    if (this.resultCache.has(cacheKey)) {
      return this.resultCache.get(cacheKey);
    }
    
    // 활성화된 필터가 없는 경우 항상 통과
    if (this.activeFilters.size === 0) {
      return true;
    }
    
    let result;
    
    if (this.filterCombineMode === 'AND') {
      // AND 모드: 모든 필터 만족해야 함
      result = Array.from(this.activeFilters.values()).every(filter => filter(node));
    } else {
      // OR 모드: 하나의 필터라도 만족하면 됨
      result = Array.from(this.activeFilters.values()).some(filter => filter(node));
    }
    
    // 결과 캐싱
    this.resultCache.set(cacheKey, result);
    
    return result;
  }
  
  /**
   * 트리 데이터에 필터를 적용하여 일치하는 노드만 반환합니다.
   * @param {Array|Object} treeData - 필터링할 트리 데이터
   * @returns {Array} 필터링된 노드 배열
   */
  filterTree(treeData) {
    const nodes = Array.isArray(treeData) ? treeData : [treeData];
    const results = [];
    
    // 모든 노드를 대상으로 필터 적용
    const processNode = (node) => {
      const matchesFilter = this.applyFilters(node);
      
      if (matchesFilter) {
        results.push(node);
      }
      
      // 자식 노드 처리
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => processNode(child));
      }
    };
    
    nodes.forEach(node => processNode(node));
    
    return results;
  }
  
  /**
   * 트리 데이터를 필터링하여 표시/숨김 처리를 위한 상태 데이터를 반환합니다.
   * 원본 트리 구조를 유지하면서 각 노드의 표시 여부 정보를 포함합니다.
   * @param {Array|Object} treeData - 필터링할 트리 데이터
   * @returns {Object} 필터링 상태가 포함된 트리 데이터
   */
  processTreeVisibility(treeData) {
    const nodes = Array.isArray(treeData) ? treeData : [treeData];
    const result = [];
    
    // 자동 확장을 위한 일치 노드 ID 수집
    const matchedNodeIds = new Set();
    const parentNodeMap = new Map();
    
    // 1단계: 필터와 일치하는 노드 찾기 및 부모-자식 관계 매핑
    const identifyMatches = (node, parent = null) => {
      // 부모-자식 관계 기록
      if (parent) {
        parentNodeMap.set(node.id, parent);
      }
      
      // 필터 적용
      const matchesFilter = this.applyFilters(node);
      
      if (matchesFilter) {
        matchedNodeIds.add(node.id);
      }
      
      // 자식 노드 재귀 처리
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => identifyMatches(child, node));
      }
    };
    
    // 2단계: 일치하는 노드의 모든 부모 노드 식별
    const expandParentNodes = () => {
      if (!this.options.autoExpandMatches) return;
      
      const parentsToExpand = new Set();
      
      // 일치하는 모든 노드의 부모를 찾아 확장 집합에 추가
      matchedNodeIds.forEach(nodeId => {
        let currentParent = parentNodeMap.get(nodeId);
        
        while (currentParent) {
          parentsToExpand.add(currentParent.id);
          currentParent = parentNodeMap.get(currentParent.id);
        }
      });
      
      return parentsToExpand;
    };
    
    // 3단계: 각 노드의 표시 여부 결정 및 확장 상태 업데이트
    const processNode = (node) => {
      // 노드 복사본 생성
      const processedNode = { ...node };
      
      // 부모 경로에 포함되거나 필터와 일치하면 표시
      const matchesFilter = matchedNodeIds.has(node.id);
      const shouldBeVisible = matchesFilter || !this.options.hideFilteredNodes;
      
      // 표시 여부 설정
      processedNode.visible = shouldBeVisible;
      
      // 자식 노드 처리
      if (node.children && node.children.length > 0) {
        processedNode.children = node.children.map(child => processNode(child));
        
        // 자식 중 표시되는 항목이 있으면 부모도 표시
        const hasVisibleChildren = processedNode.children.some(child => child.visible);
        if (hasVisibleChildren) {
          processedNode.visible = true;
        }
      }
      
      // 필터 일치 여부 표시
      processedNode.matches = matchesFilter;
      
      return processedNode;
    };
    
    // 필터 일치 노드 식별 및 부모-자식 관계 매핑
    nodes.forEach(node => identifyMatches(node));
    
    // 부모 노드 확장 정보 계산
    const parentsToExpand = expandParentNodes();
    
    // 표시 여부 처리 및 결과 생성
    nodes.forEach(node => {
      // 확장 상태 처리 (자동 확장 설정된 경우)
      if (parentsToExpand && parentsToExpand.has(node.id)) {
        node.expanded = true;
      }
      
      result.push(processNode(node));
    });
    
    return Array.isArray(treeData) ? result : result[0];
  }
  
  /**
   * 필터 적용 결과 객체를 생성합니다.
   * @param {Array|Object} treeData - 필터링할 트리 데이터
   * @returns {Object} 필터 적용 결과 객체
   */
  applyFiltersToTree(treeData) {
    // 필터링된 가시성 정보가 포함된 트리
    const processedTree = this.processTreeVisibility(treeData);
    
    // 필터와 일치하는 노드만 포함된 평면화된 배열
    const matchingNodes = this.filterTree(treeData);
    
    return {
      // 원본 트리 구조를 유지하면서 표시 여부 정보 포함
      processedTree,
      
      // 필터에 일치하는 노드만 포함된 평면화된 배열
      matchingNodes,
      
      // 일치하는 노드 수
      matchCount: matchingNodes.length,
      
      // 필터 설정 정보
      filterInfo: {
        activeFilterCount: this.activeFilters.size,
        combineMode: this.filterCombineMode
      }
    };
  }
  
  /**
   * 현재 활성화된 필터 ID 목록을 반환합니다.
   * @returns {Array} 활성화된 필터 ID 배열
   */
  getActiveFilterIds() {
    return Array.from(this.activeFilters.keys());
  }
  
  /**
   * 특정 필터가 활성화되어 있는지 확인합니다.
   * @param {string} filterId - 확인할 필터 ID
   * @returns {boolean} 필터 활성화 여부
   */
  isFilterActive(filterId) {
    return this.activeFilters.has(filterId);
  }
}

// 외부 사용을 위해 export
export default FilterManager;