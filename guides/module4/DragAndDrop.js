/**
 * TreeDragAndDrop 클래스
 * 트리 뷰의 드래그 앤 드롭 기능 구현
 */
class TreeDragAndDrop {
  /**
   * @param {VirtualTreeView} treeView - 연결할 트리 뷰 인스턴스
   */
  constructor(treeView) {
    this.treeView = treeView;
    this.draggedNodeId = null;  // 현재 드래그 중인 노드 ID
    this.dropTargetNodeId = null; // 현재 드롭 대상 노드 ID
    this.dragGhost = null; // 드래그 고스트 요소
    this.scrollTimer = null; // 자동 스크롤용 타이머
    
    // 스크롤 민감 영역 (픽셀)
    this.scrollSensitiveArea = 50;
    
    // 드래그 지연 설정
    this.dragDelay = 200; // 밀리초
    this.dragDelayTimer = null;
    this.potentialDragStart = null;
    
    // 설정
    this.options = {
      enableFileDragging: true,    // 파일 드래그 허용
      enableFolderDragging: true,  // 폴더 드래그 허용
      dropOnFolder: true,          // 폴더에 드롭 허용
      dropBetweenNodes: true,      // 노드 사이에 드롭 허용
      visualFeedback: true,        // 드래그 중 시각적 표시
      ghostImage: true             // 드래그 고스트 이미지 사용
    };
    
    // 이벤트 리스너 설정
    this.setupEventListeners();
  }

  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    const container = this.treeView.itemsContainer;
    
    // 이벤트 위임을 사용한 드래그 시작 처리
    container.addEventListener('mousedown', this.handleMouseDown.bind(this));
    container.addEventListener('mousemove', this.handleMouseMove.bind(this));
    container.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // 드래그 이벤트 처리
    container.addEventListener('dragstart', this.handleDragStart.bind(this));
    container.addEventListener('dragover', this.handleDragOver.bind(this));
    container.addEventListener('dragenter', this.handleDragEnter.bind(this));
    container.addEventListener('dragleave', this.handleDragLeave.bind(this));
    container.addEventListener('drop', this.handleDrop.bind(this));
    container.addEventListener('dragend', this.handleDragEnd.bind(this));
    
