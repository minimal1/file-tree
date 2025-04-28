/**
 * 트리 상태 관리 클래스
 * 트리의 상태를 중앙에서 관리하고 변경 사항을 통지
 */
class TreeState extends EventEmitter {
  constructor(initialData = []) {
    super();
    this.nodes = initialData;
    this.selectedNodes = new Set(); // 다중 선택 지원
    this.expandedNodes = new Set(); // 확장된 노드 ID 추적
    this.contextMenuNode = null; // 컨텍스트 메뉴를 표시할 노드
  }

  /**
   * 노드 ID로 노드 찾기 (재귀 사용)
   * @param {string} id - 찾을 노드 ID
   * @param {Array} nodes - 검색할 노드 배열 (기본값: 루트 노드)
   * @returns {Object|null} 찾은 노드 또는 null
   */
  findNodeById(id, nodes = this.nodes) {
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }
      
      if (node.type === 'folder' && node.children?.length > 0) {
        const foundInChildren = this.findNodeById(id, node.children);
        if (foundInChildren) {
          return foundInChildren;
        }
      }
    }
    
    return null;
  }

  /**
   * 노드 확장 상태 토글
   * @param {string} nodeId - 토글할 노드 ID
   */
  toggleNodeExpand(nodeId) {
    const node = this.findNodeById(nodeId);
    if (!node || node.type !== 'folder') return;
    
    const isExpanded = this.expandedNodes.has(nodeId);
    
    if (isExpanded) {
      this.expandedNodes.delete(nodeId);
    } else {
      this.expandedNodes.add(nodeId);
    }
    
    // 변경 이벤트 발생
    this.emit('node:expand-toggle', {
      nodeId,
      isExpanded: !isExpanded
    });
  }

  /**
   * 단일 노드 선택
   * @param {string} nodeId - 선택할 노드 ID
   * @param {boolean} shouldReplace - 기존 선택 대체 여부
   */
  selectNode(nodeId, shouldReplace = true) {
    const node = this.findNodeById(nodeId);
    if (!node) return;
    
    // 이전 선택 상태 저장
    const previousSelected = new Set(this.selectedNodes);
    
    // 기존 선택 대체 시 모든 선택 해제
    if (shouldReplace) {
      this.selectedNodes.clear();
    }
    
    // 노드 선택
    this.selectedNodes.add(nodeId);
    
    // 변경 이벤트 발생
    this.emit('selection:change', {
      selected: Array.from(this.selectedNodes),
      added: [nodeId],
      removed: shouldReplace ? Array.from(previousSelected) : []
    });
  }

  /**
   * 다중 노드 선택 (Ctrl 키 사용)
   * @param {string} nodeId - 선택할 노드 ID
   */
  toggleNodeSelect(nodeId) {
    const node = this.findNodeById(nodeId);
    if (!node) return;
    
    // 이전 선택 상태 저장
    const previousSelected = new Set(this.selectedNodes);
    
    // 선택/해제 토글
    if (this.selectedNodes.has(nodeId)) {
      this.selectedNodes.delete(nodeId);
    } else {
      this.selectedNodes.add(nodeId);
    }
    
    // 변경된 선택 계산
    const currentSelected = new Set(this.selectedNodes);
    const added = [...currentSelected].filter(id => !previousSelected.has(id));
    const removed = [...previousSelected].filter(id => !currentSelected.has(id));
    
    // 변경 이벤트 발생
    this.emit('selection:change', {
      selected: Array.from(this.selectedNodes),
      added,
      removed
    });
  }

  /**
   * 범위 선택 (Shift 키 사용)
   * @param {string} startNodeId - 시작 노드 ID
   * @param {string} endNodeId - 끝 노드 ID
   */
  selectNodeRange(startNodeId, endNodeId) {
    // 이 구현은 복잡하므로 간략화합니다.
    // 실제 구현에서는 트리를 순회하여 startNodeId와 endNodeId 사이의 모든 노드를 선택해야 합니다.
    
    // 노드 간 경로 결정 알고리즘 필요...
    console.log(`Select range from ${startNodeId} to ${endNodeId}`);
    
    // 이벤트 발생 (상세 구현 후)
    this.emit('selection:change', {
      selected: Array.from(this.selectedNodes),
      added: [],  // 실제 구현 시 채워야 함
      removed: [] // 실제 구현 시 채워야 함
    });
  }

  /**
   * 컨텍스트 메뉴 노드 설정
   * @param {string} nodeId - 컨텍스트 메뉴를 표시할 노드 ID
   * @param {Object} position - 메뉴 표시 위치 {x, y}
   */
  setContextMenuNode(nodeId, position) {
    this.contextMenuNode = nodeId ? {
      nodeId,
      position
    } : null;
    
    // 이벤트 발생
    this.emit('context-menu:change', this.contextMenuNode);
  }

  /**
   * 노드 삭제 (다중 선택 지원)
   * @param {string[]} nodeIds - 삭제할 노드 ID 배열
   */
  deleteNodes(nodeIds) {
    // 실제 구현 시 재귀로 노드 트리 검색 및 삭제 필요
    // 간단한 예시만 제공
    nodeIds.forEach(nodeId => {
      // 선택 및 확장 상태에서 제거
      this.selectedNodes.delete(nodeId);
      this.expandedNodes.delete(nodeId);
    });
    
    // 변경 이벤트 발생
    this.emit('nodes:delete', nodeIds);
  }

  /**
   * 노드 추가
   * @param {string} parentId - 부모 노드 ID (null이면 루트 레벨)
   * @param {Object} nodeData - 추가할 노드 데이터
   */
  addNode(parentId, nodeData) {
    const newNodeId = nodeData.id || `node-${Date.now()}`;
    const newNode = {
      ...nodeData,
      id: newNodeId
    };
    
    // 부모 노드에 추가 또는 루트에 추가
    if (parentId) {
      const parentNode = this.findNodeById(parentId);
      if (parentNode && parentNode.type === 'folder') {
        if (!parentNode.children) {
          parentNode.children = [];
        }
        parentNode.children.push(newNode);
      }
    } else {
      this.nodes.push(newNode);
    }
    
    // 이벤트 발생
    this.emit('node:add', {
      parentId,
      node: newNode
    });
    
    return newNodeId;
  }
}