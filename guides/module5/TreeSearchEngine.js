/**
 * @class TreeSearchEngine
 * @description 파일 트리 구조에서 효율적인 검색 기능을 제공하는 엔진
 * DFS 및 BFS를 활용한 검색 알고리즘 구현과 검색 결과 관리를 담당합니다.
 */
class TreeSearchEngine {
  /**
   * @constructor
   * @param {Object|Array} treeData - 검색 대상 트리 데이터
   * @param {Object} options - 검색 엔진 옵션
   * @param {boolean} options.caseSensitive - 대소문자 구분 여부 (기본값: false)
   * @param {boolean} options.useRegex - 정규식 검색 사용 여부 (기본값: false)
   * @param {boolean} options.useIndex - 인덱스 사용 여부 (기본값: true)
   * @param {string} options.searchAlgorithm - 검색 알고리즘 ('dfs' 또는 'bfs', 기본값: 'dfs')
   */
  constructor(treeData, options = {}) {
    this.treeData = treeData;
    this.options = Object.assign({
      caseSensitive: false,
      useRegex: false,
      useIndex: true,
      searchAlgorithm: 'dfs'
    }, options);
    
    // 검색 결과 및 상태
    this.searchResults = [];
    this.currentResultIndex = -1;
    this.lastQuery = '';
    
    // 검색 인덱스 (성능 최적화용)
    this.searchIndex = this.options.useIndex ? this._buildSearchIndex() : null;
    
    // 검색 결과 캐시
    this.searchCache = new Map();
  }
  
