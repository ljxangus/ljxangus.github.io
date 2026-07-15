---
layout: post
title: "星闪协议栈 services/stack 技术深度解析"
subtitle: "聚焦 OpenHarmony communication_nearlink_service 中 stack 模块的架构、控制面、数据面与底层适配"
date: 2026-07-15
tag: Post
author: Liang Jiaxin
readTime: "30 min read"
---

> 仓库：[openharmony/communication_nearlink_service](https://gitcode.com/openharmony/communication_nearlink_service)，分析对象为 `services/stack` 目录下的协议栈实现。本文聚焦协议栈本体（非 framework/server 层），围绕目录组织、构建加固、控制面（CP）、数据面（DP）、底层 DLI/NAI 适配以及框架公共能力展开，结合实际头文件与源文件给出技术解读。

---
前几天星闪协议栈刚刚在OpenHarmony上开源，这篇文章针对开源的代码仓进行简单的实现分析。


## 一、整体定位与目录全景

`services/stack` 是星闪（NearLink）服务组件中的**协议栈本体**。在仓库的分层架构中,它向上对接 `frameworks/native`(C++ Inner API)、向下通过 `services/hardware`(DLI 适配器)与厂商芯片通信。其同级的 `services/server`、`services/service` 负责 IPC 消息分发与基础服务编排,而 `services/stack` 才是真正实现 SLE 接入、连接、安全、服务化数据传输、测距等协议逻辑的核心。

目录结构(节选自 `BUILD.gn` 与实际目录树):

```
services/stack/
├── BUILD.gn
├── libnearlink_stack.versionscript        # 符号导出控制
├── libslestack_blocklist.txt              # 符号黑名单
├── include/ext/                            # 对外公共头(nlstk_*_ext.h)
└── src/
    ├── adapter/        # 各模块对外扩展函数注册与封装(适配层)
    ├── cp/             # Control Panel,控制面
    │   ├── bal/        # Basic Application Layer
    │   │   ├── audioctl/  (actm / cctl / cdsm / mctl / micp)
    │   │   └── profile/  (bas / dis / icce / port / hid)
    │   ├── bsl/sle/    # Basic Service Layer (SparkLink Low Energy)
    │   │   ├── cm/    (connection mgmt: link / icb / dyntrans / signaling)
    │   │   ├── devd/  (device discovery: adv / scan / scan_stm / filter)
    │   │   ├── hadm/  (high accuracy distance measurement)
    │   │   ├── qosm/ (QoS mgmt + autorate 子模块)
    │   │   ├── servm/ssap/  (SparkLink Service Access Protocol)
    │   │   └── sm/    (security management)
    │   ├── bnl/proxy/  # BNL 代理
    │   ├── nlstkfwk/   # 框架公共能力 (cfgdb / dft / dfx / log / schedule)
    │   └── doc/
    ├── dp/             # Data Plane,数据面
    │   ├── dpfwk/      # 数据面框架 (errcode / log)
    │   ├── dtap/      # Data Transmission & Adaptation Protocol
    │   └── transport/
    ├── dli/            # Device Link Interface(与芯片通信的总线)
    │   ├── cmd/ event/ layer/ sapi/ thread/ common/ interface/
    ├── nai/            # NearLink Adaptation Interface
    │   ├── api/ crypto/ dft/ naifwk/ nlm/ slem/
    ├── sdf/           # Starlink Develop Framework(OSAL)
    │   ├── bsl/ (dsl, stm)  oal/  interface/  dfx/
    └── utils/         # 通用工具 (crc16 / parameter_wrapper / time_utils)
```

`BUILD.gn` 中的 `nearlink_stack_sources` 列表汇总了所有参与编译的 `.c` 文件(约 130 余个),最终产出一个 `ohos_shared_library("nearlink_stack")`,依赖:

```
deps = [
  ".../services/hardware:nearlink_dli_adapter",
  ".../utils:nearlink_utils",
  ".../services/dft:nearlink_dft_manager",
  ".../services/stack/src/sdf:nearlink_stack_sdf",
  ".../services/stack/src/dli:nearlink_stack_base",
]
external_deps = [ hilog, init, openssl, hisysevent, bounds_checking_function ]
```

OpenSSL 在依赖列表里——这直接验证了 `sm/` 安全管理模块使用了真实密码学算法(而非自研),与下文 SM 模块的分析吻合。

---

## 二、构建与安全加固

`BUILD.gn` 中关于加固的配置值得单独指出,因为它直接反映了产物的安全姿态:

```gn
ohos_shared_library("nearlink_stack") {
  branch_protector_ret = "pac_ret"      # ARM PAC,返回地址保护
  ldflags = [ "-flto", "-Wl,--gc-sections" ]
  sanitize = {
    cfi = true                  # Control Flow Integrity
    cfi_vcall_icall_only = true # 只对间接调用做 CFI,减小开销
    boundary_sanitize = true    # 边界检查
    cfi_cross_dso = true        # 跨 SO 的 CFI
    integer_overflow = true
    ubsan = true
  }
  cflags = [
    "-Os", "-D_FORTIFY_SOURCE=2",
    "-fdata-sections", "-ffunction-sections",
    "-fno-asynchronous-unwind-tables", "-fno-unwind-tables",
    "-fno-exceptions", "-fno-rtti", "-flto",
  ]
}
```

几个值得注意的点:

1. **CFI + PAC 双重 CFI 防护**:`cfi_cross_dso = true` 说明协议栈在跨动态库调用时也保留控制流完整性校验,这对于一个被多个上层服务进程加载的协议栈而言是必要的;`branch_protector_ret = "pac_ret"` 在 ARMv9 PAC-capable 硬件上启用返回地址签名,对抗 ROP 链。
2. **纯 C ABI + 无异常/RTTI**:`-fno-exceptions -fno-rtti` 配合 `extern "C"` 头文件,意味着协议栈设计为可在 C 与 C++ 两侧被引用的纯 C ABI,避免运行时异常抛栈造成的崩溃面。
3. **`-D_FORTIFY_SOURCE=2` + `bounds_checking_function`**:fortified libc 与 `libsec_shared` 共同覆盖字符串/内存拷贝边界,配合 `boundary_sanitize` 在构建期/运行期双重拦截栈缓冲溢出。
4. **LTO + gc-sections**:对嵌入式/资源敏感的协议栈体积优化,并配合 `-DIS_NL_RELEASE_VERSION` 在 user 版本里关闭调试路径。

---

## 三、控制面(CP)解析

CP 是协议栈的"大脑",处理所有控制信令、状态机、连接编排、服务发现与安全。代码量与模块数都远超 DP。

### 3.1 总体分层:BSL / BAL / NLSTKFWK

按 `services/stack/src/cp/doc/01_introduction.md` 的定义:

- **BSL(Basic Service Layer)**:基础业务层,承载 SLE 接入的"硬核"协议——连接(cm)、设备发现(devd)、安全(sm)、服务管理(servm/ssap)、测距(hadm)、QoS(qosm)。
- **BAL(Basic Application Layer)**:基础应用层,面向具体业务能力——音频控制(actm/cctl/cdsm/mctl/micp)、典型 profile(bas/dis/icce/port/hid)。这些 profile 与 BLE GATT profile 概念同构,但实现于星闪 SSAP 之上。
- **NLSTKFWK**:协议栈自身的 OSAL/框架层——`cfgdb`(配置库)、`dft`(DFT 测试桩)、`dfx`、`log`、`schedule`(线程调度)。

下面按子模块展开。

### 3.2 连接管理 CM(Connection Management)

CM 的入口在 `cp/bsl/sle/cm/interface/cm.h`。文件首部注释直接揭示了 CM 的核心设计哲学:

```
连接管理模块通过白名单连接机制管理多用户(模块)多操作并发的星闪连接
1,支持多设备并发背景连接
2,支持多设备并发直接连接
3,支持背景连接和直接连接并发
4,支持多用户注册监听连接事件
限制说明:
    1,并发连接最大设备数量取决于控制器白名单大小(协议栈启动时从控制器读取)
    2,对于某用户的异常操作,未下发芯片操作前,则直接通知该用户,不再通知其他用户
    3,不同模块之间可以互相断连(即不做引用计数)
    4,不同模块之间可以互相取消连接中的请求
```

这一段信息密度极高,归纳出 CM 的几个关键决策:

- **白名单驱动(whitelist-driven)**:并发连接的容量并不在协议栈本身,而是受限于"控制器白名单大小",这个值**在协议栈启动时从控制器读取**。这是一种典型的"主机-控制器能力协商"模式,类似 BLE 的 `LE White List Size` HCI 命令。
- **不做引用计数的取消/断连策略**:不同模块之间可以互相取消对方发起中的连接、互相对已建立的连接断连。这意味着 CM 的设计哲学是"低摩擦、最终一致",而不是严格的所有权管理——这对上层使用者(SSAP、HADM、SM、DTAP 等多个 `CM_ModuleId_E` 客户端)提出了协调义务,但简化了协议栈内部逻辑。
- **背景连接 vs 直接连接的并发模型**:背景连接(`CM_BackgroundConnectAdd`)不携带连接参数、采用默认值,本质上是"将地址加入白名单让控制器自动扫描回连";直接连接(`CM_DirectConnectAdd`)是主动发起、超时 10s,由协议栈内部"平衡功耗与性能后确定参数"。

`cm_def.h` 给出了 CM 内部数据模型的核心:

```c
typedef enum {
    CM_G_NODE, CM_T_NODE,
} CM_NodeType_E;                         // G 节点 / T 节点(中心-终端)

typedef enum {
    CM_MODULE_ADPT = 0x0, CM_MODULE_CM_SIGNALING = 0x1,
    CM_MODULE_DTAP = 0x2, CM_MODULE_SM = 0x3,
    CM_MODULE_SSAP = 0x4, CM_MODULE_HADM = 0x5,
    CM_MODULE_CM_DYNTRANS = 0x6, CM_MODULE_QOSM = 0x7,
    CM_MODULE_BNL = 0x8, CM_MODULE_ID_MAX,
} CM_ModuleId_E;                          // CM 客户端模块 ID

typedef enum {
    CM_LINK_STATE_CONNECTED = 0x00,
    CM_LINK_STATE_CONNECTING = 0x01,
    CM_LINK_STATE_DISCONNECTED = 0x02,
    CM_LINK_STATE_DISCONNECTING = 0x03,
} CM_ConnectLinkState_E;

typedef enum {
    CM_TRANS_MODE_BASIC, CM_TRANS_MODE_TRANSPARENT,
    CM_TRANS_MODE_STREAM, CM_TRANS_MODE_RELIABLE,
} CM_TransMode_E;                          // 四种传输模式

typedef enum {
    CM_ACCESS_TRANS_MODE_UNICAST, CM_ACCESS_TRANS_MODE_DATA_MCST,
    CM_ACCESS_TRANS_MODE_FEEDBACK_MCST, CM_ACCESS_TRANS_MODE_BIDI_MCST,
    CM_ACCESS_TRANS_MODE_SEND_BCST, CM_ACCESS_TRANS_MODE_RECV_BCST,
} CM_AccessTransportMode_E;                 // 单播 / 3 种组播 / 2 种广播
```

值得注意的几点:

- **G 节点 / T 节点**:星闪接入拓扑中的中心节点(G)与终端节点(T),对应 BLE 的 Central/Peripheral 概念。
- **`CM_ModuleId_E` 是 CM 的多客户端身份**:每个上层模块(SSAP、SM、HADM、QOSM 等)都用唯一 ID 在 CM 中登记,CM 据此把同一连接上的事件分发给对应模块。
- **四种传输模式 + 六种接入传输方式**:传输模式(基础/透传/流/可靠)对应 DP 侧的 DTAP 四种 trans mode;接入传输方式(单播+3组播+2广播)则反映了星闪在 PHY/MAC 层对组播与广播的原生支持——这是相比 BLE 的明显增强。

CM 内部进一步细分为:

| 子目录 | 职责 |
|---|---|
| `cm/link/` | 主链路管理:`cm_access_mgr`(接入管理)、`sle_logic_link_mgr`(逻辑链路管理)、`sle_connect_param`(连接参数)、`cm_concurrent_conn`(并发连接编排)、`cm_link_collab_func`(协作连接) |
| `cm/icb/` | ICB(Connection Block)管理:`cm_icb_mgr` / `cm_icb_init` / `cm_icb_api` |
| `cm/dyntrans/` | 动态传输通道管理:`cm_dyn_trans_channel_mgr` / `cm_dyn_trans_chan_state_mgr` / `cm_dyn_tcid` |
| `cm/signaling/` | 信令交互:`cm_signaling_manage` / `cm_signaling_cap`(能力协商)/ `cm_signaling_trans_channel` / `cm_signaling_version`(版本协商) |
| `cm/common/` | `cm_dli_adapter` 与日志宏 |

`cm/signaling/include/cm_signaling_manage.h` 给出了信令缓存机制:

```c
typedef void (*CM_SignalingTimeoutCbk)(void *args);
void CM_SignalingRegisterCbk(CM_SendSignalingDataCbk sendFunc);
CM_SignalingHandle CM_SignalingGetManagerHandler(uint8_t code);
uint8_t CM_GetIdentifier(void);                                              // 信令 ID 分配
uint32_t CM_SignalingCacheInsert(uint16_t lcid, uint8_t id, uint8_t code, void *args, CM_SignalingTimeoutCbk cbk);
void CM_SignalingCacheRemove(uint8_t id, uint8_t code);
void CM_SignalingCacheClearByLcid(uint16_t lcid);
```

这是一个"请求-响应"配对模型:每个外发信令分配一个 `id`,缓存 `(lcid, id, code, args, timeout_cb)`;收到对端响应或超时后从缓存中移除;连接断开时按 `lcid` 整体清空。该模式与 HCI Command/Event 的 `Num_HCI_Command_Packets` 处理思路类似。

信令编解码用 `CM_DECODE2BYTE/CM_ENCODE2BYTE/CM_DECODE4BYTE/CM_ENCODE4BYTE` 宏手工完成,注意它是**小端序**(`*ptr` 为低字节,`*(ptr+1) << 8` 为高字节)——这与星闪空口规范一致,但要求所有信令处理代码严格按宏来读写多字节字段,避免字节序错误。

### 3.3 设备发现 DEVD(Device Discovery)

DEVD 模块位于 `cp/bsl/sle/devd/`,源文件清单揭示了功能切分:

```
devd.c, devd_adv.c, devd_local.c,
devd_scan.c, devd_scan_api.c, devd_scan_manager.c, devd_scan_stm.c,
devd_scan_filter.c, devd_scan_util.c, devd_report_parse.c, devd_tbl.c,
nlstk_devd_api.c, nlstk_scan_api.c
```

对外接口(`nlstk_devd_api.h`)覆盖广播与扫描两侧:

```c
NLSTK_Errcode_E NLSTK_DevdSetAdvData(NLSTK_DevdSetAdvData_S *setAdvData);
NLSTK_Errcode_E NLSTK_DevdStartAdv(NLSTK_DevdSetAdvParams_S *advParams);
NLSTK_Errcode_E NLSTK_DevdEnableAdv(NLSTK_DevdSetAdvEnable_S *setEnable);
NLSTK_Errcode_E NLSTK_DevdSetTxPower(NLSTK_DevdSetTxPower_S *setTxPower);
NLSTK_Errcode_E NLSTK_DevdRemoveAdv(uint8_t *setAdvHandle);
uint8_t         NLSTK_DevdCreateAdvHandle(NLSTK_DevdAdvEventCbk cbk);

NLSTK_Errcode_E NLSTK_DevdSleStartScan(NLSTK_DevdSleScanParams_S *sleScanParams);
NLSTK_Errcode_E NLSTK_DevdSleEnableScan(NLSTK_DevdSleScanEnable_S *sleScanEnable);
NLSTK_Errcode_E NLSTK_DevdRegScanEventCbk(NLSTK_DevdSleScanExterCbk_S *scanEventCbk);
```

设计要点:

- **广播句柄化**:`NLSTK_DevdCreateAdvHandle` 返回一个 `uint8_t` 句柄,多个广播实例可并存(对应星闪多广播集的空口能力),失败返回 `0xFF` 作为哨兵值。
- **扫描是状态机化的**:源文件 `devd_scan_stm.c` 表明扫描有独立状态机——典型的"INIT → DISCOVERY → IDLE"循环,用以协调"启动扫描 → 接收 report → 上报 → 停止扫描"的事件序列,避免并发扫描请求互相踩踏。
- **过滤分层**:`devd_scan_filter.c` 与 `devd_report_parse.c` 分别承担"过滤条件管理"与"report 解析"职责,扫描过滤可以配置多组(README 中明确"支持配置多组过滤条件")。

### 3.4 安全管理 SM(Security Management)

SM 是协议栈中安全姿态最重的模块,位于 `cp/bsl/sle/sm/`。源码清单:

```
sm.c            — 模块总入口(SmInit/SmEnable/SmDeInit)
sm_algos.c      — 密码学算法选择
sm_auth.c       — 鉴权流程
sm_dhkey.c      — DH 密钥协商
sm_encp.c       — 加密使能(Encryption Procedure)
sm_nego.c       — 安全参数协商(NEGO)
sm_noentry.c    — 无输入鉴权
sm_numcmp.c     — 数字比较(Numeric Comparison,类 BLE Just-Works 变体)
sm_oob.c        — OOB(Out-of-Band)
sm_passcode.c   — Passcode 输入
sm_password.c   — Password 配对
sm_psk.c        — PSK 路径
sm_slink.c      — SLink(Security Link)生命周期
sm_stm.c        — 状态机
sm_img.c        — IMG(Identity Management Group?)
sm_dft.c        — DFT 测试桩
nlstk_sm_api.c  — 对外 C API
```

`sm_stm.c` 文件头部注释明示了状态机设计:

```
共有六个状态,
    + INIT - 配对流程尚未开始.
    + NEGO - 根据协议决策配对时使用的密码学算法, 鉴权方式等.
    + AUTH - 根据指定鉴权方式验证公钥真实性.
    + ENCP - 使能加密能力.
    + FULL - 已经配对状态.
    + REMV - 执行配对删除.
以 XxxxDispatch() 命名的函数描述了状态机的转移行为,
以 XxxxEntry() 和 XxxxExit() 命名的函数描述了进入和退出状态时的行为.
```

实际枚举(来自 `sm_stm.c`):

```c
const char *g_smStateName[] = {
    [SM_STATE_INIT] = "SLINK_INIT",
    [SM_STATE_NEGO] = "NEGOTIATING",
    [SM_STATE_AUTH] = "AUTHENTICATING",
    [SM_STATE_ENCP] = "SECU_CTRL_PROC",
    [SM_STATE_MISS] = "KEY_MISSING",
    [SM_STATE_FULL] = "SLINK_FULL",
    [SM_STATE_REMV] = "SLINK_REMOVE",
};
```

注意 `SM_STATE_MISS = "KEY_MISSING"`——这是配对密钥丢失状态,是对端设备曾经配对过、但本端找不到密钥记录时的过渡状态,是"无感配对"流程的兜底入口。

状态机基类来自 SDF(`StateMachineSoftBaseCtor`),`SmStateMachine_S` 继承自 `StateMachine`,使用 C 风格的"对象+虚表"实现:

```c
SmStateMachine_S *SmStateMachineCtor(SmSLink_S *slink)
{
    SmStateMachine_S *stm = SDF_MemZalloc(sizeof(SmStateMachine_S));
    StateMachineSoftBaseCtor((StateMachine *)stm);
    stm->slink = slink;
    State *init  = CreateInitState((StateMachine *)stm);
    State *nego  = CreateNegoState((StateMachine *)stm);
    /* ... */
}
```

每一个 `CreateXxxState` 函数返回一个 `State` 对象,内部封装 Entry/Exit/Dispatch 回调。这种"组合式状态机"是 sdf/stm 子框架的标准用法,CP 中其他模块(devd_scan_stm、ssapc_app_link_sm 等)也采用同样基类。

SM 支持的鉴权方式从文件名即可窥见全貌:`sm_numcmp`(数字比较)、`sm_oob`(带外)、`sm_passcode`(密码输入)、`sm_password`(密码配对)、`sm_psk`(预共享密钥)、`sm_noentry`(无输入,对应 BLE Just-Works)。鉴权后的密钥派生走 `sm_dhkey.c`(DH 协商)与 `sm_algos.c`(算法选择),加密能力则由 `sm_encp.c` 在 `ENCP` 状态使能。对外暴露极简:

```c
void SmDeInit(void); uint32_t SmInit(void); void SmEnable(void);
bool SmIsSLinkAuthComplete(uint16_t lcid);
bool SmIsSLinkEncryptComplete(uint16_t lcid);
```

CM、SSAP、HADM 在执行需要安全保障的操作前会调用 `SmIsSLinkAuthComplete/SmIsSLinkEncryptComplete` 自检——这是协议栈内部"安全门禁"模式。

### 3.5 服务管理 SSAP(SparkLink Service Access Protocol)

SSAP 是星闪对标 BLE GATT/ATT 的属性协议栈,位于 `cp/bsl/sle/servm/ssap/`。源码组织清晰分为客户端(`ssapc_*`)与服务端(`ssaps_*`)两侧:

```
ssap_common.c, ssap_handle.c, ssap_link.c, ssap_link_state.c,
ssap_manager.c, ssap_utils.c, ssap_app_link.c,
ssapc_app.c, ssapc_app_link_sm.c, ssapc_app_util.c, ssapc_cache.c,
ssapc_client.c, ssapc_client_api.c,
ssaps_server.c, ssaps_server_write.c, ssaps_server_api.c,
ssaps_server_app.c, ssaps_server_find.c, ssaps_service.c,
ssaps_service_param.c,
nlstk_ssap_app_client.c, nlstk_ssap_app_link.c, nlstk_ssap_app_server.c
```

从命名规律可以看出 SSAP 的内部模型:

1. **Link 实体 `SSAP_Link`**(`ssap_link.h`)承载每条逻辑链路上的 SSAP 上下文:`paramList` 是"有回复信令缓存列表"(即等待 Response 的 Request 队列),`SSAP_LinkStatus` 只有 `IDLE/BUSY` 两种——SSAP 链路是串行的,同一时刻只处理一个事务。
2. **任务模型 `SSAP_TaskParam_S`**:

```c
typedef struct SSAP_TaskParam {
    int32_t appId;
    void *arg;
    SSAP_TaskArgFreeFunc freeFunc;
    SSAP_ProcessTaskFunc func;
    int64_t timeout;
    bool valid;
    SsapTaskAppCallback appCallback;
} SSAP_TaskParam_S;
```

每个 SSAP 操作(读、写、通知、发现)被封装为一个 Task,挂到 `paramList`;`SSAP_ProcessRequestTask` / `SSAP_ProcessHighPriorityRequestTask` 按优先级派发,`SSAP_TIMEOUT_TIME = 30000`(30 秒)触发 `SSAP_TimeoutCbk`。这与 ATT 的"事务超时 → 链路断开"模型一致。

3. **服务端与客户端对称**:`ssaps_*` 提供 server 端的 service 注册、属性 find、write 处理、参数管理;`ssapc_*` 提供 client 端的 cache(`ssapc_cache.c` 存放已发现的 service/characteristic 缓存)、client API、app link 状态机(`ssapc_app_link_sm.c`)。
4. **`SSAP_Recv` 是数据入口**:`SSAP_Recv(DTAP_Data_Info_S *info, SDF_Buff_S *buff)` 是 DTAP 收到 PI=SSAP 的数据后回调进 SSAP 的入口。也就是说 SSAP 把报文收发完全委托给了 DTAP,自己只关注 PDU 解析与事务状态——这体现了 stack 内"控制面与数据面解耦"的清晰边界。

### 3.6 测距管理 HADM(High Accuracy Distance Measurement)

HADM 是星闪的标志性能力之一。源码(`hadm/src/`):

```
hadm_init.c        — 初始化
hadm_api.c         — 对外 API
hadm_config_cm.c   — 通过 CM 配置链路参数
hadm_config_dli.c  — 通过 DLI 配置芯片侧
hadm_link_manager.c — 测距链路管理
hadm_listen_cm.c   — 监听 CM 事件
hadm_listen_dli.c  — 监听 DLI 事件
hadm_parser_iq.c   — IQ 数据解析(核心:相位→距离)
hadm_sm.c          — 状态机
hadm_user_proc.c   — 用户流程处理
hadm_dft.c         — DFT 测试桩
hadm_api.h         — 对外头
```

错误码集中定义在 `nlstk_public_define_ext.h`,HADM 段:

```c
NLSTK_HADM_ERRCODE_BASE = 0x2000,
NLSTK_HADM_ERRCODE_CAN_NOT_FIND_LINKCB,                // 找不到链路控制块
NLSTK_HADM_ERRCODE_LINK_EXCEPTION,                     // 链路异常
NLSTK_HADM_ERRCODE_ADDR_ALREADY_IN_SOUNDING,           // 该地址正在测距中
NLSTK_HADM_ERRCODE_MAX_PARALLEL_SOUNDING_NUM,          // 并发测距任务达到最大值
NLSTK_HADM_ERRCODE_CONFIG_CM_FAIL,                     // 调用 CM 接口配置链路参数失败
NLSTK_HADM_ERRCODE_CONFIG_DLI_FAIL,                    // 调用 DLI 接口配置链路参数失败
NLSTK_HADM_ERRCODE_CALL_CM_FAIL,
NLSTK_HADM_ERRCODE_CALL_DLI_FAIL,
NLSTK_HADM_ERRCODE_PEER_NOT_SUPPORT_SOUNDING,          // 对端不支持测距
```

这里有几个非常关键的设计信号:

- **"Sounding"概念**:星闪测距用 sounding(探测定向)一词,对应空口的相位测距/CSI 测距机制。`hadm_parser_iq.c` 表明底层数据是 IQ(同相/正交)采样,协议栈在主机侧完成 IQ → 距离值的解析计算(结合相位、信号强度、置信度上报,与 README 描述一致)。
- **CM 与 DLI 双轨配置**:`hadm_config_cm` 走协议栈内部链路参数,`hadm_config_dli` 走芯片侧直接配置;这种"主机-控制器双轨"的配置方式在 BLE 中也常见(如 AoA/AoD 的 CTE 配置既走 HCI 也走主机参数表)。
- **并发限制**:`MAX_PARALLEL_SOUNDING_NUM` 错误码说明同时进行的测距会话数量有上限——这是空口资源(sounding 时隙)的硬约束,超出时协议栈拒绝新增请求而不是排队。
- **`ADDR_ALREADY_IN_SOUNDING`**:同一对端地址不可重复发起 sounding,避免空口资源争用。

### 3.7 QoS 管理 QOSM 与 Autorate 子模块

QOSM 主目录 `cp/bsl/sle/qosm/`,并下设 `autorate/` 子模块。autorate 源码:

```
qosm_icg_mgr.c, qosm_table_mgr.c,
qosm_antenna_dfx.c, qosm_audio_dfx.c, qosm_uevent.c,
qosm_autorate.c, qosm_autorate_notify.c, qosm_autorate_report.c,
qosm_autorate_common.c, qosm_autorate_timeout_process.c,
qosm_icg_callback.c
```

可以解读出 QOSM 的核心增强能力:

- **Autorate(自适应速率)**:基于信道质量动态调整传输参数。`qosm_audio_dfx` 与 `qosm_antenna_dfx` 表明自适应策略针对音频流与天线状态做差异化;`qosm_uevent` 通过 uevent(用户态事件)把决策上报到上层(驱动/产品策略层);`qosm_icg_mgr` / `qosm_icg_callback` 是 ICG(Interference Co-Group?干扰协同组)的管理与回调。
- **定时驱动**:`qosm_autorate_timeout_process` 表明 autorate 有周期性触发逻辑,会周期性评估信道并下发参数调整。
- **能力位驱动**:在 CM 的私有特性位图 `CM_PRIVATE_FEATURES_BIT_AUTORATE = 23` 表明 autorate 能力是私有特性,需要双方能力协商通过才能启用——这是典型的"特性协商 gating"。

主 QOSM 模块(`qosm.c`、`qosm_trans_channel.c`)则提供传输通道级的 QoS 配置,对接 CM 的 dyntrans 通道。

### 3.8 BAL 层:AudioCtl 与 Profile 族

`cp/bal/audioctl/` 下五个子模块对应星闪的音频控制族,对标 BLE 的 GATT 音频 profile 族(MCP/VCP/CSIS/MICP 等):

| 子模块 | 全称 | 对应概念 |
|---|---|---|
| `actm/` | Audio Configuration and Transmission Management | 音频流配置与传输管理,含 L2HC 编解码(`actm_l2hc.c`) |
| `cctl/` | Call Control | 通话控制(CCS、VAS server) |
| `cdsm/` | Cooperative Devices Set Management | 合作集管理(多设备协同组) |
| `mctl/` | Media Control | 媒体控制(MCP media/volume client) |
| `micp/` | Microphone Control | 麦克风控制 |

值得单独一提的是 `actm_l2hc.c`——L2HC(Lossless High-quality Audio Codec,无损高保真音频编码)是星闪联盟主推的音频编解码,被嵌入协议栈而非放到上层服务,说明它需要与 SSAP/DTAP 紧耦合(很可能走可靠模式或流模式的 DTAP 通道,并配合 QOSM 的 autorate 调整)。

`cp/bal/profile/` 下是经典 profile:

| 子模块 | 说明 |
|---|---|
| `bas/` | Battery Access Service(电量服务,对应 BLE BAS) |
| `dis/` | Device Information Service(设备信息) |
| `icce/` | ICCE 互通 profile(星闪与中国 ICCE 互通框架对接) |
| `port/` | 通用端口 profile |
| `hid/` | HID over 星闪(人机交互设备,对应 BLE HOGP) |

每个 profile 都遵循 SSAP server/client 双侧实现模式(如 `dis_client.c` / `dis_server.c` / `dis_common.c` / `dis_stm.c` / `nlstk_dis_client.c` / `nlstk_dis_server.c`),并通过 `*_stm.c` 实现状态机化的连接交互。

### 3.9 NLSTKFWK:协议栈自身的"小 OSAL"

`cp/nlstkfwk/` 是协议栈的内部框架:

- `cfgdb/`:配置数据库(运行时配置 KV)。
- `dft/`:DFT(Design for Test)测试桩,与 `services/dft` 协同提供可注入的测试接口。
- `dfx/`:可观测性(指标/事件)。
- `log/`:日志分类,`LOG_TAG="nearlink_stack"`、`LOG_DOMAIN=0xD000153` 在 `BUILD.gn` 中硬编码。
- `schedule/`:调度核心。

`schedule/src/nlstk_schedule.c` 揭示了协议栈的线程模型:

```c
#define STACK_MAX_THREAD 2
int g_scheduleEvcHandle = -1;
int g_scheduleEventHandle = -1;
SDF_Worker_S *g_schedule = NULL;

static void ScheduleRunOnce(void *args) { SDF_WorkerRunOnce(g_schedule); }

static uint32_t ScheduleThreadCreate(void) {
    g_schedule = SDF_CreateWorker();
    SDF_EvcInstanceCreate(&g_scheduleEvcHandle, "SCHEDULE");
    SDF_EventParam param = {g_scheduleEvcHandle, ScheduleRunOnce, NULL};
    SDF_EventAdd(&g_scheduleEventHandle, &param);
}

uint32_t SchedulePostTask(SDF_WorkCb cb, void *arg, SDF_FreeWorkArg freeCb) {
    SDF_AddWork(g_schedule, cb, arg, freeCb);
    SDF_EventPost(g_scheduleEventHandle);
}
```

要点:

1. **单 Worker + Event 触发模型**:协议栈内只有一个调度 worker(`g_schedule`),所有跨模块任务通过 `SchedulePostTask` 异步派发;worker 通过事件句柄(`g_scheduleEvcHandle`)唤醒执行一次 `SDF_WorkerRunOnce`。
2. **`STACK_MAX_THREAD = 2`**:协议栈设计上最多两线程(推测一条用于 schedule,一条用于 DLI 收发),属于轻量级单进程多线程模型。
3. **失败兜底**:`SDF_EventPost` 失败时注释明确"不返回失败,下次 POST 成功时任务依旧能执行"——任务已 enqueue 到 worker,下次 post 会一并消化,避免任务丢失。

这套调度框架是整个 CP 各模块协同的"血液":SM 状态机推进、SSAP 事务派发、HADM 异步事件处理、DEVD report 上报都通过它走异步化执行,从而避免在 DLI 收包线程里做长耗时操作。

---

## 四、数据面(DP)解析

DP 在体量上明显小于 CP,但承载了星闪空口数据传输的四种模式实现。

### 4.1 框架与目录

```
services/stack/src/dp/
├── dpfwk/    # data plane framework (errcode / log)
├── dtap/     # Data Transmission & Adaptation Protocol
│   ├── interface/  dtap.h, dtap_errno.h, dtap_tcid.h
│   ├── include/    dtap_channel.h, dtap_frame.h, dtap_scheduler.h, dtap_trans.h
│   └── src/
│       dtap.c, dtap_channel.c, dtap_frame.c, dtap_scheduler.c,
│       dtap_frame_basic.c, dtap_frame_enhance.c,
│       dtap_trans.c, dtap_trans_basic.c, dtap_trans_transparent.c,
│       dtap_trans_stream.c, dtap_trans_reliable.c
└── transport/  transport.c, transport_cltp.c
```

### 4.2 DTAP:协议适配层

`dtap.h` 头部定义了 DTAP 的"上层协议指示"PI(Protocol Indicator)与四种通道优先级:

```c
#define DTAP_MAX_PAYLOAD_LEN 32768U  // 32K

enum {
    DTAP_PI_NONE = 0,  // 保留
    DTAP_PI_IPV4,      // IPv4
    DTAP_PI_IPV6,      // IPv6
    DTAP_PI_LWCLTP,    // Light Weight Connectionless-mode Transport Protocol
    DTAP_PI_LWCTP,     // Light Weight Connection-mode Transport Protocol
    DTAP_PI_WNP,       // Wireless Network Protocol (无线网络协议)
    DTAP_PI_WAP,       // Wireless Adjacency protocol (无线邻居协议)
};

typedef enum {
    DTAP_PRIORITY_FRAGMENT = 0, // 必须为0,每个 lcid 下只有一个 fragmentChannel
    DTAP_PRIORITY_CMD,
    DTAP_PRIORITY_HIGH,
    DTAP_PRIORITY_NORMAL,
} DTAP_ChannelPriority;

typedef struct DTAP_Data {
    uint8_t pi;         // 上层协议指示
    uint16_t lcid;      // 逻辑链路 handle
    uint8_t tcid;       // 传输通道 tcid
    SDF_Buff_S *buff;   // 待发送数据
} DTAP_Data_S;
```

这一段定义极其重要,揭示了星闪协议栈数据面的"三层抽象":

1. **LCID(Logic Channel ID)**:逻辑链路标识,与 CM 的逻辑链路一一对应。
2. **TCID(Transmission Channel ID)**:传输通道标识。同一 LCID 上可以有多条传输通道,每条 TCID 承载不同的传输模式。
3. **PI(Protocol Indicator)**:上层协议指示。DTAP 是个"多路复用器"——根据 PI 把数据派发到不同上层协议(IP 协议栈、LWCLTP/LWCTP、WNP、WAP 等)。`DTAP_RegisterProtoRecvCbk(pi, cbk)` 让上层协议注册自己的接收回调。
4. **优先级**:Fragment 通道固定优先级 0(用于分片重组的专用通道);CMD/HIGH/NORMAL 是业务通道的三档优先级。

接口设计:

```c
uint32_t DTAP_Init(void); void DTAP_DeInit(void);
uint32_t DTAP_DataSend(DTAP_Data_S *data);                 // 发送,成功后 buff 由 DTAP 释放
void     DTAP_DataRecv(uint16_t lcid, SDF_Buff_S *buf);   // 接收入口
uint32_t DTAP_RegisterDataRecvCb(uint8_t tcid, DTAP_DataRecvCb cb);    // 固定 TCID 回调注册
uint32_t DTAP_RegisterProtoRecvCbk(uint8_t pi, DTAP_DataRecvCb cbk);    // 上层协议 PI 回调注册
```

注册回调有两种维度:按 TCID(用于星闪预留的固定功能通道)和按 PI(用于上层协议动态分发)。这意味着协议栈既支持"星闪原生固定 TCID"模式(如 SSAP、SM 等控制信令走固定 TCID),也支持"协议多路"模式(IP 包按 PI 走对应上层处理)。

### 4.3 四种传输模式

`dtap_trans.c` 的 `g_dtapTransMode` 数组揭示了四种模式的注册机制:

```c
static DTAP_TransMode_S *g_dtapTransMode[CM_TRANS_MODE_MAX] = { NULL };

void DTAP_RegisterTransMode(DTAP_TransMode_S *dtapTransMode) {
    uint8_t modeType = dtapTransMode->getModeType();
    g_dtapTransMode[modeType] = dtapTransMode;
}

DTAP_TransMode_S *DTAP_GetTransMode(uint8_t modeType) { ... }
```

`DTAP_TransMode_S` 是一个"传输模式对象"(含函数指针表),每个模式独立注册到 `g_dtapTransMode[modeType]`。对应源文件:

| 文件 | 模式 | 说明 |
|---|---|---|
| `dtap_trans_basic.c` | CM_TRANS_MODE_BASIC | 基础模式:最简单的"发即弃",无重传、无顺序保证,用于低时延小包 |
| `dtap_trans_transparent.c` | CM_TRANS_MODE_TRANSPARENT | 透传模式:上层 PDU 不做封装直接走空口 |
| `dtap_trans_stream.c` | CM_TRANS_MODE_STREAM | 流模式:高吞吐,含 reorder/flush 定时器,用于音频流、文件传输 |
| `dtap_trans_reliable.c` | CM_TRANS_MODE_RELIABLE | 可靠模式:ARQ、顺序保证、丢包重传 |

通用工具函数(来自 `dtap_trans.c`):

```c
bool DTAP_IsFrameSeqSmaller(uint16_t own, uint16_t other) {
    return ((uint16_t)(own - other) & DTAP_FRAME_SEQ_SIGN_MASK) == DTAP_FRAME_SEQ_SIGN_MASK;
}
uint16_t DTAP_GetNextFrameSeq(uint16_t seq) {
    uint16_t nextSeq = seq + 1;
    if (nextSeq > DTAP_FRAME_SEQ_MAX) nextSeq = 0;
    return nextSeq;
}
```

`IsFrameSeqSmaller` 是经典的**回绕序列号比较**算法(与 TCP 序号比较同构),用于可靠/流模式的接收窗口与重排序判定——`DTAP_FRAME_SEQ_MAX` 是序列号上界,序列号回绕时通过符号位判定相对大小。

帧处理:`dtap_frame.c`、`dtap_frame_basic.c`、`dtap_frame_enhance.c` 分别对应基础帧与增强帧的组装/解析;`dtap_scheduler.c` 负责多通道、多优先级的发送调度;`dtap_channel.c` 管理 TCID 通道实体。

### 4.4 Transport 层

`dp/transport/` 下 `transport.c` 与 `transport_cltp.c` 是 DTAP 下层的传输通道层。`transport_cltp` 的 CLTP 推测为 "Connectionless Transport Protocol"(无连接传输),与 DTAP PI 中的 `LWCLTP` 形成上下承接——DTAP 的 PI 多路复用最终落到 transport 层的具体协议实现上。

---

## 五、底层适配:DLI / NAI / SDF / Adapter

### 5.1 DLI(Device Link Interface)

DLI 是协议栈与厂商芯片之间的"总线语言"。位于 `src/dli/`,下分:

```
cmd/        # 命令组装与下发
event/      # 事件回调(连接 / 设备发现 / 工厂 / hadm / nbc / secu)
layer/      # DLI 层抽象(layer_callback / layer_config / layer_utils)
sapi/       # 数据 stub 与 sapi 接口
thread/     # DLI 收发线程
interface/  # 对外接口:dli.h / dli_callback.h / dli_cmd.h / dli_cmd_struct.h /
            #             dli_common_func.h / dli_def.h / dli_errno.h /
            #             dli_event_struct.h / dli_layer.h / dli_layer_stru.h /
            #             dli_opcode.h
```

对外 API(`dli.h`)极简:

```c
uint32_t DLI_Init(void);  void DLI_DeInit(void);
uint32_t DLI_Enable(void); void DLI_Disable(void);
uint32_t DLI_CmdCbkReg(const ModuleType module, const DLI_InnerCbkLineStru *innerTable,
                       const uint32_t innerSize, const DLI_CbkLineStru *table, const uint32_t size);
void     DLI_CmdCbkUnReg(...);
uint32_t DLI_RegNOCPEventCbk(DLI_RegModuleType module, DLI_NOCPEventCbk cbk);
uint32_t DLI_UnregNOCPEventCbk(DLI_RegModuleType module);
```

设计模式:

- **回调表注册**:每个上层模块(CM、SM、DEVD、HADM、SSAP、QOSM 等)把自己关心的 opcode → 回调函数映射表注册到 DLI;DLI 收到芯片上报事件后按 opcode 查表分发。
- **`innerTable` vs `table`**:公共事件 vs 模块私有事件的双层映射——已知模块可以只注册私有表,新模块必须同时提供公共表,这是协议栈对扩展性的明确约束。
- **NOCP(Number Of Completed Packets)事件**:`DLI_RegNOCPEventCbk` 是蓝牙经典概念迁移——控制器在每个空口事件完成后上报本端有多少包完成,主机据此做发送信用管理。星闪空口沿用此模型,使得上层各模块都能基于"信用回补"驱动自己的发送队列。

DLI 之下通过 `services/hardware:nearlink_dli_adapter`(在 `services/hardware/`)对接具体厂商芯片,本仓库不再向下展开。

### 5.2 NAI(NearLink Adaptation Interface)

NAI 在 `src/nai/` 下,包含:

```
api/       # 通用 API 与 uapi_func
crypto/    # sle_crypto.c — 星闪密码学原语(基于 OpenSSL)
dft/       # nai_dft.c — 测试桩
naifwk/    # NAI 框架
nlm/       # nlstk_init.c — 协议栈总初始化
slem/      # sle_dli_layer.c, slem.c — SLE DLI 层与 SLEM 模块
```

`nai/nlm/src/nlstk_init.c` 是整个协议栈的入口函数集合(推测含 `NlstkInit / NlstkEnable / NlstkDisable`),把 DLI、CM、SM、SSAP、HADM、QOSM、DTAP 等按依赖顺序装配起来。`sle_crypto.c` 走 OpenSSL(与 `BUILD.gn` 的 `openssl:libcrypto_shared` 依赖吻合)实现星闪 SM 所需的 ECDH、AES-CCM、HMAC 等原语。

### 5.3 SDF(Starlink Develop Framework)

`src/sdf/` 是协议栈的 OSAL/框架层,目录:

```
sdf/bsl/dsl/    # 数据结构库(dlist 等)
sdf/bsl/stm/    # 状态机基类(StateMachineSoftBase / State / Dispatch)
sdf/oal/        # OS 抽象层(线程 / 定时器 / 锁 / 事件)
sdf/interface/  # 公共接口
sdf/dfx/        # errno / log / trace
```

SDF 提供的能力在前述各模块中已被反复引用:

- `SDF_MemZalloc / SDF_MemFree`:内存管理。
- `SDF_DListEntry_S / SDF_DListHead_S`:侵入式双向链表(SSAP、CM 等大量使用)。
- `SDF_TimerParam / CP_TimerAdd / CP_TimerDel`:定时器(DTAP、SM、SSAP、HADM 均依赖)。
- `SDF_Worker_S / SDF_CreateWorker / SDF_AddWork`:worker 池(`nlstk_schedule.c` 使用)。
- `SDF_EvcInstanceCreate / SDF_EventAdd / SDF_EventPost`:事件机制。
- `StateMachineSoftBaseCtor / State`:状态机基类(SM、DEVD、SSAP、HADM 状态机都基于此)。

SDF 是协议栈与 OpenHarmony 之间的"缓冲层"——它把 hilog、libbegetutil、libsec 等系统依赖收口在自己内部,使协议栈主体代码可以保持 OS 中立。

### 5.4 Adapter 层

`src/adapter/` 包含两类文件:

- `*_reg_ext_func.c`:注册扩展函数表(如 `bnl_reg_ext_func` / `devd_reg_ext_func` / `qosm_reg_ext_func` / `hadm_reg_ext_func`)。
- `*_ext_func_wrapper.c`:扩展函数包装器,把内部接口包装成统一签名供外部调用。

对应模块:bnl、collab、common、devd、dli、hadm、qosm。Adapter 是协议栈对外开放能力的"门面层",对接 `services/stack/include/ext/` 下的 `nlstk_*_ext.h` 头文件族(如 `nlstk_devd_def_ext.h`、`nlstk_bnl_type_ext.h`、`nlstk_reg_collab_*_ext.h` 等)。

特别值得注意的是 `collab_*` 系列(`collab_reg_ext_func` / `collab_ext_func_wrapper`)——这对应 README 提到的"合作集管理"扩展能力,对外提供 `nlstk_reg_collab_adv_ext.h`、`nlstk_reg_collab_cm_ext.h`、`nlstk_reg_collab_stm_scan_ext.h`、`nlstk_reg_collab_trans_ext.h`,即合作集场景下的广播、连接管理、扫描状态机、传输通道四个面的注册接口。这暗示星闪的"多设备协同组网"是一个一等公民特性,而非事后补丁。

---

## 六、横向架构观察

把以上各模块叠在一起,可以画出 stack 的横向数据流:

```
                    [应用/系统服务]
                          │ ArkTS / Inner API
                          ▼
                  [frameworks/native]
                          │ C++ Inner API
                          ▼
                  [services/server + service]   ← IPC 分发
                          │
        ┌─────────────────┴──────────────────┐
        ▼                                     ▼
  [stack: 控制面 CP]                    [stack: 数据面 DP]
   ┌───────────────────┐                ┌──────────────────┐
   │ bal/profile/*      │                │ transport/*      │
   │ bal/audioctl/*     │                │ dtap/            │
   │   (actm/cctl/...   │                │  ├─ basic        │
   │    mctl/micp/cdsm) │                │  ├─ transparent  │
   │ bsl/sle/cm         │   SSAP↔DTAP    │  ├─ stream       │
   │ bsl/sle/devd       │ ◄──────────►  │  └─ reliable     │
   │ bsl/sle/sm         │                │ dpfwk/           │
   │ bsl/sle/servm/ssap │                └──────────────────┘
   │ bsl/sle/hadm       │
   │ bsl/sle/qosm       │
   │ bsl/sle/bnl/proxy  │
   │ nlstkfwk/schedule  │  ← 单 Worker 调度
   └─────────┬──────────┘
             │
             ▼
       [stack: adapter/*]  ← ext 函数注册/包装
             │
             ▼
       [stack: dli/*]      ← 命令/事件分发,回调表注册
             │
             ▼
   [services/hardware:nearlink_dli_adapter]
             │
             ▼
         [厂商星闪芯片]
```

几个横向观察:

1. **CP/DP 解耦在 DTAP/SSAP 边界**:SSAP 把收发委托给 DTAP(`SSAP_Recv` 是 DTAP 的回调),CM 的传输通道与 DTAP 的 TCID 一一对应。控制信令与业务数据共享同一逻辑链路但走不同 TCID,互不阻塞。
2. **CM 是协议栈的"中枢"**:所有需要逻辑链路的模块(SM、SSAP、HADM、QOSM、DTAP、BNL、CM_DYNTRANS)都注册为 CM 的 `ModuleId` 客户端。CM 不引用这些模块的具体实现,而是通过 `CM_ModuleId_E` 与回调机制反向分发——典型的"中心总线+订阅者"模式。
3. **状态机统一基类**:SM、DEVD_SCAN、SSAPC_APP_LINK、HADM、ICB 等模块的状态机都基于 `sdf/bsl/stm` 的 `StateMachineSoftBase`,配合 `XxxDispatch / XxxEntry / XxxExit` 三段式约定,整个 CP 的状态机代码风格高度一致,便于跨模块理解与维护。
4. **错误码分段治理**:`nlstk_public_define_ext.h` 把错误码分为 `COMMON_INTER_BEGIN=1`、`SSAP_INTER_BEGIN=0x100`、`HADM_ERRCODE_BASE=0x2000`、`COMMON_INTER_END=0x800`——分段编号避免了模块间冲突,也便于上层根据错误码段位判断错误来源。
5. **`NLSTK_API_TIME_OUT = 3000`**:所有同步对外 API 的最长等待时间(3s),因为协议栈在独立线程跑,上层同步调用必须超时返回避免挂死——这是协议栈对外承诺的 SLA。
6. **可配置增强特性**(来自仓库 README):`nearlink_service_kia_enable`(关键资产保护)、`nearlink_service_bas_enable`(电量服务)、`nearlink_service_host_dynamic_running`(驱动进程动态加载)、`nearlink_service_no_pairing_dialog`(免弹窗配对)等通过编译宏控制协议栈行为,产品可按需启用。

---

## 七、几个工程层面的设计取舍评价

最后从工程视角讨论几个值得关注的设计决策:

**正向**:

1. **OSAL 边界清晰**:SDF 把 OS 依赖收口,整个协议栈主体代码不直接调用 pthread/hilog/openssl,而是通过 SDF 间接调用。这让协议栈具备移植到非 OpenHarmony 平台的潜力(虽然实际部署仍是 OH)。
2. **状态机基础设施复用**:`StateMachineSoftBase` + `State` + Dispatch/Entry/Exit 约定,使得状态机代码在每个模块都是同构的,新人进入一个新模块只需要理解"状态枚举+转移函数表"即可上手。
3. **DLI 回调表 + innerTable 双层注册**:明确区分"协议栈公共事件"与"模块私有事件",为新增模块与已有模块的事件分发提供清晰的扩展边界。
4. **安全加固**:PAC + CFI + integer_overflow + UBSan + boundary_sanitize + Fortify Source + libsec,对于一个承载短距通信的协议栈而言是合理且必要的——配对密钥协商、IQ 数据解析、SSAP 属性写操作等都是潜在的攻击面。
5. **四种传输模式独立注册**:`DTAP_RegisterTransMode` 让四种模式可独立替换/裁剪,产品形态可按需启用基础+流模式而关闭可靠模式,减小代码体积。

**值得反思的**:

1. **CM 不做引用计数的"互斥取消/断连"**:简化了协议栈内部逻辑,但把"协同义务"推给了上层模块——如果一个模块(如 SSAP)正在做关键事务,另一个模块(如 HADM)发起断连,SSAP 的事务会被打断。文档(`cm.h` 注释)承认了这一点,但生产环境仍需要上层做白名单协调。
2. **`DTAP_MAX_PAYLOAD_LEN = 32K`**:上层单次发送上限 32K,对于流模式大文件传输而言需要分片——但分片逻辑在 dtap_frame 里,会增加协议栈内内存压力与抖动可能,需配合 QOSM 流控。
3. **协议栈单 Worker 调度**:`g_schedule` 是单实例,跨模块任务都在一个 worker 上串行执行。优势是不会出现协议栈内部的数据竞争(无需大量锁),劣势是任何模块的卡顿都会影响全局——这要求所有 schedule 任务必须短小、不得阻塞。`NLSTK_API_TIME_OUT=3000` 是这一约束的兜底。
4. **`-fno-exceptions -fno-rtti`**:纯 C ABI 优势明显,但代价是错误处理完全依赖返回码(`NLSTK_Errcode_E`),上层使用协议栈接口时必须严格检查返回值,否则错误传播链断裂。从源码看,`CHECK_AND_RETURN_LOG` 宏在多处使用,是这一约束的工程兜底。
5. **状态机的"继承式"实现是 C 风格的"对象+虚表"**:可读但比 C++ 模板/继承啰嗦;这种取舍换来了与 C++/C 双侧良好的互操作(头文件都是 `extern "C"`),从协议栈作为基础库的定位来看是合理的。

---

## 八、结语

`services/stack` 的设计可以概括为三条主线:

- **控制面(CP)以 CM 为中枢、以 SSAP 为属性交互枢纽、以 SM 为安全底座、以 HADM 为差异化能力**,五者通过 `nlstkfwk/schedule` 单 worker 调度串成异步事件驱动系统。
- **数据面(DP)以 DTAP 为多路复用核心,四种传输模式独立注册、按 TCID/PI 二维分发**,与 CP 在 SSAP 边界解耦。
- **底层以 DLI 为芯片抽象、以 SDF 为 OS 抽象、以 Adapter 为对外开放门面**,三层抽象使协议栈具备良好的可移植性与可替换性。

整体而言,这是一个为 OpenHarmony 标准系统设计的、安全加固完备、模块切分清晰的 C 风格协议栈。它的工程姿态(CFI/PAC、纯 C ABI、单 worker 调度、状态机基础设施复用)反映了一个"承载无线通信、需长期演进、强调安全合规"的系统级组件应有的克制与稳健。
