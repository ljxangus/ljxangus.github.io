---
layout: post
title: "FreeBSD 网络栈分析与架构图"
subtitle: "本文针对 freebsd 的网络栈进行分析与架构梳理"
date: 2026-04-03
tag: Post
readTime: "30 min read"
---

# FreeBSD 网络栈分析与架构图

## 一、模块概述

### 1. 核心模块

| 模块 | 目录 | 主要功能 |
|------|------|----------|
| **网络接口层** | sys/net/ | 网络设备抽象、接口管理、BPF、虚拟接口 |
| **IPv4 协议栈** | sys/netinet/ | IP 协议处理、TCP/UDP、ICMP、IGMP、拥塞控制 |
| **IPv6 协议栈** | sys/netinet6/ | IPv6 协议处理、IPv6 路由、邻居发现、多播 |
| **包过滤** | sys/netpfil/ | ipfw 防火墙、PF 防火墙、IPFilter、Dummynet 流量整形 |
| **NetBIOS/SMB** | sys/netsmb/ | SMB/CIFS 协议支持 |

### 2. 关键子模块

#### sys/net/ (网络基础设施)
- `if.c` - 接口核心管理、接口链表操作
- `if_loop.c` - 回环接口
- `if_bridge.c` - 网桥接
- `if_vlan.c` - VLAN 接口
- `if_gre.c` - GRE 隧道
- `if_tuntap.c` - TUN/TAP 虚拟设备
- `bpf_filter.c`, `bpf_buffer.c` - Berkeley 数据包过滤器
- `netisr.c` - 网络软件中断处理
- `altq/` - ALTQ 流量调度
  - `altq_cbq.c` - CBQ 调度位队列
  - `altq_fairq.c` - 公平队列
  - `altq_hfsc.c` - 分层公平服务曲线
  - `altq_codel.c` - CoDel 主动队列管理
- `route/` - 路由子系统
  - `route_ctl.c` - 路由控制
  - `fib_algo.c` - FIB 算法接口
  - `nhop.c` - 下一跳管理

#### sys/netinet/ (IPv4 协议)
- `ip_input.c` - IPv4 输入处理
- `ip_output.c` - IPv4 输出处理
- `ip_forward.c` - IP 转发
- `tcp_input.c` - TCP 输入处理
- `tcp_output.c` - TCP 输出处理
- `tcp_subr.c` - TCP 子程序
- `tcp_timer.c` - TCP 定时器管理
- `tcp_syncache.c` - SYN 缓存 (SYN 缓存)
- `udp_usrreq.c` - UDP 用户请求处理
- `in_pcb.c` - Internet PCB 管理
- `in_fib.c` - IPv4 FIB
- `cc/` - 拥塞控制算法
  - `cc_newreno.c` - NewReno (默认)
  - `cc_cubic.c` - CUBIC
  - `cc_htcp.c` - H-TCP
  - `cc_dctcp.c` - DCTCP
  - `cc_cdg.c`, `cc_chd.c`, `cc_vegas.c` - 其他算法

#### sys/netinet6/ (IPv6 协议)
- `ip6_input.c` - IPv6 输入处理
- `ip6_output.c` - IPv6 输出处理
- `ip6_forward.c` - IPv6 转发
- `nd6.c` - IPv6 邻居发现
- `nd6_nbr.c` - 邻居缓存
- `nd6_rtr.c` - 路由器发现
- `icmp6.c` - ICMPv6 处理
- `frag6.c` - IPv6 分片重组
- `in6_pcb.c` - IPv6 PCB 管理
- `in6_fib.c` - IPv6 FIB
- `mld6.c` - MLDv2 (多播监听发现)

#### sys/netpfil/ (包过滤)
- `ipfw/`
  - `ip_fw2.c` - ipfw 核心实现
  - `ip_fw_pfil.c` - ipfw 包过滤钩挂
  - `ip_dummynet.c` - Dummynet 流量模拟
- `pf/`
  - `pf.c` - PF 防火墙核心
  - `pf_ruleset.c` - 规则集管理
  - `pf_norm.c` - 数据包正规化
  - `pf_table.c` - 地址表管理
- `ipfilter/netinet/` - IPFilter (第三方)

---

## 二、架构图

### 整体网络栈架构

