---
layout: post
title:  "Github Action 使用体验"
date:   2022-10-27 23:36:00 +0800
type: card-img-top
image: http://placehold.it/750X300?text=Header+Image # for local images, place in /assets/img/posts/
caption:
last-updated: 2022-10-27 23:36:00 +0800
categories: post
tag: "Github Action"
author: Liang Jiaxin
card: card-1
---

以往个人主页更新需要需要经历以下步骤：

> 本地编辑页面 --> 本地进行`Jekyll Build` --> 上传到`Github Page` --> 等待Github更新页面缓存

这个流畅非常复杂，而且当我的工作电脑或者主力机不在身边的时候，编译的环境、主页的更新都变得十分困难。这时候我们可以接触到的一种生成页面的方式，就是通过 `Github Action` 来进行自动化编译 （以前的 `Workflow`）。

其实自动化编译这个技术已经是一个在软件开发领域非常成熟的技术，也衍生出了多种不同需求之下的解决方案。只是我本人接触这个东西比较晚，所以到最近趁着更新主页架构的机会，才开始真的把它用起来。
