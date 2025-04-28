/**
 * 트리 뷰 컴포넌트 (이벤트 시스템 통합)
 * 모듈 1의 TreeView를 이벤트 시스템 및 상태 관리와 통합
 */
class EnhancedTreeView {
  /**
   * @param {HTMLElement} container - 트리가 렌더링될 DOM 컨테이너
   * @param {TreeState} treeState - 트리 상태 관리자
   */
  constructor(container, treeState) {
    this.container = container;
    this.state = treeState;
    
    // DOM 리스너 참조 보관 (제거 용이)
    this.domListeners = new Map();
    
    // 상태 변경 이벤트 구독
    this.setupStateListeners();
    
    // 초기 렌더링
    this.render();
    
    // DOM 이벤트 리스너 설정
    this.setupDOMListeners();
  }

  /**
   * 상태 변경 이벤트 리스너 설정
   */
  setupStateListeners() {
    // 노드 확장/축소 이벤트
    this.state.on('node:expand-toggle', (data) => {
      this.updateNodeExpandState(data.nodeId, data.isExpanded);
    });
    
    // 선택 변경 이벤트
    this.state.on('selection:change', (data) => {
      this.updateSelectedNodes(data.selected, data.added, data.removed);
    });
    
    // 컨텍스트 메뉴 변경 이벤트
    this.state.on('context-menu:change', (contextMenuData) => {
      this.updateContextMenu(contextMenuData);
    });
    
    // 노드 추가 이벤트
    this.state.on('node:add', (data) => {
      // 전체 트리를 다시 렌더링하는 대신 부모에 노드만 추가
      // 성능 최적화를 위한 부분 업데이트
      this.addNodeToDOM(data.parentId, data.node);
    });
    
    // 노드 삭제 이벤트
    this.state.on('nodes:delete', (nodeIds) => {
      // 각 노드 DOM 요소 제거
      nodeIds.forEach(nodeId => {
        this.removeNodeFromDOM(nodeId);
      });
    });
  }

  /**
   * DOM 이벤트 리스너 설정 (이벤트 위임 패턴)
   */
  setupDOMListeners() {
    // 클릭 이벤트 처리
    const handleClick = (event) => {
      // 기본 동작 방지 (필요한 경우)
      // event.preventDefault();
      
      // 클릭된 노드 요소 찾기
      const nodeElement = event.target.closest('[data-node-id]');
      if (!nodeElement) return;
      
      const nodeId = nodeElement.dataset.nodeId;
      const isExpandIcon = event.target.closest('.node-expand-icon');
      
      // 수정 키 상태 확인
      const isCtrlPressed = event.ctrlKey || event.metaKey;
      const isShiftPressed = event.shiftKey;
      
      // 확장 아이콘 클릭
      if (isExpandIcon) {
        this.state.toggleNodeExpand(nodeId);
        return;
      }
      
      // 선택 처리
      if (isCtrlPressed) {
        // Ctrl + 클릭: 다중 선택 토글
        this.state.toggleNodeSelect(nodeId);
      } else if (isShiftPressed && this.state.selectedNodes.size > 0) {
        // Shift + 클릭: 범위 선택
        const lastSelectedId = Array.from(this.state.selectedNodes).pop();
        this.state.selectNodeRange(lastSelectedId, nodeId);
      } else {
        // 일반 클릭: 단일 선택
        this.state.selectNode(nodeId);
      }
    };
    
    // 컨텍스트 메뉴 이벤트 처리
    const handleContextMenu = (event) => {
      // 기본 컨텍스트 메뉴 방지
      event.preventDefault();
      
      // 우클릭된 노드 요소 찾기
      const nodeElement = event.target.closest('[data-node-id]');
      
      if (nodeElement) {
        const nodeId = nodeElement.dataset.nodeId;
        // 노드가 선택되지 않은 경우, 먼저 선택
        if (!this.state.selectedNodes.has(nodeId)) {
          this.state.selectNode(nodeId);
        }
        
        // 컨텍스트 메뉴 표시
        this.state.setContextMenuNode(nodeId, {
          x: event.clientX,
          y: event.clientY
        });
      } else {
        // 빈 영역 클릭 시 컨텍스트 메뉴 숨김
        this.state.setContextMenuNode(null);
      }
    };
    
    // 키보드 이벤트 처리
    const handleKeyDown = (event) => {
      // 선택된 노드가 없으면 처리 안함
      if (this.state.selectedNodes.size === 0) return;
      
      // 마지막 선택된 노드
      const lastSelectedId = Array.from(this.state.selectedNodes).pop();
      
      switch (event.key) {
        case 'Delete':
          // 선택된 노드 삭제
          this.state.deleteNodes(Array.from(this.state.selectedNodes));
          break;
          
        case 'ArrowRight':
          // 오른쪽 화살표: 폴더 확장
          const node = this.state.findNodeById(lastSelectedId);
          if (node && node.type === 'folder' && !this.state.expandedNodes.has(lastSelectedId)) {
            this.state.toggleNodeExpand(lastSelectedId);
          }
          break;
          
        case 'ArrowLeft':
          // 왼쪽 화살표: 폴더 축소
          if (this.state.expandedNodes.has(lastSelectedId)) {
            this.state.toggleNodeExpand(lastSelectedId);
          }
          break;
          
        // 방향키 탐색은 보다 복잡한 구현이 필요하므로 생략
      }
    };
    
    // 이벤트 리스너 등록 및 참조 저장 (나중에 해제하기 위함)
    this.container.addEventListener('click', handleClick);
    this.container.addEventListener('contextmenu', handleContextMenu);
    this.container.addEventListener('keydown', handleKeyDown);
    
    this.domListeners.set('click', handleClick);
    this.domListeners.set('contextmenu', handleContextMenu);
    this.domListeners.set('keydown', handleKeyDown);
    
    // 컨테이너에 포커스 가능하도록 설정
    this.container.tabIndex = 0;
  }