```mermaid
graph TD
    A[用户空间应用] -->|socket()| B[Socket 层]
    B -->|send/recv| C[协议控制块 PCB]
    C -->|in_pcb*| D[传输层]
    D -->|TCP/UDP/ICMP| E[网络层]
    E -->|IPv4/IPv6| F[包过滤层 PFIL]
    F -->|ipfw/pf/ipfilter| G[路由层]
    G -->|fib*| H[接口层 ifnet]
    H -->|if_output| I[设备驱动层]

    subgraph "sys/netinet (IPv4)"
        D1[TCP]
        D2[UDP]
        D3[ICMP]
        D4[IGMP]
        E1[ip_input/output]
        C1[in_pcb]
        D --> D1 & D2 & D3
        E --> E1
        C --> C1
    end

    subgraph "sys/netinet6 (IPv6)"
        E2[ip6_input/output]
        N1[ND6]
        N2[MLD6]
        E --> E2
    end

    subgraph "sys/netpfil"
        F1[ipfw]
        F2[pf]
        F --> F1 & F2
    end

    subgraph "sys/net"
        G1[route/*]
        H1[if.c]
        B1[BPF]
        ALTQ[ALTQ]
        H --> G1 & H1 & B1 & ALTQ
    end
```

### 协议栈层级结构

```mermaid
graph LR
    subgraph 应用层
        APP[应用程序]
    end

    subgraph 套插座层系统
        SOCK[Socket API]
        PR1[Protocol Switch<br/>ipprotosw[]]
        PCB[PCB 哈希表<br/>udpcb_hash<br/>tcbinfo]
    end

    subgraph 传输层 Transport Layer
        TCP[TCP 模块<br/>tcp_input.c<br/>tcp_output.c]
        UDP[UDP 模块<br/>udp_usrreq.c]
        CC[拥塞控制<br/>cc_newreno.c<br/>cc_cubic.c]
    end

    subgraph 网络层 Network Layer
        IP4[IPv4<br/>ip_input/output]
        IP6[IPv6<br/>ip6_input/output]
        ICMP[ICMP/ICMP6]
        MCAST[多播 IGMP/MLD6]
    end

    subgraph 包过滤 Packet Filtering
        PFIL[PFIL 钩子框架]
        IPFW[ipfw 防火墙]
        PF[PF 防火墙]
        ALTQ[ALTQ 流量整形]
    end

    subgraph 路由和接口 Routing & Interface
        RT[路由表 FIB<br/>in_fib.c]
        IF[网络接口<br/>ifnet 结构]
        BPF[BPF 数据包过滤器]
    end

    APP --> SOCK
    SOCK --> PR1
    PR1 --> PCB
    PCB --> TCP & UDP
    TCP --> CC
    TCP & UDP --> IP4 & IP6
    IP4 & IP6 --> PFIL
    PFIL --> IPFW & PF
    PFIL --> ALTQ
    IP4 & IP6 --> RT
    RT --> IF
    IF --> BPF
```

---

## 三、数据流图

### 入包处理流程

```mermaid
graph TD
    A[设备驱动接收数据包] -->|if_input| B[mbuf 链]
    B -->|以太解封装| C{链路类型}
    C -->|IPv4| D[PFIL 钩子链]
    C -->|IPv6| E[PFIL 钩子链]
    C -->|ARP| F[ARP 处理]

    D -->|ipfw_check_packet| G[ipfw 规则检查]
    G -->|通过| H[pf_test PF检查]
    H -->|通过| I[ip_input]

    I -->|检查校验和| J{多播/本地}
    J -->|是| K[IGMP 处理]
    J -->|否| L{协议类型}

    L -->|TCP| M[tcp_input]
    L -->|UDP| N[udp_input]
    L -->|ICMP| O[icmp_input]
    L -->|IPPROTO_RAW| P[raw_ip_input]

    M -->|查找 PCB| Q[in_pcblookup]
    Q -->|找到| R[处理 TCP 段]
    R -->|拥塞控制| S[cc_ack_received]

    E -->|PFIL 检查| T[ip6_input]
    T -->|IPv6 扩展头| U{下一头}
    U -->|TCP| V[tcp6_input]
    U -->|UDP| W[udp6_input]
    U -->|ICMPv6| X[icmp6_input]
    U -->|ND6| Y[nd6_input]
```

### 出包处理流程

