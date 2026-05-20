# 新知识库（YueShen MCP 知识库目录）

这个目录是 `yueshen_rag` MCP 服务器默认扫描的知识库目录（默认等价于项目根目录下的 `新知识库`）。

## 怎么用（最少配置版）

1) 把文档放进本目录（可放子目录）。
2) 启动 Fay（确保 `http://127.0.0.1:5000` 可用）。
3) 在 Fay 的 MCP 中启用 `yueshen_rag` 服务器。
4) 首次使用建议先执行一次工具：`ingest_yueshen`（建立索引）。
5) 之后用工具：`query_yueshen` 进行检索。

> 提示：默认会把向量索引持久化到 `cache_data/chromadb_yueshen`。

## 支持的文件格式（以代码为准）

当前 `yueshen_rag` 实际会扫描并处理：

- `.pdf`
- `.docx`

不在上述列表中的文件会被忽略（例如 `.doc` / `.txt`）。如需使用 `.doc`，请先转换为 `.docx`。

## 常用工具说明

- `ingest_yueshen`：扫描本目录文档并写入向量库
- `query_yueshen`：向量检索（输入 `query`）
- `yueshen_stats`：查看当前向量库状态（例如向量数量）

如果检索返回提示 “vector store empty; run ingest_yueshen first”，说明还没建立索引，先执行一次 `ingest_yueshen` 即可。

