/**
 * @class AccessibilityManager
 * @description 파일 트리 컴포넌트의 접근성을 향상시키기 위한 클래스
 * WAI-ARIA 규칙에 따른 속성 추가 및 포커스 관리를 담당합니다.
 */
class AccessibilityManager {
  /**
   * @constructor
   * @param {HTMLElement} treeContainer - 트리 컴포넌트의 루트 엘리먼트
   * @param {Object} treeModel - 트리 데이터 모델 객체
   */
  constructor(treeContainer, treeModel) {
    this.treeContainer = treeContainer;
    this.treeModel = treeModel;
    this.focusedNodeId = null;
    
    // 트리 컨테이너에 기본 ARIA 속성 설정
    this._setupTreeContainerAttributes();
  }
  
  /**
   * 트리 컨테이너에 기본 ARIA 속성을 설정합니다.
   * @private
   */
  _setupTreeContainerAttributes() {
    // 트리 컨테이너에 role="tree" 속성 추가
    this.treeContainer.setAttribute('role', 'tree');
    
    // 접근성을 위한 추가 속성
    this.treeContainer.setAttribute('aria-label', '파일 탐색기');
    this.treeContainer.setAttribute('tabindex', '0');
    
    // 트리 컨테이너가 키보드 포커스를 받았을 때의 핸들러
    this.treeContainer.addEventListener('focus', this._handleTreeFocus.bind(this));
  }
  
  /**
   * 트리에 포커스가 들어왔을 때 처리를 담당합니다.
   * @param {FocusEvent} event - 포커스 이벤트 객체
   * @private
   */
  _handleTreeFocus(event) {
    // 포커스된 노드가 없으면 첫 번째 노드로 포커스 이동
    if (!this.focusedNodeId) {
      const firstNode = this.treeContainer.querySelector('[role="treeitem"]');
      if (firstNode) {
        this.focusNode(firstNode.getAttribute('data-id'));
      }
    } else {
      // 이전에 포커스된 노드가 있다면 해당 노드에 포커스 복원
      this.focusNode(this.focusedNodeId);
    }
  }
  
  /**
   * 트리 노드에 접근성 속성을 적용합니다.
   * @param {HTMLElement} nodeElement - 트리 노드 엘리먼트
   * @param {Object} nodeData - 해당 노드의 데이터
   */
  applyNodeAttributes(nodeElement, nodeData) {
    // 기본 역할 설정
    nodeElement.setAttribute('role', 'treeitem');
    nodeElement.setAttribute('data-id', nodeData.id);
    nodeElement.setAttribute('tabindex', '-1'); // 기본적으로 포커스 불가능, 프로그래밍 방식으로만 접근
    
    // 확장 상태 표시
    if (nodeData.type === 'folder') {
      nodeElement.setAttribute('aria-expanded', nodeData.expanded ? 'true' : 'false');
    }
    
    // 선택 상태 표시
    nodeElement.setAttribute('aria-selected', nodeData.selected ? 'true' : 'false');
    
    // 자식 요소가 있는 경우 설정
    if (nodeData.children && nodeData.children.length > 0) {
      // 폴더인 경우 하위 항목을 그룹으로 설정
      const childrenContainer = nodeElement.querySelector('.children-container');
      if (childrenContainer) {
        childrenContainer.setAttribute('role', 'group');
        nodeElement.setAttribute('aria-owns', `${nodeData.id}-children`);
        childrenContainer.id = `${nodeData.id}-children`;
      }
    }
    
    // 레벨 설정 (트리 깊이)
    nodeElement.setAttribute('aria-level', nodeData.level || 1);
    
    // 항목 레이블 설정
    const labelElement = nodeElement.querySelector('.node-label');
    if (labelElement) {
      nodeElement.setAttribute('aria-label', `${nodeData.name}, ${nodeData.type === 'folder' ? '폴더' : '파일'}`);
    }
  }
  
  /**
   * 특정 노드에 포커스를 부여합니다.
   * @param {string} nodeId - 포커스할 노드의 ID
   */
  focusNode(nodeId) {
    // 이전 포커스된 노드의 tabindex를 -1로 설정
    if (this.focusedNodeId) {
      const prevNode = this.treeContainer.querySelector(`[data-id="${this.focusedNodeId}"]`);
      if (prevNode) {
        prevNode.setAttribute('tabindex', '-1');
        prevNode.classList.remove('focus-visible');
      }
    }
    
    // 새 노드에 포커스 부여
    const node = this.treeContainer.querySelector(`[data-id="${nodeId}"]`);
    if (node) {
      node.setAttribute('tabindex', '0');
      this.focusedNodeId = nodeId;
      node.focus();
      node.classList.add('focus-visible');
      
      // 노드가 보이는 위치에 있는지 확인하고 필요시 스크롤
      this._ensureNodeVisible(node);
      
      // 스크린 리더를 위한 알림 (선택적)
      this._announceNode(node);
    }
  }
  