```mermaid
graph TD
    A[用户 send() 调用] -->|so_send| B[Socket 层]
    B -->|协议处理| C{协议类型}

    C -->|TCP| D[tcp_output]
    C -->|UDP| E[udp_output]

    D -->|构建 TCP 头| F[拥塞控制 CC]
    F -->|窗口检查| G{可发送}
    G -->|是| H[分片处理]
    G -->|否| I[阻塞/缓存]

    H -->|构建 IP 头| J[ip_output]
    E -->|构建 UDP 头| J

    J -->|路由查找| K[rtalloc1]
    K -->|输出接口| L[if_output]
    L -->|PFIL 输出钩| M[ipfw/pf 检查]
    M -->|通过| N[ALTQ 队列]

    N -->|流量整形| O[排队/延迟]
    O -->|接口输出| P[设备驱动发送]
```

### TCP 连接建立流程

```mermaid
graph TD
    A[客户端主动连接] -->|socket()| B[创建 TCP PCB]
    B -->|connect()| C[进入 SYN_SENT 状态]
    C -->|tcp_output| D[发送 SYN 包]

    D -->|IP 层| E[ip_output 路由]

    E -->|SYN 到达服务器| F[tcp_input 处理]
    F -->|状态 LISTEN| G[创建新 PCB]
    G -->|检查 syncookie| H[SYN 缓存]
    H -->|接受| I[进入 SYN_RCVD]
    I -->|tcp_output| J[发送 SYN-ACK]

    J -->|客户端收到| K[tcp_input]
    K -->|状态 SYN_SENT| L[进入 ESTABLISHED]
    L -->|tcp_output| M[发送 ACK]

    M -->|服务器收到 ACK| N[tcp_input]
    N -->|状态 SYN_RCVD| O[进入 ESTABLISHED]

    O -->|连接建立完成| P[数据传输开始]
```

### TCP 状态机

```mermaid
stateDiagram-v2
    [*] --> CLOSED: 初始/关闭
    CLOSED --> LISTEN: passive open (socket+bind+listen)
    CLOSED --> SYN_SENT: active open (connect)

    LISTEN --> SYN_RCVD: recv SYN (send SYN+ACK)

    SYN_SENT --> SYN_RCVD: recv SYN (send ACK)
    SYN_SENT --> ESTABLISHED: recv SYN+ACK (send ACK)

    SYN_RCVD --> ESTABLISHED: recv ACK

    ESTABLISHED --> FIN_WAIT_1: active close (send FIN)
    ESTABLISHED --> CLOSE_WAIT: passive close (recv FIN)

    FIN_WAIT_1 --> FIN_WAIT_2: recv ACK
    FIN_WAIT_1 --> CLOSING: recv FIN (send ACK)

    FIN_WAIT_2 --> TIME_WAIT: recv FIN (send ACK)
    CLOSE_WAIT --> LAST_ACK: active close (send FIN)

    CLOSING --> TIME_WAIT: recv ACK
    LAST_ACK --> CLOSED: recv ACK

    TIME_WAIT --> CLOSED: 2MSL 超时

    ESTABLISHED --> CLOSED: recv RST
    FIN_WAIT_1 --> CLOSED: recv RST
    FIN_WAIT_2 --> CLOSED: recv RST
    CLOSE_WAIT --> CLOSED: recv RST
    LAST_ACK --> CLOSED: recv RST
    CLOSING --> CLOSED: recv RST
```

---

## 四、关键结构体

### ifnet 结构 (sys/net/if_var.h)
网络接口的核心抽象，表示所有网络设备

```mermaid
classDiagram
    class ifnet {
        +char if_xname[IFNAMSIZ]
        +int if_unit
ifnet --|>| ifaddrhead
        +u_short if_mtu
        +u_short if_flags
        +uint64_t if_counter[IFCOUNTERS]
        +ifnethead if_link
    }

    class ifaddr {
        +struct sockaddr* ifa_addr
        +struct sockaddr* ifa_broadaddr
        +struct sockaddr* ifa_netmask
        +struct ifnet* ifa_ifp
    }

    class altq {
        +int altq_type
        +void* altq_disc
        +int altq_enqueue
        +int altq_dequeue
    }

    ifnet *-- ifaddr
    ifnet *-- altq
```

### in_pcb 结构 (sys/netinet/in_pcb.h)
Internet 协议控制块，管理传输层连接

