/**
 * 트리 뷰 컴포넌트
 * 전체 트리 구조를 관리하고 렌더링
 */
class TreeView {
  /**
   * @param {HTMLElement} container - 트리가 렌더링될 DOM 컨테이너
   * @param {TreeNode[]} data - 초기 트리 데이터
   */
  constructor(container, data = []) {
    this.container = container;
    this.rootNodes = data;
    this.selectedNode = null;
    
    // 트리 렌더링
    this.render();
    
    // 이벤트 리스너 설정
    this.setupEventListeners();
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
    this.rootNodes.forEach(node => {
      const nodeElement = this.renderNode(node);
      rootList.appendChild(nodeElement);
    });
    
    // DOM에 추가
    this.container.appendChild(rootList);
  }

  /**
   * 개별 노드 렌더링
   * @param {TreeNode} node
   * @returns {HTMLElement} 노드의 LI 요소
   */
  renderNode(node) {
    const li = document.createElement('li');
    li.classList.add('tree-node');
    li.dataset.nodeId = node.id;
    
    // 노드 내용 컨테이너
    const nodeContent = document.createElement('div');
    nodeContent.classList.add('node-content');
    
    // 선택 상태에 따른 클래스 추가
    if (node.isSelected) {
      nodeContent.classList.add('selected');
    }
    
    // 아이콘 표시 (폴더/파일)
    const icon = document.createElement('span');
    icon.classList.add('node-icon');
    
    if (node.isFolder()) {
      icon.textContent = node.isExpanded ? '📂' : '📁';
      icon.classList.add('folder-icon');
    } else {
      icon.textContent = '📄';
      icon.classList.add('file-icon');
    }
    
    // 라벨 (이름) 표시
    const label = document.createElement('span');
    label.classList.add('node-label');
    label.textContent = node.name;
    
    // 내용 조합
    nodeContent.appendChild(icon);
    nodeContent.appendChild(label);
    li.appendChild(nodeContent);
    
    // 폴더인 경우 자식 노드 렌더링
    if (node.isFolder()) {
      const childrenContainer = document.createElement('ul');
      childrenContainer.classList.add('children');
      
      // 확장 상태가 아니면 숨김
      if (!node.isExpanded) {
        childrenContainer.style.display = 'none';
      }
      
      // 자식 노드 렌더링
      node.children.forEach(childNode => {
        const childElement = this.renderNode(childNode);
        childrenContainer.appendChild(childElement);
      });
      
      li.appendChild(childrenContainer);
    }
    
    return li;
  }

  /**
   * 이벤트 위임을 사용한 이벤트 리스너 설정
   */
  setupEventListeners() {
    // 클릭 이벤트 처리 (이벤트 위임 패턴)
    this.container.addEventListener('click', (event) => {
      // 클릭된 노드 컨텐츠 요소 찾기
      const nodeContent = event.target.closest('.node-content');
      if (!nodeContent) return;
      
      // 노드 ID 추출
      const nodeId = nodeContent.parentElement.dataset.nodeId;
      if (!nodeId) return;
      
      // 노드 찾기
      const node = this.findNodeById(nodeId);
      if (!node) return;
      
      // 아이콘 클릭인 경우 폴더 확장/축소
      if (event.target.classList.contains('node-icon') && node.isFolder()) {
        this.toggleNodeExpand(node);
      } 
      // 그 외 클릭은 선택 처리
      else {
        this.selectNode(node);
      }
    });
  }

  /**
   * ID로 노드 찾기 (재귀 사용)
   * @param {string} id - 찾을 노드 ID
   * @param {TreeNode[]} nodes - 검색할 노드 배열 (기본값: 루트 노드)
   * @returns {TreeNode|null} 찾은 노드 또는 null
   */
  findNodeById(id, nodes = this.rootNodes) {
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }
      
      if (node.isFolder() && node.children.length > 0) {
        const foundInChildren = this.findNodeById(id, node.children);
        if (foundInChildren) {
          return foundInChildren;
        }
      }
    }
    
    return null;
  }

  /**
   * 노드 확장/축소 토글
   * @param {TreeNode} node - 토글할 노드
   */
  toggleNodeExpand(node) {
    if (!node.isFolder()) return;
    
    // 노드 상태 업데이트
    node.toggleExpand();
    
    // UI 업데이트
    const nodeElement = this.container.querySelector(`li[data-node-id="${node.id}"]`);
    if (nodeElement) {
      // 아이콘 업데이트
      const icon = nodeElement.querySelector('.node-icon');
      if (icon) {
        icon.textContent = node.isExpanded ? '📂' : '📁';
      }
      
      // 자식 컨테이너 표시/숨김
      const childrenContainer = nodeElement.querySelector('.children');
      if (childrenContainer) {
        childrenContainer.style.display = node.isExpanded ? 'block' : 'none';
      }
    }
  }

  /**
   * 노드 선택
   * @param {TreeNode} node - 선택할 노드
   */
  selectNode(node) {
    // 이전 선택 노드 선택 해제
    if (this.selectedNode) {
      this.selectedNode.isSelected = false;
      const prevSelected = this.container.querySelector('.node-content.selected');
      if (prevSelected) {
        prevSelected.classList.remove('selected');
      }
    }
    
    // 새 노드 선택
    this.selectedNode = node;
    node.isSelected = true;
    
    // UI 업데이트
    const nodeElement = this.container.querySelector(`li[data-node-id="${node.id}"]`);
    if (nodeElement) {
      const nodeContent = nodeElement.querySelector('.node-content');
      if (nodeContent) {
        nodeContent.classList.add('selected');
      }
    }
    
    // 선택 이벤트 발생 (이후 모듈에서 확장)
    console.log('Node selected:', node);
  }

  /**
   * 새 데이터로 트리 업데이트
   * @param {TreeNode[]} newData - 새 트리 데이터
   */
  updateData(newData) {
    this.rootNodes = newData;
    this.selectedNode = null;
    this.render();
  }
}