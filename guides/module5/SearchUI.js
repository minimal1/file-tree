/**
 * @class SearchUI
 * @description 파일 트리 검색 및 필터링을 위한 UI 컴포넌트
 * 검색 입력, 필터 컨트롤, 결과 내비게이션 등의 UI 요소를 제공합니다.
 */
class SearchUI {
  /**
   * @constructor
   * @param {HTMLElement} container - UI를 렌더링할 컨테이너 요소
   * @param {Object} options - UI 옵션
   * @param {function} options.onSearch - 검색 이벤트 핸들러
   * @param {function} options.onFilter - 필터 변경 이벤트 핸들러
   * @param {function} options.onNavigateResult - 결과 내비게이션 이벤트 핸들러
   * @param {function} options.onClear - 검색 초기화 이벤트 핸들러
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = Object.assign({
      enableRealTimeSearch: true,
      enableFilters: true,
      enableRegex: true,
      enableCaseSensitive: true,
      searchDebounceTime: 300,
      placeholderText: '파일 또는 폴더 검색...'
    }, options);
    
    // 상태 관리
    this.state = {
      searchText: '',
      caseSensitive: false,
      useRegex: false,
      activeFilters: {},
      resultCount: 0,
      currentResultIndex: -1
    };
    
    // 디바운스 타이머
    this.debounceTimer = null;
    
    this._createUI();
    this._attachEventListeners();
  }
  
  /**
   * UI 요소를 생성합니다.
   * @private
   */
  _createUI() {
    this.container.classList.add('search-ui-container');
    
    // 검색 컨테이너
    this.searchContainer = document.createElement('div');
    this.searchContainer.className = 'search-container';
    
    // 검색 입력 필드
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.className = 'search-input';
    this.searchInput.placeholder = this.options.placeholderText;
    
    // 검색 버튼
    this.searchButton = document.createElement('button');
    this.searchButton.className = 'search-button';
    this.searchButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
    this.searchButton.title = '검색';
    
    // 검색 지우기 버튼
    this.clearButton = document.createElement('button');
    this.clearButton.className = 'clear-button';
    this.clearButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    this.clearButton.title = '검색 지우기';
    this.clearButton.style.display = 'none';
    
    // 검색 요소들을 컨테이너에 추가
    this.searchContainer.appendChild(this.searchInput);
    this.searchContainer.appendChild(this.searchButton);
    this.searchContainer.appendChild(this.clearButton);
    
    // 검색 옵션 컨테이너
    this.optionsContainer = document.createElement('div');
    this.optionsContainer.className = 'search-options-container';
    
    // 대소문자 구분 옵션
    if (this.options.enableCaseSensitive) {
      this.caseCheckbox = document.createElement('input');
      this.caseCheckbox.type = 'checkbox';
      this.caseCheckbox.id = 'case-sensitive';
      this.caseCheckbox.className = 'search-option-checkbox';
      
      const caseLabel = document.createElement('label');
      caseLabel.htmlFor = 'case-sensitive';
      caseLabel.className = 'search-option-label';
      caseLabel.textContent = '대소문자 구분';
      
      const caseContainer = document.createElement('div');
      caseContainer.className = 'search-option-item';
      caseContainer.appendChild(this.caseCheckbox);
      caseContainer.appendChild(caseLabel);
      
      this.optionsContainer.appendChild(caseContainer);
    }
    
    // 정규식 옵션
    if (this.options.enableRegex) {
      this.regexCheckbox = document.createElement('input');
      this.regexCheckbox.type = 'checkbox';
      this.regexCheckbox.id = 'use-regex';
      this.regexCheckbox.className = 'search-option-checkbox';
      
      const regexLabel = document.createElement('label');
      regexLabel.htmlFor = 'use-regex';
      regexLabel.className = 'search-option-label';
      regexLabel.textContent = '정규식 사용';
      
      const regexContainer = document.createElement('div');
      regexContainer.className = 'search-option-item';
      regexContainer.appendChild(this.regexCheckbox);
      regexContainer.appendChild(regexLabel);
      
      this.optionsContainer.appendChild(regexContainer);
    }
    
    // 필터 옵션 컨테이너
    if (this.options.enableFilters) {
      this.filterContainer = document.createElement('div');
      this.filterContainer.className = 'filter-container';
      
      // 필터 토글 버튼
      this.filterToggleButton = document.createElement('button');
      this.filterToggleButton.className = 'filter-toggle-button';
      this.filterToggleButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>';
      this.filterToggleButton.title = '필터 보기/숨기기';
      
      // 파일 유형 필터
      this.fileTypeFilter = document.createElement('select');
      this.fileTypeFilter.className = 'file-type-filter';
      
      const allOption = document.createElement('option');
      allOption.value = 'all';
      allOption.textContent = '모든 파일 유형';
      
      const fileOption = document.createElement('option');
      fileOption.value = 'file';
      fileOption.textContent = '파일만';
      
      const folderOption = document.createElement('option');
      folderOption.value = 'folder';
      folderOption.textContent = '폴더만';
      
      this.fileTypeFilter.appendChild(allOption);
      this.fileTypeFilter.appendChild(fileOption);
      this.fileTypeFilter.appendChild(folderOption);
      
      // 확장자 필터 (인기 확장자 목록)
      this.extensionFilter = document.createElement('select');
      this.extensionFilter.className = 'extension-filter';
      
      const allExtOption = document.createElement('option');
      allExtOption.value = '';
      allExtOption.textContent = '모든 확장자';
      
      // 인기 확장자 목록
      const popularExtensions = ['js', 'ts', 'html', 'css', 'md', 'json', 'py', 'java', 'php', 'txt'];
      
      this.extensionFilter.appendChild(allExtOption);
      popularExtensions.forEach(ext => {
        const option = document.createElement('option');
        option.value = ext;
        option.textContent = `.${ext}`;
        this.extensionFilter.appendChild(option);
      });
      
      // 필터 보기/숨기기 토글 상태
      this.isFilterVisible = false;
      this.fileTypeFilter.style.display = 'none';
      this.extensionFilter.style.display = 'none';
      
      // 필터 컨테이너에 추가
      this.filterContainer.appendChild(this.filterToggleButton);
      this.filterContainer.appendChild(this.fileTypeFilter);
      this.filterContainer.appendChild(this.extensionFilter);
    }
    
    // 결과 내비게이션 컨테이너
    this.resultNavContainer = document.createElement('div');
    this.resultNavContainer.className = 'result-nav-container';
    
    // 결과 ���운터
    this.resultCounter = document.createElement('span');
    this.resultCounter.className = 'result-counter';
    this.resultCounter.textContent = '0 결과';
    
    // 이전 결과 버튼
    this.prevResultButton = document.createElement('button');
    this.prevResultButton.className = 'nav-button prev-button';
    this.prevResultButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';
    this.prevResultButton.title = '이전 결과';
    this.prevResultButton.disabled = true;
    
    // 다음 결과 버튼
    this.nextResultButton = document.createElement('button');
    this.nextResultButton.className = 'nav-button next-button';
    this.nextResultButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
    this.nextResultButton.title = '다음 결과';
    this.nextResultButton.disabled = true;
    
    // 내비게이션 요소들을 컨테이너에 추가
    this.resultNavContainer.appendChild(this.resultCounter);
    this.resultNavContainer.appendChild(this.prevResultButton);
    this.resultNavContainer.appendChild(this.nextResultButton);
    
    // 모든 요소를 메인 컨테이너에 추가
    this.container.appendChild(this.searchContainer);
    this.container.appendChild(this.optionsContainer);
    if (this.options.enableFilters) {
      this.container.appendChild(this.filterContainer);
    }
    this.container.appendChild(this.resultNavContainer);
    
    // 초기에는 결과 내비게이션 숨기기
    this.resultNavContainer.style.display = 'none';
  }
  
