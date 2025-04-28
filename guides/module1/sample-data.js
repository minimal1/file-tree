// 샘플 데이터 설정
const sampleData = [
  new TreeNode('1', 'src', 'folder', [
    new TreeNode('2', 'index.js', 'file'),
    new TreeNode('3', 'styles.css', 'file'),
    new TreeNode('4', 'components', 'folder', [
      new TreeNode('5', 'Button.js', 'file'),
      new TreeNode('6', 'Modal.js', 'file')
    ])
  ]),
  new TreeNode('7', 'package.json', 'file'),
  new TreeNode('8', 'README.md', 'file')
];