  /**
   * 컴포넌트 정리 (이벤트 리스너 해제)
   */
  dispose() {
    // DOM 이벤트 리스너 해제
    this.domListeners.forEach((listener, eventType) => {
      this.container.removeEventListener(eventType, listener);
    });
    
    // 상태 이벤트 리스너 해제
    this.state.removeAllListeners();
  }

  /**
   * 트리 전체 렌더링
   */
  render() {
    // 컨테이너 초기화
    this.container.innerHTML = '';
    
    // 루트 UL 요소 생성
    const rootList = document.createElement('ul');
    rootList.className = 'tree-view';
    
    // 각 루트 노드 렌더링
    this.state.nodes.forEach(node => {
      const nodeElement = this.renderNode(node);
      rootList.appendChild(nodeElement);
    });
    
    // DOM에 추가
    this.container.appendChild(rootList);
    
    // 컨텍스트 메뉴 컨테이너 생성
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.style.display = 'none';
    contextMenu.style.position = 'absolute';
    this.contextMenuElement = contextMenu;
    
    this.container.appendChild(contextMenu);
  }

  /**
   * 개별 노드 렌더링
   * @param {Object} node - 렌더링할 노드 데이터
   * @returns {HTMLElement} - 노드 DOM 요소
   */
  renderNode(node) {
    const li = document.createElement('li');
    li.classList.add('tree-node');
    li.dataset.nodeId = node.id;
    
    // 노드 내용 컨테이너
    const nodeContent = document.createElement('div');
    nodeContent.classList.add('node-content');
    
    // 선택 상태 반영
    if (this.state.selectedNodes.has(node.id)) {
      nodeContent.classList.add('selected');
    }
    
    // 확장 아이콘 (폴더인 경우)
    if (node.type === 'folder') {
      const expandIcon = document.createElement('span');
      expandIcon.classList.add('node-expand-icon');
      expandIcon.textContent = this.state.expandedNodes.has(node.id) ? '▼' : '▶';
      nodeContent.appendChild(expandIcon);
    } else {
      // 파일인 경우 공간 유지
      const spacer = document.createElement('span');
      spacer.classList.add('node-spacer');
      spacer.textContent = ' ';
      nodeContent.appendChild(spacer);
    }
    
    // 아이콘 (파일/폴더 구분)
    const icon = document.createElement('span');
    icon.classList.add('node-icon');
    
    if (node.type === 'folder') {
      icon.textContent = '📁';
      icon.classList.add('folder-icon');
    } else {
      icon.textContent = '📄';
      icon.classList.add('file-icon');
    }
    
    // 이름 라벨
    const label = document.createElement('span');
    label.classList.add('node-label');
    label.textContent = node.name;
    
    // 요소 조합
    nodeContent.appendChild(icon);
    nodeContent.appendChild(label);
    li.appendChild(nodeContent);
    
    // 자식 노드 렌더링 (폴더인 경우)
    if (node.type === 'folder' && node.children?.length > 0) {
      const childrenContainer = document.createElement('ul');
      childrenContainer.classList.add('node-children');
      
      // 확장 상태가 아니면 숨김
      if (!this.state.expandedNodes.has(node.id)) {
        childrenContainer.style.display = 'none';
      }
      
      // 각 자식 노드 렌더링
      node.children.forEach(childNode => {
        const childElement = this.renderNode(childNode);
        childrenContainer.appendChild(childElement);
      });
      
      li.appendChild(childrenContainer);
    }
    
    return li;
  }

  /**
   * 노드 확장 상태 UI 업데이트
   * @param {string} nodeId - 노드 ID
   * @param {boolean} isExpanded - 확장 상태
   */
  updateNodeExpandState(nodeId, isExpanded) {
    const nodeElement = this.container.querySelector(`[data-node-id="${nodeId}"]`);
    if (!nodeElement) return;
    
    // 확장 아이콘 업데이트
    const expandIcon = nodeElement.querySelector('.node-expand-icon');
    if (expandIcon) {
      expandIcon.textContent = isExpanded ? '▼' : '▶';
    }
    
    // 자식 컨테이너 표시/숨김
    const childrenContainer = nodeElement.querySelector('.node-children');
    if (childrenContainer) {
      childrenContainer.style.display = isExpanded ? 'block' : 'none';
    }
  }