  /**
   * 이벤트 리스너를 등록합니다.
   * @private
   */
  _attachEventListeners() {
    // 검색 입력 이벤트
    if (this.options.enableRealTimeSearch) {
      this.searchInput.addEventListener('input', this._handleSearchInput.bind(this));
    }
    
    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this._executeSearch();
      } else if (e.key === 'Escape') {
        this._clearSearch();
      }
    });
    
    // 검색 버튼 클릭 이벤트
    this.searchButton.addEventListener('click', this._executeSearch.bind(this));
    
    // 검색 지우기 버튼 클릭 이벤트
    this.clearButton.addEventListener('click', this._clearSearch.bind(this));
    
    // 대소문자 구분 체크박스 이벤트
    if (this.options.enableCaseSensitive) {
      this.caseCheckbox.addEventListener('change', () => {
        this.state.caseSensitive = this.caseCheckbox.checked;
        
        if (this.searchInput.value) {
          this._executeSearch();
        }
      });
    }
    
    // 정규식 체크박스 이벤트
    if (this.options.enableRegex) {
      this.regexCheckbox.addEventListener('change', () => {
        this.state.useRegex = this.regexCheckbox.checked;
        
        if (this.searchInput.value) {
          this._executeSearch();
        }
      });
    }
    
    // 필터 관련 이벤트
    if (this.options.enableFilters) {
      // 필터 토글 버튼 클릭 이벤트
      this.filterToggleButton.addEventListener('click', this._toggleFilters.bind(this));
      
      // 파일 유형 필터 변경 이벤트
      this.fileTypeFilter.addEventListener('change', this._handleFilterChange.bind(this));
      
      // 확장자 필터 변경 이벤트
      this.extensionFilter.addEventListener('change', this._handleFilterChange.bind(this));
    }
    
    // 결과 내비게이션 이벤트
    this.prevResultButton.addEventListener('click', this._navigateToPrevResult.bind(this));
    this.nextResultButton.addEventListener('click', this._navigateToNextResult.bind(this));
  }
  
  /**
   * 검색 입력 변경 이벤트를 처리합니다.
   * @param {Event} event - 입력 이벤트 객체
   * @private
   */
  _handleSearchInput(event) {
    const searchText = event.target.value;
    
    // 검색어 상태 업데이트
    this.state.searchText = searchText;
    
    // 지우기 버튼 표시 여부 설정
    this.clearButton.style.display = searchText ? 'block' : 'none';
    
    // 디바운스 처리 (연속 입력 시 마지막 입력만 검색)
    clearTimeout(this.debounceTimer);
    
    if (searchText) {
      this.debounceTimer = setTimeout(() => {
        this._executeSearch();
      }, this.options.searchDebounceTime);
    } else {
      this._clearSearch();
    }
  }
  
  /**
   * 검색을 실행합니다.
   * @private
   */
  _executeSearch() {
    const searchText = this.searchInput.value.trim();
    
    if (!searchText) {
      this._clearSearch();
      return;
    }
    
    // 검색 옵션
    const searchOptions = {
      caseSensitive: this.state.caseSensitive,
      useRegex: this.state.useRegex,
      filters: this._getActiveFilters()
    };
    
    // 검색 콜백 호출
    if (this.options.onSearch) {
      this.options.onSearch(searchText, searchOptions);
    }
  }
  
  /**
   * 검색을 초기화합니다.
   * @private
   */
  _clearSearch() {
    // 입력 필드 초기화
    this.searchInput.value = '';
    this.state.searchText = '';
    this.clearButton.style.display = 'none';
    
    // 결과 내비게이션 초기화
    this.resultNavContainer.style.display = 'none';
    this.state.resultCount = 0;
    this.state.currentResultIndex = -1;
    
    // 검색 초기화 콜백 호출
    if (this.options.onClear) {
      this.options.onClear();
    }
  }
  
  /**
   * 필터를 표시하거나 숨깁니다.
   * @private
   */
  _toggleFilters() {
    this.isFilterVisible = !this.isFilterVisible;
    
    this.fileTypeFilter.style.display = this.isFilterVisible ? 'inline-block' : 'none';
    this.extensionFilter.style.display = this.isFilterVisible ? 'inline-block' : 'none';
    
    this.filterToggleButton.classList.toggle('active', this.isFilterVisible);
  }
  
  /**
   * 필터 변경 이벤트를 처리합니다.
   * @private
   */
  _handleFilterChange() {
    const filters = this._getActiveFilters();
    
    // 필터 변경 콜백 호출
    if (this.options.onFilter) {
      this.options.onFilter(filters);
    }
    
    // 검색어가 있는 경우 검색 다시 실행
    if (this.state.searchText) {
      this._executeSearch();
    }
  }
  
  /**
   * 활성화된 필터를 가져옵니다.
   * @returns {Object} 활성화된 필터 객체
   * @private
   */
  _getActiveFilters() {
    const filters = {};
    
    if (this.options.enableFilters) {
      // 파일 유형 필터
      const fileType = this.fileTypeFilter.value;
      if (fileType !== 'all') {
        filters.type = fileType;
      }
      
      // 확장자 필터
      const extension = this.extensionFilter.value;
      if (extension) {
        filters.extension = extension;
      }
    }
    
    return filters;
  }
  
  /**
   * 이전 검색 결과로 이동합니다.
   * @private
   */
  _navigateToPrevResult() {
    if (this.state.resultCount === 0 || this.state.currentResultIndex <= 0) {
      return;
    }
    
    this.state.currentResultIndex = Math.max(0, this.state.currentResultIndex - 1);
    
    // 내비게이션 콜백 호출
    if (this.options.onNavigateResult) {
      this.options.onNavigateResult('prev', this.state.currentResultIndex);
    }
    
    this._updateResultNavigation();
  }
  
  /**
   * 다음 검색 결과로 이동합니다.
   * @private
   */
  _navigateToNextResult() {
    if (this.state.resultCount === 0 || this.state.currentResultIndex >= this.state.resultCount - 1) {
      return;
    }
    
    this.state.currentResultIndex = Math.min(this.state.resultCount - 1, this.state.currentResultIndex + 1);
    
    // 내비게이션 콜백 호출
    if (this.options.onNavigateResult) {
      this.options.onNavigateResult('next', this.state.currentResultIndex);
    }
    
    this._updateResultNavigation();
  }
  
  /**
   * 결과 내비게이션 UI를 업데이트합니다.
   * @private
   */
  _updateResultNavigation() {
    this.resultCounter.textContent = `${this.state.currentResultIndex + 1}/${this.state.resultCount} 결과`;
    
    this.prevResultButton.disabled = this.state.currentResultIndex <= 0;
    this.nextResultButton.disabled = this.state.currentResultIndex >= this.state.resultCount - 1;
  }
  
  /**
   * 검색 결과 정보를 업데이트합니다.
   * @param {number} resultCount - 검색 결과 수
   * @param {number} currentIndex - 현재 결과 인덱스
   */
  updateResults(resultCount, currentIndex = 0) {
    this.state.resultCount = resultCount;
    this.state.currentResultIndex = resultCount > 0 ? currentIndex : -1;
    
    // 결과가 있으면 내비게이션 표시, 없으면 숨김
    this.resultNavContainer.style.display = resultCount > 0 ? 'flex' : 'none';
    
    if (resultCount > 0) {
      this._updateResultNavigation();
    } else {
      this.resultCounter.textContent = '0 결과';
    }
  }
  
  /**
   * 현재 검색 상태를 반환합니다.
   * @returns {Object} 현재 검색 상태
   */
  getSearchState() {
    return { ...this.state };
  }
  
  /**
   * 검색 UI를 초기화하고 기본 값으로 설정합니다.
   */
  reset() {
    this.searchInput.value = '';
    
    if (this.options.enableCaseSensitive) {
      this.caseCheckbox.checked = false;
      this.state.caseSensitive = false;
    }
    
    if (this.options.enableRegex) {
      this.regexCheckbox.checked = false;
      this.state.useRegex = false;
    }
    
    if (this.options.enableFilters) {
      this.fileTypeFilter.value = 'all';
      this.extensionFilter.value = '';
      this.isFilterVisible = false;
      this.fileTypeFilter.style.display = 'none';
      this.extensionFilter.style.display = 'none';
      this.filterToggleButton.classList.remove('active');
    }
    
    this.state.searchText = '';
    this.state.resultCount = 0;
    this.state.currentResultIndex = -1;
    
    this.clearButton.style.display = 'none';
    this.resultNavContainer.style.display = 'none';
  }
  
  /**
   * 확장자 목록을 업데이트합니다.
   * @param {Array} extensions - 파일 확장자 배열
   */
  updateExtensionList(extensions) {
    if (!this.options.enableFilters) return;
    
    // 현재 선택된 값 저장
    const currentValue = this.extensionFilter.value;
    
    // 첫 번째 옵션(모든 확장자)을 제외한 모든 옵션 제거
    while (this.extensionFilter.options.length > 1) {
      this.extensionFilter.remove(1);
    }
    
    // 새 확장자 목록 추가
    extensions.forEach(ext => {
      const option = document.createElement('option');
      option.value = ext;
      option.textContent = `.${ext}`;
      this.extensionFilter.appendChild(option);
    });
    
    // 이전 선택 값 복원 (존재하는 경우)
    if (extensions.includes(currentValue)) {
      this.extensionFilter.value = currentValue;
    }
  }
}

// 외부 사용을 위해 export
export default SearchUI;