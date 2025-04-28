/**
 * @class SearchableTreeView
 * @description 검색 및 필터링 기능이 통합된 트리 뷰 컴포넌트
 * 이전 모듈의 EnhancedVirtualTreeView를 확장하여 검색 기능을 추가합니다.
 */
import EnhancedVirtualTreeView from '../module4/EnhancedVirtualTreeView.js';
import TreeSearchEngine from './TreeSearchEngine.js';
import FilterManager from './FilterManager.js';
import SearchUI from './SearchUI.js';

class SearchableTreeView {
  /**
   * @constructor
   * @param {HTMLElement} container - 트리 뷰를 렌더링할 메인 컨테이너
   * @param {Object} options - 트리 뷰 설정 옵션
   * @param {Object} options.treeData - 트리 데이터 모델
   * @param {boolean} options.enableSearchUI - 검색 UI 표시 여부 (기본값: true)
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = Object.assign({
      treeData: [],
      enableSearchUI: true,
      itemHeight: 24,
      searchDebounceTime: 300,
      enableKeyboardNavigation: true,
      enableDragAndDrop: true,
      enableAccessibility: true
    }, options);
    
    // 내부 상태
    this.treeData = this.options.treeData;
    this.eventListeners = {};
    
    // 검색 결과 및 상태
    this.searchResults = [];
    this.currentSearchResultIndex = -1;
    this.activeSearchTerm = '';
    this.activeFilters = {};
    
    // 컨테이너 설정
    this._setupContainers();
    
    // 컴포넌트 초기화
    this._initComponents();
    
    // 이벤트 리스너
    this._attachEventListeners();
  }
  
  /**
   * 컴포넌트의 컨테이너를 설정합니다.
   * @private
   */
  _setupContainers() {
    // 메인 컨테이너 클래스 추가
    this.container.classList.add('searchable-tree-container');
    
    // 검색 UI 컨테이너 (검색 UI 활성화된 경우)
    if (this.options.enableSearchUI) {
      this.searchUIContainer = document.createElement('div');
      this.searchUIContainer.className = 'search-ui-wrapper';
      this.container.appendChild(this.searchUIContainer);
    }
    
    // 트리 뷰 컨테이너
    this.treeViewContainer = document.createElement('div');
    this.treeViewContainer.className = 'tree-view-wrapper';
    this.container.appendChild(this.treeViewContainer);
  }
  
  /**
   * 주요 컴포넌트들을 초기화합니다.
   * @private
   */
  _initComponents() {
    // 검색 엔진 초기화
    this.searchEngine = new TreeSearchEngine(this.treeData, {
      useIndex: true,
      searchAlgorithm: 'dfs'
    });
    
    // 필터 관리자 초기화
    this.filterManager = new FilterManager({
      hideFilteredNodes: true,
      autoExpandMatches: true
    });
    
    // 트리 뷰 초기화
    const treeViewOptions = {
      treeData: this.treeData,
      itemHeight: this.options.itemHeight,
      enableKeyboardNavigation: this.options.enableKeyboardNavigation,
      enableDragAndDrop: this.options.enableDragAndDrop,
      enableAccessibility: this.options.enableAccessibility,
      renderCallback: this._customRenderNode.bind(this)
    };
    
    this.treeView = new EnhancedVirtualTreeView(this.treeViewContainer, treeViewOptions);
    
    // 검색 UI 초기화 (활성화된 경우)
    if (this.options.enableSearchUI) {
      this.searchUI = new SearchUI(this.searchUIContainer, {
        onSearch: this._handleSearch.bind(this),
        onFilter: this._handleFilterChange.bind(this),
        onNavigateResult: this._handleResultNavigation.bind(this),
        onClear: this._handleSearchClear.bind(this),
        searchDebounceTime: this.options.searchDebounceTime
      });
    }
  }
  
