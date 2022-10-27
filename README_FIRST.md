本文件夹是用来进行网页生成的源码，目前未成功部署Github Action Workflow 的自动化流程中。

## 使用步骤：

1. 安装Ruby、Jekyll、bundle
2. 在本文件夹目录中运行 `bundle exec jekyll build` 或 `bundle exec jekyll serve`
   * `build`用于生成静态页面
   * `serve`用于生成动态后台服务，用于动态调试页面
3. 生成的静态页面在 `_site` 中，后续放入 `ljxangus.github.io` 中push至GitHub中进行托管。

## TODO
* 完成 Github Action Workflow 搭建，怀疑缺少 Deploy 相关脚本
* 润色页面布局，开启周期性Blog更新
* 嵌入 Gitalk 评论系统 (Done)
* 插入中文简历
* 移除 jekyll-scholar 依赖，实现Github自动编译流程