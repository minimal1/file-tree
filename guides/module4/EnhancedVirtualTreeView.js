/**
 * @class EnhancedVirtualTreeView
 * @description 고급 사용자 상호작용 기능이 통합된 가상화 트리 뷰 컴포넌트
 * 키보드 내비게이션, 드래그 앤 드롭, 접근성 기능이 모두 포함되어 있습니다.
 */
import VirtualScroller from '../module3/VirtualScroller.js';
import KeyboardNavigator from './KeyboardNavigator.js';
import DragAndDrop from './DragAndDrop.js';
import AccessibilityManager from './AccessibilityManager.js';

class EnhancedVirtualTreeView {
  /**
   * @constructor
   * @param {HTMLElement} container - 트리 뷰를 렌더링할 컨테이너 엘리먼트
   * @param {Object} options - 트리 뷰 설정 옵션
   * @param {Object} options.treeData - 트리 데이터 모델
   * @param {number} options.itemHeight - 각 트리 항목의 높이 (픽셀)
   * @param {function} options.renderCallback - 트리 항목 렌더링 콜백 함수
   */
  constructor(container, options) {
    this.container = container;
    this.options = Object.assign({
      itemHeight: 24,
      enableKeyboardNavigation: true,
      enableDragAndDrop: true,
      enableAccessibility: true
    }, options);
    
    this.treeData = this.options.treeData;
    this.flattenedData = this._flattenTree(this.treeData);
    
    // 내부 상태
    this.selectedNodeIds = new Set();
    this.focusedNodeId = null;
    this.expandedNodeIds = new Set();
    this.eventListeners = {};
    
    // 컴포넌트 초기화
    this._initComponents();
    this._attachEventListeners();
    this._render();
  }
  
  /**
   * 주요 컴포넌트들을 초기화합니다.
   * @private
   */
  _initComponents() {
    // 기본 컨테이너 설정
    this.container.classList.add('enhanced-virtual-tree');
    
    // 가상 스크롤러 초기화
    this.virtualScroller = new VirtualScroller(
      this.container,
      this.options.itemHeight,
      this.flattenedData.length,
      this._renderNode.bind(this)
    );
    
    // 선택적 기능 초기화
    if (this.options.enableKeyboardNavigation) {
      this.keyboardNavigator = new KeyboardNavigator(this);
    }
    
    if (this.options.enableDragAndDrop) {
      this.dragAndDrop = new DragAndDrop(this);
    }
    
    if (this.options.enableAccessibility) {
      this.accessibilityManager = new AccessibilityManager(this.container, this.treeData);
    }
  }
  
  /**
   * 이벤트 리스너를 등록합니다.
   * @private
   */
  _attachEventListeners() {
    // 클릭 이벤트 위임으로 처리
    this.container.addEventListener('click', this._handleNodeClick.bind(this));
    
    // 포커스 이벤트
    this.container.addEventListener('focus', this._handleContainerFocus.bind(this), true);
    
    // 컨텍스트 메뉴 이벤트
    this.container.addEventListener('contextmenu', this._handleContextMenu.bind(this));
    
    // 키보드 내비게이션이 활성화된 경우
    if (this.keyboardNavigator) {
      this.container.addEventListener('keydown', (e) => this.keyboardNavigator.handleKeyDown(e));
    }
  }
  
