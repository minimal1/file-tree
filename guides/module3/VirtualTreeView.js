/**
 * VirtualTreeView 클래스
 * 대용량 데이터를 위한 가상화된 트리 뷰 구현
 */
class VirtualTreeView extends EventEmitter {
  /**
   * @param {HTMLElement} container - 트리가 렌더링될 DOM 컨테이너
   * @param {Array} treeData - 트리 데이터
   * @param {Object} options - 설정 옵션
   */
  constructor(container, treeData = [], options = {}) {
    super();
    
    this.container = container;
    this.originalData = treeData;
    
    // 기본 옵션 설정
    this.options = {
      itemHeight: 24, // 각 항목의 높이 (픽셀)
      overscan: 10,   // 보이는 영역 외에 추가로 렌더링할 항목 수
      indent: 20,     // 들여쓰기 픽셀 크기
      ...options
    };
    
    // 상태 초기화
    this.expandedNodes = new Set();
    this.selectedNodes = new Set();
    this.visibleData = [];
    this.flattenedData = [];
    this.scrollTop = 0;
    
    // DOM 요소 풀 초기화
    this.nodePool = new NodePool('li', 100);
    
    // 데이터 준비
    this.prepareData();
    
    // 렌더링 컨테이너 설정
    this.setupContainer();
    
    // 이벤트 리스너 설정
    this.setupEventListeners();
    
    // 초기 렌더링
    this.render();
  }

  /**
   * 컨테이너 설정 및 스크롤 영역 생성
   */
  setupContainer() {
    // 컨테이너 스타일 설정
    this.container.style.position = 'relative';
    this.container.style.overflow = 'auto';
    this.container.classList.add('virtual-tree-container');
    
    // 내부 요소 생성
    this.viewport = document.createElement('div');
    this.viewport.className = 'virtual-tree-viewport';
    this.viewport.style.position = 'relative';
    this.viewport.style.width = '100%';
    this.viewport.style.overflow = 'hidden';
    
    // 전체 높이를 가질 빈 공간 생성
    this.heightContainer = document.createElement('div');
    this.heightContainer.className = 'virtual-tree-height';
    this.heightContainer.style.position = 'absolute';
    this.heightContainer.style.top = '0';
    this.heightContainer.style.left = '0';
    this.heightContainer.style.width = '1px';
    
    // 항목이 렌더링될 컨테이너
    this.itemsContainer = document.createElement('ul');
    this.itemsContainer.className = 'virtual-tree-items';
    this.itemsContainer.style.position = 'absolute';
    this.itemsContainer.style.top = '0';
    this.itemsContainer.style.left = '0';
    this.itemsContainer.style.width = '100%';
    this.itemsContainer.style.margin = '0';
    this.itemsContainer.style.padding = '0';
    this.itemsContainer.style.listStyle = 'none';
    
    // DOM에 추가
    this.viewport.appendChild(this.heightContainer);
    this.viewport.appendChild(this.itemsContainer);
    this.container.appendChild(this.viewport);
  }

  /**
   * 트리 데이터 준비
   * 계층적 데이터를 평탄화하고 가시성 결정
   */
  prepareData() {
    // 트리 데이터 평탄화
    this.flattenedData = LargeDataGenerator.flattenTree(this.originalData);
    
    // 보이는 노드만 필터링
    this.updateVisibleData();
    
    // 높이 컨테이너 업데이트
    this.updateHeightContainer();
  }

  /**
   * 보이는 노드 배열 업데이트
   */
  updateVisibleData() {
    // 확장된 노드에 따라 보이는 아이템 계산
    this.visibleData = [];
    
    let currentParents = new Set();
    
    this.flattenedData.forEach(node => {
      if (node.level === 0) {
        // 루트 노드는 항상 표시
        this.visibleData.push(node);
        if (node.type === 'folder') {
          currentParents.add(node.id);
        }
      } else {
        // 부모가 확장된 상태인지 확인
        let parentId = node.parentId;
        let isVisible = false;
        
        // 모든 부모 폴더가 확장되었는지 체크
        let allParentsExpanded = true;
        while (parentId) {
          if (!this.expandedNodes.has(parentId)) {
            allParentsExpanded = false;
            break;
          }
          
          // 부모의 부모 찾기
          const parentNode = this.flattenedData.find(n => n.id === parentId);
          if (!parentNode) break;
          
          parentId = parentNode.parentId;
        }
        
        if (allParentsExpanded) {
          this.visibleData.push(node);
          if (node.type === 'folder') {
            currentParents.add(node.id);
          }
        }
      }
    });
  }

  /**
   * 높이 컨테이너 업데이트
   * 전체 스크롤 영역 설정
   */
  updateHeightContainer() {
    const totalHeight = this.visibleData.length * this.options.itemHeight;
    this.heightContainer.style.height = `${totalHeight}px`;
  }

  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    // 스크롤 이벤트 리스너
    const handleScroll = ScrollOptimizations.rAF(() => {
      this.scrollTop = this.container.scrollTop;
      this.render();
    });
    
    // 패시브 스크롤 이벤트 사용
    ScrollOptimizations.addPassiveEventListener(
      this.container, 
      'scroll', 
      handleScroll
    );
    