  /**
   * 선택된 노드 UI 업데이트
   * @param {string[]} selectedIds - 현재 선택된 노드 ID 배열
   * @param {string[]} addedIds - 새로 선택된 노드 ID 배열
   * @param {string[]} removedIds - 선택 해제된 노드 ID 배열
   */
  updateSelectedNodes(selectedIds, addedIds, removedIds) {
    // 선택 해제된 노드 업데이트
    removedIds.forEach(nodeId => {
      const nodeElement = this.container.querySelector(`[data-node-id="${nodeId}"] .node-content`);
      if (nodeElement) {
        nodeElement.classList.remove('selected');
      }
    });
    
    // 새로 선택된 노드 업데이트
    addedIds.forEach(nodeId => {
      const nodeElement = this.container.querySelector(`[data-node-id="${nodeId}"] .node-content`);
      if (nodeElement) {
        nodeElement.classList.add('selected');
      }
    });
  }

  /**
   * 컨텍스트 메뉴 업데이트
   * @param {Object|null} contextMenuData - 컨텍스트 메뉴 데이터 또는 null
   */
  updateContextMenu(contextMenuData) {
    if (!this.contextMenuElement) return;
    
    if (!contextMenuData) {
      // 컨텍스트 메뉴 숨김
      this.contextMenuElement.style.display = 'none';
      return;
    }
    
    // 노드 데이터 가져오기
    const node = this.state.findNodeById(contextMenuData.nodeId);
    if (!node) return;
    
    // 메뉴 내용 생성
    this.contextMenuElement.innerHTML = '';
    
    // 메뉴 아이템 생성 헬퍼 함수
    const createMenuItem = (label, action) => {
      const item = document.createElement('div');
      item.className = 'menu-item';
      item.textContent = label;
      item.addEventListener('click', () => {
        action();
        this.state.setContextMenuNode(null); // 메뉴 닫기
      });
      return item;
    };
    
    // 노드 타입에 따른 메뉴 항목 생성
    if (node.type === 'folder') {
      // 폴더용 메뉴 항목
      this.contextMenuElement.appendChild(
        createMenuItem('새 파일', () => {
          const name = prompt('파일 이름:', 'new-file.txt');
          if (name) {
            this.state.addNode(node.id, { name, type: 'file' });
          }
        })
      );
      
      this.contextMenuElement.appendChild(
        createMenuItem('새 폴더', () => {
          const name = prompt('폴더 이름:', 'new-folder');
          if (name) {
            this.state.addNode(node.id, { name, type: 'folder', children: [] });
          }
        })
      );
    }
    
    // 공통 메뉴 항목
    this.contextMenuElement.appendChild(
      createMenuItem('이름 변경', () => {
        // 이름 변경 로직 (실제 구현 필요)
        console.log('Rename', node.id);
      })
    );
    
    this.contextMenuElement.appendChild(
      createMenuItem('삭제', () => {
        this.state.deleteNodes([node.id]);
      })
    );
    
    // 메뉴 위치 설정
    this.contextMenuElement.style.left = `${contextMenuData.position.x}px`;
    this.contextMenuElement.style.top = `${contextMenuData.position.y}px`;
    this.contextMenuElement.style.display = 'block';
    
    // 문서 클릭 시 메뉴 닫기
    const closeMenu = (e) => {
      if (!this.contextMenuElement.contains(e.target)) {
        this.state.setContextMenuNode(null);
        document.removeEventListener('click', closeMenu);
      }
    };
    
    // 다음 클릭에서 메뉴 닫기 위해 setTimeout 사용
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);
  }

  /**
   * 새 노드를 DOM에 추가 (부분 업데이트)
   * @param {string|null} parentId - 부모 노드 ID (null이면 루트 레벨)
   * @param {Object} node - 추가할 노드 데이터
   */
  addNodeToDOM(parentId, node) {
    // 새 노드 요소 생성
    const nodeElement = this.renderNode(node);
    
    if (parentId) {
      // 부모 노드의 자식 컨테이너 찾기
      const parentElement = this.container.querySelector(`[data-node-id="${parentId}"]`);
      if (parentElement) {
        let childrenContainer = parentElement.querySelector('.node-children');
        
        // 자식 컨테이너가 없으면 생성
        if (!childrenContainer) {
          childrenContainer = document.createElement('ul');
          childrenContainer.className = 'node-children';
          
          // 부모가 확장되지 않았으면 숨김
          if (!this.state.expandedNodes.has(parentId)) {
            childrenContainer.style.display = 'none';
          }
          
          parentElement.appendChild(childrenContainer);
        }
        
        // 새 노드 추가
        childrenContainer.appendChild(nodeElement);
      }
    } else {
      // 루트 레벨에 추가
      const rootList = this.container.querySelector('.tree-view');
      if (rootList) {
        rootList.appendChild(nodeElement);
      }
    }
  }

  /**
   * 노드를 DOM에서 제거
   * @param {string} nodeId - 제거할 노드 ID
   */
  removeNodeFromDOM(nodeId) {
    const nodeElement = this.container.querySelector(`[data-node-id="${nodeId}"]`);
    if (nodeElement) {
      nodeElement.remove();
    }
  }
}