    // 브라우저 창 밖으로 드래그했을 때도 정리
    document.addEventListener('mouseup', this.handleDocumentMouseUp.bind(this));
  }

  /**
   * 마우스 다운 이벤트 처리 (드래그 지연 시작)
   * @param {MouseEvent} event - 마우스 이벤트
   */
  handleMouseDown(event) {
    // 드래그 가능한 요소인지 확인
    const nodeContent = event.target.closest('.node-content');
    if (!nodeContent) return;
    
    const nodeId = nodeContent.dataset.nodeId;
    if (!nodeId) return;
    
    // 노드 정보 가져오기
    const node = this.treeView.flattenedData.find(n => n.id === nodeId);
    if (!node) return;
    
    // 드래그 가능 여부 확인
    if (!this.isNodeDraggable(node)) return;
    
    // 드래그 지연 타이머 설정
    this.potentialDragStart = {
      nodeId,
      x: event.clientX,
      y: event.clientY
    };
    
    this.dragDelayTimer = setTimeout(() => {
      // 드래그 준비
      this.prepareDrag(nodeId);
      
      // 노드 요소에 draggable 속성 추가
      const nodeElement = this.treeView.itemsContainer.querySelector(`[data-node-id="${nodeId}"] .node-content`);
      if (nodeElement) {
        nodeElement.setAttribute('draggable', 'true');
      }
    }, this.dragDelay);
  }

  /**
   * 마우스 이동 이벤트 처리 (드래그 취소 판단)
   * @param {MouseEvent} event - 마우스 이벤트
   */
  handleMouseMove(event) {
    if (!this.potentialDragStart) return;
    
    // 마우스가 임계값 이상 이동했는지 확인
    const dx = event.clientX - this.potentialDragStart.x;
    const dy = event.clientY - this.potentialDragStart.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 임계값 이상 이동했으면 드래그 준비
    if (distance > 5) {
      clearTimeout(this.dragDelayTimer);
      this.prepareDrag(this.potentialDragStart.nodeId);
      
      const nodeElement = this.treeView.itemsContainer.querySelector(`[data-node-id="${this.potentialDragStart.nodeId}"] .node-content`);
      if (nodeElement) {
        nodeElement.setAttribute('draggable', 'true');
      }
    }
  }

  /**
   * 마우스 업 이벤트 처리 (드래그 취소)
   */
  handleMouseUp() {
    // 드래그 지연 타이머 취소
    if (this.dragDelayTimer) {
      clearTimeout(this.dragDelayTimer);
      this.dragDelayTimer = null;
    }
    
    this.potentialDragStart = null;
  }

  /**
   * 문서 전체 마우스 업 이벤트 처리 (드래그 취소)
   */
  handleDocumentMouseUp() {
    this.handleMouseUp();
    
    // 드래그 중이었다면 정리
    if (this.draggedNodeId) {
      this.cleanupDrag();
    }
  }

  /**
   * 드래그 시작 이벤트 처리
   * @param {DragEvent} event - 드래그 이벤트
   */
  handleDragStart(event) {
    const nodeContent = event.target.closest('.node-content');
    if (!nodeContent) {
      event.preventDefault();
      return;
    }
    
    const nodeId = nodeContent.dataset.nodeId;
    if (!nodeId) {
      event.preventDefault();
      return;
    }
    
    // 노드 정보 가져오기
    const node = this.treeView.flattenedData.find(n => n.id === nodeId);
    if (!node || !this.isNodeDraggable(node)) {
      event.preventDefault();
      return;
    }
    
    // 드래그 시작 처리
    this.draggedNodeId = nodeId;
    
    // 드래그 데이터 설정
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', nodeId);
    
    // 드래그 이미지 설정
    if (this.options.ghostImage) {
      this.createDragGhost(node, event);
    }
    
    // 드래그 중인 노드 스타일 변경
    nodeContent.classList.add('dragging');
    
    // 드래그 시작 이벤트 발생
    this.treeView.emit('drag:start', {
      nodeId,
      node
    });
  }

  /**
   * 드래그 오버 이벤트 처리
   * @param {DragEvent} event - 드래그 이벤트
   */
  handleDragOver(event) {
    if (!this.draggedNodeId) return;
    
    // 기본 동작 방지 (드롭 허용을 위해)
    event.preventDefault();
    
    // 드래그 효과 설정
    event.dataTransfer.dropEffect = 'move';
    
    // 드롭 위치 계산
    this.calculateDropPosition(event);
    
    // 자동 스크롤 처리
    this.handleAutoScroll(event);
  }

  /**
   * 드래그 엔터 이벤트 처리
   * @param {DragEvent} event - 드래그 이벤트
   */
  handleDragEnter(event) {
    if (!this.draggedNodeId) return;
    
    // 기본 동작 방지
    event.preventDefault();
    
    // 상위 요소로 이벤트 전파 방지
    event.stopPropagation();
    
    const nodeElement = event.target.closest('[data-node-id]');
    if (!nodeElement) return;
    
    const nodeId = nodeElement.dataset.nodeId;
    if (!nodeId || nodeId === this.draggedNodeId) return;
    
    // 드롭 대상 노드 업데이트
    this.setDropTargetNode(nodeId);
  }

  /**
   * 드래그 리브 이벤트 처리
   * @param {DragEvent} event - 드래그 이벤트
   */
  handleDragLeave(event) {
    if (!this.draggedNodeId) return;
    
    // 상위 요소로 이벤트 전파 방지
    event.stopPropagation();
    
    // 실제로 드래그가 대상을 떠났는지 확인
    const nodeElement = event.target.closest('[data-node-id]');
    if (nodeElement && this.dropTargetNodeId === nodeElement.dataset.nodeId) {
      // 자식 요소 간 이동일 수 있으므로 확인 필요
      const relatedTarget = event.relatedTarget;
      if (!nodeElement.contains(relatedTarget)) {
        // 드롭 대상 노드 제거
        this.clearDropTarget();
      }
    }
  }

  /**
   * 드롭 이벤트 처리
   * @param {DragEvent} event - 드래그 이벤트
   */
  handleDrop(event) {
    // 기본 동작 방지
    event.preventDefault();
    
    // 드래그 중이 아니면 무시
    if (!this.draggedNodeId) return;
    
    // 드롭 위치 계산
    const dropInfo = this.calculateDropPosition(event);
    
    if (!dropInfo.isValid) {
      this.cleanupDrag();
      return;
    }
    
    // 드롭 실행
    this.executeMove(this.draggedNodeId, dropInfo);
    
    // 드래그 정리
    this.cleanupDrag();
    
    // 트리 업데이트
    this.treeView.updateVisibleData();
    this.treeView.updateHeightContainer();
    this.treeView.render();
  }

  /**
   * 드래그 종료 이벤트 처리
   * @param {DragEvent} event - 드래그 이벤트
   */
  handleDragEnd(event) {
    this.cleanupDrag();
  }

  /**
   * 드래그 이미지(고스트) 생성
   * @param {Object} node - 드래그 중인 노드
   * @param {DragEvent} event - 드래그 이벤트
   */
  createDragGhost(node, event) {
    // 이미 고스트가 있으면 제거
    if (this.dragGhost) {
      document.body.removeChild(this.dragGhost);
    }
    
    // 고스트 요소 생성
    this.dragGhost = document.createElement('div');
    this.dragGhost.className = 'drag-ghost';
    this.dragGhost.innerHTML = `
      <span class="ghost-icon">${node.type === 'folder' ? '📂' : '📄'}</span>
      <span class="ghost-label">${node.name}</span>
    `;
    
    // 고스트 요소를 body에 추가 (화면 밖으로)
    this.dragGhost.style.position = 'absolute';
    this.dragGhost.style.top = '-9999px';
    this.dragGhost.style.left = '-9999px';
    this.dragGhost.style.opacity = '0.8';
    this.dragGhost.style.padding = '5px 10px';
    this.dragGhost.style.backgroundColor = '#f5f5f5';
    this.dragGhost.style.border = '1px solid #ccc';
    this.dragGhost.style.borderRadius = '3px';
    this.dragGhost.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    this.dragGhost.style.zIndex = '1000';
    
    document.body.appendChild(this.dragGhost);
    
    // 드래그 이미지 설정
    event.dataTransfer.setDragImage(this.dragGhost, 10, 10);
  }

  /**
   * 드롭 위치 계산
   * @param {DragEvent} event - 드래그 이벤트
   * @returns {Object} 드롭 위치 정보
   */
  calculateDropPosition(event) {
    const result = {
      targetNodeId: null,
      position: 'inside', // 'inside', 'before', 'after'
      isValid: false
    };
    
    // 드롭 대상 노드 요소 찾기
    const nodeElement = event.target.closest('[data-node-id]');
    if (!nodeElement) return result;
    
    const nodeId = nodeElement.dataset.nodeId;
    if (!nodeId || nodeId === this.draggedNodeId) return result;
    
    // 노드 정보 가져오기
    const targetNode = this.treeView.flattenedData.find(n => n.id === nodeId);
    const draggedNode = this.treeView.flattenedData.find(n => n.id === this.draggedNodeId);
    
    if (!targetNode || !draggedNode) return result;
    
    // 순환 참조 방지 (드래그 노드가 타겟 노드의 조상인 경우)
    if (this.isAncestor(draggedNode.id, targetNode.id)) {
      return result;
    }
    
    result.targetNodeId = nodeId;
    
    // 폴더에 드롭하는 경우
    if (targetNode.type === 'folder' && this.options.dropOnFolder) {
      // 커서 위치에 따라 폴더 내부 또는 주변에 드롭
      const rect = nodeElement.getBoundingClientRect();
      const mouseY = event.clientY;
      const relativeY = mouseY - rect.top;
      
      if (relativeY < rect.height * 0.25) {
        // 상단 25% - 폴더 위에 드롭
        result.position = 'before';
      } else if (relativeY > rect.height * 0.75) {
        // 하단 25% - 폴더 아래에 드롭
        result.position = 'after';
      } else {
        // 중간 50% - 폴더 내부에 드롭
        result.position = 'inside';
      }
      
      this.updateDropIndicator(nodeElement, result.position);
      result.isValid = true;
      
    } else if (this.options.dropBetweenNodes) {
      // 파일 또는 폴더 사이에 드롭
      const rect = nodeElement.getBoundingClientRect();
      const mouseY = event.clientY;
      const relativeY = mouseY - rect.top;
      
      if (relativeY < rect.height / 2) {
        // 상단 50% - 노드 위에 드롭
        result.position = 'before';
      } else {
        // 하단 50% - 노드 아래에 드롭
        result.position = 'after';
      }
      
      this.updateDropIndicator(nodeElement, result.position);
      result.isValid = true;
    }
    
    return result;
  }

  /**
   * 자동 스크롤 처리
   * @param {DragEvent} event - 드래그 이벤트
   */
  handleAutoScroll(event) {
    // 자동 스크롤 타이머가 이미 있으면 취소
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
      this.scrollTimer = null;
    }
    
    const container = this.treeView.container;
    const containerRect = container.getBoundingClientRect();
    const mouseY = event.clientY;
    
    // 컨테이너의 상단 가까이에 있을 때 위로 스크롤
    if (mouseY < containerRect.top + this.scrollSensitiveArea) {
      const scrollAmount = 10; // 스크롤 속도
      this.scrollTimer = setTimeout(() => {
        container.scrollTop -= scrollAmount;
        this.scrollTimer = null;
      }, 50);
    }
    // 컨테이너의 하단 가까이에 있을 때 아래로 스크롤
    else if (mouseY > containerRect.bottom - this.scrollSensitiveArea) {
      const scrollAmount = 10; // 스크롤 속도
      this.scrollTimer = setTimeout(() => {
        container.scrollTop += scrollAmount;
        this.scrollTimer = null;
      }, 50);
    }
  }

  /**
   * 드롭 인디케이터 업데이트
   * @param {HTMLElement} nodeElement - 대상 노드 요소
   * @param {string} position - 드롭 위치 ('before', 'after', 'inside')
   */
  updateDropIndicator(nodeElement, position) {
    // 모든 인디케이터 제거
    this.clearDropIndicators();
    
    if (!this.options.visualFeedback) return;
    
    // 노드 요소에 위치 클래스 추가
    if (position === 'inside') {
      nodeElement.classList.add('drop-target-inside');
    } else if (position === 'before') {
      nodeElement.classList.add('drop-target-before');
    } else if (position === 'after') {
      nodeElement.classList.add('drop-target-after');
    }
  }

  /**
   * 모든 드롭 인디케이터 제거
   */
  clearDropIndicators() {
    const indicators = this.treeView.itemsContainer.querySelectorAll(
      '.drop-target-inside, .drop-target-before, .drop-target-after'
    );
    
    indicators.forEach(el => {
      el.classList.remove('drop-target-inside', 'drop-target-before', 'drop-target-after');
    });
  }

  /**
   * 드롭 대상 노드 설정
   * @param {string} nodeId - 드롭 대상 노드 ID
   */
  setDropTargetNode(nodeId) {
    // 이전 드롭 대상 클래스 제거
    this.clearDropTarget();
    
    // 새 드롭 대상 설정
    this.dropTargetNodeId = nodeId;
    
    // 드롭 대상 요소 찾기
    const nodeElement = this.treeView.itemsContainer.querySelector(`[data-node-id="${nodeId}"]`);
    if (nodeElement) {
      nodeElement.classList.add('drop-target');
    }
  }

  /**
   * 드롭 대상 노드 제거
   */
  clearDropTarget() {
    if (this.dropTargetNodeId) {
      const nodeElement = this.treeView.itemsContainer.querySelector(`[data-node-id="${this.dropTargetNodeId}"]`);
      if (nodeElement) {
        nodeElement.classList.remove('drop-target');
      }
      
      this.dropTargetNodeId = null;
    }
    
    // 모든 인디케이터도 제거
    this.clearDropIndicators();
  }

  /**
   * 드래그 노드 이동 실행
   * @param {string} nodeId - 이동할 노드 ID
   * @param {Object} dropInfo - 드롭 위치 정보
   */
  executeMove(nodeId, dropInfo) {
    const { targetNodeId, position } = dropInfo;
    
    // 노드 정보 가져오기
    const draggedNode = this.treeView.flattenedData.find(n => n.id === nodeId);
    const targetNode = this.treeView.flattenedData.find(n => n.id === targetNodeId);
    
    if (!draggedNode || !targetNode) return;
    
    // 드래그 노드의 원래 부모 ID 저장
    const originalParentId = draggedNode.parentId;
    
    // 이벤트 발생
    const moveInfo = {
      nodeId,
      targetNodeId,
      position,
      complete: false
    };
    
    this.treeView.emit('node:move', moveInfo);
    
    // 이벤트 핸들러에서 작업이 이미 완료되었으면 종료
    if (moveInfo.complete) return;
    
    // 리스너가 처리하지 않았으면 직접 트리 수정
    // 참고: 실제 구현에서는 원본 트리 데이터를 찾아 수정해야 함
    // 이 예제에서는 더미 함수만 제공
    console.log(`노드 이동: ${nodeId} -> ${targetNodeId} (${position})`);
    
    // 이동 결과 알림
    this.treeView.emit('node:moved', {
      nodeId,
      targetNodeId,
      position,
      success: true,
      originalParentId
    });
  }

  /**
   * 드래그 정리
   */
  cleanupDrag() {
    // 드래그 중인 노드 표시 제거
    if (this.draggedNodeId) {
      const nodeElement = this.treeView.itemsContainer.querySelector(`[data-node-id="${this.draggedNodeId}"] .node-content`);
      if (nodeElement) {
        nodeElement.classList.remove('dragging');
        nodeElement.removeAttribute('draggable');
      }
    }
    
    // 드롭 대상 노드 표시 제거
    this.clearDropTarget();
    
    // 드래그 고스트 제거
    if (this.dragGhost && this.dragGhost.parentNode) {
      document.body.removeChild(this.dragGhost);
      this.dragGhost = null;
    }
    
    // 자동 스크롤 타이머 취소
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
      this.scrollTimer = null;
    }
    
    // 드래그 상태 초기화
    this.draggedNodeId = null;
    this.dropTargetNodeId = null;
  }

  /**
   * 노드가 드래그 가능한지 확인
   * @param {Object} node - 확인할 노드
   * @returns {boolean} 드래그 가능 여부
   */
  isNodeDraggable(node) {
    if (!node) return false;
    
    // 노드 타입에 따라 확인
    if (node.type === 'file') {
      return this.options.enableFileDragging;
    } else if (node.type === 'folder') {
      return this.options.enableFolderDragging;
    }
    
    return false;
  }

  /**
   * 노드가 다른 노드의 조상인지 확인
   * @param {string} ancestorId - 조상 노드 ID
   * @param {string} descendantId - 자손 노드 ID
   * @returns {boolean} 조상 관계 여부
   */
  isAncestor(ancestorId, descendantId) {
    if (ancestorId === descendantId) return true;
    
    // 자손 노드 찾기
    const descendant = this.treeView.flattenedData.find(n => n.id === descendantId);
    if (!descendant || !descendant.parentId) return false;
    
    // 부모가 조상인지 확인
    if (descendant.parentId === ancestorId) return true;
    
    // 부모의 부모로 재귀 확인
    return this.isAncestor(ancestorId, descendant.parentId);
  }

  /**
   * 드래그 준비
   * @param {string} nodeId - 드래그할 노드 ID
   */
  prepareDrag(nodeId) {
    // 드래그 관련 속성들 초기화
    this.potentialDragStart = null;
    
    // 이벤트 발생 - 드래그 준비
    const node = this.treeView.flattenedData.find(n => n.id === nodeId);
    if (node) {
      this.treeView.emit('drag:prepare', {
        nodeId,
        node
      });
    }
  }
}
