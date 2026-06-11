module.exports = {
  presets: ['@babel/preset-env', '@babel/preset-react'],
  // Vite's `import.meta.env` is invalid syntax under Jest/babel; this plugin rewrites it to process.env so App.jsx (VITE_GOOGLE_OAUTH_CLIENT_ID) transforms cleanly.
  plugins: ['babel-plugin-transform-vite-meta-env'],
};
