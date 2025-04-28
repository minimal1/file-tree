/**
 * KeyboardNavigator 클래스
 * 트리 뷰의 키보드 내비게이션 기능 구현
 */
class TreeKeyboardNavigator {
  /**
   * @param {VirtualTreeView} treeView - 연결할 트리 뷰 인스턴스
   */
  constructor(treeView) {
    this.treeView = treeView;
    this.focusedNodeId = null;
    this.lastDirection = null; // 마지막 이동 방향 (up/down)
    
    // tabindex 설정 (키보드 포커스 가능하도록)
    this.treeView.itemsContainer.setAttribute('tabindex', '0');
    this.treeView.itemsContainer.setAttribute('role', 'tree');
    this.treeView.itemsContainer.setAttribute('aria-label', '파일 트리');
    
    // 이벤트 리스너 설정
    this.setupEventListeners();
  }

  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    this.treeView.itemsContainer.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    // 클릭 시 포커스 처리 (이벤트 위임)
    this.treeView.itemsContainer.addEventListener('click', event => {
      const nodeElement = event.target.closest('[data-node-id]');
      if (nodeElement) {
        const nodeId = nodeElement.dataset.nodeId;
        this.focusNode(nodeId);
      }
    });
    
    // 포커스 받을 때 마지막 노드 또는 첫 노드 포커스
    this.treeView.itemsContainer.addEventListener('focus', event => {
      // 포커스된 노드가 없으면 첫 번째 노드 포커스
      if (!this.focusedNodeId && this.treeView.visibleData.length > 0) {
        this.focusNode(this.treeView.visibleData[0].id);
      }
    });
  }

  /**
   * 키보드 이벤트 처리
   * @param {KeyboardEvent} event - 키보드 이벤트
   */
  handleKeyDown(event) {
    // 이벤트 기본 동작 방지 (필요한 경우만)
    const preventDefaultKeys = [
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 
      'Home', 'End', 'Enter', 'Space'
    ];
    
    if (preventDefaultKeys.includes(event.key)) {
      event.preventDefault();
    }
    
    // 키 입력에 따른 동작 분기
    switch (event.key) {
      case 'ArrowDown':
        this.moveDown();
        break;
        
      case 'ArrowUp':
        this.moveUp();
        break;
        
      case 'ArrowRight':
        this.handleRightArrow();
        break;
        
      case 'ArrowLeft':
        this.handleLeftArrow();
        break;
        
      case 'Home':
        this.moveToFirst();
        break;
        
      case 'End':
        this.moveToLast();
        break;
        
      case 'Enter':
      case ' ': // Space
        this.activateCurrentNode();
        break;
        
      case 'PageDown':
        this.pageDown();
        break;
        
      case 'PageUp':
        this.pageUp();
        break;
    }
  }

  /**
   * 다음 노드로 이동
   */
  moveDown() {
    if (!this.focusedNodeId) {
      // 포커스된 노드가 없으면 첫 번째 노드 선택
      if (this.treeView.visibleData.length > 0) {
        this.focusNode(this.treeView.visibleData[0].id);
      }
      return;
    }
    
    // 현재 노드의 인덱스 찾기
    const currentIndex = this.treeView.visibleData.findIndex(
      node => node.id === this.focusedNodeId
    );
    
    if (currentIndex < this.treeView.visibleData.length - 1) {
      // 다음 노드로 이동
      const nextNode = this.treeView.visibleData[currentIndex + 1];
      this.focusNode(nextNode.id);
    }
    
    this.lastDirection = 'down';
  }

  /**
   * 이전 노드로 이동
   */
  moveUp() {
    if (!this.focusedNodeId) {
      // 포커스된 노드가 없으면 첫 번째 노드 선택
      if (this.treeView.visibleData.length > 0) {
        this.focusNode(this.treeView.visibleData[0].id);
      }
      return;
    }
    
    // 현재 노드의 인덱스 찾기
    const currentIndex = this.treeView.visibleData.findIndex(
      node => node.id === this.focusedNodeId
    );
    
    if (currentIndex > 0) {
      // 이전 노드로 이동
      const prevNode = this.treeView.visibleData[currentIndex - 1];
      this.focusNode(prevNode.id);
    }
    
    this.lastDirection = 'up';
  }

  /**
   * 오른쪽 화살표 처리 (폴더 확장 또는 자식으로 이동)
   */
  handleRightArrow() {
    if (!this.focusedNodeId) return;
    
    // 현재 노드 찾기
    const node = this.treeView.flattenedData.find(
      node => node.id === this.focusedNodeId
    );
    
    if (!node) return;
    
    // 폴더인 경우
    if (node.type === 'folder') {
      if (this.treeView.expandedNodes.has(node.id)) {
        // 이미 확장된 상태이면 첫 번째 자식으로 이동
        const currentIndex = this.treeView.visibleData.findIndex(
          n => n.id === this.focusedNodeId
        );
        
        if (currentIndex < this.treeView.visibleData.length - 1) {
          const nextNode = this.treeView.visibleData[currentIndex + 1];
          if (nextNode.parentId === node.id) {
            this.focusNode(nextNode.id);
          }
        }
      } else {
        // 확장되지 않은 상태이면 확장
        this.treeView.toggleNodeExpand(node.id);
      }
    }
  }

  /**
   * 왼쪽 화살표 처리 (폴더 축소 또는 부모로 이동)
   */
  handleLeftArrow() {
    if (!this.focusedNodeId) return;
    
    // 현재 노드 찾기
    const node = this.treeView.flattenedData.find(
      node => node.id === this.focusedNodeId
    );
    
    if (!node) return;
    
    // 확장된 폴더인 경우 축소
    if (node.type === 'folder' && this.treeView.expandedNodes.has(node.id)) {
      this.treeView.toggleNodeExpand(node.id);
      return;
    }
    
    // 그렇지 않으면 부모 노드로 이동
    if (node.parentId) {
      const parentNode = this.treeView.flattenedData.find(
        n => n.id === node.parentId
      );
      
      if (parentNode) {
        this.focusNode(parentNode.id);
      }
    }
  }

  /**
   * 첫 번째 노드로 이동
   */
  moveToFirst() {
    if (this.treeView.visibleData.length > 0) {
      this.focusNode(this.treeView.visibleData[0].id);
    }
  }

  /**
   * 마지막 노드로 이동
   */
  moveToLast() {
    if (this.treeView.visibleData.length > 0) {
      const lastNode = this.treeView.visibleData[this.treeView.visibleData.length - 1];
      this.focusNode(lastNode.id);
    }
  }

  /**
   * 현재 노드 활성화 (선택 또는 토글)
   */
  activateCurrentNode() {
    if (!this.focusedNodeId) return;
    
    // 현재 노드 찾기
    const node = this.treeView.flattenedData.find(
      node => node.id === this.focusedNodeId
    );
    
    if (!node) return;
    
    // 폴더인 경우 토글
    if (node.type === 'folder') {
      this.treeView.toggleNodeExpand(node.id);
    }
    
    // 노드 선택
    this.treeView.selectNode(node.id);
  }

  /**
   * 페이지 아래로 이동 (여러 항목 건너뛰기)
   */
  pageDown() {
    if (!this.focusedNodeId) return;
    
    // 현재 노드의 인덱스 찾기
    const currentIndex = this.treeView.visibleData.findIndex(
      node => node.id === this.focusedNodeId
    );
    
    if (currentIndex === -1) return;
    
    // 페이지 크기 계산 (컨테이너 높이에 따라)
    const containerHeight = this.treeView.container.clientHeight;
    const itemHeight = this.treeView.options.itemHeight;
    const pageSize = Math.floor(containerHeight / itemHeight);
    
    // 이동할 인덱스 계산
    const targetIndex = Math.min(
      currentIndex + pageSize,
      this.treeView.visibleData.length - 1
    );
    
    // 타겟 노드로 이동
    this.focusNode(this.treeView.visibleData[targetIndex].id);
  }

  /**
   * 페이지 위로 이동 (여러 항목 건너뛰기)
   */
  pageUp() {
    if (!this.focusedNodeId) return;
    
    // 현재 노드의 인덱스 찾기
    const currentIndex = this.treeView.visibleData.findIndex(
      node => node.id === this.focusedNodeId
    );
    
    if (currentIndex === -1) return;
    
    // 페이지 크기 계산 (컨테이너 높이에 따라)
    const containerHeight = this.treeView.container.clientHeight;
    const itemHeight = this.treeView.options.itemHeight;
    const pageSize = Math.floor(containerHeight / itemHeight);
    
    // 이동할 인덱스 계산
    const targetIndex = Math.max(currentIndex - pageSize, 0);
    
    // 타겟 노드로 이동
    this.focusNode(this.treeView.visibleData[targetIndex].id);
  }

  /**
   * 특정 노드에 포커스
   * @param {string} nodeId - 포커스할 노드 ID
   */
  focusNode(nodeId) {
    if (!nodeId) return;
    
    // 이전 포커스 노드에서 포커스 제거
    if (this.focusedNodeId) {
      const prevElement = this.treeView.itemsContainer.querySelector(
        `[data-node-id="${this.focusedNodeId}"] .node-content`
      );
      
      if (prevElement) {
        prevElement.classList.remove('focused');
        prevElement.setAttribute('aria-selected', 'false');
      }
    }
    
    // 새 노드에 포커스 설정
    this.focusedNodeId = nodeId;
    
    // DOM에서 해당 노드 찾기
    const element = this.treeView.itemsContainer.querySelector(
      `[data-node-id="${nodeId}"] .node-content`
    );
    
    if (element) {
      element.classList.add('focused');
      element.setAttribute('aria-selected', 'true');
      
      // 화면에 보이도록 스크롤
      this.scrollNodeIntoView(nodeId);
    }
    
    // 노드 정보 얻기
    const node = this.treeView.flattenedData.find(n => n.id === nodeId);
    
    if (node) {
      // 포커스 변경 이벤트 발생
      this.treeView.emit('node:focus', {
        nodeId,
        node
      });
    }
  }

  /**
   * 노드가 보이도록 스크롤
   * @param {string} nodeId - 스크롤할 노드 ID
   */
  scrollNodeIntoView(nodeId) {
    const index = this.treeView.visibleData.findIndex(n => n.id === nodeId);
    
    if (index === -1) return;
    
    const itemHeight = this.treeView.options.itemHeight;
    const scrollTop = this.treeView.container.scrollTop;
    const clientHeight = this.treeView.container.clientHeight;
    
    const nodeTop = index * itemHeight;
    const nodeBottom = nodeTop + itemHeight;
    
    // 노드가 뷰포트 위쪽을 벗어난 경우
    if (nodeTop < scrollTop) {
      this.treeView.container.scrollTop = nodeTop;
    }
    // 노드가 뷰포트 아래쪽을 벗어난 경우
    else if (nodeBottom > scrollTop + clientHeight) {
      this.treeView.container.scrollTop = nodeBottom - clientHeight;
    }
  }

  /**
   * 다중 선택 처리 (Shift 키 사용)
   * @param {string} endNodeId - 선택 범위의 끝 노드 ID
   */
  selectRange(endNodeId) {
    if (!this.focusedNodeId || !endNodeId) return;
    
    // 시작 노드와 끝 노드의 인덱스 찾기
    const startIndex = this.treeView.visibleData.findIndex(
      node => node.id === this.focusedNodeId
    );
    
    const endIndex = this.treeView.visibleData.findIndex(
      node => node.id === endNodeId
    );
    
    if (startIndex === -1 || endIndex === -1) return;
    
    // 범위 내의 모든 노드 선택
    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);
    
    // 선택된 노드 ID 배열 생성
    const selectedIds = this.treeView.visibleData
      .slice(minIndex, maxIndex + 1)
      .map(node => node.id);
    
    // 트리 뷰에 선택 범위 업데이트 요청
    this.treeView.selectMultipleNodes(selectedIds);
  }
}