  /**
   * 노드가 화면에 보이도록 스크롤합니다.
   * @param {HTMLElement} node - 보여질 노드 엘리먼트
   * @private
   */
  _ensureNodeVisible(node) {
    // 노드가 보이는 영역에 있는지 확인
    const rect = node.getBoundingClientRect();
    const containerRect = this.treeContainer.getBoundingClientRect();
    
    if (rect.top < containerRect.top) {
      // 노드가 컨테이너 위쪽으로 벗어난 경우
      node.scrollIntoView({ block: 'nearest' });
    } else if (rect.bottom > containerRect.bottom) {
      // 노드가 컨테이너 아래쪽으로 벗어난 경우
      node.scrollIntoView({ block: 'nearest' });
    }
  }
  
  /**
   * 스크린 리더를 위해 현재 포커스된 노드 정보를 알립니다.
   * @param {HTMLElement} node - 현재 포커스된 노드
   * @private
   */
  _announceNode(node) {
    // 실제 구현에서는 aria-live 영역을 사용하여 알림
    const liveRegion = document.getElementById('tree-announcer');
    if (!liveRegion) {
      // 라이브 리전이 없으면 생성
      const announcer = document.createElement('div');
      announcer.id = 'tree-announcer';
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('class', 'sr-only'); // 화면에 보이지 않게 설정
      document.body.appendChild(announcer);
    }
    
    // 알림 메시지 설정
    const nodeName = node.getAttribute('aria-label') || node.textContent;
    const isExpanded = node.getAttribute('aria-expanded');
    const isSelected = node.getAttribute('aria-selected');
    
    let message = nodeName;
    if (isExpanded === 'true') {
      message += ', 확장됨';
    } else if (isExpanded === 'false') {
      message += ', 축소됨';
    }
    
    if (isSelected === 'true') {
      message += ', 선택됨';
    }
    
    document.getElementById('tree-announcer').textContent = message;
  }
  
  /**
   * 노드 선택 상태를 업데이트합니다.
   * @param {string} nodeId - 노드 ID
   * @param {boolean} selected - 선택 여부
   */
  updateNodeSelection(nodeId, selected) {
    const node = this.treeContainer.querySelector(`[data-id="${nodeId}"]`);
    if (node) {
      node.setAttribute('aria-selected', selected ? 'true' : 'false');
      
      if (selected) {
        // 선택된 경우 클래스 추가
        node.classList.add('selected');
      } else {
        // 선택 해제된 경우 클래스 제거
        node.classList.remove('selected');
      }
    }
  }
  
  /**
   * 노드 확장 상태를 업데이트합니다.
   * @param {string} nodeId - 노드 ID
   * @param {boolean} expanded - 확장 여부
   */
  updateNodeExpansion(nodeId, expanded) {
    const node = this.treeContainer.querySelector(`[data-id="${nodeId}"]`);
    if (node) {
      node.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      
      // 자식 노드 컨테이너 표시/숨김 처리
      const childrenContainer = document.getElementById(`${nodeId}-children`);
      if (childrenContainer) {
        childrenContainer.style.display = expanded ? 'block' : 'none';
      }
    }
  }
  
  /**
   * 트리 컴포넌트의 접근성 상태를 전체적으로 업데이트합니다.
   */
  refreshAccessibility() {
    // 모든 노드에 대해 접근성 속성 재설정
    const allNodes = this.treeContainer.querySelectorAll('[role="treeitem"]');
    
    // 각 노드의 위치 정보 업데이트 (posInSet, setSize)
    this._updatePositionInfo(allNodes);
    
    // 첫 번째 노드는 루트 컨테이너에서 탭으로 접근 가능하도록 설정
    if (allNodes.length > 0 && !this.focusedNodeId) {
      allNodes[0].setAttribute('tabindex', '0');
      this.focusedNodeId = allNodes[0].getAttribute('data-id');
    }
  }
  
  /**
   * 각 노드의 위치 정보를 업데이트합니다.
   * @param {NodeList} nodes - 트리 노드 엘리먼트 리스트
   * @private
   */
  _updatePositionInfo(nodes) {
    // 부모별로 그룹화
    const nodesByParent = {};
    
    nodes.forEach(node => {
      const parentId = node.parentElement.closest('[role="treeitem"]')?.getAttribute('data-id') || 'root';
      
      if (!nodesByParent[parentId]) {
        nodesByParent[parentId] = [];
      }
      
      nodesByParent[parentId].push(node);
    });
    
    // 각 그룹에 대해 posInSet과 setSize 설정
    Object.values(nodesByParent).forEach(nodeGroup => {
      const setSize = nodeGroup.length;
      
      nodeGroup.forEach((node, index) => {
        node.setAttribute('aria-posinset', index + 1);
        node.setAttribute('aria-setsize', setSize);
      });
    });
  }
  
  /**
   * 트리가 업데이트되었을 때 호출되는 메서드
   */
  onTreeUpdated() {
    // 트리 데이터가 변경되었을 때 접근성 속성 업데이트
    this.refreshAccessibility();
  }
}

// 외부 사용을 위해 export
export default AccessibilityManager;