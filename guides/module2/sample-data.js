// 샘플 데이터
const sampleData = [
  {
    id: '1',
    name: 'src',
    type: 'folder',
    children: [
      { id: '2', name: 'index.js', type: 'file' },
      { id: '3', name: 'styles.css', type: 'file' },
      {
        id: '4',
        name: 'components',
        type: 'folder',
        children: [
          { id: '5', name: 'Button.js', type: 'file' },
          { id: '6', name: 'Modal.js', type: 'file' }
        ]
      }
    ]
  },
  { id: '7', name: 'package.json', type: 'file' },
  { id: '8', name: 'README.md', type: 'file' }
];