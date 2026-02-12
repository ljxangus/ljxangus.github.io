# Jekyll学术网站自动更新系统

## 项目简介

本项目是一个基于Jekyll搭建的学术个人网站，包含自动更新脚本，用于从Google Scholar爬取论文数据并更新网站内容。脚本支持完整更新模式和仅数据拉取模式，能够自动生成论文页面、更新配置文件，并提供详细的日志记录和备份机制。

## 脚本更新流程

### 1. 前提条件和环境要求

| 环境要求 | 版本/说明 | 备注 |
|---------|----------|------|
| Python | 3.7+ | 脚本运行环境 |
| Ruby | 2.5.0+ | Jekyll运行环境 |
| Jekyll | 4.0+ | 静态网站生成器 |
| 依赖包 | 见requirements.txt | 脚本依赖 |
| 网络连接 | 稳定 | 用于爬取Google Scholar数据 |

### 2. 获取最新脚本的具体方法

#### 方法一：Git拉取（推荐）

```bash
# 克隆仓库（首次使用）
git clone https://github.com/ljxangus/ljxangus.github.io.git

# 进入项目目录
cd ljxangus.github.io

# 拉取最新代码
git pull origin main
```

#### 方法二：手动下载

1. 访问GitHub仓库：https://github.com/ljxangus/ljxangus.github.io
2. 点击"Code"按钮，选择"Download ZIP"
3. 解压ZIP文件到本地目录
4. 进入解压后的项目目录

### 3. 执行脚本更新的完整命令步骤

#### 步骤1：安装依赖包

```bash
# 安装Python依赖
pip install -r requirements.txt

# 安装Jekyll依赖（首次使用或依赖变更时）
bundle install
```

#### 步骤2：运行更新脚本

```bash
# 完整更新模式（默认）：爬取数据并更新网站
python update_publications.py

# 仅数据拉取模式：只爬取数据，不更新网站
python update_publications.py -f
# 或
python update_publications.py --fetch-only
```

#### 步骤3：构建Jekyll网站

```bash
# 构建网站
bundle exec jekyll build

# 本地预览（可选）
bundle exec jekyll serve
```

### 4. 更新过程中可能出现的常见问题及解决方法

| 问题 | 错误信息 | 解决方法 |
|------|----------|----------|
| YAML格式错误 | `YAML Exception reading file.md: mapping values are not allowed in this context` | 检查YAML前置元数据，确保特殊字符（如冒号、引号）使用正确，建议将值用引号包围 |
| 依赖缺失 | `ModuleNotFoundError: No module named 'xxx'` | 运行`pip install -r requirements.txt`安装缺失的依赖 |
| 网络连接问题 | `requests.exceptions.ConnectionError` | 检查网络连接，确保能够访问Google Scholar |
| Ruby版本过低 | `jekyll: command not found` | 更新Ruby到2.5.0+版本 |
| 权限问题 | `PermissionError: [Errno 13] Permission denied` | 确保当前用户对项目目录有读写权限 |
| WSL路径问题 | `Failed to translate 'D:\path\to\file'` | 在WSL中使用Linux路径格式，如`/mnt/c/path/to/file` |

### 5. 更新完成后的验证步骤

1. **检查配置文件更新**
   ```bash
   # 查看论文数据文件
   cat _data/publist.yml
   
   # 查看项目数据文件
   cat _data/projects.yml
   ```

2. **检查生成的论文页面**
   ```bash
   # 查看生成的论文页面
   ls -la _posts/projects/
   ```

3. **验证网站构建**
   ```bash
   # 构建网站并检查输出
   bundle exec jekyll build
   ```

4. **本地预览验证**
   ```bash
   # 启动本地服务器
   bundle exec jekyll serve
   ```
   然后在浏览器中访问 http://localhost:4000，检查网站内容是否正确更新

## 调试过程

### 1. 调试环境的搭建与配置

#### 本地开发环境（Windows/macOS/Linux）

1. **安装Python开发环境**
   - 下载并安装Python 3.7+：https://www.python.org/downloads/
   - 安装IDE（推荐VS Code或PyCharm）
   - 安装必要的扩展/插件：
     - VS Code：Python、YAML、Markdown All in One
     - PyCharm：内置Python支持

2. **配置Jekyll开发环境**
   - 安装Ruby和Jekyll：https://jekyllrb.com/docs/installation/
   - 安装项目依赖：`bundle install`

#### WSL Ubuntu环境

1. **启用WSL**
   - 打开PowerShell，运行：`wsl --install`
   - 重启计算机
   - 安装Ubuntu发行版：`wsl --install -d Ubuntu`

2. **配置WSL环境**
   ```bash
   # 更新系统
   sudo apt update && sudo apt upgrade
   
   # 安装Ruby和Jekyll
   sudo apt install ruby-full build-essential zlib1g-dev
   sudo gem install jekyll bundler
   
   # 安装Python
   sudo apt install python3 python3-pip python3-venv
   ```

3. **访问项目目录**
   ```bash
   # 进入Windows项目目录
   cd /mnt/c/Users/ljxan/OneDrive/code/Github主页开发/ljxangus.github.io/
   ```

### 2. 常用调试命令及参数说明

#### Python调试命令

| 命令 | 说明 | 参数 |
|------|------|------|
| `python -m pdb script.py` | 启动Python调试器 | 无 |
| `python -c "import module; module.function()"` | 测试单个模块或函数 | 无 |
| `python -v script.py` | 详细输出Python执行过程 | 无 |
| `python -O script.py` | 优化模式运行脚本 | 无 |