  /**
   * 이벤트 리스너를 등록합니다.
   * @private
   */
  _attachEventListeners() {
    // 트리 뷰 이벤트 전달
    if (this.treeView) {
      // 노드 클릭 이벤트
      this.treeView.on('nodeClick', (data) => {
        this._emitEvent('nodeClick', data);
      });
      
      // 노드 선택 이벤트
      this.treeView.on('nodeSelected', (data) => {
        this._emitEvent('nodeSelected', data);
      });
      
      // 노드 확장/축소 이벤트
      this.treeView.on('nodeExpansionToggled', (data) => {
        this._emitEvent('nodeExpansionToggled', data);
        
        if (data.expanded) {
          // 노드 확장 시 검색 인덱스 업데이트 필요
          this._updateSearchIndex();
        }
      });
      
      // 노드 이동 이벤트
      this.treeView.on('nodeMoved', (data) => {
        this._emitEvent('nodeMoved', data);
        
        // 노드 이동 시 검색 인덱스 업데이트 필요
        this._updateSearchIndex();
      });
      
      // 트리 업데이트 이벤트
      this.treeView.on('treeUpdated', (data) => {
        this._emitEvent('treeUpdated', data);
      });
    }
    
    // 키보드 단축키 이벤트
    document.addEventListener('keydown', (e) => {
      // Ctrl+F 또는 Cmd+F: 검색 입력에 포커스
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        if (this.options.enableSearchUI && this.searchUI) {
          this.searchUI.searchInput.focus();
        }
      }
      
      // F3: 다음 검색 결과로 이동
      if (e.key === 'F3') {
        e.preventDefault();
        this._navigateToNextResult();
      }
      
      // Shift+F3: 이전 검색 결과로 이동
      if (e.shiftKey && e.key === 'F3') {
        e.preventDefault();
        this._navigateToPrevResult();
      }
      
      // Escape: 검색 UI에 포커스가 있는 경우 검색 초기화
      if (e.key === 'Escape' && this.searchUI && document.activeElement === this.searchUI.searchInput) {
        e.preventDefault();
        this._handleSearchClear();
      }
    });
  }
  
  /**
   * 노드 렌더링 커스터마이징을 위한 콜백 함수
   * @param {HTMLElement} element - 노드 DOM 요소
   * @param {Object} nodeData - 노드 데이터
   * @private
   */
  _customRenderNode(element, nodeData) {
    // 검색 활성화 상태이고 해당 노드가 검색 결과에 포함된 경우 하이라이팅
    if (this.activeSearchTerm && this.searchResults.some(result => result.id === nodeData.id)) {
      this._highlightSearchTermInNode(element, nodeData, this.activeSearchTerm);
      
      // 현재 포커스된 검색 결과 표시
      const isFocusedResult = this.currentSearchResultIndex !== -1 && 
                              this.searchResults[this.currentSearchResultIndex] && 
                              this.searchResults[this.currentSearchResultIndex].id === nodeData.id;
      
      if (isFocusedResult) {
        element.classList.add('search-result-focused');
      } else {
        element.classList.remove('search-result-focused');
      }
      
      // 검색 결과 스타일 추가
      element.classList.add('search-result');
    } else {
      // 검색 결과 스타일 제거
      element.classList.remove('search-result');
      element.classList.remove('search-result-focused');
    }
  }
  
  /**
   * 노드 내에서 검색어를 하이라이팅합니다.
   * @param {HTMLElement} element - 노드 DOM 요소
   * @param {Object} nodeData - 노드 데이터
   * @param {string} searchTerm - 검색어
   * @private
   */
  _highlightSearchTermInNode(element, nodeData, searchTerm) {
    const labelElement = element.querySelector('.node-label');
    if (!labelElement) return;
    
    // 검색 엔진의 하이라이팅 함수를 사용하여 강조 처리
    const highlightedText = this.searchEngine.highlightText(nodeData.name, searchTerm);
    labelElement.innerHTML = highlightedText;
  }
  
  /**
   * 검색 이벤트 핸들러
   * @param {string} searchText - 검색어
   * @param {Object} options - 검�� 옵션
   * @private
   */
  _handleSearch(searchText, options) {
    console.time('Search execution');
    
    // 검색 엔진 옵션 설정
    this.searchEngine.options.caseSensitive = options.caseSensitive || false;
    this.searchEngine.options.useRegex = options.useRegex || false;
    
    // 검색 실행
    this.searchResults = this.searchEngine.search(searchText, options.filters || {});
    this.activeSearchTerm = searchText;
    this.activeFilters = options.filters || {};
    this.currentSearchResultIndex = this.searchResults.length > 0 ? 0 : -1;
    
    // 검색 결과 정보 업데이트 (UI 있는 경우)
    if (this.options.enableSearchUI && this.searchUI) {
      this.searchUI.updateResults(this.searchResults.length, this.currentSearchResultIndex);
    }
    
    // 검색 결과가 있으면 첫 번째 결과로 이동
    if (this.searchResults.length > 0) {
      this._navigateToResult(0);
    } else {
      // 결과가 없는 경우 트리 뷰 갱신만 수행
      this.treeView.virtualScroller.rerender();
    }
    
    // 검색 완료 이벤트 발생
    this._emitEvent('searchCompleted', {
      searchText,
      resultCount: this.searchResults.length,
      options
    });
    
    console.timeEnd('Search execution');
  }
  
  /**
   * 필터 변경 이벤트 핸들러
   * @param {Object} filters - 필터 객체
   * @private
   */
  _handleFilterChange(filters) {
    this.activeFilters = filters;
    
    // 활성화된 검색어가 있는 경우 검색 다시 실행
    if (this.activeSearchTerm) {
      this._handleSearch(this.activeSearchTerm, {
        caseSensitive: this.searchEngine.options.caseSensitive,
        useRegex: this.searchEngine.options.useRegex,
        filters
      });
    } else {
      // 검색어 없이 필터만 적용
      const filteredNodes = this.filterManager.filter(this.treeData);
      
      // 필터링 결과가 있으면 트리 뷰 업데이트
      if (filteredNodes.length > 0) {
        // TODO: 필터링만 적용된 트리 표시 로직 구현
        this.treeView.virtualScroller.rerender();
      }
    }
    
    // 필터 변경 이벤트 발생
    this._emitEvent('filterChanged', {
      filters,
      resultCount: this.searchResults.length
    });
  }
  
  /**
   * 결과 내비게이션 이벤트 핸들러
   * @param {string} direction - 내비게이션 방향 ('prev' 또는 'next')
   * @param {number} index - 결과 인덱스
   * @private
   */
  _handleResultNavigation(direction, index) {
    this._navigateToResult(index);
  }
  
  /**
   * 검색 초기화 이벤트 핸들러
   * @private
   */
  _handleSearchClear() {
    // 검색 상태 초기화
    this.searchResults = [];
    this.activeSearchTerm = '';
    this.currentSearchResultIndex = -1;
    
    // 트리 뷰 갱신
    this.treeView.virtualScroller.rerender();
    
    // 검색 초기화 이벤트 발생
    this._emitEvent('searchCleared', {});
  }
  
  /**
   * 특정 인덱스의 검색 결과로 이동합니다.
   * @param {number} index - 결과 인덱스
   * @private
   */
  _navigateToResult(index) {
    if (this.searchResults.length === 0 || index < 0 || index >= this.searchResults.length) {
      return;
    }
    
    // 결과 인덱스 업데이트
    this.currentSearchResultIndex = index;
    
    // 검색 결과 노드
    const resultNode = this.searchResults[index];
    
    // 노드가 트리에 표시되도록 부모 폴더들 펼치기
    this._expandParentsOfNode(resultNode);
    
    // 노드 선택 및 포커스
    this.treeView.selectNode(resultNode.id);
    this.treeView.setFocusedNode(resultNode.id);
    
    // 트리 뷰 갱신
    this.treeView.virtualScroller.rerender();
    
    // 결과 내비게이션 이벤트 발생
    this._emitEvent('resultNavigated', {
      resultNode,
      resultIndex: index,
      totalResults: this.searchResults.length
    });
  }
  
  /**
   * 다음 검색 결과로 이동합니다.
   * @private
   */
  _navigateToNextResult() {
    if (this.searchResults.length === 0) return;
    
    const nextIndex = (this.currentSearchResultIndex + 1) % this.searchResults.length;
    this._navigateToResult(nextIndex);
    
    // UI가 있는 경우 결과 카운터 업데이트
    if (this.options.enableSearchUI && this.searchUI) {
      this.searchUI.updateResults(this.searchResults.length, nextIndex);
    }
  }
  
  /**
   * 이전 검색 결과로 이동합니다.
   * @private
   */
  _navigateToPrevResult() {
    if (this.searchResults.length === 0) return;
    
    const prevIndex = (this.currentSearchResultIndex - 1 + this.searchResults.length) % this.searchResults.length;
    this._navigateToResult(prevIndex);
    
    // UI가 있는 경우 결과 카운터 업데이트
    if (this.options.enableSearchUI && this.searchUI) {
      this.searchUI.updateResults(this.searchResults.length, prevIndex);
    }
  }
  
  /**
   * 노드의 모든 부모 폴더를 펼칩니다.
   * @param {Object} node - 대상 노드
   * @private
   */
  _expandParentsOfNode(node) {
    // 노드 경로가 없는 경우 처리할 수 없음
    if (!node.path) return;
    
    // 경로를 기반으로 부모 노드 ID 찾기
    const pathParts = node.path.split('/');
    let currentPath = '';
    
    // 루트부터 현재 노드 직전까지의 모든 경로 부분에 대해
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (i > 0) {
        currentPath += '/';
      }
      currentPath += pathParts[i];
      
      // 현재 경로에 해당하는 노드 찾기
      const pathNode = this._findNodeByPath(this.treeData, currentPath);
      
      // 노드를 찾고 폴더인 경우 펼치기
      if (pathNode && pathNode.type === 'folder') {
        pathNode.expanded = true;
        this.treeView.expandedNodeIds.add(pathNode.id);
      }
    }
    
    // 트리 갱신
    this.treeView._refreshTree();
  }
  
  /**
   * 경로로 노드를 찾습니다.
   * @param {Array|Object} nodes - 검색할 노드 또는 노드 배열
   * @param {string} path - 찾을 경로
   * @returns {Object|null} 찾은 노드 또는 null
   * @private
   */
  _findNodeByPath(nodes, path) {
    const nodeArray = Array.isArray(nodes) ? nodes : [nodes];
    
    for (const node of nodeArray) {
      // 경로가 일치하는 경우
      if (node.path === path) {
        return node;
      }
      
      // 자식 노드 검색
      if (node.children && node.children.length > 0) {
        const foundNode = this._findNodeByPath(node.children, path);
        if (foundNode) return foundNode;
      }
    }
    
    return null;
  }
  
  /**
   * 검색 인덱스를 업데이트합니다.
   * @private
   */
  _updateSearchIndex() {
    // 트리 구조 변경 시 검색 인덱스 재구축
    this.searchEngine.rebuildIndex();
    
    // 활성 검색어가 있는 경우 검색 재실행
    if (this.activeSearchTerm) {
      this._handleSearch(this.activeSearchTerm, {
        caseSensitive: this.searchEngine.options.caseSensitive,
        useRegex: this.searchEngine.options.useRegex,
        filters: this.activeFilters
      });
    }
  }
  
  /**
   * 이벤트를 발생시킵니다.
   * @param {string} eventName - 이벤트 이름
   * @param {Object} data - 이벤트 데이터
   * @private
   */
  _emitEvent(eventName, data) {
    if (this.eventListeners[eventName]) {
      this.eventListeners[eventName].forEach(callback => callback(data));
    }
  }
  
  // 공개 API 메서드
  
  /**
   * 이벤트 리스너를 등록합니다.
   * @param {string} eventName - 이벤트 이름
   * @param {function} callback - 콜백 함수
   * @returns {SearchableTreeView} 메서드 체이닝을 위한 this
   */
  on(eventName, callback) {
    if (!this.eventListeners[eventName]) {
      this.eventListeners[eventName] = [];
    }
    this.eventListeners[eventName].push(callback);
    return this;
  }
  
  /**
   * 이벤트 리스너를 제거합니다.
   * @param {string} eventName - 이벤트 이름
   * @param {function} callback - 제거할 콜백 함수
   * @returns {SearchableTreeView} 메서드 체이닝을 위한 this
   */
  off(eventName, callback) {
    if (this.eventListeners[eventName]) {
      this.eventListeners[eventName] = this.eventListeners[eventName]
        .filter(cb => cb !== callback);
    }
    return this;
  }
  
  /**
   * 검색을 실행합니다.
   * @param {string} query - 검색어
   * @param {Object} options - 검색 옵션
   * @returns {Object} 검색 결과 정보
   */
  search(query, options = {}) {
    // 검색 UI가 있는 경우 UI 상태 업데이트
    if (this.options.enableSearchUI && this.searchUI) {
      // 검색 입력 필드 업데이트
      this.searchUI.searchInput.value = query;
      
      // 대소문자 구분 옵션
      if (this.searchUI.caseCheckbox) {
        this.searchUI.caseCheckbox.checked = options.caseSensitive || false;
      }
      
      // 정규식 옵션
      if (this.searchUI.regexCheckbox) {
        this.searchUI.regexCheckbox.checked = options.useRegex || false;
      }
    }
    
    // 검색 실행
    this._handleSearch(query, options);
    
    // 검색 결과 반환
    return {
      query,
      resultCount: this.searchResults.length,
      results: this.searchResults
    };
  }
  
  /**
   * 노드를 선택합니다.
   * @param {string} nodeId - 노드 ID
   */
  selectNode(nodeId) {
    this.treeView.selectNode(nodeId);
  }
  
  /**
   * 노드 확장 여부를 토글합니다.
   * @param {string} nodeId - 노드 ID
   */
  toggleNodeExpansion(nodeId) {
    this.treeView.toggleNodeExpansion(nodeId);
  }
  
  /**
   * 트리 뷰 인스턴스를 반환합니다.
   * @returns {EnhancedVirtualTreeView} 트리 뷰 인스턴스
   */
  getTreeView() {
    return this.treeView;
  }
  
  /**
   * 검색 엔진 인스턴스를 반환합니다.
   * @returns {TreeSearchEngine} 검색 엔진 인스턴스
   */
  getSearchEngine() {
    return this.searchEngine;
  }
  
  /**
   * 필터 관리자 인스턴스를 반환합니다.
   * @returns {FilterManager} 필터 관리자 인스턴스
   */
  getFilterManager() {
    return this.filterManager;
  }
  
  /**
   * 현재 검색 결과를 반환합니다.
   * @returns {Array} 검색 결과 배열
   */
  getSearchResults() {
    return this.searchResults;
  }
  
  /**
   * 현재 검색 결과 인덱스를 반환합니다.
   * @returns {number} 현재 결과 인덱스
   */
  getCurrentResultIndex() {
    return this.currentSearchResultIndex;
  }
  
  /**
   * 컴포넌트를 초기화합니다.
   */
  reset() {
    // 검색 UI 초기화
    if (this.options.enableSearchUI && this.searchUI) {
      this.searchUI.reset();
    }
    
    // 검색 상태 초기화
    this.searchResults = [];
    this.activeSearchTerm = '';
    this.currentSearchResultIndex = -1;
    this.activeFilters = {};
    
    // 트리 뷰 갱신
    this.treeView.virtualScroller.rerender();
  }
}

// 외부 사용을 위해 export
export default SearchableTreeView;