  /**
   * 트리 데이터를 평탄화하여 배열로 변환합니다.
   * @param {Array|Object} nodes - 트리 데이터 노드
   * @param {number} level - 현재 레벨 (깊이)
   * @param {Array} result - 평탄화된 결과 배열
   * @returns {Array} 평탄화된 노드 배열
   * @private
   */
  _flattenTree(nodes, level = 0, result = []) {
    const nodeArray = Array.isArray(nodes) ? nodes : [nodes];
    
    nodeArray.forEach(node => {
      // 노드에 ID가 없는 경우 생성
      if (!node.id) {
        node.id = `node-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // 노드에 레벨 정보 추가
      node.level = level;
      
      // 결과 배열에 노드 추가
      result.push(node);
      
      // 확장된 폴더인 경우 자식 노드들도 평탄화
      if (node.type === 'folder' && node.expanded && node.children) {
        this.expandedNodeIds.add(node.id);
        this._flattenTree(node.children, level + 1, result);
      }
    });
    
    return result;
  }
  
  /**
   * 트리를 다시 평탄화하고 렌더링합니다.
   * @private
   */
  _refreshTree() {
    this.flattenedData = this._flattenTree(this.treeData);
    this.virtualScroller.updateTotalItems(this.flattenedData.length);
    this.virtualScroller.rerender();
    
    // 접근성 관리자가 있는 경우 업데이트
    if (this.accessibilityManager) {
      this.accessibilityManager.onTreeUpdated();
    }
    
    // 이벤트 발생
    this._emitEvent('treeUpdated', { tree: this });
  }
  
  /**
   * 개별 노드를 렌더링합니다. (가상 스크롤러의 콜백 함수)
   * @param {HTMLElement} element - 노드를 렌더링할 DOM 요소
   * @param {number} index - 노드의 인덱스
   * @private
   */
  _renderNode(element, index) {
    if (index >= this.flattenedData.length) return;
    
    const nodeData = this.flattenedData[index];
    
    // 노드 요소 설정
    element.className = 'tree-node';
    element.setAttribute('data-id', nodeData.id);
    element.setAttribute('data-type', nodeData.type);
    element.setAttribute('data-level', nodeData.level);
    element.style.paddingLeft = `${(nodeData.level * 16) + 4}px`;
    
    // 선택 상태 표시
    if (this.selectedNodeIds.has(nodeData.id)) {
      element.classList.add('selected');
    } else {
      element.classList.remove('selected');
    }
    
    // 포커스 상태 표시
    if (this.focusedNodeId === nodeData.id) {
      element.classList.add('focused');
    } else {
      element.classList.remove('focused');
    }
    
    // 노드 내용 생성
    element.innerHTML = this._generateNodeHTML(nodeData);
    
    // 드래그 앤 드롭 설정 (해당 기능이 활성화된 경우)
    if (this.dragAndDrop) {
      this.dragAndDrop.setupNodeDragAndDrop(element, nodeData);
    }
    
    // 접근성 속성 설정 (해당 기능이 활성화된 경우)
    if (this.accessibilityManager) {
      this.accessibilityManager.applyNodeAttributes(element, nodeData);
    }
    
    // 추가적인 렌더링 콜백이 있는 경우 호출
    if (this.options.renderCallback) {
      this.options.renderCallback(element, nodeData, this);
    }
  }
  
  /**
   * 노드의 HTML 콘텐츠를 생성합니다.
   * @param {Object} nodeData - 노드 데이터
   * @returns {string} 노드 HTML 문자열
   * @private
   */
  _generateNodeHTML(nodeData) {
    const isFolder = nodeData.type === 'folder';
    const isExpanded = isFolder && this.expandedNodeIds.has(nodeData.id);
    
    // 아이콘 결정
    let iconClass = isFolder 
                      ? (isExpanded ? 'folder-open-icon' : 'folder-icon') 
                      : 'file-icon';
    
    // 폴더 확장/축소 화살표
    const expanderHTML = isFolder
      ? `<span class="expander ${isExpanded ? 'expanded' : 'collapsed'}" data-action="toggle"></span>`
      : `<span class="expander-placeholder"></span>`;
    
    return `
      ${expanderHTML}
      <span class="icon ${iconClass}"></span>
      <span class="node-label">${nodeData.name}</span>
    `;
  }
  
  /**
   * 노드 클릭 이벤트를 처리합니다.
   * @param {MouseEvent} event - 클릭 이벤트 객체
   * @private
   */
  _handleNodeClick(event) {
    const nodeElement = event.target.closest('.tree-node');
    if (!nodeElement) return;
    
    const nodeId = nodeElement.getAttribute('data-id');
    const node = this.flattenedData.find(n => n.id === nodeId);
    if (!node) return;
    
    // 이벤트 타겟 확인
    if (event.target.classList.contains('expander')) {
      // 확장/축소 토글
      this.toggleNodeExpansion(nodeId);
    } else {
      // 노드 선택
      if (event.ctrlKey) {
        this.toggleNodeSelection(nodeId);
      } else if (event.shiftKey) {
        this.selectNodeRange(nodeId);
      } else {
        this.selectNode(nodeId);
      }
      
      // 포커스 설정
      this.setFocusedNode(nodeId);
      
      // 노드 클릭 이벤트 발생
      this._emitEvent('nodeClick', { nodeId, node, event });
    }
  }
  
  /**
   * 컨테이너 포커스 이벤트를 처리합니다.
   * @param {FocusEvent} event - 포커스 이벤트 객체
   * @private
   */
  _handleContainerFocus(event) {
    // 이미 포커스된 노드가 있는지 확인
    if (!this.focusedNodeId && this.flattenedData.length > 0) {
      // 첫 번째 노드에 포커스 설정
      this.setFocusedNode(this.flattenedData[0].id);
    } else if (this.focusedNodeId) {
      // 기존 포커스된 노드에 포커스 복원
      const focusedElement = this.container.querySelector(`[data-id="${this.focusedNodeId}"]`);
      if (focusedElement) {
        focusedElement.focus();
      }
    }
  }
  
  /**
   * 컨텍스트 메뉴 이벤트를 처리합니다.
   * @param {MouseEvent} event - 컨텍스트 메뉴 이벤트 객체
   * @private
   */
  _handleContextMenu(event) {
    const nodeElement = event.target.closest('.tree-node');
    if (!nodeElement) return;
    
    const nodeId = nodeElement.getAttribute('data-id');
    const node = this.flattenedData.find(n => n.id === nodeId);
    if (!node) return;
    
    // 노드가 선택되지 않은 경우 선택
    if (!this.selectedNodeIds.has(nodeId)) {
      this.selectNode(nodeId);
    }
    
    // 컨텍스트 메뉴 이벤트 발생
    this._emitEvent('contextMenu', { nodeId, node, event });
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
  
  /**
   * 전체 트리를 렌더링합니다.
   * @private
   */
  _render() {
    this.virtualScroller.render();
  }
  
  // 공개 API 메서드
  
  /**
   * 이벤트 리스너를 등록합니다.
   * @param {string} eventName - 이벤트 이름
   * @param {function} callback - 콜백 함수
   */
  on(eventName, callback) {
    if (!this.eventListeners[eventName]) {
      this.eventListeners[eventName] = [];
    }
    this.eventListeners[eventName].push(callback);
  }
  
  /**
   * 이벤트 리스너를 제거합니다.
   * @param {string} eventName - 이벤트 이름
   * @param {function} callback - 제거할 콜백 함수
   */
  off(eventName, callback) {
    if (this.eventListeners[eventName]) {
      this.eventListeners[eventName] = this.eventListeners[eventName]
        .filter(cb => cb !== callback);
    }
  }
  
  /**
   * 노드를 선택합니다.
   * @param {string} nodeId - 노드 ID
   */
  selectNode(nodeId) {
    // 기존 선택 항목 모두 해제
    this.selectedNodeIds.clear();
    
    // 새 노드 선택
    this.selectedNodeIds.add(nodeId);
    
    // 트리 업데이트
    this.virtualScroller.rerender();
    
    // 접근성 업데이트
    if (this.accessibilityManager) {
      this.accessibilityManager.updateNodeSelection(nodeId, true);
    }
    
    // 이벤트 발생
    const node = this.flattenedData.find(n => n.id === nodeId);
    this._emitEvent('nodeSelected', { nodeId, node });
  }
  
  /**
   * 노드 선택을 토글합니다.
   * @param {string} nodeId - 노드 ID
   */
  toggleNodeSelection(nodeId) {
    if (this.selectedNodeIds.has(nodeId)) {
      this.selectedNodeIds.delete(nodeId);
      
      // 접근성 업데이트
      if (this.accessibilityManager) {
        this.accessibilityManager.updateNodeSelection(nodeId, false);
      }
    } else {
      this.selectedNodeIds.add(nodeId);
      
      // 접근성 업데이트
      if (this.accessibilityManager) {
        this.accessibilityManager.updateNodeSelection(nodeId, true);
      }
    }
    
    // 트리 업데이트
    this.virtualScroller.rerender();
    
    // 이벤트 발생
    const node = this.flattenedData.find(n => n.id === nodeId);
    this._emitEvent('nodeSelectionToggled', { 
      nodeId, 
      node, 
      selected: this.selectedNodeIds.has(nodeId)
    });
  }
  
  /**
   * 지정된 노드까지 범위 선택합니다.
   * @param {string} endNodeId - 범위 끝 노드 ID
   */
  selectNodeRange(endNodeId) {
    // 현재 포커스된 노드가 없으면 단일 선택으로 처리
    if (!this.focusedNodeId) {
      this.selectNode(endNodeId);
      return;
    }
    
    // 시작 및 종료 인덱스 찾기
    const startIndex = this.flattenedData.findIndex(n => n.id === this.focusedNodeId);
    const endIndex = this.flattenedData.findIndex(n => n.id === endNodeId);
    
    if (startIndex === -1 || endIndex === -1) return;
    
    // 이전 선택 항목 지우기
    this.selectedNodeIds.clear();
    
    // 범위 내의 모든 노드 선택
    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);
    
    for (let i = minIndex; i <= maxIndex; i++) {
      this.selectedNodeIds.add(this.flattenedData[i].id);
    }
    
    // 트리 업데이트
    this.virtualScroller.rerender();
    
    // 접근성 업데이트
    if (this.accessibilityManager) {
      this.selectedNodeIds.forEach(id => {
        this.accessibilityManager.updateNodeSelection(id, true);
      });
    }
    
    // 이벤트 발생
    this._emitEvent('nodesRangeSelected', { 
      startNodeId: this.focusedNodeId, 
      endNodeId, 
      selectedNodeIds: [...this.selectedNodeIds]
    });
  }
  
  /**
   * 포커스 노드를 설정합니다.
   * @param {string} nodeId - 노드 ID
   */
  setFocusedNode(nodeId) {
    // 이전 포커스 제거
    if (this.focusedNodeId) {
      const prevElement = this.container.querySelector(`[data-id="${this.focusedNodeId}"]`);
      if (prevElement) {
        prevElement.classList.remove('focused');
      }
    }
    
    // 새 포커스 설정
    this.focusedNodeId = nodeId;
    const element = this.container.querySelector(`[data-id="${nodeId}"]`);
    
    if (element) {
      element.classList.add('focused');
      
      // 노드가 보이는 위치에 있는지 확인
      const containerRect = this.container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      
      if (elementRect.top < containerRect.top || elementRect.bottom > containerRect.bottom) {
        element.scrollIntoView({ block: 'nearest' });
      }
      
      // 접근성 포커스 업데이트
      if (this.accessibilityManager) {
        this.accessibilityManager.focusNode(nodeId);
      }
    }
    
    // 이벤트 발생
    const node = this.flattenedData.find(n => n.id === nodeId);
    this._emitEvent('nodeFocused', { nodeId, node });
  }
  
  /**
   * 노드 확장 여부를 토글합니다.
   * @param {string} nodeId - 노드 ID
   */
  toggleNodeExpansion(nodeId) {
    const node = this.flattenedData.find(n => n.id === nodeId);
    if (!node || node.type !== 'folder') return;
    
    // 확장 상태 토글
    if (this.expandedNodeIds.has(nodeId)) {
      this.expandedNodeIds.delete(nodeId);
      node.expanded = false;
    } else {
      this.expandedNodeIds.add(nodeId);
      node.expanded = true;
    }
    
    // 트리 갱신
    this._refreshTree();
    
    // 접근성 업데이트
    if (this.accessibilityManager) {
      this.accessibilityManager.updateNodeExpansion(nodeId, node.expanded);
    }
    
    // 이벤트 발생
    this._emitEvent('nodeExpansionToggled', { 
      nodeId, 
      node, 
      expanded: node.expanded
    });
  }
  
  /**
   * 노드를 이동합니다. (드래그 앤 드롭 결과)
   * @param {string} sourceNodeId - 이동할 소스 노드 ID
   * @param {string} targetNodeId - 대상 노드 ID
   * @param {string} position - 드롭 위치 ('before', 'after', 'inside')
   */
  moveNode(sourceNodeId, targetNodeId, position) {
    // 원본과 대상 노드 찾기
    const sourceNode = this._findNodeInTree(this.treeData, sourceNodeId);
    const targetNode = this._findNodeInTree(this.treeData, targetNodeId);
    
    if (!sourceNode || !targetNode) return;
    
    // 원본 노드의 부모에서 제거
    const sourceParent = this._findParentNode(this.treeData, sourceNodeId);
    if (sourceParent) {
      sourceParent.children = sourceParent.children.filter(child => child.id !== sourceNodeId);
    } else {
      // 루트 레벨 노드인 경우
      this.treeData = this.treeData.filter(node => node.id !== sourceNodeId);
    }
    
    // 대상 위치에 추가
    if (position === 'inside' && targetNode.type === 'folder') {
      // 폴더 내부로 이동
      if (!targetNode.children) {
        targetNode.children = [];
      }
      targetNode.children.push(sourceNode);
      
      // 폴더가 닫혀있으면 열기
      if (!this.expandedNodeIds.has(targetNodeId)) {
        this.expandedNodeIds.add(targetNodeId);
        targetNode.expanded = true;
      }
    } else {
      // 노드 위/아래로 이동
      const targetParent = this._findParentNode(this.treeData, targetNodeId);
      
      if (targetParent) {
        // 부모 내에서의 인덱스 찾기
        const targetIndex = targetParent.children.findIndex(child => child.id === targetNodeId);
        
        if (position === 'before') {
          targetParent.children.splice(targetIndex, 0, sourceNode);
        } else { // 'after'
          targetParent.children.splice(targetIndex + 1, 0, sourceNode);
        }
      } else {
        // 루트 레벨
        const targetIndex = this.treeData.findIndex(node => node.id === targetNodeId);
        
        if (position === 'before') {
          this.treeData.splice(targetIndex, 0, sourceNode);
        } else { // 'after'
          this.treeData.splice(targetIndex + 1, 0, sourceNode);
        }
      }
    }
    
    // 트리 갱신
    this._refreshTree();
    
    // 이벤트 발생
    this._emitEvent('nodeMoved', { 
      sourceNodeId, 
      targetNodeId, 
      position, 
      sourceNode, 
      targetNode 
    });
  }
  
  /**
   * 트리에서 특정 ID의 노드를 찾습니다.
   * @param {Array|Object} nodes - 트리 또는 서브트리
   * @param {string} nodeId - 찾을 노드 ID
   * @returns {Object|null} 찾은 노드 또는 null
   * @private
   */
  _findNodeInTree(nodes, nodeId) {
    const nodeArray = Array.isArray(nodes) ? nodes : [nodes];
    
    for (const node of nodeArray) {
      if (node.id === nodeId) {
        return node;
      }
      
      if (node.children) {
        const found = this._findNodeInTree(node.children, nodeId);
        if (found) return found;
      }
    }
    
    return null;
  }
  
  /**
   * 트리에서 특정 ID를 가진 노드의 부모를 찾습니다.
   * @param {Array|Object} nodes - 트리 또는 서브트리
   * @param {string} nodeId - 자식 노드 ID
   * @param {Object} parent - 현재 부모 노드
   * @returns {Object|null} 부모 노드 또는 null
   * @private
   */
  _findParentNode(nodes, nodeId, parent = null) {
    const nodeArray = Array.isArray(nodes) ? nodes : [nodes];
    
    for (const node of nodeArray) {
      if (node.children) {
        if (node.children.some(child => child.id === nodeId)) {
          return node;
        }
        
        const found = this._findParentNode(node.children, nodeId, node);
        if (found) return found;
      }
    }
    
    return null;
  }
  
  /**
   * 키보드 내비게이션 객체에 접근합니다.
   * @returns {KeyboardNavigator} 키보드 내비게이션 객체
   */
  getKeyboardNavigator() {
    return this.keyboardNavigator;
  }
  
  /**
   * 드래그 앤 드롭 객체에 접근합니다.
   * @returns {DragAndDrop} 드래그 앤 드롭 객체
   */
  getDragAndDrop() {
    return this.dragAndDrop;
  }
  
  /**
   * 접근성 관리자 객체에 접근합니다.
   * @returns {AccessibilityManager} 접근성 관리자 객체
   */
  getAccessibilityManager() {
    return this.accessibilityManager;
  }
  
  /**
   * 현재 포커스된 노드 ID를 반환합니다.
   * @returns {string|null} 포커스된 노드 ID
   */
  getFocusedNodeId() {
    return this.focusedNodeId;
  }
  
  /**
   * 현재 선택된 노드 ID 배열을 반환합니다.
   * @returns {Array} 선택된 노드 ID 배열
   */
  getSelectedNodeIds() {
    return [...this.selectedNodeIds];
  }
  
  /**
   * 현재 확장된 노드 ID 배열을 반환합니다.
   * @returns {Array} 확장된 노드 ID 배열
   */
  getExpandedNodeIds() {
    return [...this.expandedNodeIds];
  }
}

// 외부 사용을 위해 export
export default EnhancedVirtualTreeView;