    // 클릭 이벤트 - 이벤트 위임 사용
    this.itemsContainer.addEventListener('click', (event) => {
      // 노드 컨텐츠 요소 찾기
      const nodeContent = event.target.closest('.node-content');
      if (!nodeContent) return;
      
      // 노드 ID 추출
      const nodeId = nodeContent.dataset.nodeId;
      if (!nodeId) return;
      
      // 노드 찾기
      const node = this.flattenedData.find(n => n.id === nodeId);
      if (!node) return;
      
      // 아이콘 클릭 시 폴더 확장/축소
      if (event.target.classList.contains('node-icon') && node.type === 'folder') {
        this.toggleNodeExpand(nodeId);
      } else {
        // 그 외 클릭은 노드 선택
        this.selectNode(nodeId);
      }
    });
  }

  /**
   * 화면에 보이는 항목만 렌더링
   */
  render() {
    // 현재 보이는 영역 계산
    const { scrollTop, clientHeight } = this.container;
    const startIndex = Math.floor(scrollTop / this.options.itemHeight) - this.options.overscan;
    const endIndex = Math.ceil((scrollTop + clientHeight) / this.options.itemHeight) + this.options.overscan;
    
    // 유효한 인덱스 범위로 제한
    const validStartIndex = Math.max(0, startIndex);
    const validEndIndex = Math.min(this.visibleData.length - 1, endIndex);
    
    // 렌더링할 노드 추출
    const visibleNodes = this.visibleData.slice(validStartIndex, validEndIndex + 1);
    
    // 모든 DOM 요소 풀로 반환
    this.nodePool.releaseAll();
    
    // 항목 컨테이너 비우기
    while (this.itemsContainer.firstChild) {
      this.itemsContainer.removeChild(this.itemsContainer.firstChild);
    }
    
    // 보이는 노드만 렌더링
    visibleNodes.forEach((node, index) => {
      const absoluteIndex = validStartIndex + index;
      const nodeElement = this.renderNode(node, absoluteIndex);
      this.itemsContainer.appendChild(nodeElement);
    });
  }

  /**
   * 개별 노드 렌더링
   * @param {Object} node - 노드 데이터
   * @param {number} index - 보이는 노드 배열에서의 인덱스
   * @returns {HTMLElement} 렌더링된 노드 요소
   */
  renderNode(node, index) {
    // 노드 풀에서 요소 가져오기
    const element = this.nodePool.acquire();
    
    // 위치 설정
    element.style.position = 'absolute';
    element.style.top = `${index * this.options.itemHeight}px`;
    element.style.height = `${this.options.itemHeight}px`;
    element.style.left = '0';
    element.style.right = '0';
    
    // 노드 클래스 설정
    element.className = 'tree-node';
    element.dataset.nodeId = node.id;
    
    // 노드 내용 컨테이너
    const nodeContent = document.createElement('div');
    nodeContent.className = 'node-content';
    nodeContent.dataset.nodeId = node.id;
    
    // 들여쓰기 설정
    nodeContent.style.paddingLeft = `${node.level * this.options.indent}px`;
    
    // 선택 상태에 따른 클래스 추가
    if (this.selectedNodes.has(node.id)) {
      nodeContent.classList.add('selected');
    }
    
    // 아이콘 표시 (폴더/파일)
    const icon = document.createElement('span');
    icon.className = 'node-icon';
    
    if (node.type === 'folder') {
      const isExpanded = this.expandedNodes.has(node.id);
      icon.textContent = isExpanded ? '📂' : '📁';
      icon.classList.add('folder-icon');
    } else {
      icon.textContent = '📄';
      icon.classList.add('file-icon');
    }
    
    // 라벨 (이름) 표시
    const label = document.createElement('span');
    label.className = 'node-label';
    label.textContent = node.name;
    
    // 내용 조합
    nodeContent.appendChild(icon);
    nodeContent.appendChild(label);
    element.appendChild(nodeContent);
    
    return element;
  }

  /**
   * 노드 확장/축소 토글
   * @param {string} nodeId - 토글할 노드 ID
   */
  toggleNodeExpand(nodeId) {
    // 확장 상태 토글
    if (this.expandedNodes.has(nodeId)) {
      this.expandedNodes.delete(nodeId);
    } else {
      this.expandedNodes.add(nodeId);
    }
    
    // 보이는 노드 업데이트
    this.updateVisibleData();
    this.updateHeightContainer();
    
    // 다시 렌더링
    this.render();
    
    // 이벤트 발생
    this.emit('node:expand-toggle', {
      nodeId,
      isExpanded: this.expandedNodes.has(nodeId)
    });
  }

  /**
   * 노드 선택
   * @param {string} nodeId - 선택할 노드 ID
   */
  selectNode(nodeId) {
    // 이전 선택 해제
    this.selectedNodes.clear();
    
    // 새 노드 선택
    this.selectedNodes.add(nodeId);
    
    // 다시 렌더링
    this.render();
    
    // 이벤트 발생
    this.emit('node:select', {
      nodeId,
      node: this.flattenedData.find(n => n.id === nodeId)
    });
  }

  /**
   * 노드로 스크롤 이동
   * @param {string} nodeId - 스크롤할 노드 ID
   */
  scrollToNode(nodeId) {
    const nodeIndex = this.visibleData.findIndex(node => node.id === nodeId);
    
    if (nodeIndex !== -1) {
      const scrollPos = nodeIndex * this.options.itemHeight;
      this.container.scrollTop = scrollPos;
    }
  }
}
