# 网页使用说明

本文件夹是用来进行网页生成的源码，目前已经成功部署Github Action Workflow 的自动化流程中。

## 使用步骤

1. 安装Ruby、Jekyll、bundle
2. 使用bundle安装网页所需的环境：
   `bundle install`
   tips:留意是否有文件写入权限控制，如果有，使用`bundle config path <path to install env>`
3. 在本文件夹目录中运行 `bundle exec jekyll build` 或 `bundle exec jekyll serve`
   * `build`用于生成静态页面
   * `serve`用于生成动态后台服务，用于动态调试页面
4. 生成的静态页面在 `_site` 中，后续放入 `ljxangus.github.io` 中push至GitHub中进行托管。

## Changelog

* 完成 Github Action Workflow 搭建，支持在线编辑或添加page之后自动更新网站，实现任意轻量设备编辑后即可网页上线
* 嵌入 Gitalk 评论系统
* 补充中文简历
