---
layout: post
title:  "A note on the GNURadio"
description: "分析关于 GNURadio 系统的搭建"
date:   2018-04-24 15:13:00 +0800
type: card-img-top
image: http://placehold.it/750X300?text=Header+Image # for local images, place in /assets/img/posts/
caption:
last-updated: 2018-04-24 15:13:00 +0800
categories: post
tag: GNURadio
author: Liang Jiaxin
card: card-2
---


接下来我会开始写一写这两年来在·GNURadio·开发方面的一些简单教程和个人介绍。<!--more-->虽然这是一个很小众的
领域但是自己积累下来的经验是希望可以多分享一些，这样也有利于之后自己回顾以往做过的一些开发流程。

## 前言

从很早之前开始就已经在和 GNUradio 打交道了，但是很长的时间里面，我都是从来不敢动底层部件（如 C++ block)
或者是其他相关的代码操作。只会利用已有的·PHY层·部件进行拼凑用以对·MAC层·进行设计。

但是自从 DARPA 的比赛开始，我就不得不把重心转移到了对底层模块进行操作的方向上来。一方面是因为，
原来已有的部件局限性太大，对系统的性能的制约也很明显。并且以为 PHY层内部的部件的各种开发时的随意性，导致我们在使用时也出现诸多的不便，即便只是参数的更改有时候也会是大费周章。

记得一个比较简单但是深刻的例子就是，当我们在对原先的 PNC 系统 进行修改的时候，便发现原系统的 bitrate（详细定义可参考 802.11a 的 bitrate 的定义）并不能随意更改。一旦 bitrate $x \leq 2$ 的时候，便会出现某个 IO 的 size 不对的情况。但比较让人觉得可怕的地方是，程序并不会因此报错而停止，而是输出包解码错误。如果只从现象来观察，很容易会得出*信道质量太差*或者*硬件出了问题*的结论。
后来几经波折才发现，出现问题的是因为某个内部 PHY层 的处理模块的输出输入口不按照原先的定义进行输出，粗略一点来讲便是*IO口的 Size 不对*。

从上面的经历得出的结论便是，如果我们想进一步提高系统性能的时候，出来更改MAC层的基本设计，还需要多关注PHY层的代码实现。很多时候PHY层的代码实现会十分明显地影响系统的整体性能。

以下我先描述几个细节点：

* GNURadio 和 USRP 之间的时间关系
* 参数传递
* 通信系统接收端的响应方式

## 处理 GNURadio 和 USRP 之间的时间关系