```mermaid
classDiagram
    class in_pcb {
        +struct inpcbinfo* inp_pcbinfo
        +struct in_conninfo inp_ppcb
        +struct mbuf* inp_options
        +struct ip_moptions* inp_moptions
        +struct inpcb* inp_next
        +struct inpcb* inp_prev
    }

    class in_conninfo {
        +uint8_t inc_flags
        +uint8_t inc_len
        +uint16_t inc_fibnum
        +struct in_endpoints inc_ie
    }

    class in_endpoints {
        +uint16_t ie_fport
        +uint16_t ie_lport
        +union in_dependaddr ie_dependfaddr
        +union in_dependaddr ie_dependladdr
        +uint32_t ie6_zoneid
    }

    in_pcb *-- in_conninfo
    in_conninfo *-- in_endpoints
```

### tcpcb 结构 (sys/netinet/tcp_var.h)
TCP 协议控制块，管理 TCP 连接状态

```mermaid
classDiagram
    class tcpcb {
        +tcp_seq snd_una
        +tcp_seq snd_max
        +tcp_seq snd_nxt
        +tcp_seq snd_up
        +tcp_seq iss
        +tcp_seq rcv_nxt
        +tcp_seq rcv_adv
        +tcp_seq rcv_wnd
        +tcp_seq irs
        +int t_state
        +u_int t_flags
        +struct cc_algo* cc_algo
        +tcp_seq sackhole
        +struct tseg_qent t_segq
    }

    class cc_algo {
        +char name[CC_ALGO_NAME_SIZE]
        +int (*cb_init)
        +int (*cb_ack_received)
        +int (*)cb_cong_signal
    }

    class sackhole {
        +tcp_seq start
        +tcp_seq end
        +tcp_seq rxmit
    }

    tcpcb *-- cc_algo
    tcpcb *-- sackhole
```

---

## 五、拥塞控制模块

```mermaid
graph TD
    A[TCP 发送数据] -->|cc_send| B[拥塞控制算法]
    B -->|cc_ack_received| C{算法类型}

    C -->|NewReno| D[cc_newreno.c<br/>标准 Reno<br/>慢启动/拥塞避免]
    C -->|CUBIC| E[cc_cubic.c<br/>三次窗口函数]
    C -->|H-TCP| F[cc_htcp.c<br/>Hamilton TCP<br/>RTT 敏感]
    C -->|DCTCP| G[cc_dctcp.c<br/>数据中心 TCP<br/>ECN 显式拥塞]
    C -->|CDG| H[cc_cdg.c<br/>CAIA Delay-Gradient]
    C -->|Vegas| I[cc_vegas.c<br/>延迟增长]

    D --> J[调整拥塞窗口]
    E --> J
    F --> J
    G --> J
    H --> J
    I --> J

    J --> K[计算新 cwnd]
    K --> L[更新发送窗口]
```

---

## 六、包过滤架构

```mermaid
graph TD
    A[IP 数据包] -->|PFIL_IN| B[pfil_head 钩子链]

    B --> C[包过滤器1: ipfw]
    B --> D[包过滤器2: pf]
    B --> E[包过滤器3: ALTQ]

    C -->|ipfw_check_packet| F{规则匹配}
    F -->|accept| G[传递]
    F -->|drop| H[丢弃]
    F -->|divert| I[重定向]
    F -->|pipe| J[Dummynet 流量整形]

    D -->|pf_test| K{规则匹配}
    K -->|pass| G
    K -->|block| H

    E -->|altq_enqueue| L[排队]
    L -->|调度| M[altq_dequeue]
    M --> G
```

---

## 七、模块调用关系