#### Jekyll调试命令

| 命令 | 说明 | 参数 |
|------|------|------|
| `bundle exec jekyll build --trace` | 构建网站并输出详细错误信息 | `--trace`：输出完整堆栈跟踪 |
| `bundle exec jekyll serve --verbose` | 启动本地服务器并输出详细日志 | `--verbose`：详细输出 |
| `bundle exec jekyll clean` | 清理构建文件 | 无 |
| `bundle exec jekyll doctor` | 检查配置问题 | 无 |

### 3. 断点设置与变量监控方法

#### 使用Python内置调试器（pdb）

```python
# 在脚本中设置断点
import pdb
pdb.set_trace()  # 断点位置

# 或在命令行启动时设置断点
python -m pdb update_publications.py
```

**常用pdb命令**：
- `n`：执行下一行
- `s`：进入函数
- `c`：继续执行直到下一个断点
- `l`：查看当前位置的代码
- `p variable`：打印变量值
- `q`：退出调试器

#### 使用VS Code调试

1. 打开VS Code，进入项目目录
2. 点击左侧调试图标（或按`Ctrl+Shift+D`）
3. 点击"创建launch.json文件"，选择Python环境
4. 配置launch.json文件：
   ```json
   {
       "version": "0.2.0",
       "configurations": [
           {
               "name": "Python: 当前文件",
               "type": "python",
               "request": "launch",
               "program": "${file}",
               "console": "integratedTerminal",
               "justMyCode": true
           }
       ]
   }
   ```
5. 在代码中点击行号左侧设置断点
6. 点击"开始调试"按钮（或按`F5`）启动调试

### 4. 日志输出的查看与分析方式

#### 日志文件位置

脚本生成的日志文件存储在项目根目录的`logs/`文件夹中，按日期命名，格式为：`update_publications_YYYYMMDD.log`

#### 查看日志文件

```bash
# 查看最新日志
tail -f logs/update_publications_$(date +%Y%m%d).log

# 查看完整日志
cat logs/update_publications_YYYYMMDD.log

# 搜索特定日志
grep "ERROR" logs/update_publications_YYYYMMDD.log
```

#### 日志级别说明

| 级别 | 说明 | 示例 |
|------|------|------|
| INFO | 正常运行信息 | 开始执行脚本、完成更新等 |
| WARNING | 警告信息 | 配置文件不存在、跳过未来日期帖子等 |
| ERROR | 错误信息 | YAML解析错误、网络连接失败等 |
| DEBUG | 调试信息 | 变量值、函数调用等（需启用DEBUG模式） |

### 5. 常见错误的诊断流程和解决策略

#### 错误诊断流程

1. **查看错误信息**：首先查看命令行输出的错误信息
2. **检查日志文件**：查看详细的日志记录，定位问题原因
3. **验证配置文件**：检查YAML配置文件格式是否正确
4. **测试依赖**：验证所有依赖包是否正确安装
5. **检查环境**：确保Python和Jekyll版本符合要求
6. **搜索解决方案**：使用错误信息搜索相关解决方案

#### 常见错误及解决策略

| 错误类型 | 常见原因 | 解决策略 |
|----------|----------|----------|
| YAML解析错误 | YAML格式不正确，如冒号使用不当、缺少引号等 | 使用在线YAML验证工具检查格式，将包含特殊字符的值用引号包围 |
| 依赖缺失 | 缺少必要的Python或Ruby依赖 | 运行`pip install -r requirements.txt`或`bundle install`安装缺失依赖 |
| 网络连接失败 | 网络连接不稳定或被防火墙阻止 | 检查网络连接，确保能够访问Google Scholar，可尝试使用代理 |
| 权限问题 | 用户对文件或目录没有读写权限 | 使用`chmod`命令修改权限，或使用管理员/root权限运行命令 |
| 文件路径错误 | 路径格式不正确，特别是在WSL环境中 | 使用正确的路径格式，Windows路径需转换为WSL路径（如`/mnt/c/...`） |
| 日期格式错误 | 帖子日期格式不正确 | 确保帖子文件名和前置元数据中的日期格式为`YYYY-MM-DD` |

## 其他重要信息

### 项目结构

```
ljxangus.github.io/
├── _data/              # 数据文件目录
│   ├── publist.yml     # 论文列表数据
│   └── projects.yml    # 项目列表数据
├── _posts/             # 帖子目录
│   └── projects/       # 项目帖子
├── _includes/          # 包含模板
├── _layouts/           # 页面布局模板
├── assets/             # 静态资源
├── logs/               # 日志文件
├── backups/            # 数据备份
├── update_publications.py  # 主更新脚本
├── requirements.txt     # Python依赖
├── Gemfile             # Ruby依赖
└── _config.yml         # Jekyll配置
```

### 贡献指南

1. 克隆仓库到本地
2. 创建新的分支：`git checkout -b feature-branch`
3. 进行修改并提交：`git add . && git commit -m "描述你的修改"`
4. 推送到远程仓库：`git push origin feature-branch`
5. 创建Pull Request

### 许可证

本项目采用MIT许可证，详见LICENSE.txt文件。

## 联系方式

如有任何问题或建议，欢迎通过以下方式联系：

- 邮箱：jiax.l@outlook.com
- GitHub：https://github.com/ljxangus

---

*本README文档定期更新，建议定期查看以获取最新信息。*