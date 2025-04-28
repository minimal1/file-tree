/**
 * 대용량 파일 시스템 데이터 생성기
 * 가상화 테스트를 위한 대규모 데이터셋 생성
 */
class LargeDataGenerator {
  /**
   * 파일 및 폴더 이름 생성에 사용할 단어 목록
   */
  static WORDS = [
    'data', 'src', 'lib', 'docs', 'test', 'config', 'build', 'dist',
    'component', 'module', 'util', 'helper', 'service', 'model', 'view'
  ];

  /**
   * 파일 확장자 목록
   */
  static EXTENSIONS = [
    'js', 'jsx', 'ts', 'tsx', 'css', 'scss', 'html', 'json', 'md'
  ];

  /**
   * 무작위 ID 생성
   * @returns {string} 고유 ID
   */
  static generateId() {
    return Math.random().toString(36).substring(2, 10);
  }

  /**
   * 무작위 파일/폴더 이름 생성
   * @param {string} type - 'file' 또는 'folder'
   * @returns {string} 생성된 이름
   */
  static generateName(type) {
    const randomWord = this.WORDS[Math.floor(Math.random() * this.WORDS.length)];
    
    if (type === 'file') {
      const randomExt = this.EXTENSIONS[Math.floor(Math.random() * this.EXTENSIONS.length)];
      return `${randomWord}.${randomExt}`;
    } else {
      return randomWord;
    }
  }

  /**
   * 대용량 파일 시스템 데이터 생성
   * @param {number} depth - 최대 폴더 깊이
   * @param {number} filesPerFolder - 폴더당 파일 수
   * @param {number} foldersPerFolder - 폴더당 하위 폴더 수
   * @param {number} [maxTotalNodes=5000] - 총 노드 수 제한
   * @returns {Array} 생성된 파일 시스템 트리
   */
  static generateLargeFileSystem(depth = 3, filesPerFolder = 20, foldersPerFolder = 5, maxTotalNodes = 5000) {
    let nodeCount = 0;
    
    const generateFolder = (currentDepth) => {
      const nodes = [];
      
      if (nodeCount >= maxTotalNodes) {
        return nodes;
      }
      
      // 파일 추가
      for (let i = 0; i < filesPerFolder; i++) {
        if (nodeCount >= maxTotalNodes) break;
        
        nodes.push({
          id: this.generateId(),
          name: this.generateName('file'),
          type: 'file'
        });
        
        nodeCount++;
      }
      
      // 최대 깊이 체크
      if (currentDepth >= depth) {
        return nodes;
      }
      
      // 하위 폴더 생성
      for (let i = 0; i < foldersPerFolder; i++) {
        if (nodeCount >= maxTotalNodes) break;
        
        nodes.push({
          id: this.generateId(),
          name: this.generateName('folder'),
          type: 'folder',
          children: generateFolder(currentDepth + 1)
        });
        
        nodeCount++;
      }
      
      return nodes;
    };
    
    const rootNodes = generateFolder(0);
    console.log(`Generated ${nodeCount} nodes in total`);
    
    return rootNodes;
  }

  /**
   * 평탄화된 노드 배열 생성 (가상화에 사용)
   * @param {Array} tree - 계층적 트리 구조
   * @returns {Array} 평탄화된 노드 배열
   */
  static flattenTree(tree) {
    const flatNodes = [];
    
    const traverse = (nodes, level = 0, parentId = null) => {
      nodes.forEach(node => {
        flatNodes.push({
          id: node.id,
          name: node.name,
          type: node.type,
          level,
          parentId,
          hasChildren: node.type === 'folder' && node.children && node.children.length > 0
        });
        
        if (node.type === 'folder' && node.children) {
          traverse(node.children, level + 1, node.id);
        }
      });
    };
    
    traverse(tree);
    return flatNodes;
  }
}
