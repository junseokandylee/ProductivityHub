module.exports = [
"[turbopack-node]/transforms/postcss.ts { CONFIG => \"[project]/ClaudeCode/Productivity/frontend/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "build/chunks/ClaudeCode_Productivity_f3c0f555._.js",
  "build/chunks/[root-of-the-server]__289a030a._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[turbopack-node]/transforms/postcss.ts { CONFIG => \"[project]/ClaudeCode/Productivity/frontend/postcss.config.mjs [postcss] (ecmascript)\" } [postcss] (ecmascript)");
    });
});
}),
];