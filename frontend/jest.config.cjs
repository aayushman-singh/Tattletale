const path = require('path');

// Resolve a package to THIS workspace's own copy. The repo is an npm workspace,
// so deps hoist to the repo-root node_modules where another workspace pulls in
// React 19 — mixing it with the frontend's React 18 triggers
// "A React Element from an older version of React was rendered". Pinning every
// React entry point to frontend/node_modules guarantees a single React 18 copy.
const local = (p) => path.join(__dirname, 'node_modules', p);

module.exports = {
  moduleNameMapper: {
    // Pin React (and its runtimes) + ReactDOM to the frontend's own React 18 copy.
    '^react$': local('react'),
    '^react-dom$': local('react-dom'),
    '^react-dom/(.*)$': local('react-dom') + '/$1',
    '^react/jsx-runtime$': local('react/jsx-runtime'),
    '^react/jsx-dev-runtime$': local('react/jsx-dev-runtime'),
    '^@/(.*)$': '<rootDir>/src/$1', // Map @/ to src/
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(gsap|gsap/.*))'
  ],
  testEnvironment: 'jsdom',
};