```mermaid
graph TD
    subgraph 网络接口层 sys/net
        IF1[if.c<br/>if_start/stop]
        IF2[if_loop.c<br/>if_looutput]
        IF3[if_bridge.c<br/>bridge_input/output]
        IF4[bpf_filter.c<br/>bpf_filter]
        IF5[altq/*.c<br/>altq_enqueue/dequeue]
    end

    subgraph IPv4 协议层 sys/netinet
        IP1[ip_input.c<br/>ip_input]
        IP2[ip_output.c<br/>ip_output]
        TCP1[tcp_input.c<br/>tcp_input]
        TCP2[tcp_output.c<br/>tcp_output]
        UDP1[udp_usrreq.c<br/>udp_input/output]
        PCB1[in_pcb.c<br/>in_pcblookup/insert]
        CC1[cc/*.c<br/>cc_newreno/cubic]
    end

    subgraph IPv6 协议层 sys/netinet6
        IP6[ip6_input/output<br/>ip6_input/output]
        ND6[nd6.c<br/>nd6_input]
        ICMP6[icmp6.c<br/>icmp6_input]
        FRAG6[frag6.c<br/>frag6_input]
    end

    subgraph 包过滤层 sys/netpfil
        IPFW[ip_fw2.c<br/>ipfw_check_packet]
        PF1[pf.c<br/>pf_test]
        ALTQ[ip_dummynet.c<br/>dummynet_io]
    end

    IF1 --> IF2
    IF1 --> IF3
    IF3 --> IP1
    IF1 --> IF4
    IF1 --> IF5

    IP1 --> TCP1
    IP1 --> UDP1
    IP2 --> IPFW
    IP2 --> PF1
    IP2 --> IF5

    TCP1 --> PCB1
    TCP1 --> CC1
    TCP2 --> CC1

    IP6 --> ND6
    IP6 --> ICMP6
    IP6 --> FRAG6

    ALTQ --> IF5
```

---

## 八、关键文件路径索引

### 网络接口层
- [if.c](sys/net/if.c) - 接口核心
- [if_var.h](sys/net/if_var.h) - 接口数据结构
- [if_loop.c](sys/net/if_loop.c) - 回环接口
- [if_bridge.c](sys/net/if_bridge.c) - 网桥
- [bpf_filter.c](sys/net/bpf_filter.c) - BPF 过滤器

### IPv4 协议
- [ip_input.c](sys/netinet/ip_input.c) - IPv4 输入
- [ip_output.c](sys/netinet/ip_output.c) - IPv4 输出
- [tcp_input.c](sys/netinet/tcp_input.c) - TCP 输入
- [tcp_output.c](sys/netinet/tcp_output.c) - TCP 输出
- [tcp_subr.c](sys/netinet/tcp_subr.c) - TCP 辅助函数
- [tcp_timer.c](sys/netinet/tcp_timer.c) - TCP 定时器

- [in_pcb.c](sys/netinet/in_pcb.c) - PCB 管理
- [in_pcb.h](sys/netinet/in_pcb.h) - PCB 结构
- [tcp_var.h](sys/netinet/tcp_var.h) - TCP 变量和结构
- [tcp_fsm.h](sys/netinet/tcp_fsm.h) - TCP 状态机

### 拥塞控制
- [cc/cc.c](sys/netinet/cc/cc.c) - CC 框架
- [cc/cc_newreno.c](sys/netinet/cc/cc_newreno.c) - NewReno
- [cc/cc_cubic.c](sys/netinet/cc/cc_cubic.c) - CUBIC
- [cc/cc_htcp.c](sys/netinet/cc/cc_htcp.c) - H-TCP
- [cc/cc_dctcp.c](sys/netinet/cc/cc_dctcp.c) - DCTCP

### IPv6 协议
- [ip6_input.c](sys/netinet6/ip6_input.c) - IPv6 输入
- [ip6_output.c](sys/netinet6/ip6_output.c) - IPv6 输出
- [nd6.c](sys/netinet6/nd6.c) - 邻居发现
- [icmp6.c](sys/netinet6/icmp6.c) - ICMPv6
- [frag6.c](sys/netinet6/frag6.c) - 分片重组

### 包过滤
- [ipfw/ip_fw2.c](sys/netpfil/ipfw/ip_fw2.c) - ipfw 核心
- [ipfw/ip_fw_pfil.c](sys/netpfil/ipfw/ip_fw_pfil.c) - ipfw 钩子
- [pf/pf.c](sys/netpfil/pf/pf.c) - PF 核心
- [pf/pf_ioctl.c](sys/netpfil/pf/pf_ioctl.c) - PF 控制
- [pfil.h](sys/net/pfil.h) - 包过滤接口

### 路由
- [route/route_ctl.c](sys/net/route/route_ctl.c) - 路由控制
- [route/fib_algo.c](sys/net/route/fib_algo.c) - FIB 算法
- [in_fib.c](sys/netinet/in_fib.c) - IPv4 FIB
- [in6_fib.c](sys/netinet6/in6_fib.c) - IPv6 FIB