  /**
   * 검색 인덱스를 구축합니다.
   * @returns {Object} 구축된 검색 인덱스
   * @private
   */
  _buildSearchIndex() {
    console.time('Building search index');
    
    // 인덱스 구조 초기화
    const index = {
      nodeMap: new Map(), // ID로 노드 빠르게 조회
      nameIndex: {},      // 이름 기반 인덱스
      pathIndex: {},      // 경로 기반 인덱스
      typeIndex: {        // 타입 기반 인덱스
        file: [],
        folder: []
      },
      extensionIndex: {}  // 확장자 기반 인덱스
    };
    
    // 모든 노드 처리 (평탄화된 트리 생성)
    const processNode = (node, parentPath = '') => {
      // 노드 ID가 없는 경우 생성
      if (!node.id) {
        node.id = `node_${Math.random().toString(36).substring(2, 11)}`;
      }
      
      // 현재 노드 경로 계산
      const nodePath = parentPath ? `${parentPath}/${node.name}` : node.name;
      
      // 노드에 경로 정보 추가
      node.path = nodePath;
      
      // nodeMap에 추가
      index.nodeMap.set(node.id, node);
      
      // 이름 인덱싱
      const lowerName = node.name.toLowerCase();
      if (!index.nameIndex[lowerName]) {
        index.nameIndex[lowerName] = [];
      }
      index.nameIndex[lowerName].push(node.id);
      
      // 각 부분 문자열에 대한 인덱싱
      for (let i = 0; i < lowerName.length; i++) {
        for (let j = i + 1; j <= lowerName.length; j++) {
          const subStr = lowerName.substring(i, j);
          if (!index.nameIndex[subStr]) {
            index.nameIndex[subStr] = [];
          }
          if (!index.nameIndex[subStr].includes(node.id)) {
            index.nameIndex[subStr].push(node.id);
          }
        }
      }
      
      // 경로 인덱싱
      const lowerPath = nodePath.toLowerCase();
      if (!index.pathIndex[lowerPath]) {
        index.pathIndex[lowerPath] = [];
      }
      index.pathIndex[lowerPath].push(node.id);
      
      // 타입 인덱싱
      index.typeIndex[node.type].push(node.id);
      
      // 확장자 인덱싱 (파일인 경우)
      if (node.type === 'file') {
        const matches = node.name.match(/\.([^.]+)$/);
        const extension = matches ? matches[1].toLowerCase() : '';
        
        if (extension) {
          if (!index.extensionIndex[extension]) {
            index.extensionIndex[extension] = [];
          }
          index.extensionIndex[extension].push(node.id);
        }
      }
      
      // 자식 노드가 있는 경우 재귀적으로 처리
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => processNode(child, nodePath));
      }
    };
    
    // 트리 데이터 처리 시작
    const nodes = Array.isArray(this.treeData) ? this.treeData : [this.treeData];
    nodes.forEach(node => processNode(node));
    
    console.timeEnd('Building search index');
    return index;
  }
  
  /**
   * 검색 쿼리에 따른 결과를 반환합니다.
   * @param {string} query - 검색어
   * @param {Object} filters - 추가 필터 조건 (선택적)
   * @returns {Array} 검색 결과 배열
   */
  search(query, filters = {}) {
    // 빈 쿼리인 경우 빈 결과 반환
    if (!query.trim()) {
      this.searchResults = [];
      this.currentResultIndex = -1;
      this.lastQuery = '';
      return this.searchResults;
    }
    
    // 캐시된 결과가 있는지 확인
    const cacheKey = this._getCacheKey(query, filters);
    if (this.searchCache.has(cacheKey)) {
      this.searchResults = this.searchCache.get(cacheKey);
      this.currentResultIndex = this.searchResults.length > 0 ? 0 : -1;
      this.lastQuery = query;
      return this.searchResults;
    }
    
    console.time('Search');
    
    // 검색 옵션에 따라 쿼리 처리
    const processedQuery = this.options.caseSensitive ? query : query.toLowerCase();
    let results = [];
    
    if (this.options.useIndex && this.searchIndex) {
      // 인덱스를 사용한 검색
      results = this._searchWithIndex(processedQuery, filters);
    } else {
      // 트리 순회를 통한 검색
      if (this.options.searchAlgorithm === 'bfs') {
        results = this._searchWithBFS(processedQuery, filters);
      } else {
        results = this._searchWithDFS(processedQuery, filters);
      }
    }
    
    // 결과 저장 및 캐싱
    this.searchResults = results;
    this.currentResultIndex = results.length > 0 ? 0 : -1;
    this.lastQuery = query;
    this.searchCache.set(cacheKey, results);
    
    console.timeEnd('Search');
    return results;
  }
  
  /**
   * 인덱스를 활용한 검색을 수행합니다.
   * @param {string} query - 처리된 검색어
   * @param {Object} filters - 필터 조건
   * @returns {Array} 검색 결과
   * @private
   */
  _searchWithIndex(query, filters) {
    // 정규식 검색 처리
    if (this.options.useRegex) {
      try {
        const regexFlags = this.options.caseSensitive ? '' : 'i';
        const regex = new RegExp(query, regexFlags);
        
        // 모든 노드를 대상으로 정규식 검색
        return Array.from(this.searchIndex.nodeMap.values())
          .filter(node => {
            const nameMatch = regex.test(node.name);
            return nameMatch && this._applyFilters(node, filters);
          });
      } catch (e) {
        console.error('정규식 검색 오류:', e);
        // 정규식 오류 시 일반 검색으로 대체
      }
    }
    
    // 일반 검색
    let matchedNodeIds = [];
    
    // 이름 기반 검색
    Object.keys(this.searchIndex.nameIndex).forEach(key => {
      if (this.options.caseSensitive) {
        // 대소문자 구분 검색
        if (key.includes(query)) {
          matchedNodeIds = matchedNodeIds.concat(this.searchIndex.nameIndex[key]);
        }
      } else {
        // 대소문자 무시 검색
        if (key.includes(query.toLowerCase())) {
          matchedNodeIds = matchedNodeIds.concat(this.searchIndex.nameIndex[key]);
        }
      }
    });
    
    // 중복 제거
    matchedNodeIds = [...new Set(matchedNodeIds)];
    
    // 노드 객체로 변환하고 필터 적용
    return matchedNodeIds
      .map(id => this.searchIndex.nodeMap.get(id))
      .filter(node => this._applyFilters(node, filters));
  }
  
  /**
   * 깊이 우선 탐색(DFS)을 사용한 검색을 수행합니다.
   * @param {string} query - 처리된 검색어
   * @param {Object} filters - 필터 조건
   * @returns {Array} 검색 결과
   * @private
   */
  _searchWithDFS(query, filters) {
    const results = [];
    
    // 정규식 객체 생성 (useRegex가 true인 경우)
    let regex = null;
    if (this.options.useRegex) {
      try {
        const regexFlags = this.options.caseSensitive ? '' : 'i';
        regex = new RegExp(query, regexFlags);
      } catch (e) {
        console.error('정규식 검색 오류:', e);
      }
    }
    
    // DFS 검색 함수
    const dfs = (node) => {
      // 노드명 검색
      let isMatch = false;
      
      if (regex) {
        // 정규식 검색
        isMatch = regex.test(node.name);
      } else if (this.options.caseSensitive) {
        // 대소문자 구분 검색
        isMatch = node.name.includes(query);
      } else {
        // 대소문자 무시 검색
        isMatch = node.name.toLowerCase().includes(query.toLowerCase());
      }
      
      // 매치되고 필터 조건을 만족하면 결과에 추가
      if (isMatch && this._applyFilters(node, filters)) {
        results.push(node);
      }
      
      // 자식 노드가 있으면 재귀적으로 처리
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => dfs(child));
      }
    };
    
    // 루트 노드부터 DFS 시작
    const nodes = Array.isArray(this.treeData) ? this.treeData : [this.treeData];
    nodes.forEach(node => dfs(node));
    
    return results;
  }
  
  /**
   * 너비 우선 탐색(BFS)을 사용한 검색을 수행합니다.
   * @param {string} query - 처리된 검색어
   * @param {Object} filters - 필터 조건
   * @returns {Array} 검색 결과
   * @private
   */
  _searchWithBFS(query, filters) {
    const results = [];
    
    // 정규식 객체 생성 (useRegex가 true인 경우)
    let regex = null;
    if (this.options.useRegex) {
      try {
        const regexFlags = this.options.caseSensitive ? '' : 'i';
        regex = new RegExp(query, regexFlags);
      } catch (e) {
        console.error('정규식 검색 오류:', e);
      }
    }
    
    // BFS 시작 노드 설정
    const queue = Array.isArray(this.treeData) 
      ? [...this.treeData] 
      : [this.treeData];
    
    // BFS 순회
    while (queue.length > 0) {
      const node = queue.shift();
      
      // 노드명 검색
      let isMatch = false;
      
      if (regex) {
        // 정규식 검색
        isMatch = regex.test(node.name);
      } else if (this.options.caseSensitive) {
        // 대소문자 구분 검색
        isMatch = node.name.includes(query);
      } else {
        // 대소문자 무시 검색
        isMatch = node.name.toLowerCase().includes(query.toLowerCase());
      }
      
      // 매치되고 필터 조건을 만족하면 결과에 추가
      if (isMatch && this._applyFilters(node, filters)) {
        results.push(node);
      }
      
      // 자식 노드들을 큐에 추가
      if (node.children && node.children.length > 0) {
        queue.push(...node.children);
      }
    }
    
    return results;
  }
  
  /**
   * 노드에 필터 조건을 적용합니다.
   * @param {Object} node - 검사할 노드
   * @param {Object} filters - 필터 조건
   * @returns {boolean} 필터 조건 만족 여부
   * @private
   */
  _applyFilters(node, filters) {
    // 필터 조건이 없는 경우 항상 true 반환
    if (!filters || Object.keys(filters).length === 0) {
      return true;
    }
    
    // 필터 조건 검사
    for (const [key, value] of Object.entries(filters)) {
      switch (key) {
        case 'type':
          // 타입 필터 (file 또는 folder)
          if (node.type !== value) {
            return false;
          }
          break;
          
        case 'extension':
          // 확장자 필터
          if (node.type === 'file') {
            const matches = node.name.match(/\.([^.]+)$/);
            const extension = matches ? matches[1].toLowerCase() : '';
            
            if (Array.isArray(value)) {
              // 다중 확장자 필터
              if (!value.includes(extension)) {
                return false;
              }
            } else {
              // 단일 확장자 필터
              if (extension !== value.toLowerCase()) {
                return false;
              }
            }
          } else {
            // 폴더인 경우 확장자 필터는 적용하지 않음
            return false;
          }
          break;
          
        case 'custom':
          // 커스텀 필터 함수
          if (typeof value === 'function' && !value(node)) {
            return false;
          }
          break;
          
        // 기타 필드별 필터링
        default:
          if (node[key] !== value) {
            return false;
          }
          break;
      }
    }
    
    // 모든 필터 조건을 통과
    return true;
  }
  
  /**
   * 다음 검색 결과로 이동합니다.
   * @returns {Object|null} 다음 검색 결과 노드 또는 null
   */
  nextResult() {
    if (this.searchResults.length === 0) {
      return null;
    }
    
    // 다음 결과 인덱스로 이동
    this.currentResultIndex = (this.currentResultIndex + 1) % this.searchResults.length;
    return this.searchResults[this.currentResultIndex];
  }
  
  /**
   * 이전 검색 결과로 이동합니다.
   * @returns {Object|null} 이전 검색 결과 노드 또는 null
   */
  prevResult() {
    if (this.searchResults.length === 0) {
      return null;
    }
    
    // 이전 결과 인덱스로 이동
    this.currentResultIndex = (this.currentResultIndex - 1 + this.searchResults.length) % this.searchResults.length;
    return this.searchResults[this.currentResultIndex];
  }
  
  /**
   * 현재 검색 결과 노드를 반환합니다.
   * @returns {Object|null} 현재 검색 결과 노드 또는 null
   */
  getCurrentResult() {
    if (this.currentResultIndex === -1 || this.searchResults.length === 0) {
      return null;
    }
    
    return this.searchResults[this.currentResultIndex];
  }
  
  /**
   * 검색 결과 하이라이팅을 위한 HTML을 생성합니다.
   * @param {string} text - 원본 텍스트
   * @param {string} query - 하이라이트할 검색어
   * @returns {string} 하이라이트된 HTML
   */
  highlightText(text, query) {
    if (!query || !text) {
      return text;
    }
    
    // 정규식 이스케이프
    const escapeRegExp = (string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };
    
    let regex;
    if (this.options.useRegex) {
      try {
        const regexFlags = this.options.caseSensitive ? 'g' : 'gi';
        regex = new RegExp(query, regexFlags);
      } catch (e) {
        // 정규식 오류 시 일반 텍스트 검색으로 대체
        const escapedQuery = escapeRegExp(query);
        regex = new RegExp(escapedQuery, this.options.caseSensitive ? 'g' : 'gi');
      }
    } else {
      const escapedQuery = escapeRegExp(query);
      regex = new RegExp(escapedQuery, this.options.caseSensitive ? 'g' : 'gi');
    }
    
    // 검색어 하이라이트
    return text.replace(regex, match => `<span class="highlight">${match}</span>`);
  }
  
  /**
   * 캐시 키를 생성합니다.
   * @param {string} query - 검색어
   * @param {Object} filters - 필터 조건
   * @returns {string} 캐시 키
   * @private
   */
  _getCacheKey(query, filters) {
    const normalizedQuery = this.options.caseSensitive ? query : query.toLowerCase();
    const filtersKey = JSON.stringify(filters);
    
    return `${normalizedQuery}_${filtersKey}_${this.options.useRegex}_${this.options.searchAlgorithm}`;
  }
  
  /**
   * 검색 결과 수를 반환합니다.
   * @returns {number} 검색 결과 수
   */
  getResultCount() {
    return this.searchResults.length;
  }
  
  /**
   * 검색 인덱스를 재구축합니다.
   */
  rebuildIndex() {
    if (this.options.useIndex) {
      this.searchIndex = this._buildSearchIndex();
      
      // 캐시 초기화
      this.searchCache.clear();
    }
  }
  
  /**
   * 검색 캐시를 지웁니다.
   */
  clearCache() {
    this.searchCache.clear();
  }
  
  /**
   * 전체 노드에 필터를 적용합니다.
   * @param {Object} filters - 필터 조건
   * @returns {Array} 필터링된 노드 배열
   */
  filter(filters) {
    if (!filters || Object.keys(filters).length === 0) {
      return [];
    }
    
    const results = [];
    
    // 인덱스 사용
    if (this.options.useIndex && this.searchIndex) {
      return Array.from(this.searchIndex.nodeMap.values())
        .filter(node => this._applyFilters(node, filters));
    }
    
    // 인덱스 미사용 시 트리 순회
    const processNode = (node) => {
      if (this._applyFilters(node, filters)) {
        results.push(node);
      }
      
      // 자식 노드 처리
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => processNode(child));
      }
    };
    
    // 루트 노드부터 처리 시작
    const nodes = Array.isArray(this.treeData) ? this.treeData : [this.treeData];
    nodes.forEach(node => processNode(node));
    
    return results;
  }
}

// 외부 사용을 위해 export
export default TreeSearchEngine;