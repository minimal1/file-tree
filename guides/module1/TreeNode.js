/**
 * 파일 시스템 아이템을 나타내는 클래스
 * 파일과 폴더를 모두 표현할 수 있음
 */
class TreeNode {
  /**
   * @param {string} id - 노드 고유 식별자
   * @param {string} name - 표시될 이름
   * @param {string} type - 'file' 또는 'folder'
   * @param {TreeNode[]} children - 자식 노드 배열 (폴더인 경우)
   */
  constructor(id, name, type, children = []) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.children = type === 'folder' ? children : [];
    this.isExpanded = false; // 폴더의 확장/축소 상태
    this.isSelected = false; // 선택 상태
  }

  /**
   * 노드가 폴더인지 확인
   * @returns {boolean}
   */
  isFolder() {
    return this.type === 'folder';
  }

  /**
   * 노드가 파일인지 확인
   * @returns {boolean}
   */
  isFile() {
    return this.type === 'file';
  }

  /**
   * 자식 노드 추가 (폴더인 경우만 가능)
   * @param {TreeNode} childNode
   */
  addChild(childNode) {
    if (this.isFolder()) {
      this.children.push(childNode);
    } else {
      throw new Error('Cannot add children to a file node');
    }
  }

  /**
   * 폴더 확장/축소 토글
   */
  toggleExpand() {
    if (this.isFolder()) {
      this.isExpanded = !this.isExpanded;
    }
  }
}