---
layout: post
title:  "Qdisc 机制探究"
date: 2022-12-14 23:36:00 +0800
type: card-img-top
image: http://placehold.it/750X300?text=Header+Image # for local images, place in /assets/img/posts/
caption:
last-updated: 2022-12-14 23:36:00 +0800
categories: post
tag: "Qdisc"
author: Liang Jiaxin
card: card-4
---

最近在探索内核中流量调度的事情，学习了几种常用的流量调度算法：PQ（Priority Queueing）、RR（Round Robin）、WRR（Weighted Round Robin）、DRR（Deficit Round Robin）、DWRR（Deficit Weighted Round Robin）、WFQ（Weighted Fair Queuing）。

> 参考资料：
> https://zhuanlan.zhihu.com/p/163812643
> https://blog.csdn.net/hopegrace/article/details/104551023
> https://en.wikipedia.org/wiki/Fair_queuing
> https://www.cs.bu.edu/fac/byers/courses/791/F99/scribe_notes/mazen/FairQueuing.htm
> 
